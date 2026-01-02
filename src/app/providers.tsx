'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import React from 'react';
import { TRPCReactProvider } from '@/trpc/react';
import { type AppRouter } from '@/server/api/root';

export default function Providers({ children }: { children: React.ReactNode }) {

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#8257e6',
          logo: '/logo.png',
          showWalletLoginFirst: true,
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        loginMethods: ['wallet', 'email', 'google', 'discord'],
        // Removing supportedChains as it's causing TypeScript errors
        // Will rely on Privy's default chain support
      }}
    >
      <TRPCReactProvider>
        {children}
      </TRPCReactProvider>
    </PrivyProvider>
  );
}
