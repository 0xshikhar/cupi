/** @jest-environment node */
import {
  generateClaimKeyPair,
  deriveClaimKeyHash,
  signClaimPayload,
  verifyClaimSignature,
} from "../claim-crypto";

describe("Claim Cryptography", () => {
  it("should generate a valid ephemeral keypair and derive claimKeyHash", () => {
    const keyPair = generateClaimKeyPair();

    expect(keyPair.claimPrivateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(keyPair.claimAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(keyPair.claimKeyHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

    // Consistency check: deriving from private key matches derived hash
    const derivedHash = deriveClaimKeyHash(keyPair.claimPrivateKey);
    expect(derivedHash).toBe(keyPair.claimKeyHash);
  });

  it("should sign and verify claim signature successfully", async () => {
    const keyPair = generateClaimKeyPair();
    const recipient = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

    const signature = await signClaimPayload({
      claimPrivateKey: keyPair.claimPrivateKey,
      claimKeyHash: keyPair.claimKeyHash,
      recipientAddress: recipient,
    });

    expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);

    const verification = await verifyClaimSignature({
      claimKeyHash: keyPair.claimKeyHash,
      recipientAddress: recipient,
      signature,
    });

    expect(verification.valid).toBe(true);
    expect(verification.recoveredAddress?.toLowerCase()).toBe(
      keyPair.claimAddress.toLowerCase()
    );
  });

  it("should reject an invalid claim signature or wrong recipient", async () => {
    const keyPair = generateClaimKeyPair();
    const recipient = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    const wrongRecipient = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

    const signature = await signClaimPayload({
      claimPrivateKey: keyPair.claimPrivateKey,
      claimKeyHash: keyPair.claimKeyHash,
      recipientAddress: recipient,
    });

    const verification = await verifyClaimSignature({
      claimKeyHash: keyPair.claimKeyHash,
      recipientAddress: wrongRecipient,
      signature,
    });

    expect(verification.valid).toBe(false);
  });
});
