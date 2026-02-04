/** @jest-environment node */
import { describe, expect, it } from "@jest/globals";
import { Keypair } from "@solana/web3.js";
import {
  createSolanaPayUrl,
  parseSolanaPayUrl,
  generateSolanaPayReference,
  SOLANA_USDC_MAINNET,
} from "../solana-usdc";

describe("Solana USDC & Solana Pay Integration", () => {
  it("should generate a valid Solana Pay URL with USDC token mint", () => {
    const recipientKp = Keypair.generate();
    const recipient = recipientKp.publicKey.toBase58();

    const url = createSolanaPayUrl({
      recipient,
      amount: "25.50",
      memo: "Coffee with Alice",
    });

    expect(url.startsWith(`solana:${recipient}?`)).toBe(true);
    expect(url).toContain("amount=25.50");
    expect(url).toContain(`spl-token=${SOLANA_USDC_MAINNET.toBase58()}`);
    expect(url).toContain("memo=Coffee+with+Alice");
  });

  it("should correctly parse and validate a Solana Pay URL", () => {
    const recipientKp = Keypair.generate();
    const recipient = recipientKp.publicKey.toBase58();
    const rawUrl = `solana:${recipient}?amount=15.00&spl-token=${SOLANA_USDC_MAINNET.toBase58()}&memo=Invoice-101`;

    const parsed = parseSolanaPayUrl(rawUrl);
    expect(parsed.recipient).toBe(recipient);
    expect(parsed.amount).toBe("15.00");
    expect(parsed.splToken).toBe(SOLANA_USDC_MAINNET.toBase58());
    expect(parsed.memo).toBe("Invoice-101");
  });

  it("should generate a valid ephemeral reference keypair for payment tracking", () => {
    const { referencePublicKey, referenceKeypair } = generateSolanaPayReference();

    expect(referencePublicKey).toBeDefined();
    expect(referenceKeypair.publicKey.toBase58()).toBe(referencePublicKey);
    expect(referencePublicKey.length).toBeGreaterThan(32);
  });
});
