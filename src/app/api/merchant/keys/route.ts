import { NextResponse } from "next/server";
import { z } from "zod";
import { createApiKeyForMerchant } from "@/lib/merchant/merchant-service";
import { extractMerchantKeyFromRequest, validateMerchantApiKey } from "@/lib/merchant/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createKeySchema = z.object({
  merchantId: z.string().optional(),
  name: z.string().min(1).default("Secondary Secret Key"),
});

/**
 * POST /api/merchant/keys
 * Issues a new API key for the authenticated merchant.
 */
export async function POST(request: Request) {
  try {
    const rawKey = extractMerchantKeyFromRequest(request);
    const body = await request.json().catch(() => ({}));
    const input = createKeySchema.parse(body);

    let targetMerchantId: string | null = null;

    if (rawKey) {
      const auth = await validateMerchantApiKey(rawKey);
      if (!auth) {
        return NextResponse.json({ error: "Invalid or inactive API key" }, { status: 401 });
      }
      targetMerchantId = auth.merchant.id;
    } else if (input.merchantId) {
      const merchant = await prisma.merchant.findUnique({
        where: { id: input.merchantId },
      });
      if (!merchant) {
        return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
      }
      targetMerchantId = merchant.id;
    } else {
      return NextResponse.json(
        { error: "Authentication required: Provide X-Merchant-Key or merchantId" },
        { status: 401 }
      );
    }

    const { apiKeyRecord, rawKey: newRawKey } = await createApiKeyForMerchant(
      targetMerchantId,
      input.name
    );

    return NextResponse.json(
      {
        success: true,
        key: {
          id: apiKeyRecord.id,
          name: apiKeyRecord.name,
          keyPrefix: apiKeyRecord.keyPrefix,
          createdAt: apiKeyRecord.createdAt,
          apiKey: newRawKey, // Shown only once
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[MERCHANT KEYS] POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create API key" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/merchant/keys
 * Lists all active API keys for the authenticated merchant (without exposing the raw secret).
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

    const keys = await prisma.merchantApiKey.findMany({
      where: { merchantId: auth.merchant.id },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      keys,
    });
  } catch (error) {
    console.error("[MERCHANT KEYS] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve API keys" },
      { status: 500 }
    );
  }
}
