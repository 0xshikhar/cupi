import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  ComputeBudgetProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
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
export const SOLANA_MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

export const ACTIONS_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Accept-Action-Version, X-Accept-Blockchain-Ids",
  "Access-Control-Expose-Headers": "X-Action-Version, X-Blockchain-Ids",
  "X-Action-Version": "2.1.3",
  "X-Blockchain-Ids": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
};

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
 * Creates Phantom & Solflare Mobile Deep Links for 1-tap checkout inside Telegram & WhatsApp.
 */
export function createMobileWalletDeepLink(
  solanaPayUrl: string,
  wallet: "phantom" | "solflare" = "phantom"
): string {
  const encoded = encodeURIComponent(solanaPayUrl);
  if (wallet === "phantom") {
    return `https://phantom.app/ul/browse/${encoded}?ref=${encodeURIComponent("https://cupi.xyz")}`;
  }
  return `https://solflare.com/ul/v1/browse/${encoded}`;
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
 * Estimates dynamic priority fees based on recent cluster congestion.
 * Uses 75th percentile of recent transactions to guarantee inclusion in congested blocks.
 */
export async function estimateDynamicPriorityFee(
  connection: Connection,
  defaultMicroLamports: number = 50_000
): Promise<number> {
  try {
    const recentFees = await connection.getRecentPrioritizationFees();
    if (!recentFees || recentFees.length === 0) return defaultMicroLamports;

    const positiveFees = recentFees
      .map((f) => f.prioritizationFee)
      .filter((fee) => fee > 0)
      .sort((a, b) => a - b);

    if (positiveFees.length === 0) return defaultMicroLamports;

    const p75Index = Math.floor(positiveFees.length * 0.75);
    const estimated = positiveFees[p75Index];

    // Cap between default floor and reasonable max (e.g. 500,000 microLamports = ~0.0001 SOL)
    return Math.min(Math.max(estimated, defaultMicroLamports), 500_000);
  } catch {
    return defaultMicroLamports;
  }
}

/**
 * Builds an atomic SPL Token (USDC) transfer transaction on Solana.
 * Features:
 * 1. Priority Fees & Compute Budget (resilient under 10k-user mainnet congestion)
 * 2. Dynamic fee estimation via getRecentPrioritizationFees
 * 3. Idempotent Associated Token Account (ATA) creation
 * 4. TransferChecked instruction for strict mint & decimal safety
 * 5. Ephemeral reference key for sub-second confirmation
 * 6. SPL Memo v2 for transparent on-chain audit trail
 * 7. Gasless relayer support (if Ihsan/Cupi sponsor key is available)
 */
export async function buildSolanaUsdcTransferTransaction(params: {
  connection: Connection;
  payer: PublicKey;
  recipient: PublicKey;
  amountUsdc: number;
  isDevnet?: boolean;
  reference?: PublicKey;
  memo?: string;
  sponsorKeypair?: Keypair;
  priorityFeeMicroLamports?: number;
}): Promise<Transaction> {
  const {
    connection,
    payer,
    recipient,
    amountUsdc,
    isDevnet,
    reference,
    memo,
    sponsorKeypair,
    priorityFeeMicroLamports,
  } = params;

  // Resolve dynamic priority fee if not specified
  const effectivePriorityFee = priorityFeeMicroLamports !== undefined
    ? priorityFeeMicroLamports
    : await estimateDynamicPriorityFee(connection);

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

  // 1. Mainnet Congestion Protection: Compute Budget & Priority Fee
  tx.add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 200_000,
    }),
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: effectivePriorityFee,
    })
  );

  // 2. Ensure recipient ATA exists (idempotent creation prevents new user onboarding failures)
  const feePayerPubkey = sponsorKeypair ? sponsorKeypair.publicKey : payer;
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      feePayerPubkey, // payer for rent exemption
      recipientAta,
      recipient, // owner of ATA
      usdcMint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  );

  // 3. Transfer SPL USDC tokens using TransferChecked (ensures exact mint + decimals)
  const transferInstruction = createTransferCheckedInstruction(
    senderAta,
    usdcMint,
    recipientAta,
    payer,
    rawAmount,
    SOLANA_USDC_DECIMALS,
    [],
    TOKEN_PROGRAM_ID
  );

  // 4. Attach ephemeral reference key for instant transaction discovery
  if (reference) {
    transferInstruction.keys.push({
      pubkey: reference,
      isWritable: false,
      isSigner: false,
    });
  }

  tx.add(transferInstruction);

  // 5. Add SPL Memo v2 if provided
  if (memo) {
    tx.add(
      new TransactionInstruction({
        keys: [{ pubkey: payer, isSigner: true, isWritable: true }],
        programId: SOLANA_MEMO_PROGRAM_ID,
        data: Buffer.from(memo, "utf-8"),
      })
    );
  }

  // 6. Fetch recent blockhash
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = feePayerPubkey;

  // 7. If gasless sponsor keypair is present, partially sign as fee payer
  if (sponsorKeypair) {
    tx.partialSign(sponsorKeypair);
  }

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

