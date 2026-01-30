import { Address, encodeFunctionData, parseAbi } from "viem";
import { DEFAULT_CHAIN } from "@/config/chains";

export const CUPI_ESCROW_VAULT_ABI = parseAbi([
  "event Deposited(bytes32 indexed claimKeyHash, address indexed sender, address token, uint256 amount, uint256 expiresAt)",
  "event Claimed(bytes32 indexed claimKeyHash, address indexed recipient, uint256 amount)",
  "event Refunded(bytes32 indexed claimKeyHash, address indexed sender, uint256 amount)",
  "function deposit(bytes32 claimKeyHash, address token, uint256 amount, uint256 validForSeconds) external",
  "function claim(bytes32 claimKeyHash, address recipient, bytes calldata signature) external",
  "function refund(bytes32 claimKeyHash) external",
  "function deposits(bytes32) external view returns (address sender, address token, uint256 amount, uint256 expiresAt, bool claimed)",
]);

/**
 * Escrow Vault Contract addresses per supported network.
 */
export const ESCROW_VAULT_ADDRESSES: Record<number, Address> = {
  // Base Mainnet
  8453: "0x3bE525140e6E42B3f8e5c544321A858e77aC9001",
  // Arbitrum One
  42161: "0x3bE525140e6E42B3f8e5c544321A858e77aC9002",
  // Base Sepolia (Testnet)
  84532: "0x3bE525140e6E42B3f8e5c544321A858e77aC9003",
};

export function getEscrowVaultAddress(chainId: number = DEFAULT_CHAIN.id): Address {
  return (
    ESCROW_VAULT_ADDRESSES[chainId] ||
    ESCROW_VAULT_ADDRESSES[DEFAULT_CHAIN.id] ||
    "0x0000000000000000000000000000000000000000"
  );
}

/**
 * Encodes calldata for depositing into CupiEscrowVault.
 */
export function encodeEscrowDepositCalldata(params: {
  claimKeyHash: `0x${string}`;
  tokenAddress: Address;
  amount: bigint;
  validForSeconds: bigint;
}): `0x${string}` {
  return encodeFunctionData({
    abi: CUPI_ESCROW_VAULT_ABI,
    functionName: "deposit",
    args: [
      params.claimKeyHash,
      params.tokenAddress,
      params.amount,
      params.validForSeconds,
    ],
  });
}

/**
 * Encodes calldata for claiming from CupiEscrowVault.
 */
export function encodeEscrowClaimCalldata(params: {
  claimKeyHash: `0x${string}`;
  recipientAddress: Address;
  signature: `0x${string}`;
}): `0x${string}` {
  return encodeFunctionData({
    abi: CUPI_ESCROW_VAULT_ABI,
    functionName: "claim",
    args: [
      params.claimKeyHash,
      params.recipientAddress,
      params.signature,
    ],
  });
}

/**
 * Encodes calldata for refunding expired deposit from CupiEscrowVault.
 */
export function encodeEscrowRefundCalldata(params: {
  claimKeyHash: `0x${string}`;
}): `0x${string}` {
  return encodeFunctionData({
    abi: CUPI_ESCROW_VAULT_ABI,
    functionName: "refund",
    args: [params.claimKeyHash],
  });
}
