import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/transactions - Get transactions with filtering options
export async function GET(request: NextRequest) {
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
    const where: { 
      userId: string; 
      portfolioId?: string; 
      assetId?: string 
    } = { userId };
    
    if (portfolioId) {
      where.portfolioId = portfolioId;
    }
    
    if (assetId) {
      where.assetId = assetId;
    }
    
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        asset: true
      },
      orderBy: {
        date: 'desc'
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
}

// POST /api/transactions - Record a new transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId,
      portfolioId,
      assetId, 
      amount, 
      price, 
      type, 
      date, 
      hash, 
      status,
      metadata
    } = body;
    
    if (!userId || !portfolioId || !assetId || amount === undefined || !type) {
      return NextResponse.json(
        { error: 'User ID, Portfolio ID, Asset ID, amount, and type are required' },
        { status: 400 }
      );
    }
    
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        portfolioId,
        assetId,
        amount,
        price,
        totalValue: amount * (price || 0),
        type,
        date: date ? new Date(date) : new Date(),
        hash,
        status: status || 'COMPLETED',
        metadata
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
}
