/** @jest-environment node */
import { parseUnits } from "viem";
import {
  generateClaimKeyPair,
  deriveClaimKeyHash,
  signClaimPayload,
  verifyClaimSignature,
} from "../../escrow/claim-crypto";
import {
  encodeDepositCalldata,
  encodeClaimCalldata,
  encodeRefundCalldata,
} from "../escrow-vault";

describe("End-to-End Escrow Payment Lifecycle", () => {
  const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const RECIPIENT_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const AMOUNT_USDC = parseUnits("25.5", 6); // 25.50 USDC
  const ONE_WEEK_EXPIRY = BigInt(Math.floor(Date.now() / 1000) + 7 * 86400);

  it("should complete a full deposit -> sign -> claim calldata lifecycle", async () => {
    // 1. Sender initiates link: Ephemeral claim key generated client-side
    const keyPair = generateClaimKeyPair();
    expect(keyPair.claimKeyHash).toBeDefined();

    // 2. Sender prepares deposit calldata into CupiEscrowVault
    const depositCalldata = encodeDepositCalldata({
      claimKeyHash: keyPair.claimKeyHash,
      token: USDC_ADDRESS,
      amount: AMOUNT_USDC,
      expiryTimestamp: ONE_WEEK_EXPIRY,
    });
    expect(depositCalldata.startsWith("0x")).toBe(true);

    // 3. Recipient opens link with #key=... and generates ECDSA claim signature
    const signature = await signClaimPayload({
      claimPrivateKey: keyPair.claimPrivateKey,
      claimKeyHash: keyPair.claimKeyHash,
      recipientAddress: RECIPIENT_ADDRESS,
    });
    expect(signature).toBeDefined();

    // 4. Verifies signature against derived claim key hash
    const verification = await verifyClaimSignature({
      claimKeyHash: keyPair.claimKeyHash,
      recipientAddress: RECIPIENT_ADDRESS,
      signature,
    });
    expect(verification.valid).toBe(true);
    expect(verification.recoveredAddress?.toLowerCase()).toBe(
      keyPair.claimAddress.toLowerCase()
    );

    // 5. Escrow relayer encodes claim execution calldata
    const claimCalldata = encodeClaimCalldata({
      claimKeyHash: keyPair.claimKeyHash,
      recipient: RECIPIENT_ADDRESS,
      signature,
    });
    expect(claimCalldata.startsWith("0x")).toBe(true);
  });

  it("should generate valid refund calldata for expired escrow links", () => {
    const keyPair = generateClaimKeyPair();
    const refundCalldata = encodeRefundCalldata({
      claimKeyHash: keyPair.claimKeyHash,
    });
    expect(refundCalldata.startsWith("0x")).toBe(true);
  });
});
