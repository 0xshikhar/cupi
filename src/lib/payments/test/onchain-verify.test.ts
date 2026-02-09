/** @jest-environment node */
import { encodeAbiParameters, keccak256, toHex, type Address } from "viem";
import { Keypair } from "@solana/web3.js";

import {
  deriveSolanaPayReference,
  getSolanaUsdcMint,
  isEvmAddress,
  isSolanaAddress,
  toUsdcBaseUnits,
  verifyEvmUsdcTransfer,
  verifySolanaUsdcTransfer,
} from "../onchain-verify";

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
});
