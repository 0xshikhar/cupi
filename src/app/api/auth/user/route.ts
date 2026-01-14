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

    // Generate random username for new users
    const generateRandomUsername = () => {
      const adjectives = ['cool', 'happy', 'swift', 'bright', 'smart', 'quick', 'lucky', 'bold'];
      const nouns = ['panda', 'tiger', 'eagle', 'wolf', 'fox', 'bear', 'lion', 'hawk'];
      const randomNum = Math.floor(Math.random() * 9999);
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      return `${adj}${noun}${randomNum}`;
    };

    const user = await prisma.user.upsert({
      where: {
        walletAddress: walletAddress
      },
      update: {},
      create: {
        walletAddress: walletAddress,
        username: generateRandomUsername(), // Auto-generate username
        notifications: {
          create: [
            {
              title: "Welcome to CUPI",
              message: "Your account has been successfully created.",
              type: "ACCOUNT_CREATION",
              status: "unread"
            },
            {
              title: "Cashback Reward",
              message: "You earned a reward for joining!",
              type: "REWARD",
              amount: "+$0.01",
              status: "unread"
            }
          ]
        }
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
