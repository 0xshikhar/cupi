import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/agents - Get all agents or filter by strategy
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const strategyId = searchParams.get('strategyId');
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const where: { userId: string; strategyId?: string } = { userId };
    
    if (strategyId) {
      where.strategyId = strategyId;
    }

    const agents = await prisma.agent.findMany({
      where,
      include: {
        strategy: true
      }
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

// POST /api/agents - Create a new agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, strategyId, name, type, config, description } = body;
    
    if (!userId || !strategyId || !name || !type) {
      return NextResponse.json(
        { error: 'User ID, strategy ID, name, and type are required' },
        { status: 400 }
      );
    }
    
    const agent = await prisma.agent.create({
      data: {
        userId,
        strategyId,
        name,
        type,
        configuration: config || {},
        description,
      }
    });
    
    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}
