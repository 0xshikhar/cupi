import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const POST = async (request: Request) => {
    try {
        const body = await request.json();
        const { walletAddress, username } = body;

        if (!walletAddress || !username) {
            return NextResponse.json(
                { error: 'Wallet address and username are required' },
                { status: 400 }
            );
        }

        // Validate username format
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return NextResponse.json(
                { error: 'Invalid username format' },
                { status: 400 }
            );
        }

        console.log('[UPDATE USERNAME] Updating username for:', walletAddress, 'to:', username);

        // Check if username is already taken by another user
        const existingUser = await prisma.user.findFirst({
            where: {
                username: {
                    equals: username,
                    mode: 'insensitive',
                },
                NOT: {
                    walletAddress: walletAddress,
                },
            },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'Username already taken' },
                { status: 409 }
            );
        }

        // Update user's username
        const user = await prisma.user.update({
            where: { walletAddress },
            data: { username },
        });

        console.log('[UPDATE USERNAME] Username updated successfully');

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
            },
        });
    } catch (error) {
        console.error('[UPDATE USERNAME] Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to update username',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
};
