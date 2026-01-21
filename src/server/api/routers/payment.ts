import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import {
  claimPaymentLink,
  createPaymentLink,
  getPaymentLinkBySlug,
} from "@/lib/payments/payment-service";
import {
  paymentLinkClaimSchema,
  paymentLinkCreateSchema,
} from "@/lib/payments/payment-schemas";

export const paymentRouter = createTRPCRouter({
  createLink: protectedProcedure
    .input(
      paymentLinkCreateSchema.extend({
        baseUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await createPaymentLink(input, {
        baseUrl: input.baseUrl,
      });

      return result;
    }),

  getLink: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      const link = await getPaymentLinkBySlug(input.slug);

      if (!link) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
      }

      return link;
    }),

  claimLink: protectedProcedure
    .input(paymentLinkClaimSchema)
    .mutation(async ({ input }) => {
      const result = await claimPaymentLink(input);
      return {
        success: true,
        amount: result.payment.amount,
        txHash: result.txHash,
        paymentLink: result.paymentLink,
      };
    }),
});
