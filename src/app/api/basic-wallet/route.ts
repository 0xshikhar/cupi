import { NextResponse } from 'next/server';

/**
 * GET endpoint to check if a user has a basic agent wallet
 * 
 * @param request - The HTTP request containing the user wallet address
 * @returns Status of the basic agent wallet
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Basic wallet API has been removed. Use /api/agent-wallet instead.' },
    { status: 410 }
  );
}

/**
 * POST endpoint to create a new basic agent wallet for a user
 *
 * @returns The new basic agent wallet address
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Basic wallet API has been removed. Use /api/agent-wallet instead.' },
    { status: 410 }
  );
}