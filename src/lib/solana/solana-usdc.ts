import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

// Standard USDC Mint on Solana
export const SOLANA_USDC_MAINNET = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);
export const SOLANA_USDC_DEVNET = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);
export const SOLANA_USDC_DECIMALS = 6;

export interface SolanaPayUrlParams {
  recipient: string; // Base58 address
  amount: number | string;
  splToken?: string;
  reference?: string;
  label?: string;
  message?: string;
  memo?: string;
}

/**
 * Creates an official Solana Pay compliant payment URL.
 * Specification: https://github.com/solana-pay/specs/blob/master/SPEC.md
 * e.g., solana:mvines9iiHiQTysnf8UThEGqKXxdAjTRtBeWSmN98WQ?amount=10&spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
 */
export function createSolanaPayUrl(params: SolanaPayUrlParams): string {
  const url = new URL(`solana:${params.recipient}`);

  url.searchParams.append("amount", params.amount.toString());

  // Default to Solana Mainnet USDC if not specified
  const tokenMint = params.splToken || SOLANA_USDC_MAINNET.toBase58();
  url.searchParams.append("spl-token", tokenMint);

  if (params.reference) {
    url.searchParams.append("reference", params.reference);
  }
  if (params.label) {
    url.searchParams.append("label", params.label);
  }
  if (params.message) {
    url.searchParams.append("message", params.message);
  }
  if (params.memo) {
    url.searchParams.append("memo", params.memo);
  }

  return url.toString();
}

/**
 * Parses and validates a Solana Pay URL.
 */
export function parseSolanaPayUrl(rawUrl: string): SolanaPayUrlParams {
  if (!rawUrl.startsWith("solana:")) {
    throw new Error("Invalid Solana Pay URL: must start with 'solana:' protocol");
  }

  const clean = rawUrl.replace("solana:", "http://solana.pay/");
  const parsed = new URL(clean);
  const recipient = parsed.pathname.replace(/^\//, "");

  // Validate recipient is a valid Base58 public key
  new PublicKey(recipient);

  const amount = parsed.searchParams.get("amount");
  if (!amount) {
    throw new Error("Solana Pay URL missing amount parameter");
  }

  return {
    recipient,
    amount,
    splToken: parsed.searchParams.get("spl-token") || undefined,
    reference: parsed.searchParams.get("reference") || undefined,
    label: parsed.searchParams.get("label") || undefined,
    message: parsed.searchParams.get("message") || undefined,
    memo: parsed.searchParams.get("memo") || undefined,
  };
}

/**
 * Builds an atomic SPL Token (USDC) transfer transaction on Solana.
 * Automatically creates Associated Token Account (ATA) if recipient doesn't have one.
 */
export async function buildSolanaUsdcTransferTransaction(params: {
  connection: Connection;
  payer: PublicKey;
  recipient: PublicKey;
  amountUsdc: number;
  isDevnet?: boolean;
  reference?: PublicKey;
}): Promise<Transaction> {
  const { connection, payer, recipient, amountUsdc, isDevnet, reference } = params;

  const usdcMint = isDevnet ? SOLANA_USDC_DEVNET : SOLANA_USDC_MAINNET;
  const rawAmount = BigInt(Math.round(amountUsdc * Math.pow(10, SOLANA_USDC_DECIMALS)));

  // Derive sender ATA
  const senderAta = await getAssociatedTokenAddress(
    usdcMint,
    payer,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // Derive recipient ATA
  const recipientAta = await getAssociatedTokenAddress(
    usdcMint,
    recipient,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const tx = new Transaction();

  // 1. Ensure recipient ATA exists (idempotent creation)
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      payer, // payer for rent exemption
      recipientAta,
      recipient, // owner of ATA
      usdcMint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  );

  // 2. Transfer SPL USDC tokens
  const transferInstruction = createTransferInstruction(
    senderAta,
    recipientAta,
    payer,
    rawAmount,
    [],
    TOKEN_PROGRAM_ID
  );

  // 3. Attach reference key if provided (for Solana Pay tracking)
  if (reference) {
    transferInstruction.keys.push({
      pubkey: reference,
      isWritable: false,
      isSigner: false,
    });
  }

  tx.add(transferInstruction);

  // 4. Fetch recent blockhash
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;

  return tx;
}

/**
 * Generates an ephemeral reference keypair for tracking a Solana Pay transaction.
 */
export function generateSolanaPayReference(): {
  referencePublicKey: string;
  referenceKeypair: Keypair;
} {
  const kp = Keypair.generate();
  return {
    referencePublicKey: kp.publicKey.toBase58(),
    referenceKeypair: kp,
  };
}
