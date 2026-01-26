import { NextRequest, NextResponse } from "next/server";
import { AgentWalletService } from "@/lib/services/agent-wallet-service";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/modules/auth/server";

// Use the existing Prisma client from lib/prisma

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
 * GET endpoint to check if a user wallet has an associated agent wallet
 *
 * @param request - The HTTP request containing the user wallet address
 * @returns Status of the agent wallet
 */
export const GET = withAuth(async (req, { auth }) => {
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

        // Check for existing agent wallet
        const directMapping = await prisma.agentWalletMap.findUnique({
            where: { userWalletAddress },
        });

        console.log(
            "[AGENT WALLET API] Direct prisma check result:",
            directMapping
        );

        if (directMapping) {
            const existingWallet = await prisma.agentWallet.findUnique({
                where: { agent_id: directMapping.agent_id },
            });

            if (existingWallet) {
                console.log(
                    `[AGENT WALLET API] GET found agent wallet: ${existingWallet.walletPublicKey}`
                );
                return NextResponse.json({
                    hasAgentWallet: true,
                    agentWalletAddress: existingWallet.walletPublicKey,
                    walletType: 'EOA', // App Wallet
                    debug: {
                        directDatabaseCheck: true,
                        mappingFound: true,
                        agentId: directMapping.agent_id,
                    },
                });
            }
        }

        console.log(
            `[AGENT WALLET API] GET result: no agent wallet found for user`
        );

        return NextResponse.json({
            hasAgentWallet: false,
            agentWalletAddress: null,
            walletType: 'EOA',
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
});

/**
 * POST endpoint to create a new agent wallet for a user wallet
 *
 * @param request - The HTTP request containing the user wallet address
 * @returns The new agent wallet address
 */
export const POST = withAuth(async (req, { auth }) => {
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

        // Create new agent wallet (EOA)
        console.log("[AGENT WALLET API] Creating new App Wallet (EOA)...");

        const result = await AgentWalletService.getOrCreateAgentWallet(
            userWalletAddress
        );

        console.log(
            `[AGENT WALLET API] Wallet result: ${result.agentWalletAddress}`
        );

        return NextResponse.json({
            message: "Agent wallet created successfully",
            agentWalletAddress: result.agentWalletAddress,
            walletType: 'EOA', // App Wallet
            debug: {
                agentId: result.agentId,
                walletType: 'EOA'
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
});

/**
 * DELETE endpoint to delete all agent wallets (for testing purposes only)
 * This should only be used in development environment
 */
export const DELETE = withAuth(async (req, { auth }) => {
    console.log("[AGENT WALLET API] DELETE request received");
    try {
        // Only delete in development or test environments
        if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DELETE_WALLETS) {
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
                `Transaction failed: ${deleteError instanceof Error ? deleteError.message : "Unknown error"
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
        // await prisma.$disconnect(); // Best practice in Next.js is usually to keep it open, but we can if requested.
        // For now, removing explicit disconnect to avoid connection pool exhaustion if Next creates many instances.
    }
});
