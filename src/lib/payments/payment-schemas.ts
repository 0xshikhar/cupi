import { z } from "zod";

import { walletAddressSchema } from "@/lib/validation";

export const paymentTokenSchema = z.enum(["ETH", "USDC"]);

export const paymentAmountSchema = z
  .union([z.string(), z.number()])
  .transform((value) => (typeof value === "number" ? value.toString() : value))
  .refine((value) => Number(value) > 0, {
    message: "Amount must be greater than 0",
  });

export const paymentSendSchema = z.object({
  senderWalletAddress: walletAddressSchema,
  receiverIdentifier: z.string().min(1, "Recipient is required"),
  amount: paymentAmountSchema,
  token: paymentTokenSchema,
  paymentLinkId: z.string().uuid().optional(),
  paymentLinkSlug: z.string().min(1).optional(),
  txHash: z.string().optional(),
});

export const paymentLinkCreateSchema = z.object({
  creatorWalletAddress: walletAddressSchema,
  amount: paymentAmountSchema,
  tokenSymbol: paymentTokenSchema,
  description: z.string().max(500).optional(),
  claimKeyHash: z.string().optional(),
  expiresInMinutes: z.number().int().min(5).max(60 * 24 * 30).optional(),
  maxUses: z.number().int().min(1).max(100).optional(),
  chainId: z.number().int().optional(),
});

export const paymentLinkClaimSchema = z.object({
  slug: z.string().min(1),
  senderWalletAddress: walletAddressSchema.optional(),
  recipientAddress: walletAddressSchema.optional(),
  claimKeyHash: z.string().optional(),
  signature: z.string().optional(),
  txHash: z.string().optional(),
});

export type PaymentSendInput = z.infer<typeof paymentSendSchema>;
export type PaymentLinkCreateInput = z.infer<typeof paymentLinkCreateSchema>;
export type PaymentLinkClaimInput = z.infer<typeof paymentLinkClaimSchema>;
