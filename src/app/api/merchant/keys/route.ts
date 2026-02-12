import { NextResponse } from "next/server";
import { z } from "zod";
import { createApiKeyForMerchant } from "@/lib/merchant/merchant-service";
import { resolveMerchantAuth } from "@/lib/merchant/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createKeySchema = z.object({
  name: z.string().min(1).default("Secondary Secret Key"),
});

/**
 * POST /api/merchant/keys
 * Issues a new API key for the authenticated merchant
 * (X-Merchant-Key or owning-user session).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const input = createKeySchema.parse(body);

    const auth = await resolveMerchantAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (auth.kind === "user") {
      return NextResponse.json({ error: "No merchant account for this user" }, { status: 404 });
    }
    const targetMerchantId = auth.merchant.id;

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
    const auth = await resolveMerchantAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (auth.kind === "user") {
      return NextResponse.json({ error: "No merchant account for this user" }, { status: 404 });
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
