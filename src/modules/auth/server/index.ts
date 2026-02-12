/**
 * Auth server module barrel export
 * 
 * Usage:
 *   import { withAuth, verifyAuth, privy } from "@/modules/auth/server";
 */
export { privy, verifyAuth } from "./privy";
export { withAuth, requireUser, isUser, unauthorized, forbidden } from "./with-auth";
export type { AuthContext } from "./with-auth";
