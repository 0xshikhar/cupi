import { z } from 'zod';
import { isAddress } from 'viem';

// Common validation schemas
export const walletAddressSchema = z.string().refine(
  (address) => isAddress(address),
  { message: 'Invalid wallet address format' }
);

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const positiveNumberSchema = z.number().positive('Must be a positive number');

export const nonEmptyStringSchema = z.string().min(1, 'Field cannot be empty');

export const limitSchema = z.number().int().min(1).max(1000).default(50);

// API-specific validation schemas
export const userAuthSchema = z.object({
  walletAddress: walletAddressSchema,
  isNewUser: z.boolean().optional()
});

export const transactionQuerySchema = z.object({
  userId: uuidSchema,
  portfolioId: uuidSchema.optional(),
  assetId: uuidSchema.optional(),
  limit: limitSchema
});

export const transactionCreateSchema = z.object({
  userId: uuidSchema,
  portfolioId: uuidSchema,
  assetId: uuidSchema,
  amount: positiveNumberSchema,
  price: z.number().nonnegative().optional(),
  type: z.enum(['BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL']),
  date: z.string().datetime().optional(),
  hash: z.string().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED']).optional(),
  metadata: z.record(z.any()).optional()
});

export const agentCreateSchema = z.object({
  userId: uuidSchema,
  strategyId: uuidSchema,
  name: nonEmptyStringSchema.max(100),
  type: z.enum(['REBALANCING', 'YIELD_FARMING', 'ARBITRAGE']),
  config: z.record(z.any()).optional(),
  description: z.string().max(500).optional()
});

export const agentRequestSchema = z.object({
  userMessage: nonEmptyStringSchema.max(2000),
  userWalletAddress: walletAddressSchema
});

export const userProfileSchema = z.object({
  walletAddress: walletAddressSchema,
  riskProfile: z.string().max(50).optional(),
  otherUserInfo: z.string().max(10000).optional()
});

export const strategyCreateSchema = z.object({
  userId: uuidSchema,
  name: nonEmptyStringSchema.max(100),
  description: z.string().max(1000).optional(),
  type: z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE']),
  riskLevel: z.number().int().min(1).max(10),
  timeHorizon: z.string().max(50).optional(),
  expectedReturn: z.number().nonnegative().optional()
});

export const basicWalletSchema = z.object({
  userWalletAddress: walletAddressSchema
});

// Sanitization functions
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>"'&]/g, '') // Remove potentially dangerous characters
    .trim()
    .substring(0, 10000); // Limit length
}

export function sanitizeNumber(input: any): number | null {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }
  return num;
}

// Validation middleware helper
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (request: Request): Promise<{ data: T; error: null } | { data: null; error: string }> => {
    try {
      const body = await request.json();
      const data = schema.parse(body);
      return { data, error: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        return { data: null, error: `Validation error: ${errorMessage}` };
      }
      return { data: null, error: 'Invalid request format' };
    }
  };
}

// Query parameter validation
export function validateQueryParams<T>(schema: z.ZodSchema<T>, searchParams: URLSearchParams): { data: T; error: null } | { data: null; error: string } {
  try {
    const params: Record<string, any> = {};
    
    Array.from(searchParams.entries()).forEach(([key, value]) => {
      // Convert string values to appropriate types
      if (key === 'limit' || key.includes('Id')) {
        const numValue = parseInt(value, 10);
        params[key] = isNaN(numValue) ? value : numValue;
      } else {
        params[key] = value;
      }
    });
    
    const data = schema.parse(params);
    return { data, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { data: null, error: `Query validation error: ${errorMessage}` };
    }
    return { data: null, error: 'Invalid query parameters' };
  }
}

// SQL injection prevention helpers
export function escapeSqlString(input: string): string {
  return input.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

// Rate limiting validation
export const rateLimitSchema = z.object({
  maxRequests: z.number().int().positive().default(100),
  windowMs: z.number().int().positive().default(900000) // 15 minutes
});

export default {
  walletAddressSchema,
  uuidSchema,
  positiveNumberSchema,
  nonEmptyStringSchema,
  userAuthSchema,
  transactionQuerySchema,
  transactionCreateSchema,
  agentCreateSchema,
  agentRequestSchema,
  userProfileSchema,
  strategyCreateSchema,
  basicWalletSchema,
  sanitizeString,
  sanitizeNumber,
  validateRequest,
  validateQueryParams,
  escapeSqlString
};