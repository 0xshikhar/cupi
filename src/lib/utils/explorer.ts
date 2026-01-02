/**
 * Returns the correct block explorer transaction URL for a given chain.
 *
 * Supports common networks; defaults to Etherscan mainnet if unknown.
 */
export function getTxExplorerUrl(
  txHash: string,
  chainId?: number
): string {
  const base = getExplorerBaseUrl(chainId);
  return `${base}/tx/${txHash}`;
}

/**
 * Returns the explorer base URL (no trailing slash at end) for a given chain ID.
 */
export function getExplorerBaseUrl(chainId?: number): string {
  switch (chainId) {
    case 1: // Ethereum Mainnet
      return "https://etherscan.io";
    case 11155111: // Ethereum Sepolia
      return "https://sepolia.etherscan.io";
    case 10: // Optimism
      return "https://optimistic.etherscan.io";
    case 42161: // Arbitrum One
      return "https://arbiscan.io";
    case 137: // Polygon
      return "https://polygonscan.com";
    case 8453: // Base Mainnet
      return "https://basescan.org";
    case 84532: // Base Sepolia
      return "https://sepolia.basescan.org";
    default:
      return "https://etherscan.io";
  }
}


