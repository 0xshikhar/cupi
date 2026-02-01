import { Address, isAddress } from "viem";
import { prisma } from "@/lib/prisma";

export const DEFAULT_DAILY_SPEND_CAP_USD = 50.0;

/**
 * Whitelisted verified smart contracts permitted for autonomous agent operations.
 * Operations directed to unlisted addresses are rejected.
 */
export const WHITELISTED_PROTOCOL_CONTRACTS: Record<string, string> = {
  // Base Mainnet & Base Sepolia
  "0x2626664c2603336E57B271c5C0b26F421741e481": "Uniswap V3 SwapRouter02 (Base)",
  "0x33128a8fC17869897dcE68Ed026d694621f6FDfD": "Uniswap V3 Factory (Base)",
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913": "USDC (Base)",
  "0x4200000000000000000000000000000000000006": "WETH (Base / Sepolia Predeploy)",
  "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb": "Morpho Blue Protocol (Base)",
  "0xfA48548Ab4F5A8B715C8ef5D0219602A95886F58": "Moonwell Comptroller (Base)",

  // Base Sepolia (Testnet)
  "0x94cC0AaC535CCDB3C01d6787d6413C739ae12bc4": "Uniswap V3 SwapRouter02 (Base Sepolia)",
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e": "USDC (Base Sepolia)",
  "0x7B9C17E1A7Ec19d453A23BEbE945e43A9A65D66F": "Morpho Blue (Base Sepolia)",
};

/**
 * Normalizes an address to lowercase for uniform comparison.
 */
function normalizeAddress(addr: string): string {
  return addr.trim().toLowerCase();
}

/**
 * Checks if a target address is on the approved DeFi protocol whitelist.
 */
export function isContractWhitelisted(targetAddress: string): boolean {
  if (!targetAddress || !isAddress(targetAddress)) return false;
  const target = normalizeAddress(targetAddress);
  return Object.keys(WHITELISTED_PROTOCOL_CONTRACTS).some(
    (approved) => normalizeAddress(approved) === target
  );
}

/**
 * Calculates the total USD value spent by an agent for a user in the last 24 hours.
 */
export async function getSpentLast24Hours(userAddress: string): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const user = await prisma.user.findFirst({
      where: {
        walletAddress: {
          equals: userAddress,
          mode: "insensitive",
        },
      },
    });

    if (!user) return 0;

    // Fetch payments sent via autonomous actions in the last 24h
    const payments = await prisma.payment.findMany({
      where: {
        senderId: user.id,
        createdAt: { gte: cutoff },
      },
      select: { amount: true, tokenSymbol: true },
    });

    // Approximate USD calculation: USDC is 1:1, ETH fallback
    let totalUsd = 0;
    for (const p of payments) {
      const num = parseFloat(p.amount.toString());
      if (p.tokenSymbol === "USDC") {
        totalUsd += num;
      } else {
        // Approximate ETH at $3,000 for guardrail ceiling safety
        totalUsd += num * 3000;
      }
    }

    return parseFloat(totalUsd.toFixed(2));
  } catch (err) {
    console.warn("[SPEND GUARD] Error querying 24h spend history:", err);
    return 0;
  }
}

export interface SpendPolicyVerification {
  allowed: boolean;
  reason?: string;
  dailyCapUsd: number;
  spentLast24hUsd: number;
  remainingAllowanceUsd: number;
}

/**
 * Verifies that a proposed agent transaction complies with both:
 * 1. The target contract whitelist rule
 * 2. The user's rolling 24-hour spend cap
 */
export async function verifyAgentSpendPolicy(params: {
  userAddress: string;
  amountUsd: number;
  targetAddress: string;
  customDailyCap?: number;
}): Promise<SpendPolicyVerification> {
  const dailyCap = params.customDailyCap ?? DEFAULT_DAILY_SPEND_CAP_USD;

  // 1. Check destination whitelist
  if (!isContractWhitelisted(params.targetAddress)) {
    const spent = await getSpentLast24Hours(params.userAddress);
    return {
      allowed: false,
      reason: `Destination contract (${params.targetAddress}) is not on the verified protocol whitelist.`,
      dailyCapUsd: dailyCap,
      spentLast24hUsd: spent,
      remainingAllowanceUsd: Math.max(0, dailyCap - spent),
    };
  }

  // 2. Check 24-hour cumulative spend cap
  const spent = await getSpentLast24Hours(params.userAddress);
  const remaining = Math.max(0, dailyCap - spent);

  if (params.amountUsd > remaining) {
    return {
      allowed: false,
      reason: `Transaction of $${params.amountUsd.toFixed(
        2
      )} exceeds remaining daily spend allowance ($${remaining.toFixed(
        2
      )} remaining of $${dailyCap.toFixed(2)} cap).`,
      dailyCapUsd: dailyCap,
      spentLast24hUsd: spent,
      remainingAllowanceUsd: remaining,
    };
  }

  return {
    allowed: true,
    dailyCapUsd: dailyCap,
    spentLast24hUsd: spent,
    remainingAllowanceUsd: remaining - params.amountUsd,
  };
}

/**
 * Retrieves the live spend status for display in user settings and agent dashboards.
 */
export async function getAgentSpendStatus(
  userAddress: string,
  customDailyCap?: number
): Promise<{
  dailyCapUsd: number;
  spentLast24hUsd: number;
  remainingUsd: number;
  whitelistedCount: number;
}> {
  const dailyCap = customDailyCap ?? DEFAULT_DAILY_SPEND_CAP_USD;
  const spent = await getSpentLast24Hours(userAddress);
  const remaining = Math.max(0, parseFloat((dailyCap - spent).toFixed(2)));

  return {
    dailyCapUsd: dailyCap,
    spentLast24hUsd: spent,
    remainingUsd: remaining,
    whitelistedCount: Object.keys(WHITELISTED_PROTOCOL_CONTRACTS).length,
  };
}
