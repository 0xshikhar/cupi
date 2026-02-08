import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const username = searchParams.get('username');

        if (!username || username.trim().length === 0) {
            return NextResponse.json(
                { error: 'Username is required' },
                { status: 400 }
            );
        }

        // Validate username format
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return NextResponse.json({
                available: false,
                error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores',
            });
        }

        console.log('[USERNAME CHECK] Checking availability for:', username);

        // Check if username exists (case-insensitive)
        const existingUser = await prisma.user.findFirst({
            where: {
                username: {
                    equals: username,
                    mode: 'insensitive',
                },
            },
        });

        const available = !existingUser;

        console.log('[USERNAME CHECK] Username', username, 'is', available ? 'available' : 'taken');

        return NextResponse.json({ available });
    } catch (error) {
        console.error('[USERNAME CHECK] Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to check username availability',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
