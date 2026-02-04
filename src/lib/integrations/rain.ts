import crypto from "crypto";

export interface RainCardIssueParams {
  userId: string;
  userWalletAddress: string;
  cardholderName: string;
  spendingLimitMonthlyUsd: number;
}

export interface RainVirtualCard {
  id: string;
  cardholderName: string;
  lastFour: string;
  expMonth: string;
  expYear: string;
  status: "active" | "frozen" | "closed";
  spendingLimitMonthlyUsd: number;
  currentSpendUsd: number;
  walletAddress: string;
  createdAt: string;
}

export interface RainAuthRequest {
  transactionId: string;
  cardId: string;
  amountUsd: number;
  merchantName: string;
  merchantMcc: string;
}

/**
 * Rain Cards Integration Service
 * Powers virtual cards backed by self-custodial stablecoin balances.
 */
export class RainCardsService {
  private static apiKey = process.env.RAIN_API_KEY || "mock_rain_key";
  private static webhookSecret = process.env.RAIN_WEBHOOK_SECRET || "mock_rain_secret";

  /**
   * Issues an instant virtual Visa/Mastercard linked to user's stablecoin smart account.
   */
  static async issueVirtualCard(params: RainCardIssueParams): Promise<RainVirtualCard> {
    const cardId = `card_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const now = new Date();
    const expYear = String(now.getFullYear() + 3);
    const expMonth = String(now.getMonth() + 1).padStart(2, "0");

    return {
      id: cardId,
      cardholderName: params.cardholderName,
      lastFour: `${Math.floor(1000 + Math.random() * 9000)}`,
      expMonth,
      expYear,
      status: "active",
      spendingLimitMonthlyUsd: params.spendingLimitMonthlyUsd,
      currentSpendUsd: 0,
      walletAddress: params.userWalletAddress,
      createdAt: now.toISOString(),
    };
  }

  /**
   * Real-time authorization decision engine for incoming card swipes.
   * Evaluates user balance and guardrails before approving charge.
   */
  static evaluateAuthorization(
    auth: RainAuthRequest,
    userUsdcBalance: number,
    currentMonthlySpend: number,
    monthlyLimit: number
  ): { approved: boolean; reason?: string } {
    if (auth.amountUsd > userUsdcBalance) {
      return { approved: false, reason: "INSUFFICIENT_FUNDS" };
    }

    if (currentMonthlySpend + auth.amountUsd > monthlyLimit) {
      return { approved: false, reason: "MONTHLY_SPEND_LIMIT_EXCEEDED" };
    }

    return { approved: true };
  }

  /**
   * Cryptographically verifies Rain webhook signatures.
   */
  static verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    if (!signature || !this.webhookSecret) return false;
    try {
      const hmac = crypto.createHmac("sha256", this.webhookSecret);
      const digest = hmac.update(rawBody).digest("hex");
      return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
    } catch {
      return false;
    }
  }
}
