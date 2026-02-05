import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const GET = async (request: Request) => {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');

        if (!address) {
            return NextResponse.json(
                { error: 'Wallet address is required' },
                { status: 400 }
            );
        }

        console.log('[USER PROFILE] Fetching profile for:', address);

        const user = await prisma.user.findUnique({
            where: { walletAddress: address },
            select: {
                id: true,
                username: true,
                fullName: true,
                walletAddress: true,
                email: true,
                region: true,
                bio: true,
                jobTitle: true,
                twitter: true,
                linkedin: true,
                website: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ user });
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
};
