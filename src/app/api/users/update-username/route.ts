import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, requireUser, isUser } from '@/modules/auth/server/with-auth';

export const POST = withAuth(async (request: NextRequest, { auth }) => {
    try {
        const user = requireUser(auth);
        if (!isUser(user)) return user;

        const body = await request.json();
        const { username } = body;

        if (!username) {
            return NextResponse.json(
                { error: 'Username is required' },
                { status: 400 }
            );
        }

        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return NextResponse.json(
                { error: 'Invalid username format' },
                { status: 400 }
            );
        }

        // Check if username is already taken by another user
        const existingUser = await prisma.user.findFirst({
            where: {
                username: {
                    equals: username,
                    mode: 'insensitive',
                },
                NOT: {
                    id: user.id,
                },
            },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'Username already taken' },
                { status: 409 }
            );
        }

        // Update the authenticated user's username
        const updated = await prisma.user.update({
            where: { id: user.id },
            data: { username },
        });

        return NextResponse.json({
            success: true,
            user: {
                id: updated.id,
                walletAddress: updated.walletAddress,
                username: updated.username,
            },
        });
    } catch (error) {
        console.error('[UPDATE USERNAME] Error:', error);
        return NextResponse.json(
            { error: 'Failed to update username' },
            { status: 500 }
        );
    }
});
