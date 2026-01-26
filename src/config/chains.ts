export const SUPPORTED_CHAINS = {
  BASE_SEPOLIA: {
    id: 84532,
    network: 'base-sepolia',
    name: 'Base Sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://sepolia.base.org'] },
      public: { http: ['https://sepolia.base.org'] },
    },
    blockExplorers: {
      default: { name: 'Basescan', url: 'https://sepolia.basescan.org' },
    },
    testnet: true,
  },
  BASE_MAINNET: {
    id: 8453,
    network: 'base',
    name: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://mainnet.base.org'] },
      public: { http: ['https://mainnet.base.org'] },
    },
    blockExplorers: {
      default: { name: 'Basescan', url: 'https://basescan.org' },
    },
    testnet: false,
  },
} as const;

export const DEFAULT_CHAIN = SUPPORTED_CHAINS.BASE_SEPOLIA;

// Known contracts (move away from hardcoded in services)
export const CONTRACT_ADDRESSES = {
  [SUPPORTED_CHAINS.BASE_SEPOLIA.id]: {
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
    // Add other relevant contract addresses here (e.g., Cupi protocol contracts if any)
  },
  [SUPPORTED_CHAINS.BASE_MAINNET.id]: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base Mainnet USDC
  },
} as const;

export const getContractAddress = (
  chainId: keyof typeof CONTRACT_ADDRESSES,
  token: keyof (typeof CONTRACT_ADDRESSES)[typeof chainId]
) => {
  return CONTRACT_ADDRESSES[chainId][token];
};
