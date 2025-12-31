import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export type WalletMode = 'pro';

export interface WalletInfo {
  address: string | null;
  status: 'idle' | 'loading' | 'connected' | 'error';
  walletType: 'EOA' | 'Smart Contract';
  error?: string;
}

export interface UnifiedWalletState {
  // Current active wallet info
  activeWalletAddress: string | null;
  activeWalletStatus: 'idle' | 'loading' | 'connected' | 'error';
  activeWalletType: 'EOA' | 'Smart Contract';
  
  // Current mode
  walletMode: WalletMode;
  
  // Individual wallet info
  basicWallet: WalletInfo;
  proWallet: WalletInfo;
  
  // User wallet (Privy)
  userWalletAddress: string | null;
  userWalletStatus: 'idle' | 'loading' | 'connected' | 'error';
  
  // Actions
  switchMode: (mode: WalletMode) => void;
  ensureWallet: () => Promise<void>;
  refreshWallets: () => Promise<void>;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

/**
 * Unified wallet hook that manages pro wallets only
 * Basic mode has been removed - all users use pro wallets
 */
export function useUnifiedWallet(): UnifiedWalletState {
  const { user, authenticated, ready } = usePrivy();
  
  // Cache to prevent duplicate API calls
  const cacheRef = useRef<{
    proWallet: { data: WalletInfo | null; timestamp: number };
  }>({
    proWallet: { data: null, timestamp: 0 }
  });
  
  const CACHE_DURATION = 30000; // 30 seconds cache
  
  // State management - only pro wallet now
  const [walletMode] = useState<WalletMode>('pro'); // Always pro mode
  const [basicWallet] = useState<WalletInfo>({
    address: null,
    status: 'idle',
    walletType: 'EOA'
  }); // Empty state for backward compatibility
  const [proWallet, setProWallet] = useState<WalletInfo>({
    address: null,
    status: 'idle',
    walletType: 'Smart Contract'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Derived user wallet info
  const userWalletAddress = user?.linkedAccounts?.find(account => account.type === 'wallet')?.address || null;
  const userWalletStatus = userWalletAddress ? 'connected' : (authenticated && ready ? 'loading' : 'idle');
  
  // Derived active wallet info - always pro wallet
  const activeWallet = proWallet;
  const activeWalletAddress = activeWallet.address;
  const activeWalletStatus = activeWallet.status;
  const activeWalletType = activeWallet.walletType;
  
  /**
   * Fetch pro wallet info
   */
  const fetchProWallet = useCallback(async () => {
    if (!userWalletAddress) return;
    
    // Check cache first
    const now = Date.now();
    const cached = cacheRef.current.proWallet;
    if (cached.data && (now - cached.timestamp) < CACHE_DURATION) {
      console.log('[PRO WALLET API] Using cached data');
      setProWallet(cached.data);
      return;
    }
    
    try {
      setProWallet(prev => ({ ...prev, status: 'loading' }));
      
      const response = await fetch(`/api/agent-wallet?userWalletAddress=${userWalletAddress}`);
      const data = await response.json();
      
      let walletInfo: WalletInfo;
      
      if (response.ok) {
        if (data.hasAgentWallet) {
          walletInfo = {
            address: data.agentWalletAddress,
            status: 'connected',
            walletType: 'Smart Contract'
          };
        } else {
          walletInfo = {
            address: null,
            status: 'idle',
            walletType: 'Smart Contract'
          };
        }
      } else {
        walletInfo = {
          address: null,
          status: 'error',
          walletType: 'Smart Contract',
          error: data.error || 'Failed to fetch pro wallet'
        };
      }
      
      // Update cache and state
      cacheRef.current.proWallet = { data: walletInfo, timestamp: now };
      setProWallet(walletInfo);
      
    } catch (err) {
      const errorWallet = {
        address: null,
        status: 'error' as const,
        walletType: 'Smart Contract' as const,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
      
      cacheRef.current.proWallet = { data: errorWallet, timestamp: now };
      setProWallet(errorWallet);
    }
  }, [userWalletAddress, CACHE_DURATION]);
  
  /**
   * Create pro wallet
   */
  const createProWallet = useCallback(async () => {
    if (!userWalletAddress) return;
    
    try {
      setProWallet(prev => ({ ...prev, status: 'loading' }));
      
      const response = await fetch('/api/agent-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userWalletAddress })
      });
      
      const data = await response.json();
      
      const walletInfo: WalletInfo = response.ok ? {
        address: data.agentWalletAddress,
        status: 'connected',
        walletType: 'Smart Contract'
      } : {
        address: null,
        status: 'error',
        walletType: 'Smart Contract',
        error: data.error || 'Failed to create pro wallet'
      };
      
      // Update cache
      cacheRef.current.proWallet = { data: walletInfo, timestamp: Date.now() };
      setProWallet(walletInfo);
      
    } catch (err) {
      const errorWallet: WalletInfo = {
        address: null,
        status: 'error',
        walletType: 'Smart Contract',
        error: err instanceof Error ? err.message : 'Unknown error'
      };
      
      cacheRef.current.proWallet = { data: errorWallet, timestamp: Date.now() };
      setProWallet(errorWallet);
    }
  }, [userWalletAddress]);
  
  /**
   * Ensure the pro wallet exists
   */
  const ensureWallet = useCallback(async () => {
    if (!userWalletAddress) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if pro wallet exists, create if not
      await fetchProWallet();
      const latest = cacheRef.current.proWallet.data;
      if (!latest?.address) {
        await createProWallet();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ensure wallet');
    } finally {
      setIsLoading(false);
    }
  }, [userWalletAddress, fetchProWallet, createProWallet]);
  
  /**
   * Refresh pro wallet
   */
  const refreshWallets = useCallback(async () => {
    if (!userWalletAddress) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await fetchProWallet();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh wallet');
    } finally {
      setIsLoading(false);
    }
  }, [userWalletAddress, fetchProWallet]);
  
  /**
   * Switch wallet mode (no-op, always pro mode)
   */
  const switchMode = useCallback((mode: WalletMode) => {
    // Always pro mode, no switching needed
    setError(null);
  }, []);
  
  // Initial wallet fetch when user wallet is available (with debouncing)
  useEffect(() => {
    if (!userWalletAddress || !authenticated) return;
    
    // Only fetch if we don't have cached data
    const hasProCache = cacheRef.current.proWallet.data !== null;
    
    if (!hasProCache) {
      const timeoutId = setTimeout(() => {
        refreshWallets();
      }, 100); // Small debounce to prevent rapid calls
      
      return () => clearTimeout(timeoutId);
    }
  }, [userWalletAddress, authenticated, refreshWallets]);
  
  // Auto-ensure wallet when needed
  useEffect(() => {
    if (!userWalletAddress || !authenticated) return;
    
    // Only ensure wallet if it's idle (avoid retry loops on error)
    if (proWallet.status === 'idle') {
      const timeoutId = setTimeout(() => {
        ensureWallet();
      }, 200); // Debounce to prevent rapid calls
      
      return () => clearTimeout(timeoutId);
    }
  }, [userWalletAddress, authenticated, proWallet.status, proWallet.address, ensureWallet]);
  
  return {
    // Active wallet info
    activeWalletAddress,
    activeWalletStatus,
    activeWalletType,
    
    // Current mode
    walletMode,
    
    // Individual wallet info
    basicWallet,
    proWallet,
    
    // User wallet info
    userWalletAddress,
    userWalletStatus,
    
    // Actions
    switchMode,
    ensureWallet,
    refreshWallets,
    
    // Loading states
    isLoading,
    error
  };
}