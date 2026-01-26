import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from "@/modules/auth/server";

export const POST = withAuth(async (request, { auth }) => {
    try {
        const body = await request.json();
        const {
            userWalletAddress,
            type,
            amount,
            tokenSymbol,
            tokenAddress,
            txHash,
            chainId,
            status,
            fromAddress,
            toAddress,
        } = body;

        if (!userWalletAddress || !type || !amount || !txHash) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        console.log('[RECORD TRANSACTION] Recording transaction:', {
            userWalletAddress,
            type,
            amount,
            tokenSymbol,
            txHash,
        });

        // Find user
        const user = await prisma.user.findUnique({
            where: { walletAddress: userWalletAddress },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Check if transaction already exists
        const existingTx = await prisma.transaction.findUnique({
            where: { txHash },
        });

        if (existingTx) {
            console.log('[RECORD TRANSACTION] Transaction already exists');
            return NextResponse.json({ transaction: existingTx });
        }

        // Create transaction record
        const transaction = await prisma.transaction.create({
            data: {
                userId: user.id,
                type,
                amount,
                tokenSymbol: tokenSymbol || 'ETH',
                tokenAddress: tokenAddress || null,
                txHash,
                chainId: chainId || 84532, // Default to Base Sepolia
                status: status || 'CONFIRMED',
                fromAddress: fromAddress || '',
                toAddress: toAddress || '',
            },
        });

        // Create notification for the user
        const notificationMessage =
            type === 'DEPOSIT' ? `Deposited ${amount} ${tokenSymbol}` :
                type === 'WITHDRAWAL' ? `Withdrew ${amount} ${tokenSymbol}` :
                    type === 'PAYMENT_SENT' ? `Sent ${amount} ${tokenSymbol}` :
                        `Received ${amount} ${tokenSymbol}`;

        await prisma.notification.create({
            data: {
                userId: user.id,
                title: type === 'DEPOSIT' ? 'Deposit Confirmed' :
                    type === 'WITHDRAWAL' ? 'Withdrawal Confirmed' :
                        type === 'PAYMENT_SENT' ? 'Payment Sent' :
                            'Payment Received',
                message: notificationMessage,
                type: type,
                amount: type === 'DEPOSIT' || type === 'PAYMENT_RECEIVED' ? `+${amount} ${tokenSymbol}` : `-${amount} ${tokenSymbol}`,
                status: 'unread',
            },
        });

        console.log('[RECORD TRANSACTION] Transaction recorded successfully');

        return NextResponse.json({ transaction }, { status: 201 });
    } catch (error) {
        console.error('[RECORD TRANSACTION] Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to record transaction',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
});
