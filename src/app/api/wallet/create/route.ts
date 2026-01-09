import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Coinbase, Wallet } from '@coinbase/coinbase-sdk';

/**
 * POST endpoint to create a Coinbase wallet for a user
 * 
 * @param request - The HTTP request containing the user wallet address
 * @returns The new Coinbase wallet address
 */
export async function POST(request: Request) {
    try {
        const { userWalletAddress } = await request.json();

        console.log(`[WALLET CREATE] Creating wallet for user: ${userWalletAddress}`);

        if (!userWalletAddress) {
            return NextResponse.json(
                { error: 'User wallet address is required' },
                { status: 400 }
            );
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { walletAddress: userWalletAddress }
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found. Please register first.' },
                { status: 404 }
            );
        }

        // Check if user already has a Coinbase wallet
        if (user.agentWalletAddress) {
            console.log(`[WALLET CREATE] User already has wallet: ${user.agentWalletAddress}`);
            return NextResponse.json({
                message: 'Wallet already exists',
                agentWalletAddress: user.agentWalletAddress,
                isNewWallet: false
            });
        }

        // Initialize Coinbase SDK
        const coinbase = new Coinbase({
            apiKeyName: process.env.COINBASE_API_KEY_NAME!,
            privateKey: process.env.COINBASE_API_KEY_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        });

        // Create a new wallet
        console.log('[WALLET CREATE] Creating new Coinbase wallet...');
        const wallet = await Wallet.create({
            networkId: Coinbase.networks.BaseMainnet,
        });

        const defaultAddress = await wallet.getDefaultAddress();
        const agentWalletAddress = defaultAddress?.getId();

        if (!agentWalletAddress) {
            throw new Error('Failed to get wallet address from Coinbase');
        }

        console.log(`[WALLET CREATE] Wallet created: ${agentWalletAddress}`);

        // Export wallet data for storage (encrypted in production)
        const walletData = wallet.export();

        // Update user with Coinbase wallet address
        const updatedUser = await prisma.user.update({
            where: { walletAddress: userWalletAddress },
            data: {
                agentWalletAddress,
                agentWalletCreatedAt: new Date(),
            }
        });

        console.log(`[WALLET CREATE] User updated with wallet address`);

        return NextResponse.json({
            message: 'Wallet created successfully',
            agentWalletAddress,
            isNewWallet: true,
            walletData: {
                seed: walletData.seed,
                walletId: walletData.walletId,
            }
        });

    } catch (error) {
        console.error('[WALLET CREATE] Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to create wallet',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

/**
 * GET endpoint to check if a user has a Coinbase wallet
 * 
 * @param request - The HTTP request containing the user wallet address
 * @returns Wallet status
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userWalletAddress = searchParams.get('userWalletAddress');

        if (!userWalletAddress) {
            return NextResponse.json(
                { error: 'User wallet address is required' },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { walletAddress: userWalletAddress },
            select: {
                agentWalletAddress: true,
                agentWalletCreatedAt: true,
            }
        });

        if (!user) {
            return NextResponse.json({
                hasWallet: false,
                agentWalletAddress: null
            });
        }

        return NextResponse.json({
            hasWallet: !!user.agentWalletAddress,
            agentWalletAddress: user.agentWalletAddress,
            createdAt: user.agentWalletCreatedAt
        });

    } catch (error) {
        console.error('[WALLET GET] Error:', error);
        return NextResponse.json(
            { error: 'Failed to check wallet status' },
            { status: 500 }
        );
    }
}
