import { NextRequest, NextResponse } from 'next/server';
import { basicAgentWalletService } from '@/lib/services/BasicAgentWalletService';
import { isAddress } from 'viem';
import { withAuth } from '@/modules/auth/server';

export const POST = withAuth(async (request, { auth }) => {
  try {
    const body = await request.json();
    const { userWalletAddress, chainId } = body;

    // Validate input
    if (!userWalletAddress || !isAddress(userWalletAddress)) {
      return NextResponse.json(
        { error: 'Valid userWalletAddress is required' },
        { status: 400 }
      );
    }

    // Create basic wallet
    const walletInfo = await basicAgentWalletService.createBasicWallet({
      userWalletAddress,
      chainId
    });

    return NextResponse.json({
      success: true,
      data: walletInfo
    });
  } catch (error) {
    console.error('Error creating basic wallet:', error);
    
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { error: 'Basic wallet already exists for this user' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create basic wallet' },
      { status: 500 }
    );
  }
});