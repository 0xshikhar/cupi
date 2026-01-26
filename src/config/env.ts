import { z } from 'zod';

const envSchema = z.object({
  // Base Next
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Privy Auth
  NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1, 'Privy App ID is required'),
  PRIVY_APP_SECRET: z.string().min(1, 'Privy App Secret is required'),

  // Coinbase Developer Platform (CDP) / AgentKit
  CDP_API_KEY_NAME: z.string().min(1, 'CDP API Key Name is required'),
  CDP_API_KEY_PRIVATE_KEY: z.string().min(1, 'CDP API Key Private Key is required'),
  NETWORK_ID: z.string().default('base-sepolia'),

  // Database
  DATABASE_URL: z.string().url().optional(),

  // LLM / OpenAI
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API Key is required'),

  // Redis (Rate Limiting/Cache) - Optional for now
  KV_URL: z.string().url().optional(),
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().optional(),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
  PRIVY_APP_SECRET: process.env.PRIVY_APP_SECRET,
  CDP_API_KEY_NAME: process.env.CDP_API_KEY_NAME,
  CDP_API_KEY_PRIVATE_KEY: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle multiline keys
  NETWORK_ID: process.env.NETWORK_ID,
  DATABASE_URL: process.env.DATABASE_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  KV_URL: process.env.KV_URL,
  KV_REST_API_URL: process.env.KV_REST_API_URL,
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
});
