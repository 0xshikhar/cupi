"use server";

import { prisma } from "@/lib/prisma";

export async function getUserProfile(walletAddress: string) {
    if (!walletAddress) {
        return { error: "Wallet address is required" };
    }

    try {
        let user = await prisma.user.findFirst({
            where: {
                walletAddress: { equals: walletAddress, mode: "insensitive" }
            },
            include: {
                _count: {
                    select: { notifications: { where: { status: "unread" } } }
                }
            }
        });

        // Auto-provision user record if first-time visitor
        if (!user) {
            const defaultUsername = `user_${walletAddress.slice(2, 8).toLowerCase()}`;
            user = await prisma.user.create({
                data: {
                    walletAddress,
                    username: defaultUsername,
                    notifications: {
                        create: [
                            {
                                title: "Welcome to Cupi",
                                message: "Your account has been initialized.",
                                type: "ACCOUNT_CREATION",
                                status: "unread"
                            }
                        ]
                    }
                },
                include: {
                    _count: {
                        select: { notifications: { where: { status: "unread" } } }
                    }
                }
            });
        }

        return { user };
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return { error: "Failed to fetch user profile" };
    }
}

export async function getUserNotifications(walletAddress: string) {
    if (!walletAddress) {
        return { error: "Wallet address is required" };
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                walletAddress: { equals: walletAddress, mode: "insensitive" }
            },
            include: {
                notifications: {
                    orderBy: { createdAt: "desc" },
                    take: 50
                }
            }
        });

        if (!user) {
            return { notifications: [] };
        }

        return { notifications: user.notifications };
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return { error: "Failed to fetch notifications" };
    }
}

export async function updateUserProfile(walletAddress: string, data: any) {
    if (!walletAddress) {
        return { error: "Wallet address is required" };
    }

    try {
        // If username is provided, check if it's already claimed by another wallet
        if (data.username) {
            const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
            if (!usernameRegex.test(data.username)) {
                return { error: "Username must be 3-20 alphanumeric characters" };
            }

            const existing = await prisma.user.findFirst({
                where: {
                    username: { equals: data.username, mode: "insensitive" },
                    NOT: { walletAddress: { equals: walletAddress, mode: "insensitive" } }
                }
            });

            if (existing) {
                return { error: "Username is already taken by another user" };
            }
        }

        // Upsert user profile atomically so update never fails on un-provisioned wallets
        const user = await prisma.user.upsert({
            where: { walletAddress },
            update: {
                ...(data.username ? { username: data.username } : {}),
                fullName: data.fullName ?? "",
                region: data.region ?? "",
                bio: data.bio ?? "",
                jobTitle: data.jobTitle ?? "",
                twitter: data.twitter ?? "",
                linkedin: data.linkedin ?? "",
                website: data.website ?? "",
            },
            create: {
                walletAddress,
                username: data.username || `user_${walletAddress.slice(2, 8).toLowerCase()}`,
                fullName: data.fullName ?? "",
                region: data.region ?? "",
                bio: data.bio ?? "",
                jobTitle: data.jobTitle ?? "",
                twitter: data.twitter ?? "",
                linkedin: data.linkedin ?? "",
                website: data.website ?? "",
                notifications: {
                    create: [
                        {
                            title: "Welcome to Cupi",
                            message: "Your profile has been created.",
                            type: "ACCOUNT_CREATION",
                            status: "unread"
                        }
                    ]
                }
            }
        });

        return { success: true, user };
    } catch (error: any) {
        console.error("Error updating user profile:", error);
        return { error: error?.message || "Failed to update profile" };
    }
}
