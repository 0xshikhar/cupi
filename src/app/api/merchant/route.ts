import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createMerchant } from "@/lib/merchant/merchant-service";
import { extractMerchantKeyFromRequest, validateMerchantApiKey } from "@/lib/merchant/auth";

export const dynamic = "force-dynamic";

const onboardMerchantSchema = z.object({
  name: z.string().min(2, "Merchant name is required"),
  email: z.string().email().optional(),
  webhookUrl: z.string().url().optional(),
  settlementAddress: z.string().optional(),
  userId: z.string().optional(),
});

/**
 * POST /api/merchant
 * Onboard a new merchant into cUPI Institutional Payments.
 * Returns the Merchant entity, initial Secret API Key (shown only once), and Webhook Secret.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = onboardMerchantSchema.parse(body);

    const result = await createMerchant({
      name: input.name,
      email: input.email,
      webhookUrl: input.webhookUrl,
      settlementAddress: input.settlementAddress,
      userId: input.userId,
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
}

/**
 * GET /api/merchant
 * Retrieves current merchant profile authenticated via X-Merchant-Key.
 */
export async function GET(request: Request) {
  try {
    const rawKey = extractMerchantKeyFromRequest(request);
    if (!rawKey) {
      return NextResponse.json({ error: "X-Merchant-Key header required" }, { status: 401 });
    }

    const auth = await validateMerchantApiKey(rawKey);
    if (!auth) {
      return NextResponse.json({ error: "Invalid or inactive API key" }, { status: 401 });
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
 * Updates merchant settings (webhookUrl, settlementAddress, name).
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { merchantId, webhookUrl, settlementAddress, name } = body;

    if (!merchantId) {
      return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
    }

    const updated = await prisma.merchant.update({
      where: { id: merchantId },
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

