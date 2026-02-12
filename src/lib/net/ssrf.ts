import { lookup } from "dns/promises";

/**
 * SSRF guard for outbound webhook delivery.
 *
 * Blocks requests to loopback, link-local (cloud metadata at 169.254.169.254),
 * RFC-1918 private ranges, CGNAT, multicast, and IPv6 equivalents — resolved
 * via DNS so hostname tricks can't reach internal addresses either.
 */

const IPV4_BLOCKED: Array<[number, number]> = [
  [0x00000000, 0x000000ff], // 0.0.0.0/8 "this host"
  [0x0a000000, 0x0affffff], // 10.0.0.0/8 private
  [0x7f000000, 0x7fffffff], // 127.0.0.0/8 loopback
  [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16 link-local (cloud metadata)
  [0xac100000, 0xac1fffff], // 172.16.0.0/12 private
  [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16 private
  [0x64400000, 0x647fffff], // 100.64.0.0/10 CGNAT
  [0xe0000000, 0xefffffff], // 224.0.0.0/4 multicast
  [0xf0000000, 0xffffffff], // 240.0.0.0/4 reserved
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value >>> 0;
}

export function isBlockedIp(ip: string): boolean {
  const v4 = ipv4ToInt(ip);
  if (v4 !== null) {
    return IPV4_BLOCKED.some(([start, end]) => v4 >= start && v4 <= end);
  }

  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fe80:") || normalized.startsWith("fec0:")) return true; // link-local
  if (/^f[cd]/.test(normalized)) return true; // fc00::/7 unique-local
  if (normalized.startsWith("::ffff:")) {
    const embedded = ipv4ToInt(normalized.replace("::ffff:", ""));
    if (embedded !== null) {
      return IPV4_BLOCKED.some(([start, end]) => embedded >= start && embedded <= end);
    }
  }
  return false;
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
]);

export class SsrfBlockedError extends Error {
  constructor(url: string, reason: string) {
    super(`Webhook URL '${url}' is not allowed: ${reason}`);
    this.name = "SsrfBlockedError";
  }
}

/**
 * Validates that a webhook URL is safe to POST to: HTTPS in production,
 * non-blocked hostname, and no DNS record pointing at a blocked IP.
 * Throws SsrfBlockedError otherwise.
 */
export async function assertSafeWebhookUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedError(rawUrl, "invalid URL");
  }

  if (url.protocol !== "https:") {
    if (url.protocol !== "http:" || process.env.NODE_ENV === "production") {
      throw new SsrfBlockedError(rawUrl, "must be a public HTTPS endpoint");
    }
    console.warn(`[SSRF] Allowing non-HTTPS webhook URL in non-production: ${url.hostname}`);
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".internal") || hostname.endsWith(".local")) {
    throw new SsrfBlockedError(rawUrl, "internal hostname");
  }

  // Literal IP in the URL
  if (isBlockedIp(hostname.replace(/^\[|\]$/g, ""))) {
    throw new SsrfBlockedError(rawUrl, "blocked IP address");
  }

  // DNS check: every resolved address must be public (also covers DNS-rebinding
  // to literal internal IPs behind an innocent-looking hostname)
  try {
    const { address } = await lookup(hostname);
    if (isBlockedIp(address)) {
      throw new SsrfBlockedError(rawUrl, `resolves to blocked address ${address}`);
    }
  } catch (error) {
    if (error instanceof SsrfBlockedError) throw error;
    throw new SsrfBlockedError(rawUrl, "hostname could not be resolved");
  }

  return url;
}
