import { NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits, Address } from 'viem';
import { sepolia, baseSepolia } from 'viem/chains';
import { withAuth } from "@/modules/auth/server";

// ERC20 ABI for balanceOf
const ERC20_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

// USDC contract addresses
const USDC_ADDRESSES = {
    sepolia: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address, // Sepolia USDC
    baseSepolia: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address, // Base Sepolia USDC
};

// Approximate prices (can be updated to use real-time API later)
const PRICES = {
    ETH: 3321,
    USDC: 1,   // $1 per USDC
};

export const dynamic = "force-dynamic";

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

        console.log('[WALLET BALANCE] Fetching balance for:', address);

        // Create public clients for both chains
        const sepoliaClient = createPublicClient({
            chain: sepolia,
            transport: http(),
        });

        const baseSepoliaClient = createPublicClient({
            chain: baseSepolia,
            transport: http(),
        });

        // Fetch balances in parallel
        const [
            sepoliaEthBalance,
            baseSepoliaEthBalance,
            sepoliaUsdcBalance,
            baseSepoliaUsdcBalance,
        ] = await Promise.all([
            // Sepolia ETH
            sepoliaClient.getBalance({ address: address as Address }),

            // Base Sepolia ETH
            baseSepoliaClient.getBalance({ address: address as Address }),

            // Sepolia USDC
            sepoliaClient.readContract({
                address: USDC_ADDRESSES.sepolia,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [address as Address],
            }).catch(() => BigInt(0)), // Return 0 if contract doesn't exist or fails

            // Base Sepolia USDC
            baseSepoliaClient.readContract({
                address: USDC_ADDRESSES.baseSepolia,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [address as Address],
            }).catch(() => BigInt(0)), // Return 0 if contract doesn't exist or fails
        ]);

        // Format balances
        const sepoliaEth = parseFloat(formatUnits(sepoliaEthBalance, 18));
        const baseSepoliaEth = parseFloat(formatUnits(baseSepoliaEthBalance, 18));
        const sepoliaUsdc = parseFloat(formatUnits(sepoliaUsdcBalance, 6));
        const baseSepoliaUsdc = parseFloat(formatUnits(baseSepoliaUsdcBalance, 6));

        // Calculate USD values
        const sepoliaTotalUsd = (sepoliaEth * PRICES.ETH) + (sepoliaUsdc * PRICES.USDC);
        const baseSepoliaTotalUsd = (baseSepoliaEth * PRICES.ETH) + (baseSepoliaUsdc * PRICES.USDC);
        const totalUsd = sepoliaTotalUsd + baseSepoliaTotalUsd;

        console.log('[WALLET BALANCE] Balances:', {
            sepolia: { eth: sepoliaEth, usdc: sepoliaUsdc, usd: sepoliaTotalUsd },
            baseSepolia: { eth: baseSepoliaEth, usdc: baseSepoliaUsdc, usd: baseSepoliaTotalUsd },
            total: totalUsd,
        });

        return NextResponse.json({
            totalUsd: totalUsd.toFixed(2),
            balances: {
                sepolia: {
                    eth: sepoliaEth.toFixed(6),
                    usdc: sepoliaUsdc.toFixed(2),
                    totalUsd: sepoliaTotalUsd.toFixed(2),
                },
                baseSepolia: {
                    eth: baseSepoliaEth.toFixed(6),
                    usdc: baseSepoliaUsdc.toFixed(2),
                    totalUsd: baseSepoliaTotalUsd.toFixed(2),
                },
            },
        });
    } catch (error) {
        console.error('[WALLET BALANCE] Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch wallet balance',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
};
