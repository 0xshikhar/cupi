import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        const address = searchParams.get('address');
        const suggested = searchParams.get('suggested');
        const excludeAddress = searchParams.get('exclude');

        type SearchUser = {
            id: string;
            username: string | null;
            fullName: string | null;
            walletAddress: string;
            agentWalletAddress?: string | null;
        };

        // If asking for suggested contacts or empty query
        if (suggested === 'true' || (!query && !address)) {
            const users = await prisma.user.findMany({
                where: {
                    ...(excludeAddress ? {
                        walletAddress: {
                            not: excludeAddress,
                            mode: 'insensitive'
                        }
                    } : {}),
                    username: {
                        not: null
                    }
                },
                select: {
                    id: true,
                    username: true,
                    fullName: true,
                    walletAddress: true,
                    agentWalletAddress: true,
                },
                orderBy: {
                    updatedAt: 'desc'
                },
                take: 6,
            });

            return NextResponse.json({ users });
        }

        let users: SearchUser[] = [];

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
                    agentWalletAddress: true,
                },
                take: 1,
            });
        } else if (query) {
            const cleanQuery = query.startsWith("@") ? query.slice(1).trim() : query.trim();
            // Search by username, full name, or phone number
            users = await prisma.user.findMany({
                where: {
                    OR: [
                        {
                            username: {
                                contains: cleanQuery,
                                mode: 'insensitive',
                            },
                        },
                        {
                            fullName: {
                                contains: cleanQuery,
                                mode: 'insensitive',
                            },
                        },
                        {
                            phone: {
                                contains: cleanQuery.replace(/[^\d+]/g, ""),
                                mode: 'insensitive',
                            },
                        },
                    ],
                },
                select: {
                    id: true,
                    username: true,
                    fullName: true,
                    walletAddress: true,
                    agentWalletAddress: true,
                },
                take: 10,
            });
        }

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
