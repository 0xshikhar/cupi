'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

// The Privy SDK (embedded wallets, WalletConnect, Solana adapters) is ~2.4 MB of JS.
// Load it only on routes that need a wallet so the marketing page stays lightweight.
const WalletProviders = dynamic(() => import('./wallet-providers'));

const WALLET_FREE_ROUTES = new Set(['/']);

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname && WALLET_FREE_ROUTES.has(pathname)) {
    return <>{children}</>;
  }

  return <WalletProviders>{children}</WalletProviders>;
}
