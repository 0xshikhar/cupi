import { NextResponse } from 'next/server';
import { withAuth, requireUser, isUser } from '@/modules/auth/server/with-auth';

export const dynamic = "force-dynamic";

/**
 * GET /api/users/profile
 * Returns the authenticated user's own profile — identity comes from the
 * Privy session, never from a client-supplied address parameter.
 */
export const GET = withAuth(async (_request, { auth }) => {
    try {
        const user = requireUser(auth);
        if (!isUser(user)) return user;

        const { id, username, fullName, walletAddress, email, region, bio, jobTitle, twitter, linkedin, website } = user;

        return NextResponse.json({
            user: { id, username, fullName, walletAddress, email, region, bio, jobTitle, twitter, linkedin, website },
        });
    } catch (error) {
        console.error('[USER PROFILE] Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch user profile',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
});
