import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createMerchant } from "@/lib/merchant/merchant-service";
import { resolveMerchantAuth } from "@/lib/merchant/auth";
import { assertSafeWebhookUrl } from "@/lib/net/ssrf";
import { provisionUser } from "@/lib/users/provision-user";
import { withAuth } from "@/modules/auth/server/with-auth";

export const dynamic = "force-dynamic";

const onboardMerchantSchema = z.object({
  name: z.string().min(2, "Merchant name is required"),
  email: z.string().email().optional(),
  webhookUrl: z.string().url().optional(),
  settlementAddress: z.string().optional(),
});

/**
 * POST /api/merchant
 * Onboard a new merchant into cUPI Institutional Payments.
 * Requires a Privy session — the merchant is owned by the calling user and is
 * bound to them for portal access. One merchant account per user.
 * Returns the Merchant entity, initial Secret API Key (shown only once), and Webhook Secret.
 */
export const POST = withAuth(async (request: NextRequest, { auth }) => {
  try {
    const body = await request.json();
    const input = onboardMerchantSchema.parse(body);

    // Provision the user row if this session hasn't hit /api/auth/user yet
    const user = auth.user ?? (await provisionUser(auth.userId));

    // One merchant account per user — matches how the portal resolves ownership
    const existing = await prisma.merchant.findFirst({ where: { userId: user.id } });
    if (existing) {
      return NextResponse.json(
        {
          error: "Merchant account already exists for this user",
          merchant: { id: existing.id, name: existing.name, status: existing.status },
        },
        { status: 409 }
      );
    }

    if (input.webhookUrl) {
      try {
        await assertSafeWebhookUrl(input.webhookUrl);
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Invalid webhook URL" },
          { status: 400 }
        );
      }
    }

    const result = await createMerchant({
      name: input.name,
      email: input.email,
      webhookUrl: input.webhookUrl,
      settlementAddress: input.settlementAddress,
      userId: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        merchant: {
          id: result.merchant.id,
          name: result.merchant.name,
          email: result.merchant.email,
          webhookUrl: result.merchant.webhookUrl,
          settlementAddress: result.merchant.settlementAddress,
          status: result.merchant.status,
          createdAt: result.merchant.createdAt,
        },
        credentials: {
          apiKey: result.apiKey, // Shown only once
          webhookSecret: result.webhookSecret,
          keyPrefix: result.merchant.apiKeys[0]?.keyPrefix,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[MERCHANT ONBOARD] Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to onboard merchant" },
      { status: 500 }
    );
  }
});

/**
 * GET /api/merchant
 * Retrieves current merchant profile authenticated via X-Merchant-Key.
 */
export async function GET(request: Request) {
  try {
    const auth = await resolveMerchantAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (auth.kind === "user") {
      return NextResponse.json({ error: "No merchant account for this user" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      merchant: {
        id: auth.merchant.id,
        name: auth.merchant.name,
        email: auth.merchant.email,
        webhookUrl: auth.merchant.webhookUrl,
        settlementAddress: auth.merchant.settlementAddress,
        status: auth.merchant.status,
        createdAt: auth.merchant.createdAt,
      },
    });
  } catch (error) {
    console.error("[MERCHANT GET] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve merchant" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/merchant
 * Updates merchant settings (webhookUrl, settlementAddress, name) for the
 * authenticated merchant (X-Merchant-Key or owning-user session).
 */
export async function PATCH(request: Request) {
  try {
    const auth = await resolveMerchantAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (auth.kind === "user") {
      return NextResponse.json({ error: "No merchant account for this user" }, { status: 404 });
    }

    const body = await request.json();
    const { webhookUrl, settlementAddress, name } = body;

    if (webhookUrl !== undefined && webhookUrl !== null && webhookUrl !== "") {
      try {
        await assertSafeWebhookUrl(webhookUrl);
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Invalid webhook URL" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.merchant.update({
      where: { id: auth.merchant.id },
      data: {
        ...(webhookUrl !== undefined && { webhookUrl }),
        ...(settlementAddress !== undefined && { settlementAddress }),
        ...(name !== undefined && { name }),
      },
    });

    return NextResponse.json({
      success: true,
      merchant: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        webhookUrl: updated.webhookUrl,
        settlementAddress: updated.settlementAddress,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error("[MERCHANT PATCH] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update merchant" },
      { status: 500 }
    );
  }
}

