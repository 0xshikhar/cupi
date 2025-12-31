import { usePrivy } from '@privy-io/react-auth';
import { useCallback, useEffect, useState } from 'react';
import { isValidEthereumAddress } from '../utils/format';

/**
 * Hook to access the user's connected wallet address from Privy
 * Also handles user registration and agent wallet creation proactively
 * @returns Object containing the user's wallet address, loading state, and agent wallet status
 */
export function usePrivyWallet() {
  const { user, ready } = usePrivy();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [agentWalletStatus, setAgentWalletStatus] = useState<'loading' | 'ready' | 'error' | null>(null);
  const [agentWalletAddress, setAgentWalletAddress] = useState<string | null>(null);

  const ensureUserAndAgentWallet = useCallback(async (userWalletAddress: string) => {
    try {
      console.log('[WALLET HOOK] Ensuring user registration and agent wallet for:', userWalletAddress);
      
      // Validate wallet address format
      if (!isValidEthereumAddress(userWalletAddress)) {
        console.error('[WALLET HOOK] Invalid wallet address format:', userWalletAddress);
        setAgentWalletStatus('error');
        return;
      }
      
      // 1. Register/update user in database
      try {
        const userResponse = await fetch('/api/auth/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            walletAddress: userWalletAddress,
            isNewUser: false // We'll let the API determine this
          })
        });

        if (!userResponse.ok) {
          console.warn('[WALLET HOOK] User registration failed, but continuing...');
        } else {
          console.log('[WALLET HOOK] User registered successfully');
        }
      } catch (userError) {
        console.warn('[WALLET HOOK] User registration error:', userError);
        // Continue anyway - agent wallet creation might still work
      }

      // 2. Ensure agent wallet exists
      setAgentWalletStatus('loading');
      
      // First check if agent wallet already exists
      const checkResponse = await fetch(`/api/agent-wallet?userWalletAddress=${encodeURIComponent(userWalletAddress)}`);
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        
        if (checkData.hasAgentWallet && checkData.agentWalletAddress) {
          console.log('[WALLET HOOK] Found existing agent wallet:', checkData.agentWalletAddress);
          setAgentWalletAddress(checkData.agentWalletAddress);
          setAgentWalletStatus('ready');
          return;
        }
      }

      // Create new agent wallet if it doesn't exist
      console.log('[WALLET HOOK] Creating new agent wallet...');
      const createResponse = await fetch('/api/agent-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userWalletAddress })
      });

      if (createResponse.ok) {
        const createData = await createResponse.json();
        console.log('[WALLET HOOK] Agent wallet created successfully:', createData.agentWalletAddress);
        setAgentWalletAddress(createData.agentWalletAddress);
        setAgentWalletStatus('ready');
      } else {
        console.error('[WALLET HOOK] Failed to create agent wallet');
        const errorData = await createResponse.json().catch(() => ({}));
        console.error('[WALLET HOOK] Error details:', errorData);
        setAgentWalletStatus('error');
      }

    } catch (error) {
      console.error('[WALLET HOOK] Error ensuring user and agent wallet:', error);
      setAgentWalletStatus('error');
    }
  }, []);

  const getWalletAddress = useCallback(async () => {
    if (!ready || !user) {
      setIsLoading(false);
      setAgentWalletStatus(null);
      setAgentWalletAddress(null);
      return;
    }

    try {
      setIsLoading(true);

      // Get the first connected wallet from the user's linked accounts
      const connectedWallets = user.linkedAccounts.filter(
        (account) => account.type === 'wallet'
      );

      if (connectedWallets.length > 0) {
        const primaryWallet = connectedWallets[0];
        const address = primaryWallet.address || null;
        setWalletAddress(address);
        
        // Proactively ensure user registration and agent wallet creation
        if (address) {
          await ensureUserAndAgentWallet(address);
        }
      } else {
        setWalletAddress(null);
        setAgentWalletStatus(null);
        setAgentWalletAddress(null);
      }
    } catch (error) {
      console.error('Error getting wallet address:', error);
      setWalletAddress(null);
      setAgentWalletStatus('error');
      setAgentWalletAddress(null);
    } finally {
      setIsLoading(false);
    }
  }, [ready, user, ensureUserAndAgentWallet]);

  useEffect(() => {
    getWalletAddress();
  }, [getWalletAddress]);

  // Function to refresh agent wallet address (useful after first agent interaction)
  const refreshAgentWallet = useCallback(async () => {
    if (!walletAddress) return;
    
    try {
      console.log('[WALLET HOOK] Refreshing agent wallet address...');
      const checkResponse = await fetch(`/api/agent-wallet?userWalletAddress=${encodeURIComponent(walletAddress)}`);
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        console.log('[WALLET HOOK] Refreshed agent wallet data:', checkData);
        
        // Update with the latest smart wallet address (could be deployed now)
        if (checkData.hasAgentWallet) {
          const latestAddress = checkData.smartWalletAddress || checkData.agentWalletAddress;
          if (latestAddress && latestAddress !== "Will be created by SmartWalletProvider") {
            console.log('[WALLET HOOK] Updated agent wallet address to:', latestAddress);
            setAgentWalletAddress(latestAddress);
          }
        }
      }
    } catch (error) {
      console.error('[WALLET HOOK] Error refreshing agent wallet:', error);
    }
  }, [walletAddress]);

  return {
    walletAddress,
    isLoading,
    agentWalletStatus,
    agentWalletAddress,
    refreshWalletAddress: getWalletAddress,
    refreshAgentWallet,
  };
}
