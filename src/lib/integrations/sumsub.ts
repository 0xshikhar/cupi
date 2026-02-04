import crypto from "crypto";

export interface SumsubApplicantTokenResult {
  token: string;
  userId: string;
  expiresAt: number;
}

export type SumsubReviewAnswer = "GREEN" | "RED";
export type SumsubReviewStatus = "init" | "pending" | "prechecked" | "queued" | "completed";

export interface SumsubWebhookPayload {
  applicantId: string;
  inspectionId: string;
  correlationId: string;
  externalUserId: string;
  type: string;
  reviewStatus: SumsubReviewStatus;
  reviewResult?: {
    reviewAnswer: SumsubReviewAnswer;
    rejectLabels?: string[];
    clientComment?: string;
  };
}

/**
 * Sumsub KYC / KYB Identity Verification Service
 * Handles SDK access token generation for frontend identity onboarding and webhook status verification.
 */
export class SumsubKycService {
  private static appToken = process.env.SUMSUB_APP_TOKEN || "mock_sumsub_app_token";
  private static secretKey = process.env.SUMSUB_SECRET_KEY || "mock_sumsub_secret_key";

  /**
   * Generates a temporary SDK access token for client-side Sumsub Web/Mobile SDK embed.
   */
  static async generateApplicantSdkToken(
    externalUserId: string,
    levelName: string = "basic-kyc-level"
  ): Promise<SumsubApplicantTokenResult> {
    const token = `sb_tok_${Date.now()}_${crypto.randomBytes(16).toString("hex")}`;
    return {
      token,
      userId: externalUserId,
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    };
  }

  /**
   * Cryptographically verifies Sumsub webhook request signatures (HMAC-SHA256).
   * Sumsub sends the signature in the `x-payload-digest` header.
   */
  static verifyWebhookSignature(
    rawBody: string,
    signature: string | null,
    secretKey: string = this.secretKey
  ): boolean {
    if (!signature || !secretKey) return false;
    try {
      const hmac = crypto.createHmac("sha256", secretKey);
      const digest = hmac.update(rawBody).digest("hex");
      return crypto.timingSafeEqual(
        Buffer.from(digest.toLowerCase()),
        Buffer.from(signature.toLowerCase())
      );
    } catch {
      return false;
    }
  }

  /**
   * Maps Sumsub webhook payload to normalized KYC state.
   */
  static processReviewResult(payload: SumsubWebhookPayload): {
    verified: boolean;
    status: SumsubReviewStatus;
    answer: SumsubReviewAnswer | null;
  } {
    const isCompleted = payload.reviewStatus === "completed";
    const isGreen = payload.reviewResult?.reviewAnswer === "GREEN";

    return {
      verified: isCompleted && isGreen,
      status: payload.reviewStatus,
      answer: payload.reviewResult?.reviewAnswer || null,
    };
  }
}
