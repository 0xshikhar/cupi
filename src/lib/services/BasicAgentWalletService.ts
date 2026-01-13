import { prisma } from '@/lib/prisma';
import { privateKeyToAccount, generatePrivateKey as viemGeneratePrivateKey } from 'viem/accounts';
import { createWalletClient, http, type PrivateKeyAccount } from 'viem';
import { mainnet, base, arbitrum, polygon, baseSepolia } from 'viem/chains';
import {
    encryptPrivateKey,
    decryptPrivateKey,
    generateSalt,
    createMasterPassword,
    isValidPrivateKey
} from '../crypto/encryption';

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

            // Generate new private key
            const privateKey = viemGeneratePrivateKey();
            const account = privateKeyToAccount(privateKey);
            const agentWalletAddress = account.address;

            console.log(`[BASIC WALLET SERVICE] Generated new wallet: ${agentWalletAddress}`);

            // Generate encryption salt and master password
            const salt = generateSalt();
            const masterPassword = createMasterPassword(userWalletAddress);

            // Encrypt the private key
            const encryptedPrivateKey = encryptPrivateKey(
                privateKey.slice(2), // Remove 0x prefix
                masterPassword,
                salt
            );

            // Store in database
            const basicWallet = await prisma.basicAgentWallet.create({
                data: {
                    userWalletAddress,
                    agentWalletAddress,
                    encryptedPrivateKey,
                    encryptionSalt: salt,
                    walletType: 'basic',
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
     * Get wallet with decrypted account for transactions
     */
    async getWalletWithAccount(userWalletAddress: string, chainId: number = 8453): Promise<BasicWalletWithAccount> {
        try {
            const basicWallet = await prisma.basicAgentWallet.findUnique({
                where: { userWalletAddress }
            });

            if (!basicWallet) {
                throw new Error('Basic wallet not found');
            }

            if (basicWallet.status !== 'active') {
                throw new Error('Wallet is not active');
            }

            // Decrypt private key
            const masterPassword = createMasterPassword(userWalletAddress);
            const decryptedPrivateKey = decryptPrivateKey(
                basicWallet.encryptedPrivateKey,
                masterPassword,
                basicWallet.encryptionSalt
            );

            // Create account from private key
            const privateKeyWithPrefix = `0x${decryptedPrivateKey}` as `0x${string}`;
            const account = privateKeyToAccount(privateKeyWithPrefix);

            // Get chain configuration
            const chain = this.getChainById(chainId);
            if (!chain) {
                throw new Error(`Unsupported chain ID: ${chainId}`);
            }

            // Create wallet client
            const walletClient = createWalletClient({
                account,
                chain,
                transport: http()
            });

            // Update last used timestamp
            await prisma.basicAgentWallet.update({
                where: { id: basicWallet.id },
                data: { lastUsedAt: new Date() }
            });

            return {
                walletInfo: {
                    id: basicWallet.id,
                    userWalletAddress: basicWallet.userWalletAddress,
                    agentWalletAddress: basicWallet.agentWalletAddress,
                    walletType: basicWallet.walletType,
                    status: basicWallet.status,
                    createdAt: basicWallet.createdAt,
                    lastUsedAt: basicWallet.lastUsedAt
                },
                account,
                walletClient
            };
        } catch (error) {
            throw new Error(`Failed to get wallet with account: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
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
     * Get wallet balance for a specific chain
     */
    async getWalletBalance(userWalletAddress: string, chainId: number = 8453): Promise<bigint> {
        try {
            const { walletClient } = await this.getWalletWithAccount(userWalletAddress, chainId);
            const balance = await walletClient.getBalance({
                address: walletClient.account.address
            });
            return balance;
        } catch (error) {
            throw new Error(`Failed to get wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

export const basicAgentWalletService = BasicAgentWalletService.getInstance();
