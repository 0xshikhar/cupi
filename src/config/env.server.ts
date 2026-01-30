import "server-only";

import { z } from "zod";

/**
 * Server-side environment variables schema.
 * These are secrets that must NEVER leak to client bundles.
 * 
 * This module is guarded by `server-only` — importing it in a client
 * component will cause a build error, which is the intended behavior.
 * 
 * Validation is lazy (via getServerEnv()) to avoid crashing during
 * build-time tree-shaking when secrets aren't available.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),

  // Privy Auth
  NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1, "NEXT_PUBLIC_PRIVY_APP_ID is required"),
  PRIVY_APP_SECRET: z.string().min(1, "PRIVY_APP_SECRET is required"),

  // Coinbase Developer Platform (CDP) / AgentKit
  CDP_API_KEY_NAME: z.string().min(1, "CDP_API_KEY_NAME is required"),
  CDP_API_KEY_PRIVATE_KEY: z.string().min(1, "CDP_API_KEY_PRIVATE_KEY is required"),
  NETWORK_ID: z.string().default("base-sepolia"),

  // Database
  DATABASE_URL: z.string().optional(),

  // LLM / OpenAI
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),

  // Encryption
  ENCRYPTION_SECRET: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),

  // ERC-4337 Paymaster (Optional)
  PAYMASTER_URL: z.string().optional(),
  PAYMASTER_URL_BASE_SEPOLIA: z.string().optional(),
  PAYMASTER_URL_BASE_MAINNET: z.string().optional(),
  PAYMASTER_URL_ARBITRUM_ONE: z.string().optional(),
  ENABLE_PAYMASTER_SPONSORSHIP: z.string().optional(),
  ENABLE_USEROP_GASLESS_TRANSFERS: z.string().optional(),

  // Redis (Rate Limiting/Cache) - Optional
  KV_URL: z.string().optional(),
  KV_REST_API_URL: z.string().optional(),
  KV_REST_API_TOKEN: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Cached result to avoid re-parsing on every call
 */
let _cached: ServerEnv | null = null;

/**
 * Lazily validates and returns all server environment variables.
 * Call this inside API routes, server actions, or tRPC context — never at module level.
 * 
 * @throws {ZodError} if required env vars are missing at runtime
 */
export function getServerEnv(): ServerEnv {
  if (_cached) return _cached;

  _cached = serverEnvSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    PRIVY_APP_SECRET: process.env.PRIVY_APP_SECRET,
    CDP_API_KEY_NAME: process.env.CDP_API_KEY_NAME,
    CDP_API_KEY_PRIVATE_KEY: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n"
    ),
    NETWORK_ID: process.env.NETWORK_ID,
    DATABASE_URL: process.env.DATABASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    PAYMASTER_URL: process.env.PAYMASTER_URL,
    PAYMASTER_URL_BASE_SEPOLIA: process.env.PAYMASTER_URL_BASE_SEPOLIA,
    PAYMASTER_URL_BASE_MAINNET: process.env.PAYMASTER_URL_BASE_MAINNET,
    PAYMASTER_URL_ARBITRUM_ONE: process.env.PAYMASTER_URL_ARBITRUM_ONE,
    ENABLE_PAYMASTER_SPONSORSHIP: process.env.ENABLE_PAYMASTER_SPONSORSHIP,
    ENABLE_USEROP_GASLESS_TRANSFERS: process.env.ENABLE_USEROP_GASLESS_TRANSFERS,
    KV_URL: process.env.KV_URL,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  });

  return _cached;
}
