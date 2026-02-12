/** @jest-environment node */
import { encodeAbiParameters, keccak256, toHex, parseEther, type Address } from "viem";
import { Keypair } from "@solana/web3.js";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    payment: { findFirst: jest.fn() },
    paymentRequest: { findFirst: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  deriveSolanaPayReference,
  getSolanaUsdcMint,
  isEvmAddress,
  isSolanaAddress,
  toUsdcBaseUnits,
  verifyEvmNativeTransfer,
  verifyEvmUsdcTransfer,
  verifySolanaNativeTransfer,
  verifySolanaUsdcTransfer,
} from "../onchain-verify";
import { assertTxHashUnused } from "../tx-hash-guard";

const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address;
const MERCHANT = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as Address;
const PAYER = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as Address;
const TX_HASH = `0x${"ab".repeat(32)}`;
const TRANSFER_TOPIC = keccak256(toHex("Transfer(address,address,uint256)"));

const padTopic = (addr: Address) => `0x${addr.slice(2).toLowerCase().padStart(64, "0")}` as `0x${string}`;

function transferLog(token: Address, to: Address, value: bigint) {
  return {
    address: token,
    topics: [TRANSFER_TOPIC, padTopic(PAYER), padTopic(to)],
    data: encodeAbiParameters([{ type: "uint256" }], [value]),
    blockHash: `0x${"11".repeat(32)}`,
    blockNumber: BigInt(1),
    logIndex: 0,
    transactionHash: TX_HASH,
    transactionIndex: 0,
    removed: false,
  };
}

function mockEvmClient(receipt: unknown) {
  return {
    getTransactionReceipt: jest.fn().mockResolvedValue(receipt),
    waitForTransactionReceipt: jest.fn().mockRejectedValue(new Error("timeout")),
  } as never;
}

describe("On-chain payment verification", () => {
  describe("helpers", () => {
    it("parses strict USDC decimal amounts and rejects unsafe formats", () => {
      expect(toUsdcBaseUnits("10")).toBe(BigInt(10_000_000));
      expect(toUsdcBaseUnits("0.000001")).toBe(BigInt(1));
      expect(toUsdcBaseUnits("1e6")).toBeNull();
      expect(toUsdcBaseUnits("0x10")).toBeNull();
      expect(toUsdcBaseUnits("1.0000001")).toBeNull();
      expect(toUsdcBaseUnits("-5")).toBeNull();
    });

    it("derives a stable, session-unique Solana Pay reference", () => {
      expect(deriveSolanaPayReference("cs_1")).toBe(deriveSolanaPayReference("cs_1"));
      expect(deriveSolanaPayReference("cs_1")).not.toBe(deriveSolanaPayReference("cs_2"));
      expect(isSolanaAddress(deriveSolanaPayReference("cs_1"))).toBe(true);
    });

    it("distinguishes EVM and Solana settlement addresses", () => {
      expect(isEvmAddress(MERCHANT)).toBe(true);
      expect(isSolanaAddress(MERCHANT)).toBe(false);
      expect(isSolanaAddress(Keypair.generate().publicKey.toBase58())).toBe(true);
      expect(isEvmAddress("not-an-address")).toBe(false);
    });
  });

  describe("verifyEvmUsdcTransfer", () => {
    const baseParams = { txHash: TX_HASH, recipient: MERCHANT, amount: "10.00", chainId: 84532 };

    it("accepts a successful USDC transfer of the full amount to the merchant", async () => {
      const client = mockEvmClient({
        status: "success",
        logs: [transferLog(BASE_SEPOLIA_USDC, MERCHANT, BigInt(10_000_000))],
      });
      const result = await verifyEvmUsdcTransfer({ ...baseParams, client });
      expect(result).toMatchObject({ valid: true, txHash: TX_HASH });
      expect(result.payer?.toLowerCase()).toBe(PAYER.toLowerCase());
    });

    it("rejects underpayment", async () => {
      const client = mockEvmClient({
        status: "success",
        logs: [transferLog(BASE_SEPOLIA_USDC, MERCHANT, BigInt(9_999_999))],
      });
      expect((await verifyEvmUsdcTransfer({ ...baseParams, client })).valid).toBe(false);
    });

    it("rejects transfers to a different recipient", async () => {
      const client = mockEvmClient({
        status: "success",
        logs: [transferLog(BASE_SEPOLIA_USDC, PAYER, BigInt(10_000_000))],
      });
      expect((await verifyEvmUsdcTransfer({ ...baseParams, client })).valid).toBe(false);
    });

    it("rejects transfers of a token other than USDC", async () => {
      const fakeToken = "0x0000000000000000000000000000000000000bad" as Address;
      const client = mockEvmClient({
        status: "success",
        logs: [transferLog(fakeToken, MERCHANT, BigInt(10_000_000))],
      });
      expect((await verifyEvmUsdcTransfer({ ...baseParams, client })).valid).toBe(false);
    });

    it("rejects reverted transactions", async () => {
      const client = mockEvmClient({
        status: "reverted",
        logs: [transferLog(BASE_SEPOLIA_USDC, MERCHANT, BigInt(10_000_000))],
      });
      const result = await verifyEvmUsdcTransfer({ ...baseParams, client });
      expect(result).toMatchObject({ valid: false, reason: "Transaction reverted" });
      expect(result.pending).toBeUndefined();
    });

    it("reports pending (not invalid) when the transaction is not mined yet", async () => {
      const client = mockEvmClient(null);
      expect(await verifyEvmUsdcTransfer({ ...baseParams, client })).toMatchObject({
        valid: false,
        pending: true,
      });
    });
  });

  describe("verifySolanaUsdcTransfer", () => {
    const merchant = Keypair.generate().publicKey.toBase58();
    const payer = Keypair.generate().publicKey.toBase58();
    const reference = deriveSolanaPayReference("cs_sol_1");
    const mint = getSolanaUsdcMint();

    function parsedTx(opts: { err?: unknown; includeReference?: boolean; delta: bigint; owner?: string }) {
      const keys = [payer, merchant, ...(opts.includeReference === false ? [] : [reference])];
      return {
        meta: {
          err: opts.err ?? null,
          preTokenBalances: [{ owner: opts.owner ?? merchant, mint, uiTokenAmount: { amount: "5000000" } }],
          postTokenBalances: [
            { owner: opts.owner ?? merchant, mint, uiTokenAmount: { amount: (BigInt(5_000_000) + opts.delta).toString() } },
          ],
        },
        transaction: {
          message: { accountKeys: keys.map((k) => ({ pubkey: { toBase58: () => k } })) },
        },
      };
    }

    function mockConnection(tx: unknown, signatures = [{ signature: "sig_1", err: null }]) {
      return {
        getSignaturesForAddress: jest.fn().mockResolvedValue(signatures),
        getParsedTransaction: jest.fn().mockResolvedValue(tx),
      } as never;
    }

    it("finds the payment by reference and validates the recipient's USDC delta", async () => {
      const connection = mockConnection(parsedTx({ delta: BigInt(10_000_000) }));
      expect(
        await verifySolanaUsdcTransfer({ reference, recipient: merchant, amount: "10", connection })
      ).toMatchObject({ valid: true, txHash: "sig_1", payer });
    });

    it("rejects an underpaying transfer that still carries the reference", async () => {
      const connection = mockConnection(parsedTx({ delta: BigInt(1) }));
      expect((await verifySolanaUsdcTransfer({ reference, recipient: merchant, amount: "10", connection })).valid).toBe(false);
    });

    it("rejects failed transactions", async () => {
      const connection = mockConnection(parsedTx({ delta: BigInt(10_000_000), err: { InstructionError: [0, "Custom"] } }));
      expect((await verifySolanaUsdcTransfer({ reference, recipient: merchant, amount: "10", connection })).valid).toBe(false);
    });

    it("rejects a submitted signature that does not include the session reference", async () => {
      const connection = mockConnection(parsedTx({ delta: BigInt(10_000_000), includeReference: false }));
      expect(
        (await verifySolanaUsdcTransfer({ reference, recipient: merchant, amount: "10", signature: "sig_x", connection })).valid
      ).toBe(false);
    });

    it("reports pending when no transaction references the session yet", async () => {
      const connection = mockConnection(null, []);
      expect(
        await verifySolanaUsdcTransfer({ reference, recipient: merchant, amount: "10", connection })
      ).toMatchObject({ valid: false, pending: true });
    });
  });

  describe("verifyEvmNativeTransfer", () => {
    const baseParams = { txHash: TX_HASH, recipient: MERCHANT, amount: "0.5", chainId: 84532 };
    const sendTx = (to: Address, value: bigint) => ({
      to, from: PAYER, value, blockHash: `0x${"22".repeat(32)}`,
    });

    function mockNativeClient(receipt: unknown, tx: unknown) {
      return {
        getTransactionReceipt: jest.fn().mockResolvedValue(receipt),
        getTransaction: jest.fn().mockResolvedValue(tx),
        waitForTransactionReceipt: jest.fn().mockRejectedValue(new Error("timeout")),
      } as never;
    }

    it("accepts a native transfer with sufficient value to the recipient", async () => {
      const client = mockNativeClient(
        { status: "success", logs: [] },
        sendTx(MERCHANT, parseEther("0.5"))
      );
      expect(await verifyEvmNativeTransfer({ ...baseParams, client }))
        .toMatchObject({ valid: true, txHash: TX_HASH, payer: PAYER });
    });

    it("rejects when the value is below the expected amount", async () => {
      const client = mockNativeClient(
        { status: "success", logs: [] },
        sendTx(MERCHANT, parseEther("0.499999"))
      );
      expect(await verifyEvmNativeTransfer({ ...baseParams, client }))
        .toMatchObject({ valid: false, reason: "Transfer amount mismatch" });
    });

    it("rejects transfers to a different recipient", async () => {
      const client = mockNativeClient(
        { status: "success", logs: [] },
        sendTx(PAYER, parseEther("0.5"))
      );
      expect(await verifyEvmNativeTransfer({ ...baseParams, client }))
        .toMatchObject({ valid: false, reason: "Recipient mismatch" });
    });

    it("rejects reverted transactions and reports pending before mining", async () => {
      const reverted = mockNativeClient({ status: "reverted", logs: [] }, sendTx(MERCHANT, parseEther("1")));
      expect((await verifyEvmNativeTransfer({ ...baseParams, client: reverted })).valid).toBe(false);

      const pending = mockNativeClient(null, null);
      expect(await verifyEvmNativeTransfer({ ...baseParams, client: pending }))
        .toMatchObject({ valid: false, pending: true });
    });

    it("rejects malformed transaction hashes and unsafe amount formats", async () => {
      expect(
        (await verifyEvmNativeTransfer({ ...baseParams, txHash: "0x1234", client: mockNativeClient(null, null) })).valid
      ).toBe(false);
      expect(
        (await verifyEvmNativeTransfer({ ...baseParams, amount: "1e-3", client: mockNativeClient(null, null) })).valid
      ).toBe(false);
    });
  });

  describe("verifySolanaNativeTransfer", () => {
    const payer = Keypair.generate().publicKey.toBase58();
    const recipient = Keypair.generate().publicKey.toBase58();

    function solNativeTx(opts: { err?: unknown; deltaLamports: bigint; includeRecipient?: boolean }) {
      const keys = [payer, ...(opts.includeRecipient === false ? [] : [recipient])];
      const idx = keys.indexOf(recipient);
      const pre = idx === -1 ? [0] : [0, 5_000_000_000];
      const post = idx === -1 ? [0] : [0, 5_000_000_000 + Number(opts.deltaLamports)];
      return {
        meta: { err: opts.err ?? null, preBalances: pre, postBalances: post },
        transaction: { message: { accountKeys: keys.map((k) => ({ pubkey: { toBase58: () => k } })) } },
      };
    }
    const mockConn = (tx: unknown) =>
      ({ getParsedTransaction: jest.fn().mockResolvedValue(tx) } as never);

    it("accepts a native SOL transfer crediting the recipient", async () => {
      const conn = mockConn(solNativeTx({ deltaLamports: BigInt(1_000_000_000) }));
      expect(
        await verifySolanaNativeTransfer({ recipient, amount: "1", signature: "sig_1", connection: conn })
      ).toMatchObject({ valid: true, txHash: "sig_1", payer });
    });

    it("rejects underpayment and failed transactions", async () => {
      const underpay = mockConn(solNativeTx({ deltaLamports: BigInt(1_000) }));
      expect(
        (await verifySolanaNativeTransfer({ recipient, amount: "1", signature: "sig_1", connection: underpay })).valid
      ).toBe(false);

      const failed = mockConn(solNativeTx({ deltaLamports: BigInt(1_000_000_000), err: { InstructionError: [0, "Custom"] } }));
      expect(
        (await verifySolanaNativeTransfer({ recipient, amount: "1", signature: "sig_1", connection: failed }))
      ).toMatchObject({ valid: false, reason: "Transaction failed on-chain" });
    });

    it("rejects a transaction that does not touch the recipient and reports pending when unfetched", async () => {
      const notPayer = mockConn(solNativeTx({ deltaLamports: BigInt(1_000_000_000), includeRecipient: false }));
      expect(
        (await verifySolanaNativeTransfer({ recipient, amount: "1", signature: "sig_1", connection: notPayer }))
      ).toMatchObject({ valid: false, reason: "Recipient not found in transaction" });

      const pending = mockConn(null);
      expect(
        await verifySolanaNativeTransfer({ recipient, amount: "1", signature: "sig_1", connection: pending })
      ).toMatchObject({ valid: false, pending: true });
    });
  });

  describe("assertTxHashUnused (tx reuse guard)", () => {
    beforeEach(() => {
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.paymentRequest.findFirst as jest.Mock).mockResolvedValue(null);
    });

    it("passes when the hash has never settled a payment or request", async () => {
      await expect(assertTxHashUnused(TX_HASH)).resolves.toBeUndefined();
    });

    it("rejects when the hash already settled a payment", async () => {
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue({ id: "pay_1" });
      await expect(assertTxHashUnused(TX_HASH)).rejects.toThrow(/already been used/);
    });

    it("rejects when the hash already settled a payment request", async () => {
      (prisma.paymentRequest.findFirst as jest.Mock).mockResolvedValue({ id: "pr_1" });
      await expect(assertTxHashUnused(TX_HASH)).rejects.toThrow(/already been used/);
    });
  });
});
