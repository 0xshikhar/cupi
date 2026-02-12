import { NextRequest, NextResponse } from 'next/server';
import { basicAgentWalletService } from '@/lib/services/BasicAgentWalletService';
import { isAddress } from 'viem';
import { withAuth } from '@/modules/auth/server';

export const POST = withAuth(async (request, { auth }) => {
  try {
    const body = await request.json();
    const { userWalletAddress } = body;

    // Validate input
    if (!userWalletAddress || !isAddress(userWalletAddress)) {
      return NextResponse.json(
        { error: 'Valid userWalletAddress is required' },
        { status: 400 }
      );
    }
    // Ownership: the queried wallet must be the authenticated session's wallet
    if (!auth.walletAddress || auth.walletAddress.toLowerCase() !== userWalletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Cannot access a wallet that does not belong to the authenticated session" },
        { status: 403 }
      );
    }


    // Get or create basic wallet
    const walletInfo = await basicAgentWalletService.getOrCreateBasicWallet(userWalletAddress);

    return NextResponse.json({
      success: true,
      data: walletInfo
    });
  } catch (error) {
    console.error('Error getting or creating basic wallet:', error);
    return NextResponse.json(
      { error: 'Failed to get or create basic wallet' },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (request, { auth }) => {
  try {
    const { searchParams } = new URL(request.url);
    const userWalletAddress = searchParams.get('userWalletAddress');

    // Validate input
    if (!userWalletAddress || !isAddress(userWalletAddress)) {
      return NextResponse.json(
        { error: 'Valid userWalletAddress is required' },
        { status: 400 }
      );
    }
    // Ownership: the queried wallet must be the authenticated session's wallet
    if (!auth.walletAddress || auth.walletAddress.toLowerCase() !== userWalletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Cannot access a wallet that does not belong to the authenticated session" },
        { status: 403 }
      );
    }


    // Get basic wallet
    const walletInfo = await basicAgentWalletService.getBasicWallet(userWalletAddress);

    if (!walletInfo) {
      return NextResponse.json(
        { error: 'Basic wallet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: walletInfo
    });
  } catch (error) {
    console.error('Error getting basic wallet:', error);
    return NextResponse.json(
      { error: 'Failed to get basic wallet' },
      { status: 500 }
    );
  }
});