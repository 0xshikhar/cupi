import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { isAddress } from 'viem';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress || !isAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Valid walletAddress is required' },
        { status: 400 }
      );
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { userWalletAddress: walletAddress }
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Also get user preferences
    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress }
    });

    return NextResponse.json({
      success: true,
      data: {
        userWalletAddress: userProfile.userWalletAddress,
        basicWalletId: userProfile.basicWalletId,
        proWalletId: userProfile.proWalletId,
        basicWalletAddress: userProfile.basicWalletAddress,
        proWalletAddress: userProfile.proWalletAddress,
        riskProfile: userProfile.risk_profile,
        otherUserInfo: userProfile.other_user_info,
        preferences: user?.preferences || null,
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt
      }
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    return NextResponse.json(
      { error: 'Failed to get user profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, basicWalletAddress, proWalletAddress, riskProfile, otherUserInfo, preferences } = body;

    if (!walletAddress || !isAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Valid walletAddress is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    
    if (basicWalletAddress !== undefined) {
      updateData.basicWalletAddress = basicWalletAddress;
    }
    
    if (proWalletAddress !== undefined) {
      updateData.proWalletAddress = proWalletAddress;
    }
    
    if (riskProfile !== undefined) {
      updateData.risk_profile = riskProfile;
    }
    
    if (otherUserInfo !== undefined) {
      updateData.other_user_info = otherUserInfo;
    }

    const updatedProfile = await prisma.userProfile.update({
      where: { userWalletAddress: walletAddress },
      data: updateData
    });

    // Also update user preferences if provided
    let updatedUser = null;
    if (preferences !== undefined) {
      updatedUser = await prisma.user.upsert({
        where: { walletAddress: walletAddress },
        update: { 
          preferences: preferences,
          updatedAt: new Date()
        },
        create: {
          walletAddress: walletAddress,
          preferences: preferences
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        userWalletAddress: updatedProfile.userWalletAddress,
        basicWalletId: updatedProfile.basicWalletId,
        proWalletId: updatedProfile.proWalletId,
        basicWalletAddress: updatedProfile.basicWalletAddress,
        proWalletAddress: updatedProfile.proWalletAddress,
        riskProfile: updatedProfile.risk_profile,
        otherUserInfo: updatedProfile.other_user_info,
        preferences: updatedUser?.preferences || null,
        createdAt: updatedProfile.createdAt,
        updatedAt: updatedProfile.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, riskProfile = '', otherUserInfo = '', preferences } = body;

    if (!walletAddress || !isAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Valid walletAddress is required' },
        { status: 400 }
      );
    }

    const userProfile = await prisma.userProfile.upsert({
      where: { userWalletAddress: walletAddress },
      update: {
        risk_profile: riskProfile,
        other_user_info: otherUserInfo
      },
      create: {
        userWalletAddress: walletAddress,
        risk_profile: riskProfile,
        other_user_info: otherUserInfo
      }
    });

    // Also create/update user preferences if provided
    let user = null;
    if (preferences !== undefined) {
      user = await prisma.user.upsert({
        where: { walletAddress: walletAddress },
        update: { 
          preferences: preferences,
          updatedAt: new Date()
        },
        create: {
          walletAddress: walletAddress,
          preferences: preferences
        }
      });
    } else {
      // Get existing user preferences
      user = await prisma.user.findUnique({
        where: { walletAddress: walletAddress }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        userWalletAddress: userProfile.userWalletAddress,
        basicWalletId: userProfile.basicWalletId,
        proWalletId: userProfile.proWalletId,
        basicWalletAddress: userProfile.basicWalletAddress,
        proWalletAddress: userProfile.proWalletAddress,
        riskProfile: userProfile.risk_profile,
        otherUserInfo: userProfile.other_user_info,
        preferences: user?.preferences || null,
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt
      }
    });
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
    return NextResponse.json(
      { error: 'Failed to create/update user profile' },
      { status: 500 }
    );
  }
}