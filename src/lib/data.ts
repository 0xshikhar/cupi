import { MarketInsight, Recommendation } from "./types/research";
import { ChainInfo, TokenInfo } from "./types";

// Supported chains
export const SUPPORTED_CHAINS: ChainInfo[] = [
    {
        id: "base-mainnet",
        name: "Base Mainnet",
        networkId: "base-mainnet",
        chainId: 8453, // Base Mainnet chain ID
    },
    {
        id:"ethereum-mainnet",
        name:"Ethereum Mainnet",
        networkId:"ethereum-mainnet",
        chainId:1,
    },
    {
        id:"ethereum-sepolia",
        name:"Ethereum Sepolia (Testnet)",
        networkId:"ethereum-sepolia",
        chainId:11155111,
    },
    {
        id:"arbitrum-mainnet",
        name:"Arbitrum Mainnet",
        networkId:"arbitrum-mainnet",
        chainId:42161,
    },
    {
        id:"arbitrum-sepolia",
        name:"Arbitrum Sepolia (Testnet)",
        networkId:"arbitrum-sepolia",
        chainId:421613,
    },
    {
        id: "base-sepolia",
        name: "Base Sepolia (Testnet)",
        networkId: "base-sepolia",
        chainId: 84532, // Base Sepolia chain ID
    },
];

// Supported tokens per chain
export const CHAIN_TOKENS: Record<string, TokenInfo[]> = {
    "base-mainnet": [
        {
            symbol: "ETH",
            name: "Ethereum",
            address: "0x0000000000000000000000000000000000000000", // Native ETH
            decimals: 18,
        },
        {
            symbol: "USDC",
            name: "USD Coin",
            address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            decimals: 6,
        },
    ],
    "ethereum-mainnet": [
        {
            symbol: "ETH",
            name: "Ethereum",
            address: "0x0000000000000000000000000000000000000000", // Native ETH
            decimals: 18,
        },
        {
            symbol: "USDC",
            name: "USD Coin",
            address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            decimals: 6,
        },
    ],
    "arbitrum-mainnet": [
        {
            symbol: "ETH",
            name: "Ethereum",
            address: "0x0000000000000000000000000000000000000000", // Native ETH
            decimals: 18,
        },
        {
            symbol: "USDC",
            name: "USD Coin",
            address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
            decimals: 6,
        },
    ],
    "base-sepolia": [
        {
            symbol: "ETH",
            name: "Ethereum",
            address: "0x0000000000000000000000000000000000000000", // Native ETH
            decimals: 18,
        },
        {
            symbol: "USDC",
            name: "USD Coin",
            address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
            decimals: 6,
        },
    ],
    "ethereum-sepolia": [
        {
            symbol: "ETH",
            name: "Ethereum",
            address: "0x0000000000000000000000000000000000000000", // Native ETH
            decimals: 18,
        },
    ],
    "arbitrum-sepolia": [
        {
            symbol: "ETH",
            name: "Ethereum",
            address: "0x0000000000000000000000000000000000000000", // Native ETH
            decimals: 18,
        },
    ],
};

// API function to fetch real recommendations
export async function fetchRecommendations(userWalletAddress?: string): Promise<Recommendation[]> {
    try {
        const url = userWalletAddress 
            ? `/api/recommendations?userWalletAddress=${userWalletAddress}`
            : '/api/recommendations';
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.data) {
            throw new Error('Invalid recommendations response format');
        }
        
        return data.data;
    } catch (error) {
        console.error('[DATA] Error fetching recommendations:', error);
        
        // Fallback to empty array or basic recommendations
        return [
            {
                id: '1',
                type: 'diversification',
                title: 'Connect Wallet for Personalized Recommendations',
                description: 'Connect your wallet to receive tailored investment recommendations',
                protocols: [],
                impact: 'high',
                reasoning: 'Personalized recommendations require wallet connection to analyze your current portfolio and risk profile.'
            }
        ];
    }
}


// API function to fetch real market data
export async function fetchMarketData() {
    try {
        const response = await fetch('/api/market/data');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch market data: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.data) {
            throw new Error('Invalid market data response format');
        }
        
        return data.data;
    } catch (error) {
        console.error('[DATA] Error fetching market data:', error);
        
        // Fallback to basic market data structure
        return {
            tvlData: {
                labels: ['Loading...'],
                data: [0],
            },
            apyTrends: {
                labels: ['Loading...'],
                datasets: [
                    { name: 'Vaults', data: [0] },
                ],
            },
            riskMatrix: {
                categories: ['Loading...'],
                risk: [0],
                reward: [0],
            },
        };
    }
}

// API function to fetch real market insights
export async function fetchMarketInsights(): Promise<MarketInsight[]> {
    try {
        const response = await fetch('/api/market/insights');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch market insights: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.data) {
            throw new Error('Invalid market insights response format');
        }
        
        return data.data;
    } catch (error) {
        console.error('[DATA] Error fetching market insights:', error);
        
        // Fallback to basic insights
        return [
            {
                id: 1,
                title: 'Market Data Loading',
                category: 'System',
                analysis: 'Market insights are currently being loaded. Please check back in a moment.',
                date: new Date().toISOString(),
                confidence: 0,
            }
        ];
    }
}

// API function to fetch real user portfolios
export async function fetchUserPortfolios(userWalletAddress: string) {
    try {
        const response = await fetch(`/api/portfolio?userWalletAddress=${userWalletAddress}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch portfolios: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.data) {
            throw new Error('Invalid portfolios response format');
        }
        
        return data.data;
    } catch (error) {
        console.error('[DATA] Error fetching user portfolios:', error);
        
        // Return empty portfolios array
        return [];
    }
}

// API function to fetch vault positions (replaces portfolio concept)
export async function fetchVaultPositions(userWalletAddress: string) {
    try {
        const response = await fetch(`/api/vault/status?userWalletAddress=${userWalletAddress}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch vault positions: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.data) {
            throw new Error('Invalid vault positions response format');
        }
        
        return data.data;
    } catch (error) {
        console.error('[DATA] Error fetching vault positions:', error);
        
        return {
            vaults: [],
            summary: {
                totalVaults: 0,
                userTotalInvested: 0,
                userTotalValue: 0,
                userTotalPnl: 0
            }
        };
    }
}


// // old test data - let it here for pro version
export const mockRecommendations: Recommendation[] = [
    {
        id: '1',
        type: 'diversification',
        title: 'Improve Portfolio Diversification',
        description: 'Add exposure to DEX protocols to diversify beyond lending',
        protocols: [],
        impact: 'high',
        reasoning: 'Your portfolio is heavily concentrated in lending protocols. Adding DEX exposure can reduce correlation risk and potentially enhance returns.'
    },
    {
        id: '2',
        type: 'yield',
        title: 'Optimize for Higher Yield',
        description: 'Consider these yield-focused protocols for higher returns',
        protocols: [],
        impact: 'medium',
        reasoning: 'Current yield-generating assets are underperforming compared to market benchmarks. These alternatives offer 2-5% higher APY with similar risk profiles.'
    },
    {
        id: '3',
        type: 'risk',
        title: 'Reduce Portfolio Risk',
        description: 'Replace high-risk exposures with these safer alternatives',
        protocols: [],
        impact: 'high',
        reasoning: 'Several holdings have elevated risk profiles that could be replaced with protocols offering similar functionality but higher security guarantees and audit coverage.'
    },
    {
        id: '4',
        type: 'trending',
        title: 'Trending Opportunities',
        description: 'Popular protocols with increasing TVL and user adoption',
        protocols: [],
        impact: 'low',
        reasoning: 'These protocols have shown consistent growth in TVL and user activity over the past 30 days, indicating potential for continued growth.'
    },
    {
        id: '5',
        type: 'crosschain',
        title: 'Cross-Chain Diversification',
        description: 'Expand to these additional chains for broader exposure',
        protocols: [],
        impact: 'medium',
        reasoning: 'Your portfolio is concentrated on Ethereum. Adding exposure to alternative L1/L2 chains can provide access to unique yield opportunities and reduce gas cost overhead.'
    }
];


export const mockMarketData = {
    tvlData: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        data: [120, 132, 101, 134, 90, 150],
    },
    apyTrends: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
            { name: 'Lending', data: [4.2, 4.5, 4.3, 4.1, 4.0, 3.8] },
            { name: 'DEX', data: [5.1, 5.5, 6.3, 6.5, 6.7, 6.2] },
            { name: 'Yield', data: [9.5, 12.5, 11.3, 10.5, 11.8, 15.3] },
        ],
    },
    riskMatrix: {
        categories: ['Lending', 'DEX', 'Yield', 'Bridge'],
        risk: [8.2, 8.7, 7.4, 6.8],
        reward: [3.9, 5.5, 12.4, 1.5],
    },
}

export const marketInsights: MarketInsight[] = [
    {
        id: 1,
        title: 'Yield protocols showing strong APY growth',
        category: 'Yield',
        analysis: 'Average APY in yield protocols has increased by 5.2% over the past month, suggesting renewed interest in these platforms.',
        date: new Date().toISOString(),
        confidence: 85,
    },
    {
        id: 2,
        title: 'TVL decline in lending markets',
        category: 'Lending',
        analysis: 'Lending protocols have experienced a 3.8% decline in TVL over the past two weeks, potentially indicating a shift toward higher yield opportunities.',
        date: new Date().toISOString(),
        confidence: 72,
    },
    {
        id: 3,
        title: 'Cross-chain bridge activity increasing',
        category: 'Bridge',
        analysis: 'Cross-chain bridges have seen a 12% increase in transaction volume, suggesting growing interest in multi-chain strategies.',
        date: new Date().toISOString(),
        confidence: 91,
    },
];

export const mockPortfolios = [
    {
        id: '1',
        userId: 'user1',
        name: 'Main Portfolio',
        description: 'My primary investment portfolio',
        isActive: true,
        assets: [
            { id: 'asset1', portfolioId: '1', name: 'Ethereum', symbol: 'ETH', type: 'cryptocurrency', amount: 5.3, currentPrice: 3200, chainId: 1 },
            { id: 'asset2', portfolioId: '1', name: 'USD Coin', symbol: 'USDC', type: 'stablecoin', amount: 10000, currentPrice: 1, chainId: 1 },
            { id: 'asset3', portfolioId: '1', name: 'Aave', symbol: 'AAVE', type: 'defi_token', amount: 25, currentPrice: 120, chainId: 1 }
        ],
        strategies: [
            { id: 'strategy1', portfolioId: '1', name: 'DeFi Yield', description: 'Maximize yield through DeFi protocols', targetAllocation: 60, riskLevel: 'moderate', isActive: true },
            { id: 'strategy2', portfolioId: '1', name: 'Stablecoin Reserve', description: 'Stable value reserve assets', targetAllocation: 40, riskLevel: 'low', isActive: true }
        ],
        performanceMetrics: [],
        createdAt: new Date(Date.now() - 90 * 86400000),
        updatedAt: new Date()
    },
    {
        id: '2',
        userId: 'user1',
        name: 'High Risk Portfolio',
        description: 'Higher risk investments for potential growth',
        isActive: true,
        assets: [
            { id: 'asset4', portfolioId: '2', name: 'Solana', symbol: 'SOL', type: 'cryptocurrency', amount: 100, currentPrice: 85, chainId: 1 },
            { id: 'asset5', portfolioId: '2', name: 'Uniswap', symbol: 'UNI', type: 'defi_token', amount: 200, currentPrice: 8, chainId: 1 }
        ],
        strategies: [
            { id: 'strategy3', portfolioId: '2', name: 'High Growth', description: 'Focus on high growth potential assets', targetAllocation: 100, riskLevel: 'high', isActive: true }
        ],
        performanceMetrics: [],
        createdAt: new Date(Date.now() - 45 * 86400000),
        updatedAt: new Date()
    }
];
