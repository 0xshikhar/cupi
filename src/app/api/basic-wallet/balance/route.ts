import { NextRequest, NextResponse } from 'next/server';
import { basicAgentWalletService } from '@/lib/services/BasicAgentWalletService';
import { isAddress, formatEther } from 'viem';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userWalletAddress = searchParams.get('userWalletAddress');
    const chainId = searchParams.get('chainId');

    // Validate input
    if (!userWalletAddress || !isAddress(userWalletAddress)) {
      return NextResponse.json(
        { error: 'Valid userWalletAddress is required' },
        { status: 400 }
      );
    }

    const chainIdNum = chainId ? parseInt(chainId) : 1;

    // Get wallet balance
    const balance = await basicAgentWalletService.getWalletBalance(
      userWalletAddress,
      chainIdNum
    );

    return NextResponse.json({
      success: true,
      data: {
        balance: balance.toString(),
        balanceFormatted: formatEther(balance),
        chainId: chainIdNum
      }
    });
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Basic wallet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get wallet balance' },
      { status: 500 }
    );
  }
}