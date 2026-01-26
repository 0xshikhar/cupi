import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from "@/modules/auth/server";

// GET /api/agents/[id] - Get a specific agent by ID
export const GET = withAuth(async (request, { params, auth }: any) => {
  try {
    const id = params?.id;

    const agent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
});

// PATCH /api/agents/[id] - Update an agent
export const PATCH = withAuth(async (request, { params, auth }: any) => {
  try {
    const id = params?.id;
    const body = await request.json();
    const {
      name,
      type,
      config,
      configuration,
      runtimeConfig,
      customInstructions,
      description,
      isActive,
    } = body;

    const agent = await prisma.agent.update({
      where: { id },
      data: {
        name,
        type,
        configuration:
          configuration ||
          config ||
          runtimeConfig ||
          (customInstructions ? { customInstructions } : undefined),
        description,
        isActive,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
});

// DELETE /api/agents/[id] - Delete an agent
export const DELETE = withAuth(async (request, { params, auth }: any) => {
  try {
    const id = params?.id;

    await prisma.agent.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
});
