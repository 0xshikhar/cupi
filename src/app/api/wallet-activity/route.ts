import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { sepolia, baseSepolia } from 'viem/chains';

// Etherscan API endpoints
const SEPOLIA_API = 'https://api-sepolia.etherscan.io/api';
const BASESCAN_API = 'https://api-sepolia.basescan.org/api';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');

        if (!address) {
            return NextResponse.json(
                { error: 'Wallet address is required' },
                { status: 400 }
            );
        }

        console.log('[WALLET ACTIVITY] Fetching on-chain activity for:', address);

        // Fetch transactions from both networks in parallel
        const [sepoliaTransactions, baseSepoliaTransactions] = await Promise.all([
            fetchSepoliaTransactions(address),
            fetchBaseSepoliaTransactions(address),
        ]);

        // Combine and sort by timestamp
        const allTransactions = [
            ...sepoliaTransactions,
            ...baseSepoliaTransactions,
        ].sort((a, b) => b.timeStamp - a.timeStamp);

        console.log('[WALLET ACTIVITY] Found', allTransactions.length, 'transactions');

        return NextResponse.json({ transactions: allTransactions });
    } catch (error) {
        console.error('[WALLET ACTIVITY] Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch wallet activity',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

async function fetchSepoliaTransactions(address: string) {
    try {
        // Fetch normal transactions
        const normalTxUrl = `${SEPOLIA_API}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken'}`;

        // Fetch ERC20 token transfers
        const tokenTxUrl = `${SEPOLIA_API}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken'}`;

        const [normalRes, tokenRes] = await Promise.all([
            fetch(normalTxUrl),
            fetch(tokenTxUrl),
        ]);

        const normalData = await normalRes.json();
        const tokenData = await tokenRes.json();

        const transactions = [];

        // Process normal transactions (ETH)
        if (normalData.status === '1' && normalData.result) {
            for (const tx of normalData.result.slice(0, 20)) {
                transactions.push({
                    hash: tx.hash,
                    from: tx.from,
                    to: tx.to,
                    value: tx.value,
                    tokenSymbol: 'ETH',
                    tokenName: 'Ethereum',
                    tokenDecimal: '18',
                    timeStamp: parseInt(tx.timeStamp),
                    type: tx.from.toLowerCase() === address.toLowerCase() ? 'sent' : 'received',
                    chainId: 11155111, // Sepolia
                    chainName: 'Sepolia',
                    isError: tx.isError === '1',
                });
            }
        }

        // Process token transactions
        if (tokenData.status === '1' && tokenData.result) {
            for (const tx of tokenData.result.slice(0, 20)) {
                transactions.push({
                    hash: tx.hash,
                    from: tx.from,
                    to: tx.to,
                    value: tx.value,
                    tokenSymbol: tx.tokenSymbol,
                    tokenName: tx.tokenName,
                    tokenDecimal: tx.tokenDecimal,
                    timeStamp: parseInt(tx.timeStamp),
                    type: tx.from.toLowerCase() === address.toLowerCase() ? 'sent' : 'received',
                    chainId: 11155111,
                    chainName: 'Sepolia',
                    isError: false,
                });
            }
        }

        return transactions;
    } catch (error) {
        console.error('[SEPOLIA] Error fetching transactions:', error);
        return [];
    }
}

async function fetchBaseSepoliaTransactions(address: string) {
    try {
        // Fetch normal transactions
        const normalTxUrl = `${BASESCAN_API}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${process.env.BASESCAN_API_KEY || 'YourApiKeyToken'}`;

        // Fetch ERC20 token transfers
        const tokenTxUrl = `${BASESCAN_API}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${process.env.BASESCAN_API_KEY || 'YourApiKeyToken'}`;

        const [normalRes, tokenRes] = await Promise.all([
            fetch(normalTxUrl),
            fetch(tokenTxUrl),
        ]);

        const normalData = await normalRes.json();
        const tokenData = await tokenRes.json();

        const transactions = [];

        // Process normal transactions (ETH)
        if (normalData.status === '1' && normalData.result) {
            for (const tx of normalData.result.slice(0, 20)) {
                transactions.push({
                    hash: tx.hash,
                    from: tx.from,
                    to: tx.to,
                    value: tx.value,
                    tokenSymbol: 'ETH',
                    tokenName: 'Ethereum',
                    tokenDecimal: '18',
                    timeStamp: parseInt(tx.timeStamp),
                    type: tx.from.toLowerCase() === address.toLowerCase() ? 'sent' : 'received',
                    chainId: 84532, // Base Sepolia
                    chainName: 'Base Sepolia',
                    isError: tx.isError === '1',
                });
            }
        }

        // Process token transactions
        if (tokenData.status === '1' && tokenData.result) {
            for (const tx of tokenData.result.slice(0, 20)) {
                transactions.push({
                    hash: tx.hash,
                    from: tx.from,
                    to: tx.to,
                    value: tx.value,
                    tokenSymbol: tx.tokenSymbol,
                    tokenName: tx.tokenName,
                    tokenDecimal: tx.tokenDecimal,
                    timeStamp: parseInt(tx.timeStamp),
                    type: tx.from.toLowerCase() === address.toLowerCase() ? 'sent' : 'received',
                    chainId: 84532,
                    chainName: 'Base Sepolia',
                    isError: false,
                });
            }
        }

        return transactions;
    } catch (error) {
        console.error('[BASE SEPOLIA] Error fetching transactions:', error);
        return [];
    }
}
