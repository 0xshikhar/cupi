/**
 * Canonical wallet-address form for storage and identity comparisons.
 *
 * EVM hex addresses are case-insensitive (EIP-55 checksum casing is display
 * metadata, not identity) — normalize them to lowercase so @unique constraints
 * and equality checks treat "0xAbC..." and "0xabc..." as the same wallet.
 *
 * Solana base58 addresses ARE case-sensitive — return them unchanged.
 */
export function canonicalWalletAddress(address: string): string {
  const trimmed = address.trim();
  return trimmed.startsWith("0x") ? trimmed.toLowerCase() : trimmed;
}
