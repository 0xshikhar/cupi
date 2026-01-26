import { PrivyClient } from '@privy-io/server-auth';
import { env } from '@/config/env';

// Initialize the Privy server client
export const privy = new PrivyClient(
  env.NEXT_PUBLIC_PRIVY_APP_ID,
  env.PRIVY_APP_SECRET
);

// Helper to verify auth tokens in API routes
export async function verifyAuth(token?: string) {
  if (!token) {
    throw new Error('No authentication token provided');
  }

  try {
    const verifiedClaims = await privy.verifyAuthToken(token);
    return verifiedClaims;
  } catch (error) {
    console.error('Failed to verify token:', error);
    throw new Error('Invalid authentication token');
  }
}
