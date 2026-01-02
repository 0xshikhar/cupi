import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Basic wallet API has been removed. Use /api/agent-wallet instead.' },
    { status: 410 }
  );
}