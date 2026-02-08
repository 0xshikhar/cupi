import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = "force-dynamic";

export const GET = async (request: Request) => {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');
        const type = searchParams.get('type');
        const limit = parseInt(searchParams.get('limit') || '50');

        if (!address) {
            return NextResponse.json(
                { error: 'Wallet address is required' },
                { status: 400 }
            );
        }

        console.log('[ACTIVITY] Fetching activity for:', address);

        // Find basic wallet by agent wallet address
        const basicWallet = await prisma.basicAgentWallet.findUnique({
            where: { agentWalletAddress: address.toLowerCase() }
        });

        if (!basicWallet) {
            console.log('[ACTIVITY] No basic wallet found for:', address);
            return NextResponse.json({ transactions: [] });
        }

        // Find user by their wallet address
        const user = await prisma.user.findUnique({
            where: { walletAddress: basicWallet.userWalletAddress }
        });

        if (!user) {
            console.log('[ACTIVITY] No user found for wallet:', basicWallet.userWalletAddress);
            return NextResponse.json({ transactions: [] });
        }

        // Build query filter
        const where: any = { userId: user.id };
        if (type) {
            where.type = type;
        }

        // Fetch transactions
        const transactions = await prisma.transaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        console.log('[ACTIVITY] Found', transactions.length, 'transactions');

        return NextResponse.json({ transactions });
    } catch (error) {
        console.error('[ACTIVITY] Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch activity',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
};
