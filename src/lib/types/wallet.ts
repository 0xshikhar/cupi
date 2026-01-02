export interface WalletStats {
    balance: string;
    transactionCount: number;
    totalVolume: string;
    gasUsed: string;
}


export interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (amount: string, token: string) => void;
}

export interface ChainInfo {
    id: string;
    name: string;
    networkId: string;
    chainId: number;
}

export interface TokenInfo {
    symbol: string; // e.g. "ETH"
    name: string;
    address: string;
    decimals: number;
}