import { Address, isAddress, getAddress } from "viem";
import { isContractWhitelisted, DEFAULT_DAILY_SPEND_CAP_USD } from "./spend-guard";

export interface SessionKeyPermission {
  target: Address | "*";
  functionSelector?: `0x${string}`;
  maxAmountUsd?: number;
}

export interface ScopedSessionKey {
  id: string;
  userAddress: Address;
  sessionKeyAddress: Address;
  agentId?: string;
  permissions: SessionKeyPermission[];
  dailyCapUsd: number;
  validUntil: number; // Unix timestamp in seconds
  revoked: boolean;
  createdAt: number;
}

// In-memory registry for session keys during server execution
const sessionKeyStore = new Map<string, ScopedSessionKey>();

/**
 * Creates a scoped ERC-7715 style session key granting delegated execution authority.
 */
export function createScopedSessionKey(params: {
  userAddress: string;
  sessionKeyAddress: string;
  agentId?: string;
  permissions?: SessionKeyPermission[];
  dailyCapUsd?: number;
  validDurationSeconds?: number;
}): ScopedSessionKey {
  if (!isAddress(params.userAddress)) {
    throw new Error(`Invalid user address: ${params.userAddress}`);
  }
  if (!isAddress(params.sessionKeyAddress)) {
    throw new Error(`Invalid session key address: ${params.sessionKeyAddress}`);
  }

  const now = Math.floor(Date.now() / 1000);
  const validDuration = params.validDurationSeconds ?? 7 * 24 * 60 * 60; // 7 days default
  const validUntil = now + validDuration;

  const id = `sk_${params.sessionKeyAddress.toLowerCase().slice(2, 10)}_${Date.now()}`;

  const sessionKey: ScopedSessionKey = {
    id,
    userAddress: getAddress(params.userAddress),
    sessionKeyAddress: getAddress(params.sessionKeyAddress),
    agentId: params.agentId,
    permissions: params.permissions || [{ target: "*" }],
    dailyCapUsd: params.dailyCapUsd ?? DEFAULT_DAILY_SPEND_CAP_USD,
    validUntil,
    revoked: false,
    createdAt: now,
  };

  sessionKeyStore.set(sessionKey.id, sessionKey);
  return sessionKey;
}

/**
 * Validates whether a session key is currently authorized to perform an action on a target contract.
 */
export function validateSessionKey(
  sessionKey: ScopedSessionKey,
  callTarget: string,
  callAmountUsd: number = 0
): { valid: boolean; reason?: string } {
  // 1. Check revocation
  if (sessionKey.revoked) {
    return { valid: false, reason: "Session key has been explicitly revoked." };
  }

  // 2. Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (now > sessionKey.validUntil) {
    return { valid: false, reason: `Session key expired at ${new Date(sessionKey.validUntil * 1000).toISOString()}.` };
  }

  // 3. Check target contract whitelist
  if (!isAddress(callTarget)) {
    return { valid: false, reason: `Invalid target contract address: ${callTarget}` };
  }

  const targetAddr = getAddress(callTarget);

  // Must be in verified protocol whitelist
  if (!isContractWhitelisted(targetAddr)) {
    return { valid: false, reason: `Target contract ${targetAddr} is not on the verified protocol whitelist.` };
  }

  // 4. Check specific session key scoped permissions if specified
  const hasWildcard = sessionKey.permissions.some((p) => p.target === "*");
  const hasSpecific = sessionKey.permissions.some(
    (p) => p.target !== "*" && getAddress(p.target) === targetAddr
  );

  if (!hasWildcard && !hasSpecific) {
    return { valid: false, reason: `Target contract ${targetAddr} is not authorized by this scoped session key.` };
  }

  // 5. Check call amount limit if scoped
  for (const perm of sessionKey.permissions) {
    const isTargetMatch = perm.target === "*" || getAddress(perm.target) === targetAddr;
    if (isTargetMatch && perm.maxAmountUsd !== undefined && callAmountUsd > perm.maxAmountUsd) {
      return {
        valid: false,
        reason: `Amount $${callAmountUsd} exceeds per-call limit ($${perm.maxAmountUsd}) defined in session key.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Revokes an existing session key immediately.
 */
export function revokeSessionKey(sessionKeyId: string): boolean {
  const sessionKey = sessionKeyStore.get(sessionKeyId);
  if (!sessionKey) return false;
  sessionKey.revoked = true;
  sessionKeyStore.set(sessionKeyId, sessionKey);
  return true;
}

/**
 * Lists all active (non-revoked, unexpired) session keys for a given user.
 */
export function getActiveSessionKeys(userAddress: string): ScopedSessionKey[] {
  if (!isAddress(userAddress)) return [];
  const normalized = getAddress(userAddress);
  const now = Math.floor(Date.now() / 1000);

  return Array.from(sessionKeyStore.values()).filter(
    (sk) => sk.userAddress === normalized && !sk.revoked && sk.validUntil > now
  );
}
