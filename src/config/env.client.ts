/**
 * Client-safe environment variables.
 * Only NEXT_PUBLIC_* vars are available in client bundles.
 * This file is safe to import from any component.
 */
export const clientEnv = {
  NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "",
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;
