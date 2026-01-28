import { Address, Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
    encryptPrivateKey,
    decryptPrivateKey,
    generateSalt,
    createMasterPassword,
} from "@/lib/crypto/encryption";

// Debug mode for detailed logging
const DEBUG = process.env.NODE_ENV !== "production";

function getEncryptionSecret(): string {
    return process.env.ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET || "cupi-agent-secret-salt";
}

function encryptStoredKey(key: string, userAddress: string): string {
    const salt = generateSalt();
    const password = createMasterPassword(userAddress, getEncryptionSecret());
    const cipher = encryptPrivateKey(key, password, salt);
    return `enc:${salt}:${cipher}`;
}

function decryptStoredKey(stored: string, userAddress: string): Hex {
    if (stored.startsWith("enc:")) {
        const parts = stored.split(":");
        const salt = parts[1];
        const cipher = parts[2];
        const password = createMasterPassword(userAddress, getEncryptionSecret());
        const raw = decryptPrivateKey(cipher, password, salt);
        return `0x${raw}` as Hex;
    }
    // Legacy plaintext key
    return (stored.startsWith("0x") ? stored : `0x${stored}`) as Hex;
}

/**
 * Agent Wallet Service
 *
 * This service manages the relationship between user wallets and agent wallets (EOA),
 * ensuring each user has exactly one agent wallet per connected wallet address.
 */
export class AgentWalletService {
    /**
     * Get or create an agent wallet (EOA) for a user
     *
     * @param userWalletAddress - The user's wallet address
     * @returns The agent wallet private key and ID
     */
    static async getOrCreateAgentWallet(userWalletAddress: string): Promise<{
        privateKey: Hex;
        agentId: string;
        agentWalletAddress: Address;
    }> {
        try {
            if (DEBUG)
                console.log(
                    `[AGENT WALLET] Processing agent wallet for user: ${userWalletAddress}`
                );

            if (!userWalletAddress) {
                throw new Error(
                    "User wallet address is required to get or create an agent wallet"
                );
            }

            // 1. Check if user wallet already has an agent wallet in AgentWalletMap
            const existingMapping = await prisma.agentWalletMap.findUnique({
                where: { userWalletAddress },
            });

            if (DEBUG)
                console.log(
                    `[AGENT WALLET] Existing mapping check result: ${!!existingMapping}`
                );

            if (existingMapping) {
                // 2. If mapping exists, get the agent wallet
                const agentWallet = await prisma.agentWallet.findUnique({
                    where: { agent_id: existingMapping.agent_id },
                });

                if (DEBUG)
                    console.log(
                        `[AGENT WALLET] Existing wallet check result: ${!!agentWallet}`
                    );

                if (agentWallet) {
                    console.log(
                        `[AGENT WALLET] Found existing agent wallet for user wallet: ${userWalletAddress}`
                    );

                    // Validate and resolve the private key format before returning
                    try {
                        const resolvedPrivateKey = decryptStoredKey(
                            agentWallet.walletPrivateKey,
                            userWalletAddress
                        );
                        const testAccount = privateKeyToAccount(resolvedPrivateKey);
                        console.log(
                            `[AGENT WALLET] Private key validation successful: ${testAccount.address}`
                        );

                        return {
                            privateKey: resolvedPrivateKey,
                            agentId: agentWallet.agent_id,
                            agentWalletAddress: agentWallet.walletPublicKey as Address,
                        };
                    } catch (keyError) {
                        console.error(
                            `[AGENT WALLET] Corrupted private key detected for agent ${agentWallet.agent_id}:`,
                            keyError
                        );
                        console.log(
                            `[AGENT WALLET] Regenerating private key for agent ${agentWallet.agent_id}...`
                        );

                        // Generate a new private key
                        const newPrivateKey = generatePrivateKey();
                        const newAccount = privateKeyToAccount(newPrivateKey);
                        const encryptedKey = encryptStoredKey(newPrivateKey, userWalletAddress);

                        // Update the agent wallet with the encrypted private key and public address
                        await prisma.agentWallet.update({
                            where: { agent_id: agentWallet.agent_id },
                            data: {
                                walletPrivateKey: encryptedKey,
                                walletPublicKey: newAccount.address,
                            },
                        });

                        console.log(
                            `[AGENT WALLET] Private key regenerated successfully: ${newAccount.address}`
                        );

                        return {
                            privateKey: newPrivateKey,
                            agentId: agentWallet.agent_id,
                            agentWalletAddress: newAccount.address,
                        };
                    }
                } else {
                    console.warn(
                        `[AGENT WALLET] Found mapping but no wallet for agent_id: ${existingMapping.agent_id}`
                    );
                }
            }

            // 3. If no mapping or wallet exists, create a new one using a transaction
            console.log(
                `[AGENT WALLET] Creating new agent wallet for user wallet: ${userWalletAddress}`
            );
            const newAgentId = crypto.randomUUID();
            const newPrivateKey = generatePrivateKey();
            const account = privateKeyToAccount(newPrivateKey);
            const encryptedKey = encryptStoredKey(newPrivateKey, userWalletAddress);

            if (DEBUG)
                console.log(
                    `[AGENT WALLET] Generated new private key and account: ${account.address}`
                );

            try {
                // Use a transaction to ensure both records are created or neither is created
                await prisma.$transaction([
                    // 4. Store the new agent wallet with encrypted private key
                    prisma.agentWallet.create({
                        data: {
                            agent_id: newAgentId,
                            walletPrivateKey: encryptedKey,
                            walletPublicKey: account.address,
                        },
                    }),

                    // 5. Create the mapping between user wallet and agent wallet
                    prisma.agentWalletMap.create({
                        data: {
                            agent_id: newAgentId,
                            userWalletAddress,
                        },
                    }),
                ]);

                console.log(
                    `[AGENT WALLET] New agent wallet created and verified with address: ${account.address}`
                );
            } catch (txError) {
                // Handle duplicate races gracefully (idempotent behavior)
                if (
                    (txError instanceof Prisma.PrismaClientKnownRequestError &&
                    txError.code === "P2002") ||
                    (txError as any)?.code === "P2002"
                ) {
                    console.warn(
                        "[AGENT WALLET] Duplicate creation race detected. Fetching existing mapping/wallet instead."
                    );
                    const mapping = await prisma.agentWalletMap.findUnique({
                        where: { userWalletAddress },
                    });
                    if (mapping) {
                        const existingWallet = await prisma.agentWallet.findUnique({
                            where: { agent_id: mapping.agent_id },
                        });
                        if (existingWallet) {
                            const resolvedKey = decryptStoredKey(
                                existingWallet.walletPrivateKey,
                                userWalletAddress
                            );
                            return {
                                privateKey: resolvedKey,
                                agentId: existingWallet.agent_id,
                                agentWalletAddress: existingWallet.walletPublicKey as Address,
                            };
                        }
                    }
                    throw new Error("Duplicate detected but existing records not found");
                }
                console.error(
                    "[AGENT WALLET] Transaction error during wallet creation:",
                    txError
                );
                throw new Error(
                    `Transaction failed: ${txError instanceof Error ? txError.message : "Unknown error"
                    }`
                );
            }

            return {
                privateKey: newPrivateKey,
                agentId: newAgentId,
                agentWalletAddress: account.address,
            };
        } catch (error) {
            console.error("[AGENT WALLET] Error in getOrCreateAgentWallet:", error);
            throw new Error(
                `Failed to get or create agent wallet: ${error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Check if a user wallet has an associated agent wallet
     *
     * @param userWalletAddress - The user's wallet address
     * @returns True if an agent wallet exists for this user
     */
    static async hasAgentWallet(userWalletAddress: string): Promise<boolean> {
        try {
            if (!userWalletAddress) {
                return false;
            }

            const existingMapping = await prisma.agentWalletMap.findUnique({
                where: { userWalletAddress },
            });

            return !!existingMapping;
        } catch (error) {
            console.error("[AGENT WALLET] Error in hasAgentWallet:", error);
            return false;
        }
    }

    /**
     * Get the agent wallet address for a user wallet
     *
     * @param userWalletAddress - The user's wallet address
     * @returns The agent wallet address or null if not found
     */
    static async getAgentWalletAddress(
        userWalletAddress: string
    ): Promise<Address | null> {
        try {
            if (!userWalletAddress) {
                return null;
            }

            const existingMapping = await prisma.agentWalletMap.findUnique({
                where: { userWalletAddress },
            });

            if (!existingMapping) {
                return null;
            }

            const agentWallet = await prisma.agentWallet.findUnique({
                where: { agent_id: existingMapping.agent_id },
            });

            return agentWallet ? (agentWallet.walletPublicKey as Address) : null;
        } catch (error) {
            console.error("[AGENT WALLET] Error in getAgentWalletAddress:", error);
            return null;
        }
    }

    /**
     * Get or create a smart wallet (wrapper for AgentKit compatibility)
     * This returns the EOA wallet info in a format compatible with SmartWalletProvider
     *
     * @param userWalletAddress - The user's wallet address
     * @returns Promise with wallet data for AgentKit
     */
    static async getOrCreateSmartWallet(userWalletAddress: string): Promise<{
        smartWalletAddress?: Address;
        signerPrivateKey: Hex;
        agentId: string;
        isNewWallet: boolean;
    }> {
        try {
            console.log(
                `[AGENT WALLET] getOrCreateSmartWallet called for: ${userWalletAddress}`
            );

            // Check if wallet already exists
            const existingMapping = await prisma.agentWalletMap.findUnique({
                where: { userWalletAddress },
            });

            const isNewWallet = !existingMapping;

            // Get or create the EOA wallet
            const result = await this.getOrCreateAgentWallet(userWalletAddress);

            // Return in format expected by AgentKit
            // Note: smartWalletAddress can be set later by updateSmartWalletAddress
            const agentWallet = await prisma.agentWallet.findUnique({
                where: { agent_id: result.agentId },
            });

            return {
                smartWalletAddress: agentWallet?.smartWalletAddress as Address | undefined,
                signerPrivateKey: result.privateKey,
                agentId: result.agentId,
                isNewWallet,
            };
        } catch (error) {
            console.error("[AGENT WALLET] Error in getOrCreateSmartWallet:", error);
            throw new Error(
                `Failed to get or create smart wallet: ${error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Update the smart wallet address for an agent wallet
     * This is used when AgentKit creates the actual smart wallet on-chain
     *
     * @param agentId - The agent ID
     * @param smartWalletAddress - The smart wallet address created on-chain
     */
    static async updateSmartWalletAddress(
        agentId: string,
        smartWalletAddress: Address
    ): Promise<void> {
        try {
            console.log(
                `[AGENT WALLET] Updating smart wallet address for agent ${agentId}: ${smartWalletAddress}`
            );

            await prisma.agentWallet.update({
                where: { agent_id: agentId },
                data: { smartWalletAddress },
            });

            console.log(`[AGENT WALLET] Smart wallet address updated successfully`);
        } catch (error) {
            console.error(
                "[AGENT WALLET] Error updating smart wallet address:",
                error
            );
            throw new Error(
                "Failed to update smart wallet address: " +
                (error instanceof Error ? error.message : "Unknown error")
            );
        }
    }
}
