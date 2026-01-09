import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const paymentRouter = createTRPCRouter({
    // Create a new payment link
    createLink: protectedProcedure
        .input(z.object({
            amount: z.number().positive(),
            description: z.string().optional(),
            tokenAddress: z.string().default("0x...USDC"), // TODO: Real token address
            tokenSymbol: z.string().default("USDC"),
            chainId: z.number().default(8453), // Base
        }))
        .mutation(async ({ ctx, input }) => {
            // 1. Generate unique slug
            const slug = Math.random().toString(36).substring(2, 10); // Simple random slug

            // 2. Create DB record
            const link = await ctx.db.paymentLink.create({
                data: {
                    creatorId: ctx.session.user.id, // Assuming session has user ID, or we fetch from user table via privyId
                    slug,
                    amount: input.amount,
                    description: input.description,
                    tokenAddress: input.tokenAddress,
                    tokenSymbol: input.tokenSymbol,
                    chainId: input.chainId,
                    status: "ACTIVE",
                    // Handle fetching user ID if ctx.session only has privyId
                    // For now assuming we solved auth context
                },
            });

            return { linkId: link.id, slug, url: `https://cupi.fun/claim/${slug}` };
        }),

    // Get link details (Public)
    getLink: publicProcedure
        .input(z.object({ slug: z.string() }))
        .query(async ({ ctx, input }) => {
            const link = await ctx.db.paymentLink.findUnique({
                where: { slug: input.slug },
                include: { creator: true },
            });

            if (!link) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
            }

            return link;
        }),

    // Claim a link
    claimLink: protectedProcedure
        .input(z.object({ slug: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const link = await ctx.db.paymentLink.findUnique({
                where: { slug: input.slug },
            });

            if (!link || link.status !== "ACTIVE") {
                throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Link invalid or expired" });
            }

            // Transaction logic here (Update DB, mark as claimed)
            // For MVP, just update status
            const updated = await ctx.db.paymentLink.update({
                where: { id: link.id },
                data: {
                    status: "DISABLED", // Or logic for multi-use
                    usedCount: { increment: 1 },
                    payments: {
                        create: {
                            receiverId: ctx.session.user.id,
                            amount: link.amount || 0,
                            tokenAddress: link.tokenAddress,
                            tokenSymbol: link.tokenSymbol,
                            chainId: link.chainId,
                            status: "CONFIRMED", // Assume instant for internal P2P
                        }
                    }
                }
            });

            return { success: true, amount: link.amount };
        }),
});
