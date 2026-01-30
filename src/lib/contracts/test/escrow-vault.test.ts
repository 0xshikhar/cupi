/** @jest-environment node */
import {
  encodeEscrowDepositCalldata,
  encodeEscrowClaimCalldata,
  encodeEscrowRefundCalldata,
  getEscrowVaultAddress,
} from "../escrow-vault";

describe("Escrow Vault Contract Bindings", () => {
  it("should resolve vault addresses per chain", () => {
    const baseAddress = getEscrowVaultAddress(8453);
    expect(baseAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);

    const sepoliaAddress = getEscrowVaultAddress(84532);
    expect(sepoliaAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("should encode deposit calldata correctly", () => {
    const calldata = encodeEscrowDepositCalldata({
      claimKeyHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
      tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      amount: BigInt(50000000), // 50 USDC
      validForSeconds: BigInt(86400), // 1 day
    });

    expect(calldata).toMatch(/^0x[a-fA-F0-9]+$/);
    expect(calldata.length).toBeGreaterThan(10);
  });

  it("should encode claim calldata correctly", () => {
    const calldata = encodeEscrowClaimCalldata({
      claimKeyHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
      recipientAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      signature: ("0x" + "00".repeat(65)) as `0x${string}`,
    });

    expect(calldata).toMatch(/^0x[a-fA-F0-9]+$/);
  });

  it("should encode refund calldata correctly", () => {
    const calldata = encodeEscrowRefundCalldata({
      claimKeyHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
    });

    expect(calldata).toMatch(/^0x[a-fA-F0-9]+$/);
  });
});
