import { usePrivy } from '@privy-io/react-auth';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export interface AuthWalletState {
    // User's Privy wallet address
    userWalletAddress: string | null;

    // Basic EOA wallet address
    basicWalletAddress: string | null;

    // Loading states
    isLoading: boolean;
    isCreatingWallet: boolean;

    // Error state
    error: string | null;

    // User authenticated status
    isAuthenticated: boolean;
}

/**
 * Hook to manage Privy authentication and basic wallet creation
 * 
 * This hook:
 * 1. Monitors Privy authentication state
 * 2. Registers user in database when Privy wallet connects
 * 3. Automatically creates basic EOA wallet if not exists
 * 4. Provides loading states and error handling
 * 5. Shows toast notifications for wallet operations
 */
export function useAuthWallet() {
    const { user, ready, authenticated, login, logout } = usePrivy();

    const [state, setState] = useState<AuthWalletState>({
        userWalletAddress: null,
        basicWalletAddress: null,
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
            console.log('[AUTH WALLET] ===== START: Registering user =====');
            console.log('[AUTH WALLET] Wallet address:', walletAddress);

            const response = await fetch('/api/auth/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress,
                    isNewUser: false
                })
            });

            console.log('[AUTH WALLET] Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('[AUTH WALLET] User registration failed:', errorData);
                return false;
            }

            const data = await response.json();
            console.log('[AUTH WALLET] User registered successfully:', data);
            console.log('[AUTH WALLET] ===== END: User registered =====');
            return true;
        } catch (error) {
            console.error('[AUTH WALLET] ===== ERROR: Registering user =====', error);
            return false;
        }
    }, []);

    /**
     * Create basic wallet for user
     */
    const createWallet = useCallback(async (userWalletAddress: string) => {
        try {
            setState(prev => ({ ...prev, isCreatingWallet: true }));

            console.log('[AUTH WALLET] Creating basic wallet...');
            toast.loading('Creating your wallet...', { id: 'wallet-creation' });

            const response = await fetch('/api/basic-wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userWalletAddress })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create wallet');
            }

            console.log('[AUTH WALLET] Wallet created:', data.basicWalletAddress);

            setState(prev => ({
                ...prev,
                basicWalletAddress: data.basicWalletAddress,
                isCreatingWallet: false,
                error: null
            }));

            if (!data.existing) {
                toast.success('Wallet created successfully! 🎉', { id: 'wallet-creation' });
            } else {
                toast.dismiss('wallet-creation');
            }

            return data.basicWalletAddress;
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
     * Check if user has existing basic wallet
     */
    const checkExistingWallet = useCallback(async (userWalletAddress: string) => {
        try {
            console.log('[AUTH WALLET] ===== START: Checking for existing wallet =====');
            console.log('[AUTH WALLET] User wallet:', userWalletAddress);

            const url = `/api/basic-wallet?userWalletAddress=${encodeURIComponent(userWalletAddress)}`;
            console.log('[AUTH WALLET] Fetching:', url);

            const response = await fetch(url);
            console.log('[AUTH WALLET] Check wallet response status:', response.status);

            if (!response.ok) {
                console.log('[AUTH WALLET] No existing wallet found (non-OK response)');
                return null;
            }

            const data = await response.json();
            console.log('[AUTH WALLET] Check wallet data:', data);

            if (data.hasBasicWallet && data.basicWalletAddress) {
                console.log('[AUTH WALLET] ✓ Found existing wallet:', data.basicWalletAddress);
                console.log('[AUTH WALLET] ===== END: Existing wallet found =====');
                return data.basicWalletAddress;
            }

            console.log('[AUTH WALLET] ===== END: No existing wallet =====');
            return null;
        } catch (error) {
            console.error('[AUTH WALLET] ===== ERROR: Checking wallet =====', error);
            return null;
        }
    }, []);

    /**
     * Initialize wallet flow when user connects
     */
    /**
     * Initialize wallet flow when user connects
     */
    const initializeWallet = useCallback(async (walletAddress: string) => {
        let timeoutId: NodeJS.Timeout;

        try {
            setState(prev => ({ ...prev, isLoading: true }));

            // Set a timeout to prevent infinite loading (increased to 30s)
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                    console.error('[AUTH WALLET] Timeout reached after 30 seconds');
                    reject(new Error('Wallet initialization timed out'));
                }, 30000); // 30 seconds timeout
            });

            // Race between wallet initialization and timeout
            await Promise.race([
                (async () => {
                    // 1. Register user in database
                    await registerUser(walletAddress);

                    // 2. Check for existing wallet
                    const existingWallet = await checkExistingWallet(walletAddress);

                    if (existingWallet) {
                        // User already has a wallet
                        setState(prev => ({
                            ...prev,
                            basicWalletAddress: existingWallet,
                            isLoading: false,
                            error: null
                        }));
                    } else {
                        // Create new wallet
                        await createWallet(walletAddress);
                        setState(prev => ({ ...prev, isLoading: false }));
                    }
                })(),
                timeoutPromise
            ]);

        } catch (error) {
            console.error('[AUTH WALLET] Error initializing wallet:', error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to initialize wallet'
            }));

            // If it was a timeout, show a specific error
            if (error instanceof Error && error.message === 'Wallet initialization timed out') {
                toast.error('Wallet connection timed out. Please refresh to try again.', { id: 'wallet-error' });
            }
        } finally {
            if (timeoutId!) clearTimeout(timeoutId);
        }
    }, [registerUser, checkExistingWallet, createWallet]);

    /**
     * Main effect to handle Privy authentication state
     */
    useEffect(() => {
        console.log('[AUTH WALLET] useEffect triggered', { ready, authenticated, hasUser: !!user });

        if (!ready) {
            console.log('[AUTH WALLET] Privy not ready yet, waiting...');
            return;
        }

        if (!authenticated || !user) {
            console.log('[AUTH WALLET] User not authenticated or no user data');
            setState({
                userWalletAddress: null,
                basicWalletAddress: null,
                isLoading: false,
                isCreatingWallet: false,
                error: null,
                isAuthenticated: false,
            });
            return;
        }

        // Get user's wallet address from Privy
        console.log('[AUTH WALLET] User authenticated, extracting wallet info');
        console.log('[AUTH WALLET] User linked accounts:', user.linkedAccounts);

        const connectedWallets = user.linkedAccounts.filter(
            (account) => account.type === 'wallet'
        );

        console.log('[AUTH WALLET] Connected wallets:', connectedWallets);

        if (connectedWallets.length > 0) {
            const primaryWallet = connectedWallets[0];
            const address = primaryWallet.address;

            console.log('[AUTH WALLET] Primary wallet address:', address);

            if (address) {
                setState(prev => ({
                    ...prev,
                    userWalletAddress: address,
                    isAuthenticated: true
                }));

                console.log('[AUTH WALLET] Calling initializeWallet with address:', address);
                // Initialize wallet flow
                initializeWallet(address);
            } else {
                console.warn('[AUTH WALLET] Primary wallet has no address!');
            }
        } else {
            console.warn('[AUTH WALLET] No connected wallets found!');
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
