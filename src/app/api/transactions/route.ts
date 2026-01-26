import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentStatus } from '@prisma/client';
import { withAuth } from "@/modules/auth/server";

// GET /api/transactions - Get transactions (Payments) with filtering options
export const GET = withAuth(async (request, { auth }) => {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const portfolioId = searchParams.get('portfolioId');
    const assetId = searchParams.get('assetId');

    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Build the where clause based on filters
    // We assume userId maps to senderId for now, or we could check both sender and receiver
    const where: any = {
      OR: [
        { senderId: userId },
        { receiverId: userId }
      ]
    };

    if (portfolioId) {
      where.portfolioId = portfolioId;
      // If portfolioId is specified, we might not need the OR userId check if portfolio implies user
      // But let's keep it safe.
    }

    if (assetId) {
      where.assetId = assetId;
    }

    const transactions = await prisma.payment.findMany({
      where,
      include: {
        asset: true,
        paymentLink: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
});

// POST /api/transactions - Record a new transaction (Payment)
export const POST = withAuth(async (request, { auth }) => {
  try {
    const body = await request.json();
    const {
      userId,
      portfolioId,
      assetId,
      amount,
      tokenAddress,
      tokenSymbol,
      chainId,
      hash,
      status
    } = body;

    if (!userId || !amount) {
      return NextResponse.json(
        { error: 'User ID and amount are required' },
        { status: 400 }
      );
    }

    // Map status string to enum if possible
    let paymentStatus: PaymentStatus = PaymentStatus.PENDING;
    if (status === 'CONFIRMED' || status === 'COMPLETED') paymentStatus = PaymentStatus.CONFIRMED;
    if (status === 'FAILED') paymentStatus = PaymentStatus.FAILED;

    const transaction = await prisma.payment.create({
      data: {
        senderId: userId,
        portfolioId: portfolioId || null,
        assetId: assetId || null,
        amount: amount,
        tokenAddress: tokenAddress || '0x0000000000000000000000000000000000000000', // Default or require?
        tokenSymbol: tokenSymbol || 'ETH', // Default or require?
        chainId: chainId || 8453, // Default to Base
        txHash: hash || null,
        status: paymentStatus,
      },
      include: {
        asset: true
      }
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
});
