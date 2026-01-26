import { usePrivy } from '@privy-io/react-auth';
import { useCallback, useEffect, useState } from 'react';
import { isValidEthereumAddress } from '../utils/format';

export type WalletTier = 'basic' | 'pro';
export type WalletStatus = 'loading' | 'ready' | 'error' | null;

export interface DualWalletState {
  // User wallet info
  userWalletAddress: string | null;
  isLoading: boolean;
  
  // Wallet tier info
  walletTier: WalletTier;
  
  // Basic wallet info
  basicWalletStatus: WalletStatus;
  basicWalletAddress: string | null;
  
  // Pro wallet info (existing smart wallet)
  proWalletStatus: WalletStatus;
  proWalletAddress: string | null;
  
  // Active wallet (based on tier)
  activeWalletAddress: string | null;
  activeWalletStatus: WalletStatus;
}

/**
 * Enhanced hook for dual wallet system supporting both basic and pro wallets
 * Automatically detects user's tier and manages appropriate wallet type
 */
export function useDualWallet() {
  const { user, ready } = usePrivy();
  
  const [state, setState] = useState<DualWalletState>({
    userWalletAddress: null,
    isLoading: true,
    walletTier: 'basic',
    basicWalletStatus: null,
    basicWalletAddress: null,
    proWalletStatus: null,
    proWalletAddress: null,
    activeWalletAddress: null,
    activeWalletStatus: null
  });

  /**
   * Ensure basic wallet exists for the user using unified agent-wallet API
   */
  const ensureBasicWallet = useCallback(async (userWalletAddress: string) => {
    try {
      console.log('[DUAL WALLET] Ensuring basic wallet for:', userWalletAddress);
      
      setState(prev => ({ ...prev, basicWalletStatus: 'loading' }));
      
      // Use unified agent-wallet API which now handles basic wallets
      const response = await fetch(`/api/agent-wallet?userWalletAddress=${encodeURIComponent(userWalletAddress)}`);

      if (response.ok) {
        const data = await response.json();
        
        if (data.hasAgentWallet && data.walletTier === 'basic') {
          console.log('[DUAL WALLET] Basic wallet ready:', data.agentWalletAddress);
          
          setState(prev => ({
            ...prev,
            basicWalletStatus: 'ready',
            basicWalletAddress: data.agentWalletAddress
          }));
          
          return { agentWalletAddress: data.agentWalletAddress };
        } else {
          console.error('[DUAL WALLET] No basic wallet found or wrong tier');
          setState(prev => ({ ...prev, basicWalletStatus: 'error' }));
          return null;
        }
      } else {
        console.error('[DUAL WALLET] Failed to get basic wallet');
        setState(prev => ({ ...prev, basicWalletStatus: 'error' }));
        return null;
      }
    } catch (error) {
      console.error('[DUAL WALLET] Error ensuring basic wallet:', error);
      setState(prev => ({ ...prev, basicWalletStatus: 'error' }));
      return null;
    }
  }, []);

  /**
   * Ensure pro wallet exists for the user (existing smart wallet flow)
   */
  const ensureProWallet = useCallback(async (userWalletAddress: string) => {
    try {
      console.log('[DUAL WALLET] Ensuring pro wallet for:', userWalletAddress);
      
      setState(prev => ({ ...prev, proWalletStatus: 'loading' }));
      
      // Check if agent wallet already exists
      const checkResponse = await fetch(`/api/agent-wallet?userWalletAddress=${encodeURIComponent(userWalletAddress)}`);
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        
        if (checkData.hasAgentWallet && checkData.agentWalletAddress && checkData.walletTier === 'pro') {
          console.log('[DUAL WALLET] Found existing pro wallet:', checkData.agentWalletAddress);
          
          const walletAddress = checkData.smartWalletAddress || checkData.agentWalletAddress;
          setState(prev => ({
            ...prev,
            proWalletStatus: 'ready',
            proWalletAddress: walletAddress
          }));
          
          return { agentWalletAddress: walletAddress };
        }
      }

      // Create new pro wallet if it doesn't exist
      console.log('[DUAL WALLET] Creating new pro wallet...');
      const createResponse = await fetch('/api/agent-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userWalletAddress })
      });

      if (createResponse.ok) {
        const createData = await createResponse.json();
        console.log('[DUAL WALLET] Pro wallet created successfully:', createData.agentWalletAddress);
        
        setState(prev => ({
          ...prev,
          proWalletStatus: 'ready',
          proWalletAddress: createData.agentWalletAddress
        }));
        
        return createData;
      } else {
        console.error('[DUAL WALLET] Failed to create pro wallet');
        setState(prev => ({ ...prev, proWalletStatus: 'error' }));
        return null;
      }
    } catch (error) {
      console.error('[DUAL WALLET] Error ensuring pro wallet:', error);
      setState(prev => ({ ...prev, proWalletStatus: 'error' }));
      return null;
    }
  }, []);

  /**
   * Determine user's wallet tier and setup appropriate wallet
   */
  const setupUserWallet = useCallback(async (userWalletAddress: string) => {
    try {
      console.log('[DUAL WALLET] Setting up wallet for user:', userWalletAddress);
      
      // Register/update user in database
      try {
        const userResponse = await fetch('/api/auth/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            walletAddress: userWalletAddress,
            isNewUser: false
          })
        });

        if (!userResponse.ok) {
          console.warn('[DUAL WALLET] User registration failed, but continuing...');
        }
      } catch (userError) {
        console.warn('[DUAL WALLET] User registration error:', userError);
      }

      // Check user profile to determine tier
      try {
        const profileResponse = await fetch(`/api/user/profile?walletAddress=${encodeURIComponent(userWalletAddress)}`);
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          const tier = profileData.walletTier || 'basic';
          
          console.log('[DUAL WALLET] User tier detected:', tier);
          setState(prev => ({ ...prev, walletTier: tier as WalletTier }));
          
          if (tier === 'pro') {
            // Setup pro wallet
            const proWallet = await ensureProWallet(userWalletAddress);
            if (proWallet) {
              setState(prev => ({
                ...prev,
                activeWalletAddress: prev.proWalletAddress,
                activeWalletStatus: prev.proWalletStatus
              }));
            }
          } else {
            // Setup basic wallet (default)
            const basicWallet = await ensureBasicWallet(userWalletAddress);
            if (basicWallet) {
              setState(prev => ({
                ...prev,
                activeWalletAddress: prev.basicWalletAddress,
                activeWalletStatus: prev.basicWalletStatus
              }));
            }
          }
        } else {
          // Default to basic tier for new users
          console.log('[DUAL WALLET] Defaulting to basic tier for new user');
          setState(prev => ({ ...prev, walletTier: 'basic' }));
          
          const basicWallet = await ensureBasicWallet(userWalletAddress);
          if (basicWallet) {
            setState(prev => ({
              ...prev,
              activeWalletAddress: prev.basicWalletAddress,
              activeWalletStatus: prev.basicWalletStatus
            }));
          }
        }
      } catch (profileError) {
        console.warn('[DUAL WALLET] Profile check failed, defaulting to basic:', profileError);
        setState(prev => ({ ...prev, walletTier: 'basic' }));
        
        const basicWallet = await ensureBasicWallet(userWalletAddress);
        if (basicWallet) {
          setState(prev => ({
            ...prev,
            activeWalletAddress: prev.basicWalletAddress,
            activeWalletStatus: prev.basicWalletStatus
          }));
        }
      }
    } catch (error) {
      console.error('[DUAL WALLET] Error setting up user wallet:', error);
      setState(prev => ({
        ...prev,
        basicWalletStatus: 'error',
        proWalletStatus: 'error',
        activeWalletStatus: 'error'
      }));
    }
  }, [ensureBasicWallet, ensureProWallet]);

  /**
   * Get wallet address and setup appropriate wallet type
   */
  const initializeWallet = useCallback(async () => {
    if (!ready || !user) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        userWalletAddress: null,
        basicWalletStatus: null,
        proWalletStatus: null,
        activeWalletStatus: null
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Get the first connected wallet from the user's linked accounts
      const connectedWallets = user.linkedAccounts.filter(
        (account) => account.type === 'wallet'
      );

      if (connectedWallets.length > 0) {
        const primaryWallet = connectedWallets[0];
        const address = primaryWallet.address || null;
        
        if (address && isValidEthereumAddress(address)) {
          setState(prev => ({ ...prev, userWalletAddress: address }));
          await setupUserWallet(address);
        } else {
          console.error('[DUAL WALLET] Invalid wallet address:', address);
          setState(prev => ({
            ...prev,
            userWalletAddress: null,
            activeWalletStatus: 'error'
          }));
        }
      } else {
        setState(prev => ({
          ...prev,
          userWalletAddress: null,
          basicWalletStatus: null,
          proWalletStatus: null,
          activeWalletStatus: null
        }));
      }
    } catch (error) {
      console.error('[DUAL WALLET] Error initializing wallet:', error);
      setState(prev => ({
        ...prev,
        userWalletAddress: null,
        activeWalletStatus: 'error'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [ready, user, setupUserWallet]);

  useEffect(() => {
    initializeWallet();
  }, [initializeWallet]);

  /**
   * Upgrade user from basic to pro tier
   */
  const upgradeToPro = useCallback(async () => {
    if (!state.userWalletAddress) {
      throw new Error('No user wallet address available');
    }

    try {
      console.log('[DUAL WALLET] Upgrading user to pro tier...');
      
      // Create pro wallet
      const proWallet = await ensureProWallet(state.userWalletAddress);
      if (!proWallet) {
        throw new Error('Failed to create pro wallet');
      }

      // Update user profile tier
      const updateResponse = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: state.userWalletAddress,
          walletTier: 'pro',
          tierUpgradedAt: new Date().toISOString()
        })
      });

      if (updateResponse.ok) {
        setState(prev => ({
          ...prev,
          walletTier: 'pro',
          activeWalletAddress: prev.proWalletAddress,
          activeWalletStatus: prev.proWalletStatus
        }));
        
        console.log('[DUAL WALLET] Successfully upgraded to pro tier');
        return true;
      } else {
        throw new Error('Failed to update user profile');
      }
    } catch (error) {
      console.error('[DUAL WALLET] Error upgrading to pro:', error);
      throw error;
    }
  }, [state.userWalletAddress, ensureProWallet]);

  /**
   * Refresh wallet information
   */
  const refreshWallet = useCallback(async () => {
    if (state.userWalletAddress) {
      await setupUserWallet(state.userWalletAddress);
    }
  }, [state.userWalletAddress, setupUserWallet]);

  return {
    // Current state
    ...state,
    
    // Actions
    refreshWallet,
    upgradeToPro,
    initializeWallet,
    
    // Legacy compatibility (for existing components)
    walletAddress: state.userWalletAddress,
    agentWalletAddress: state.activeWalletAddress,
    agentWalletStatus: state.activeWalletStatus,
    refreshWalletAddress: initializeWallet,
    refreshAgentWallet: refreshWallet
  };
}