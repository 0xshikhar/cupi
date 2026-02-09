import crypto from "crypto";
import {
  createPublicClient,
  erc20Abi,
  http,
  isAddress,
  isAddressEqual,
  parseEventLogs,
  parseUnits,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { baseSepolia, base } from "viem/chains";
import { Connection, PublicKey, type ParsedTransactionWithMeta } from "@solana/web3.js";

import { CONTRACT_ADDRESSES, DEFAULT_CHAIN } from "@/config/chains";

export type SolanaCluster = "mainnet-beta" | "devnet";

const SOLANA_USDC_MINTS: Record<SolanaCluster, string> = {
  "mainnet-beta": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
};

const USDC_DECIMALS = 6;
const DECIMAL_AMOUNT = /^\d+(\.\d{1,6})?$/;

export interface TransferVerification {
  valid: boolean;
  /** True when nothing is on-chain yet (keep waiting) as opposed to a definitive mismatch. */
  pending?: boolean;
  txHash?: string;
  payer?: string;
  reason?: string;
}

export function getSolanaCluster(): SolanaCluster {
  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || process.env.SOLANA_CLUSTER;
  return cluster === "devnet" ? "devnet" : "mainnet-beta";
}

export function getSolanaUsdcMint(cluster: SolanaCluster = getSolanaCluster()): string {
  return SOLANA_USDC_MINTS[cluster];
}

export function getSolanaConnection(): Connection {
  const rpcUrl =
    process.env.SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    (getSolanaCluster() === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com");
  return new Connection(rpcUrl, "confirmed");
}

export function isSolanaAddress(value: string | null | undefined): value is string {
  if (!value || value.startsWith("0x")) return false;
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

export function isEvmAddress(value: string | null | undefined): value is Address {
  return !!value && isAddress(value);
}

/**
 * Deterministic Solana Pay reference for a checkout session.
 * Any 32 bytes form a valid reference key, so sessions need no extra storage and the
 * reconciliation worker can recompute it to discover payments the client never reported.
 */
export function deriveSolanaPayReference(sessionId: string): string {
  const seed = crypto.createHash("sha256").update(`cupi-checkout:${sessionId}`).digest();
  return new PublicKey(seed).toBase58();
}

export function toUsdcBaseUnits(amount: string): bigint | null {
  const trimmed = amount.trim();
  if (!DECIMAL_AMOUNT.test(trimmed)) return null;
  return parseUnits(trimmed, USDC_DECIMALS);
}

/** Sums the recipient's USDC balance increase inside a parsed Solana transaction. */
function solanaRecipientDelta(tx: ParsedTransactionWithMeta, recipient: string, mint: string): bigint {
  const sumFor = (balances: NonNullable<ParsedTransactionWithMeta["meta"]>["postTokenBalances"]) =>
    (balances || [])
      .filter((b) => b.owner === recipient && b.mint === mint)
      .reduce((acc, b) => acc + BigInt(b.uiTokenAmount.amount), BigInt(0));

  return sumFor(tx.meta?.postTokenBalances) - sumFor(tx.meta?.preTokenBalances);
}

/**
 * Finds and validates a Solana Pay USDC transfer by reference key (or a known signature).
 * Valid only if the tx succeeded, includes the reference, and credits the recipient >= amount.
 */
export async function verifySolanaUsdcTransfer(params: {
  reference: string;
  recipient: string;
  amount: string;
  signature?: string;
  connection?: Connection;
}): Promise<TransferVerification> {
  const expected = toUsdcBaseUnits(params.amount);
  if (expected === null) return { valid: false, reason: "Invalid amount" };

  const connection = params.connection || getSolanaConnection();
  const mint = getSolanaUsdcMint();
  const referenceKey = new PublicKey(params.reference);

  const signatures = params.signature
    ? [params.signature]
    : (await connection.getSignaturesForAddress(referenceKey, { limit: 10 }, "confirmed"))
        .filter((s) => !s.err)
        .map((s) => s.signature);

  if (signatures.length === 0) return { valid: false, pending: true, reason: "No transaction found for reference" };

  for (const signature of signatures) {
    const tx = await connection.getParsedTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (!tx || tx.meta?.err) continue;

    const accountKeys = tx.transaction.message.accountKeys.map((k) => k.pubkey.toBase58());
    if (!accountKeys.includes(params.reference)) continue;

    if (solanaRecipientDelta(tx, params.recipient, mint) >= expected) {
      return { valid: true, txHash: signature, payer: accountKeys[0] };
    }
  }

  return { valid: false, reason: "No matching USDC transfer to the settlement address" };
}

/**
 * Validates an ERC-20 USDC transfer on Base by decoding Transfer logs from the receipt.
 * Valid only if the tx succeeded and transfers >= amount of USDC to the recipient.
 */
export async function verifyEvmUsdcTransfer(params: {
  txHash: string;
  recipient: Address;
  amount: string;
  chainId?: number;
  waitMs?: number;
  client?: Pick<PublicClient, "getTransactionReceipt" | "waitForTransactionReceipt">;
}): Promise<TransferVerification> {
  const expected = toUsdcBaseUnits(params.amount);
  if (expected === null) return { valid: false, reason: "Invalid amount" };
  if (!/^0x[0-9a-fA-F]{64}$/.test(params.txHash)) return { valid: false, reason: "Invalid transaction hash" };

  const chainId = params.chainId ?? DEFAULT_CHAIN.id;
  const chain = chainId === base.id ? base : baseSepolia;
  const usdc = CONTRACT_ADDRESSES[chain.id].USDC as Address;
  const client = params.client ?? createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0]) });

  const hash = params.txHash as Hex;
  const receipt =
    (await client.getTransactionReceipt({ hash }).catch(() => null)) ??
    (params.waitMs
      ? await client.waitForTransactionReceipt({ hash, timeout: params.waitMs }).catch(() => null)
      : null);

  if (!receipt) return { valid: false, pending: true, reason: "Transaction not yet mined" };
  if (receipt.status !== "success") return { valid: false, reason: "Transaction reverted" };

  const transfers = parseEventLogs({ abi: erc20Abi, eventName: "Transfer", logs: receipt.logs }).filter(
    (log) => isAddressEqual(log.address, usdc) && isAddressEqual(log.args.to, params.recipient)
  );
  const received = transfers.reduce((acc, log) => acc + log.args.value, BigInt(0));

  if (received < expected) return { valid: false, reason: "Transfer amount or recipient mismatch" };
  return { valid: true, txHash: params.txHash, payer: transfers[0]?.args.from };
}
