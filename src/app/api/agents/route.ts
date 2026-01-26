import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from "@/modules/auth/server";

// GET /api/agents - Get all agents or filter by strategy
export const GET = withAuth(async (request, { auth }) => {
  try {
    const { searchParams } = new URL(request.url);
    const strategyId = searchParams.get('strategyId');
    const userId = searchParams.get('userId');
    const includeInactive = searchParams.get('includeInactive') === 'true';
    
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
      where: {
        ...where,
        ...(includeInactive ? {} : { isActive: true }),
      },
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
});

// POST /api/agents - Create a new agent
export const POST = withAuth(async (request, { auth }) => {
  try {
    const body = await request.json();
    const {
      userId,
      strategyId,
      name,
      type,
      config,
      configuration,
      runtimeConfig,
      customInstructions,
      description,
    } = body;
    
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
        configuration:
          configuration ||
          config ||
          runtimeConfig ||
          (customInstructions ? { customInstructions } : {}) ||
          {},
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
});
