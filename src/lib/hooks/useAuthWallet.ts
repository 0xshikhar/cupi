import { usePrivy } from '@privy-io/react-auth';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export interface AuthWalletState {
    // User's Privy wallet address
    userWalletAddress: string | null;

    // Coinbase agent wallet address
    agentWalletAddress: string | null;

    // Loading states
    isLoading: boolean;
    isCreatingWallet: boolean;

    // Error state
    error: string | null;

    // User authenticated status
    isAuthenticated: boolean;
}

/**
 * Hook to manage Privy authentication and Coinbase wallet creation
 * 
 * This hook:
 * 1. Monitors Privy authentication state
 * 2. Registers user in database when Privy wallet connects
 * 3. Automatically creates Coinbase wallet if not exists
 * 4. Provides loading states and error handling
 * 5. Shows toast notifications for wallet operations
 */
export function useAuthWallet() {
    const { user, ready, authenticated, login, logout } = usePrivy();

    const [state, setState] = useState<AuthWalletState>({
        userWalletAddress: null,
        agentWalletAddress: null,
        isLoading: true,
        isCreatingWallet: false,
        error: null,
        isAuthenticated: false,
    });

    /**
     * Register user in database
     */
    const registerUser = useCallback(async (walletAddress: string) => {
        try {
            console.log('[AUTH WALLET] Registering user:', walletAddress);

            const response = await fetch('/api/auth/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress,
                    isNewUser: false
                })
            });

            if (!response.ok) {
                console.warn('[AUTH WALLET] User registration failed');
                return false;
            }

            console.log('[AUTH WALLET] User registered successfully');
            return true;
        } catch (error) {
            console.error('[AUTH WALLET] Error registering user:', error);
            return false;
        }
    }, []);

    /**
     * Create Coinbase wallet for user
     */
    const createWallet = useCallback(async (userWalletAddress: string) => {
        try {
            setState(prev => ({ ...prev, isCreatingWallet: true }));

            console.log('[AUTH WALLET] Creating Coinbase wallet...');
            toast.loading('Creating your wallet...', { id: 'wallet-creation' });

            const response = await fetch('/api/wallet/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userWalletAddress })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create wallet');
            }

            console.log('[AUTH WALLET] Wallet created:', data.agentWalletAddress);

            setState(prev => ({
                ...prev,
                agentWalletAddress: data.agentWalletAddress,
                isCreatingWallet: false,
                error: null
            }));

            if (data.isNewWallet) {
                toast.success('Wallet created successfully! 🎉', { id: 'wallet-creation' });
            } else {
                toast.dismiss('wallet-creation');
            }

            return data.agentWalletAddress;
        } catch (error) {
            console.error('[AUTH WALLET] Error creating wallet:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create wallet';

            setState(prev => ({
                ...prev,
                isCreatingWallet: false,
                error: errorMessage
            }));

            toast.error(errorMessage, { id: 'wallet-creation' });
            return null;
        }
    }, []);

    /**
     * Check if user has existing Coinbase wallet
     */
    const checkExistingWallet = useCallback(async (userWalletAddress: string) => {
        try {
            console.log('[AUTH WALLET] Checking for existing wallet...');

            const response = await fetch(
                `/api/wallet/create?userWalletAddress=${encodeURIComponent(userWalletAddress)}`
            );

            if (!response.ok) {
                return null;
            }

            const data = await response.json();

            if (data.hasWallet && data.agentWalletAddress) {
                console.log('[AUTH WALLET] Found existing wallet:', data.agentWalletAddress);
                return data.agentWalletAddress;
            }

            return null;
        } catch (error) {
            console.error('[AUTH WALLET] Error checking wallet:', error);
            return null;
        }
    }, []);

    /**
     * Initialize wallet flow when user connects
     */
    const initializeWallet = useCallback(async (walletAddress: string) => {
        try {
            setState(prev => ({ ...prev, isLoading: true }));

            // 1. Register user in database
            await registerUser(walletAddress);

            // 2. Check for existing wallet
            const existingWallet = await checkExistingWallet(walletAddress);

            if (existingWallet) {
                // User already has a wallet
                setState(prev => ({
                    ...prev,
                    agentWalletAddress: existingWallet,
                    isLoading: false,
                    error: null
                }));
            } else {
                // Create new wallet
                await createWallet(walletAddress);
                setState(prev => ({ ...prev, isLoading: false }));
            }
        } catch (error) {
            console.error('[AUTH WALLET] Error initializing wallet:', error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to initialize wallet'
            }));
        }
    }, [registerUser, checkExistingWallet, createWallet]);

    /**
     * Main effect to handle Privy authentication state
     */
    useEffect(() => {
        if (!ready) {
            return;
        }

        if (!authenticated || !user) {
            setState({
                userWalletAddress: null,
                agentWalletAddress: null,
                isLoading: false,
                isCreatingWallet: false,
                error: null,
                isAuthenticated: false,
            });
            return;
        }

        // Get user's wallet address from Privy
        const connectedWallets = user.linkedAccounts.filter(
            (account) => account.type === 'wallet'
        );

        if (connectedWallets.length > 0) {
            const primaryWallet = connectedWallets[0];
            const address = primaryWallet.address;

            if (address) {
                setState(prev => ({
                    ...prev,
                    userWalletAddress: address,
                    isAuthenticated: true
                }));

                // Initialize wallet flow
                initializeWallet(address);
            }
        }
    }, [ready, authenticated, user, initializeWallet]);

    return {
        ...state,
        login,
        logout,
        refresh: () => {
            if (state.userWalletAddress) {
                initializeWallet(state.userWalletAddress);
            }
        }
    };
}
