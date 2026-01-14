"use server";

import { prisma } from "@/lib/prisma";

export async function getUserProfile(walletAddress: string) {
    if (!walletAddress) {
        return { error: "Wallet address is required" };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { walletAddress },
            include: {
                _count: {
                    select: { notifications: { where: { status: "unread" } } }
                }
            }
        });

        if (!user) {
            return { error: "User not found" };
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
        const user = await prisma.user.findUnique({
            where: { walletAddress },
            include: {
                notifications: {
                    orderBy: { createdAt: "desc" },
                    take: 50 // Limit to last 50 notifications
                }
            }
        });

        if (!user) {
            return { error: "User not found" };
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
        const user = await prisma.user.update({
            where: { walletAddress },
            data: {
                fullName: data.fullName,
                region: data.region,
                bio: data.bio,
                jobTitle: data.jobTitle,
                twitter: data.twitter,
                linkedin: data.linkedin,
                website: data.website,
            }
        });

        return { success: true, user };
    } catch (error) {
        console.error("Error updating user profile:", error);
        return { error: "Failed to update profile" };
    }
}
