export type CheckoutSessionStatus =
  | "PENDING"
  | "PAID"
  | "EXPIRED"
  | "FAILED"
  | "REFUNDED";

export type SupportedCurrency = "USDC" | "EURC" | "SOL";
export type SupportedNetwork = "solana" | "base" | "arbitrum";

export interface CreateCheckoutSessionInput {
  merchantId: string;
  orderId: string;
  amount: string;
  currency?: SupportedCurrency;
  network?: SupportedNetwork;
  description?: string;
  callbackUrl: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, unknown>;
  expiresInMinutes?: number;
}

export interface CheckoutSessionDTO {
  id: string;
  merchantId: string;
  orderId: string;
  amount: string;
  currency: string;
  network: string;
  description: string | null;
  status: CheckoutSessionStatus;
  checkoutUrl: string;
  callbackUrl: string;
  successUrl: string | null;
  cancelUrl: string | null;
  txHash: string | null;
  payerAddress: string | null;
  paidAt: string | null;
  expiresAt: string;
  createdAt: string;
  /** Payer-facing fields, only populated on the public session lookup. */
  merchantName?: string;
  paymentInstructions?: CheckoutPaymentInstructions;
}

export type CheckoutPaymentInstructions =
  | {
      network: "solana";
      cluster: "mainnet-beta" | "devnet";
      recipient: string;
      token: "USDC";
      tokenAddress: string;
      amount: string;
      reference: string;
      solanaPayUrl: string;
    }
  | {
      network: "base";
      chainId: number;
      recipient: string;
      token: "USDC";
      tokenAddress: string;
      amount: string;
    };

export type WebhookEvent =
  | "checkout.session.created"
  | "checkout.session.completed"
  | "checkout.session.expired"
  | "checkout.session.failed";

export interface WebhookPayload<T = unknown> {
  id: string;
  event: WebhookEvent;
  apiVersion: string;
  createdAt: string;
  data: T;
}

export interface WebhookDeliveryResult {
  success: boolean;
  attempts: number;
  lastStatusCode?: number;
  lastErrorMessage?: string;
  deliveredAt?: Date;
}
