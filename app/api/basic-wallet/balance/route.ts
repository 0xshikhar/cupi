import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Basic wallet API has been removed. Use /api/agent-wallet instead.' },
    { status: 410 }
  );
}