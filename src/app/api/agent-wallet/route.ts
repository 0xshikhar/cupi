import { NextRequest, NextResponse } from "next/server";
import { AgentWalletService } from "@/lib/services/agent-wallet-service";

// Use the existing Prisma client from lib/prisma
import { prisma } from "@/lib/prisma";

/**
 * Check database connection status
 * @returns Promise<boolean> True if the connection is successful
 */
async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Test connection by running a simple query
    await prisma.$queryRaw`SELECT 1`;
    console.log("[AGENT WALLET API] Database connection successful");
    return true;
  } catch (error) {
    console.error("[AGENT WALLET API] Database connection failed:", error);
    return false;
  }
}



/**
 * GET endpoint to check if a user wallet has an associated pro agent wallet (smart wallet)
 *
 * @param request - The HTTP request containing the user wallet address
 * @returns Status of the pro agent wallet
 */
export async function GET(req: NextRequest) {
  try {
    // Validate database connection first
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      return NextResponse.json(
        {
          error: "Database connection failed",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userWalletAddress = searchParams.get("userWalletAddress");

    console.log(
      `[AGENT WALLET API] GET checking wallet for address: ${userWalletAddress}`
    );

    if (!userWalletAddress) {
      return NextResponse.json(
        {
          error: "User wallet address is required",
        },
        { status: 400 }
      );
    }

    // Check for existing pro wallet (smart wallet)
    // First check directly with prisma to debug any service issues
    const directMapping = await prisma.agentWalletMap.findUnique({
      where: { userWalletAddress },
    });

    console.log(
      "[AGENT WALLET API] Direct prisma check result:",
      directMapping
    );

    // Use Smart Wallet Primary approach to check for existing smart wallet
    if (directMapping) {
      const existingWallet = await prisma.agentWallet.findUnique({
        where: { agent_id: directMapping.agent_id },
      });

      if (existingWallet) {
        console.log(
          `[AGENT WALLET API] GET found smart wallet: ${
            existingWallet.smartWalletAddress || "Not deployed yet"
          }`
        );
        return NextResponse.json({
          hasAgentWallet: true,
          agentWalletAddress:
            existingWallet.smartWalletAddress ||
            "Will be created by SmartWalletProvider",
          smartWalletAddress: existingWallet.smartWalletAddress,
          signerAddress: existingWallet.walletPublicKey, // Signer address
          walletType: 'Smart Contract',
          debug: {
            directDatabaseCheck: true,
            mappingFound: true,
            agentId: directMapping.agent_id,
            smartWalletDeployed: !!existingWallet.smartWalletAddress,
          },
        });
      }
    }

    console.log(
      `[AGENT WALLET API] GET result: no smart wallet found for user`
    );

    return NextResponse.json({
      hasAgentWallet: false,
      agentWalletAddress: null,
      smartWalletAddress: null,
      walletType: 'Smart Contract',
      debug: {
        directDatabaseCheck: !!directMapping,
        mappingFound: !!directMapping,
        agentId: directMapping?.agent_id || null,
      },
    });
  } catch (error) {
    console.error("[AGENT WALLET API] GET Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack:
          error instanceof Error ? error.stack : "No stack trace available",
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to create a new agent wallet for a user wallet
 *
 * @param request - The HTTP request containing the user wallet address
 * @returns The new agent wallet address
 */
export async function POST(req: NextRequest) {
  console.log("[AGENT WALLET API] POST request received");
  try {
    // Validate database connection first
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      return NextResponse.json(
        {
          error: "Database connection failed",
        },
        { status: 500 }
      );
    }

    const { userWalletAddress } = await req.json();
    console.log(
      `[AGENT WALLET API] POST creating wallet for address: ${userWalletAddress}`
    );

    if (!userWalletAddress) {
      return NextResponse.json(
        {
          error: "User wallet address is required",
        },
        { status: 400 }
      );
    }

    // Handle pro wallet (smart wallet) creation
    // First check if user already has a smart wallet - direct Prisma check
    const existingMapping = await prisma.agentWalletMap.findUnique({
      where: { userWalletAddress },
    });

    if (existingMapping) {
      console.log(
        `[AGENT WALLET API] Found existing smart wallet mapping: ${existingMapping.agent_id}`
      );
      const existingWallet = await prisma.agentWallet.findUnique({
        where: { agent_id: existingMapping.agent_id },
      });

      if (existingWallet) {
        console.log(
          `[AGENT WALLET API] Found existing smart wallet: ${existingWallet.walletPublicKey}`
        );
        return NextResponse.json({
          message: "Smart wallet already exists for this user wallet",
          agentWalletAddress: existingWallet.walletPublicKey,
          walletType: 'Smart',
          debug: {
            directDbLookup: true,
            agentId: existingMapping.agent_id
          },
        });
      }
    }

    // Create new smart wallet
    console.log("[AGENT WALLET API] Creating new smart wallet...");
    let result;
    try {
      result = await AgentWalletService.getOrCreateSmartWallet(
        userWalletAddress
      );
    } catch (e) {
      // If a race caused a duplicate, fall back to fetching existing mapping/wallet
      console.warn(
        "[AGENT WALLET API] Smart wallet creation failed, attempting recovery fetch...",
        e
      );
      const mapping = await prisma.agentWalletMap.findUnique({
        where: { userWalletAddress },
      });
      if (mapping) {
        const existingWallet = await prisma.agentWallet.findUnique({
          where: { agent_id: mapping.agent_id },
        });
        if (existingWallet) {
          result = {
            smartWalletAddress: existingWallet.smartWalletAddress || undefined,
            signerPrivateKey: existingWallet.walletPrivateKey as string,
            agentId: existingWallet.agent_id,
            isNewWallet: false,
          };
        } else {
          throw e;
        }
      } else {
        throw e;
      }
    }
    console.log(
      `[AGENT WALLET API] Smart wallet result: ${
        result.smartWalletAddress || "Will be created by SmartWalletProvider"
      }`
    );

    // Verify the creation in the database directly
    const verifyMapping = await prisma.agentWalletMap.findUnique({
      where: { userWalletAddress },
    });

    const verifyWallet = verifyMapping
      ? await prisma.agentWallet.findUnique({
          where: { agent_id: verifyMapping.agent_id },
        })
      : null;

    console.log("[AGENT WALLET API] Smart wallet verification result:", {
      mappingFound: !!verifyMapping,
      walletFound: !!verifyWallet,
    });

    return NextResponse.json({
      message: "Smart wallet setup created successfully",
      agentWalletAddress:
        result.smartWalletAddress || "Will be created by SmartWalletProvider",
      smartWalletAddress: result.smartWalletAddress,
      signerAddress: result.signerPrivateKey ? "Present" : "Missing",
      walletTier: 'pro',
      walletType: 'Smart',
      debug: {
        agentId: result.agentId,
        isNewWallet: result.isNewWallet,
        verificationSuccessful: !!verifyMapping && !!verifyWallet,
        tierDetection: true,
        walletTier: 'pro'
      },
    });
  } catch (error) {
    console.error("[AGENT WALLET API] POST Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack:
          error instanceof Error ? error.stack : "No stack trace available",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE endpoint to delete all agent wallets (for testing purposes only)
 * This should only be used in development environment
 */
export async function DELETE(req: NextRequest) {
  console.log("[AGENT WALLET API] DELETE request received");
  try {
    // Only delete in development or test environments
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          error: "Delete operation not allowed in production",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const deleteAll = searchParams.get("deleteAll") === "true";

    if (!deleteAll) {
      return NextResponse.json(
        {
          error: "Query parameter 'deleteAll=true' is required for safety",
        },
        { status: 400 }
      );
    }

    console.log(
      "[AGENT WALLET API] Deleting all agent wallets and mappings..."
    );

    // This operation is dangerous and only for development testing
    // Delete all agent wallet mappings and agent wallets (for testing only)
    try {
      // Use transactions for safety
      const deleteResult = await prisma.$transaction([
        prisma.agentWalletMap.deleteMany(),
        prisma.agentWallet.deleteMany(),
      ]);

      console.log("[AGENT WALLET API] Delete results:", deleteResult);

      return NextResponse.json({
        message: "All agent wallets deleted successfully",
        deletedMappings: deleteResult[0].count,
        deletedWallets: deleteResult[1].count,
      });
    } catch (deleteError) {
      console.error(
        "[AGENT WALLET API] Delete transaction failed:",
        deleteError
      );
      throw new Error(
        `Transaction failed: ${
          deleteError instanceof Error ? deleteError.message : "Unknown error"
        }`
      );
    }
  } catch (error) {
    console.error("[AGENT WALLET API] DELETE Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack:
          error instanceof Error ? error.stack : "No stack trace available",
      },
      { status: 500 }
    );
  } finally {
    // Always disconnect the client
    await prisma.$disconnect();
  }
}
