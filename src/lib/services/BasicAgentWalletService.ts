import { prisma } from '@/lib/prisma';
import { type PrivateKeyAccount } from 'viem';
import { createPublicClient, http, type Address } from 'viem';
import { mainnet, base, arbitrum, polygon, baseSepolia } from 'viem/chains';

// Supported chains for basic wallets
const SUPPORTED_CHAINS = {
    mainnet,
    base,
    baseSepolia,
    arbitrum,
    polygon
};

export interface BasicWalletInfo {
    id: string;
    userWalletAddress: string;
    agentWalletAddress: string;
    walletType: string;
    status: string;
    createdAt: Date;
    lastUsedAt: Date | null;
}

export interface CreateBasicWalletParams {
    userWalletAddress: string;
    chainId?: number;
}

export interface BasicWalletWithAccount {
    walletInfo: BasicWalletInfo;
    account: PrivateKeyAccount;
    walletClient: any;
}

export class BasicAgentWalletService {
    private static instance: BasicAgentWalletService;

    private constructor() { }

    public static getInstance(): BasicAgentWalletService {
        if (!BasicAgentWalletService.instance) {
            BasicAgentWalletService.instance = new BasicAgentWalletService();
        }
        return BasicAgentWalletService.instance;
    }

    /**
     * Create a new basic agent wallet for a user
     */
    async createBasicWallet(params: CreateBasicWalletParams): Promise<BasicWalletInfo> {
        const { userWalletAddress } = params;

        try {
            console.log(`[BASIC WALLET SERVICE] Creating wallet for: ${userWalletAddress}`);

            // Check if wallet already exists
            const existingWallet = await this.getBasicWallet(userWalletAddress);
            if (existingWallet) {
                console.log(`[BASIC WALLET SERVICE] Wallet already exists: ${existingWallet.agentWalletAddress}`);
                throw new Error('Basic wallet already exists for this user');
            }

            // Canonical non-custodial: register user's own address without generating or storing private keys
            const agentWalletAddress = userWalletAddress;

            console.log(`[BASIC WALLET SERVICE] Registering non-custodial wallet: ${agentWalletAddress}`);

            // Store in database with empty encrypted private key
            const basicWallet = await prisma.basicAgentWallet.create({
                data: {
                    userWalletAddress,
                    agentWalletAddress,
                    encryptedPrivateKey: '',
                    encryptionSalt: '',
                    walletType: 'canonical',
                    status: 'active'
                }
            });

            console.log(`[BASIC WALLET SERVICE] Wallet stored in database: ${basicWallet.id}`);

            // Update user profile
            await prisma.userProfile.upsert({
                where: { userWalletAddress },
                update: {
                    basicWalletId: basicWallet.id,
                    basicWalletAddress: basicWallet.agentWalletAddress
                },
                create: {
                    userWalletAddress,
                    basicWalletId: basicWallet.id,
                    basicWalletAddress: basicWallet.agentWalletAddress
                }
            });

            // Initialize usage stats
            await prisma.walletUsageStats.create({
                data: {
                    walletId: basicWallet.id,
                    walletType: 'basic'
                }
            });

            console.log(`[BASIC WALLET SERVICE] Wallet creation complete`);

            return {
                id: basicWallet.id,
                userWalletAddress: basicWallet.userWalletAddress,
                agentWalletAddress: basicWallet.agentWalletAddress,
                walletType: basicWallet.walletType,
                status: basicWallet.status,
                createdAt: basicWallet.createdAt,
                lastUsedAt: basicWallet.lastUsedAt
            };
        } catch (error) {
            console.error(`[BASIC WALLET SERVICE] Error creating wallet:`, error);
            throw new Error(`Failed to create basic wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get basic wallet info for a user
     */
    async getBasicWallet(userWalletAddress: string): Promise<BasicWalletInfo | null> {
        try {
            const basicWallet = await prisma.basicAgentWallet.findUnique({
                where: { userWalletAddress }
            });

            if (!basicWallet) {
                return null;
            }

            return {
                id: basicWallet.id,
                userWalletAddress: basicWallet.userWalletAddress,
                agentWalletAddress: basicWallet.agentWalletAddress,
                walletType: basicWallet.walletType,
                status: basicWallet.status,
                createdAt: basicWallet.createdAt,
                lastUsedAt: basicWallet.lastUsedAt
            };
        } catch (error) {
            console.error(`[BASIC WALLET SERVICE] Error getting wallet:`, error);
            throw new Error(`Failed to get basic wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get or create a basic wallet for a user
     */
    async getOrCreateBasicWallet(userWalletAddress: string): Promise<BasicWalletInfo> {
        console.log(`[BASIC WALLET SERVICE] Get or create for: ${userWalletAddress}`);
        const existingWallet = await this.getBasicWallet(userWalletAddress);
        if (existingWallet) {
            console.log(`[BASIC WALLET SERVICE] Returning existing wallet`);
            return existingWallet;
        }

        console.log(`[BASIC WALLET SERVICE] Creating new wallet`);
        return await this.createBasicWallet({ userWalletAddress });
    }

    /**
     * @deprecated Server-side custodial wallet signing is disabled. Transactions must be signed client-side via useSmartAccount.
     */
    async getWalletWithAccount(): Promise<BasicWalletWithAccount> {
        throw new Error(
            'Server-side custodial wallet signing is deprecated and disabled. All transactions must be signed client-side via useSmartAccount.'
        );
    }

    /**
     * Get supported chain by ID
     */
    private getChainById(chainId: number) {
        switch (chainId) {
            case 1:
                return SUPPORTED_CHAINS.mainnet;
            case 8453:
                return SUPPORTED_CHAINS.base;
            case 84532:
                return SUPPORTED_CHAINS.baseSepolia;
            case 42161:
                return SUPPORTED_CHAINS.arbitrum;
            case 137:
                return SUPPORTED_CHAINS.polygon;
            default:
                return null;
        }
    }

    /**
     * Deactivate a basic wallet
     */
    async deactivateWallet(userWalletAddress: string): Promise<void> {
        try {
            await prisma.basicAgentWallet.update({
                where: { userWalletAddress },
                data: { status: 'inactive' }
            });
        } catch (error) {
            throw new Error(`Failed to deactivate wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get wallet balance for a specific chain non-custodially
     */
    async getWalletBalance(userWalletAddress: string, chainId: number = 8453): Promise<bigint> {
        try {
            const chain = this.getChainById(chainId) || SUPPORTED_CHAINS.baseSepolia;
            const publicClient = createPublicClient({
                chain,
                transport: http()
            });
            const balance = await publicClient.getBalance({
                address: userWalletAddress as Address
            });
            return balance;
        } catch (error) {
            throw new Error(`Failed to get wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

export const basicAgentWalletService = BasicAgentWalletService.getInstance();
