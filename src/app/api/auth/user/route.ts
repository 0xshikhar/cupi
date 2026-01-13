import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { walletAddress, isNewUser } = await request.json();

    console.log('[API /auth/user] POST request received');
    console.log('[API /auth/user] Wallet address:', walletAddress);
    console.log('[API /auth/user] Is new user:', isNewUser);

    if (!walletAddress) {
      console.error('[API /auth/user] Missing wallet address');
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Create or update user in database
    console.log('[API /auth/user] Upserting user in database...');
    const user = await prisma.user.upsert({
      where: {
        walletAddress: walletAddress
      },
      update: {},
      create: {
        walletAddress: walletAddress,
      }
    });

    console.log('[API /auth/user] User upserted successfully:', user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        isNewUser
      }
    });
  } catch (error) {
    console.error('[API /auth/user] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create or update user' },
      { status: 500 }
    );
  }
}
