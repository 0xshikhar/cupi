import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        const address = searchParams.get('address');

        if (!query && !address) {
            return NextResponse.json(
                { error: 'Search query or address is required' },
                { status: 400 }
            );
        }

        console.log('[USER SEARCH] Searching for:', query || address);

        let users;

        if (address) {
            // Search by wallet address (exact match)
            users = await prisma.user.findMany({
                where: {
                    walletAddress: {
                        equals: address,
                        mode: 'insensitive',
                    },
                },
                select: {
                    id: true,
                    username: true,
                    fullName: true,
                    walletAddress: true,
                },
                take: 1,
            });
        } else if (query) {
            // Search by username (partial match)
            users = await prisma.user.findMany({
                where: {
                    username: {
                        contains: query,
                        mode: 'insensitive',
                    },
                },
                select: {
                    id: true,
                    username: true,
                    fullName: true,
                    walletAddress: true,
                },
                take: 10,
            });
        } else {
            users = [];
        }

        console.log('[USER SEARCH] Found', users.length, 'users');

        return NextResponse.json({ users });
    } catch (error) {
        console.error('[USER SEARCH] Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to search users',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
