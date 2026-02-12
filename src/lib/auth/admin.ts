/**
 * Admin authorization: the caller's DB identity must be listed in the
 * ADMIN_WALLET_ADDRESSES / ADMIN_USER_IDS env allowlists. Fails closed when
 * neither is configured — generic authentication is not admin authorization.
 */
export function isAdmin(user: { id: string; walletAddress: string }): boolean {
  const wallets = (process.env.ADMIN_WALLET_ADDRESSES || "")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
  const userIds = (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

  if (wallets.length === 0 && userIds.length === 0) return false;
  return wallets.includes(user.walletAddress.toLowerCase()) || userIds.includes(user.id);
}
