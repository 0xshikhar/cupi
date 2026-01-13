import { NextRequest, NextResponse } from 'next/server';
import { BasicAgentWalletService } from '@/lib/services/BasicAgentWalletService';
import { prisma } from '@/lib/prisma';
import { isAddress } from 'viem';

/**
 * Check database connection
 */
async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    return true;
  } catch (error) {
    console.error('[BASIC WALLET API] Database connection failed:', error);
    return false;
  }
}

/**
 * GET endpoint to check if a user has a basic agent wallet
 * 
 * @param request - The HTTP request containing the user wallet address
 * @returns Status of the basic agent wallet
 */
export async function GET(req: NextRequest) {
  try {
    // Validate database connection first
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userWalletAddress = searchParams.get("userWalletAddress");

    // Reduced logging to minimize spam
    // console.log(`[BASIC WALLET API] GET checking wallet for address: ${userWalletAddress}`);

    if (!userWalletAddress || !isAddress(userWalletAddress)) {
      return NextResponse.json(
        { error: "Valid user wallet address is required" },
        { status: 400 }
      );
    }

    // Check for basic agent wallet
    const basicWalletService = BasicAgentWalletService.getInstance();
    const basicWallet = await basicWalletService.getBasicWallet(userWalletAddress);
    
    if (basicWallet) {
      // Only log when wallet is found to reduce spam
      console.log(`[BASIC WALLET API] Found basic wallet: ${basicWallet.agentWalletAddress}`);
      
      return NextResponse.json({
        hasBasicWallet: true,
        basicWalletAddress: basicWallet.agentWalletAddress,
        walletType: 'EOA',
        status: basicWallet.status,
        createdAt: basicWallet.createdAt,
        lastUsedAt: basicWallet.lastUsedAt
      });
    } else {
      // Reduced logging for not found cases
      // console.log(`[BASIC WALLET API] No basic wallet found for: ${userWalletAddress}`);
      
      return NextResponse.json({
        hasBasicWallet: false,
        message: "No basic agent wallet found for this user wallet"
      });
    }
  } catch (error) {
    console.error('[BASIC WALLET API] GET error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to create a new basic agent wallet for a user
 *
 * @param request - The HTTP request containing the user wallet address
 * @returns The new basic agent wallet address
 */
export async function POST(req: NextRequest) {
  console.log("[BASIC WALLET API] POST request received");
  try {
    // Validate database connection first
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    const { userWalletAddress } = await req.json();
    console.log(`[BASIC WALLET API] POST creating wallet for address: ${userWalletAddress}`);

    if (!userWalletAddress || !isAddress(userWalletAddress)) {
      return NextResponse.json(
        { error: "Valid user wallet address is required" },
        { status: 400 }
      );
    }

    // Handle basic wallet creation
    const basicWalletService = BasicAgentWalletService.getInstance();
    
    // Check if basic wallet already exists
    const existingBasicWallet = await basicWalletService.getBasicWallet(userWalletAddress);
    if (existingBasicWallet) {
      console.log(`[BASIC WALLET API] POST Found existing basic wallet: ${existingBasicWallet.agentWalletAddress}`);
      return NextResponse.json({
        message: "Basic agent wallet already exists for this user wallet",
        basicWalletAddress: existingBasicWallet.agentWalletAddress,
        walletType: 'EOA',
        status: existingBasicWallet.status,
        existing: true
      });
    }

    // Create new basic wallet
    console.log(`[BASIC WALLET API] POST Creating new basic wallet for: ${userWalletAddress}`);
    const newBasicWallet = await basicWalletService.createBasicWallet({ userWalletAddress });
    
    // Update user profile with basic wallet address
    await prisma.userProfile.upsert({
      where: { userWalletAddress },
      update: {
        basicWalletId: newBasicWallet.id,
        basicWalletAddress: newBasicWallet.agentWalletAddress
      },
      create: {
        userWalletAddress,
        basicWalletId: newBasicWallet.id,
        basicWalletAddress: newBasicWallet.agentWalletAddress
      }
    });
    
    return NextResponse.json({
      message: "Basic agent wallet created successfully",
      basicWalletAddress: newBasicWallet.agentWalletAddress,
      walletType: 'EOA',
      status: newBasicWallet.status,
      walletId: newBasicWallet.id,
      existing: false
    });
  } catch (error) {
    console.error('[BASIC WALLET API] POST error:', error);
    return NextResponse.json(
      { error: "Failed to create basic agent wallet" },
      { status: 500 }
    );
  }
}