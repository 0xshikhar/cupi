import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { walletAddress, isNewUser } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Create or update user in database
    const user = await prisma.user.upsert({
      where: { 
        walletAddress: walletAddress 
      },
      update: {},
      create: {
        walletAddress: walletAddress,
      }
    });

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        isNewUser
      } 
    });
  } catch (error) {
    console.error('Error in auth/user API:', error);
    return NextResponse.json(
      { error: 'Failed to create or update user' },
      { status: 500 }
    );
  }
}
