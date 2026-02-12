import { prisma } from "@/lib/prisma";
import { privy } from "@/modules/auth/server/privy";
import { canonicalWalletAddress } from "@/lib/address";

const ADJECTIVES = ["cool", "happy", "swift", "bright", "smart", "quick", "lucky", "bold"];
const NOUNS = ["panda", "tiger", "eagle", "wolf", "fox", "bear", "lion", "hawk"];

const generateRandomUsername = () =>
  `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]}` +
  `${NOUNS[Math.floor(Math.random() * NOUNS.length)]}` +
  `${Math.floor(Math.random() * 9999)}`;

/**
 * Provisions (or returns) the cUPI User for a verified Privy DID.
 * The wallet address is resolved from Privy's own user record — never from
 * client input — so the stored wallet is always the account's real embedded wallet.
 */
export async function provisionUser(privyUserId: string) {
  const privyUser = await privy.getUser(privyUserId);
  const embedded = privyUser.linkedAccounts.find(
    (a: any) => a.type === "wallet" && a.walletClientType === "privy"
  ) as { address?: string } | undefined;
  const walletAddress = privyUser.wallet?.address ?? embedded?.address;

  if (!walletAddress) {
    throw new Error("No embedded wallet found on this Privy account");
  }

  return prisma.user.upsert({
    where: { privyUserId },
    update: {
      // Keep the DB wallet aligned with Privy's embedded wallet
      walletAddress: canonicalWalletAddress(walletAddress),
    },
    create: {
      privyUserId,
      walletAddress: canonicalWalletAddress(walletAddress),
      username: generateRandomUsername(),
      notifications: {
        create: [
          {
            title: "Welcome to cUPI",
            message: "Your account has been successfully created.",
            type: "ACCOUNT_CREATION",
            status: "unread",
          },
        ],
      },
    },
  });
}
