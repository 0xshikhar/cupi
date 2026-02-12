import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/auth/server/with-auth';
import { provisionUser } from '@/lib/users/provision-user';

/**
 * POST /api/auth/user
 * Provisions (or returns) the cUPI user for the authenticated Privy session.
 * The wallet address is resolved from Privy's own user record — request-body
 * addresses are client-controlled and therefore never trusted.
 */
export const POST = withAuth(async (_request: NextRequest, { auth }) => {
    try {
        const user = await provisionUser(auth.userId);

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                walletAddress: user.walletAddress,
            },
        });
    } catch (error) {
        console.error('[API /auth/user] Error:', error);
        const message = error instanceof Error ? error.message : 'Failed to create or update user';
        return NextResponse.json(
            { error: message },
            { status: message.includes('No embedded wallet') ? 400 : 500 }
        );
    }
});
