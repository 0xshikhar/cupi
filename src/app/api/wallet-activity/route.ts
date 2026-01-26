import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from "@/modules/auth/server";

// Blockscout V2 Endpoints
const SEPOLIA_API = 'https://eth-sepolia.blockscout.com/api/v2';
const BASE_SEPOLIA_API = 'https://base-sepolia.blockscout.com/api/v2';

// Helper to sync transaction to DB
async function syncTransactionsToDB(transactions: any[], userId: string) {
    if (!userId || !transactions.length) return;

    // console.log(`[SYNC] Syncing ${transactions.length} transactions for user ${userId}`);

    for (const tx of transactions) {
        try {
            // Determine Type
            // If we received it => DEPOSIT
            // If we sent it => WITHDRAWAL
            const isIncoming = tx.type === 'received';
            const type = isIncoming ? 'DEPOSIT' : 'WITHDRAWAL';

            // Amount is already formatted string in our mapped object? 
            // Let's use the mapped object properties directly

            await prisma.transaction.upsert({
                where: { txHash: tx.hash.toLowerCase() },
                update: {
                    status: !tx.isError ? 'CONFIRMED' : 'FAILED',
                },
                create: {
                    userId,
                    type,
                    amount: tx.amountFormatted, // Use pre-calculated formatted string
                    tokenSymbol: tx.tokenSymbol || 'ETH',
                    txHash: tx.hash.toLowerCase(),
                    chainId: tx.chainId,
                    status: !tx.isError ? 'CONFIRMED' : 'FAILED',
                    fromAddress: tx.from,
                    toAddress: tx.to,
                }
            });
        } catch (error) {
            console.error('[SYNC] Error syncing tx:', tx.hash, error);
        }
    }
}

async function fetchBlockscoutTransactions(baseUrl: string, address: string, chainId: number, chainName: string) {
    try {
        const url = `${baseUrl}/addresses/${address}/transactions`;
        // console.log(`[API] Fetching ${chainName} from Blockscout: ${url}`);

        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`[API] ${chainName} failed: ${response.status}`);
            return [];
        }

        const data = await response.json();
        const items = data.items || [];

        return items.map((tx: any) => {
            const isSent = tx.from.hash?.toLowerCase() === address.toLowerCase();
            const date = new Date(tx.timestamp);

            // Determine Amount and Token
            let valueWei = '0';
            let decimals = 18;
            let symbol = 'ETH';

            // Logic: Prioritize Native Value if > 0
            if (tx.value && tx.value !== '0') {
                valueWei = tx.value;
                symbol = 'ETH';
                // Base Sepolia also uses ETH
            }
            // Fallback to first Token Transfer if Native is 0
            else if (tx.token_transfers && tx.token_transfers.length > 0) {
                const tt = tx.token_transfers[0];
                if (tt.total && tt.total.value) {
                    valueWei = tt.total.value;
                    decimals = tt.token.decimals ? parseInt(tt.token.decimals) : 18;
                    symbol = tt.token.symbol || 'Unknown';
                }
            }

            const amountVal = parseFloat(valueWei) / Math.pow(10, decimals);
            const amountFormatted = amountVal.toString(); // For DB

            // For response, we might want fixed string?
            // "value" field in response is expected to be Wei? 
            // Previous Etherscan logic returned Wei in 'value'.
            // But let's return standard object for frontend usage

            return {
                timeStamp: Math.floor(date.getTime() / 1000).toString(), // Unix timestamp string for compatibility
                hash: tx.hash,
                from: tx.from.hash,
                to: tx.to.hash,
                value: valueWei, // Keep Wei for compatibility if frontend calculates
                amountFormatted, // Add this for easier usage/sync
                tokenDecimal: decimals.toString(),
                tokenSymbol: symbol,
                chainName: chainName,
                chainId: chainId,
                type: isSent ? 'sent' : 'received',
                isError: tx.status !== 'ok',
                gasUsed: tx.gas_used || '0'
            };
        });

    } catch (error) {
        console.error(`[API] Error fetching ${chainName}:`, error);
        return [];
    }
}

export const GET = withAuth(async (request, { auth }) => {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');

        if (!address) {
            return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }

        // Find associated User for Syncing
        let userId: string | null = null;
        try {
            const basicWallet = await prisma.basicAgentWallet.findUnique({
                where: { agentWalletAddress: address.toLowerCase() }
            });

            if (basicWallet) {
                const user = await prisma.user.findUnique({
                    where: { walletAddress: basicWallet.userWalletAddress }
                });
                if (user) {
                    userId = user.id;
                }
            }
        } catch (e) {
            console.warn('[WALLET ACTIVITY] Could not find user for address, skipping sync:', e);
        }

        // Fetch from chains using Blockscout
        const [sepoliaTxs, baseSepoliaTxs] = await Promise.all([
            fetchBlockscoutTransactions(SEPOLIA_API, address, 11155111, 'Sepolia'),
            fetchBlockscoutTransactions(BASE_SEPOLIA_API, address, 84532, 'Base Sepolia')
        ]);

        const allTransactions = [...sepoliaTxs, ...baseSepoliaTxs].sort((a, b) =>
            parseInt(b.timeStamp) - parseInt(a.timeStamp)
        );

        // Sync to DB
        if (userId) {
            await syncTransactionsToDB(allTransactions, userId);
        }

        return NextResponse.json({ transactions: allTransactions });

    } catch (error) {
        console.error('[WALLET ACTIVITY] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
    }
});
