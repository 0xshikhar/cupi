import crypto from "crypto";

// Lazy enforcement: allow Next build without ENCRYPTION_KEY; enforce at runtime when used
const IS_PROD = process.env.NODE_ENV === "production";
const PROVIDED_KEY = process.env.ENCRYPTION_KEY;
if (!PROVIDED_KEY && !IS_PROD) {
  // eslint-disable-next-line no-console
  console.warn(
    "[crypto-utils] ENCRYPTION_KEY not set; using development fallback key. Do NOT use this in production."
  );
}
const ALGORITHM = "aes-256-cbc";

// Ensure the key is exactly 32 bytes
function getKey(): Buffer {
  if (!PROVIDED_KEY && IS_PROD) {
    throw new Error("ENCRYPTION_KEY environment variable must be set");
  }
  const source = PROVIDED_KEY ?? "development-fallback-key";
  const key = source.padEnd(32, "0").slice(0, 32);
  return Buffer.from(key, "utf8");
}

/**
 * Encrypts a string using AES-256-CBC
 * @param text - The text to encrypt
 * @returns The encrypted text as a hex string
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypts a string using AES-256-CBC
 * @param encryptedText - The encrypted text as a hex string
 * @returns The decrypted text
 */
export function decrypt(encryptedText: string): string {
  try {
    const textParts = encryptedText.split(":");
    if (textParts.length !== 2) {
      throw new Error("Invalid encrypted text format");
    }

    const iv = Buffer.from(textParts[0], "hex");
    const encryptedData = textParts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    // Graceful fallback for legacy plain-text storage: if it looks like a 0x private key, return as-is
    if (/^0x[0-9a-fA-F]{64}$/.test(encryptedText)) {
      return encryptedText;
    }
    console.error("Decryption failed:", error);
    // Last resort: return original text for backward compatibility
    return encryptedText;
  }
}
