import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): string {
    return crypto.randomBytes(SALT_LENGTH).toString('hex');
}

/**
 * Derive a key from a password using PBKDF2
 */
function deriveKey(password: string, salt: string): Buffer {
    return crypto.pbkdf2Sync(password, Buffer.from(salt, 'hex'), 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt a private key using AES-256-CBC
 * @param privateKey - The private key to encrypt (hex string without 0x prefix)
 * @param password - The password to use for encryption
 * @param salt - The salt for key derivation
 * @returns Encrypted data as hex string
 */
export function encryptPrivateKey(privateKey: string, password: string, salt: string): string {
    try {
        // Remove 0x prefix if present
        const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

        // Derive key from password and salt
        const key = deriveKey(password, salt);

        // Generate random IV
        const iv = crypto.randomBytes(IV_LENGTH);

        // Create cipher
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        // Encrypt the private key
        let encrypted = cipher.update(cleanPrivateKey, 'hex', 'hex');
        encrypted += cipher.final('hex');

        // Combine IV and encrypted data
        const result = iv.toString('hex') + encrypted;

        return result;
    } catch (error) {
        throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Decrypt a private key using AES-256-CBC
 * @param encryptedData - The encrypted data (hex string)
 * @param password - The password used for encryption
 * @param salt - The salt used for key derivation
 * @returns Decrypted private key as hex string (without 0x prefix)
 */
export function decryptPrivateKey(encryptedData: string, password: string, salt: string): string {
    try {
        // Derive key from password and salt
        const key = deriveKey(password, salt);

        // Extract IV and encrypted data
        const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
        const encrypted = encryptedData.slice(IV_LENGTH * 2);

        // Create decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

        // Decrypt the private key
        let decrypted = decipher.update(encrypted, 'hex', 'hex');
        decrypted += decipher.final('hex');

        return decrypted;
    } catch (error) {
        throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Generate a secure random private key
 * @returns Private key as hex string (without 0x prefix)
 */
export function generatePrivateKey(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate if a string is a valid private key
 * @param privateKey - The private key to validate
 * @returns True if valid, false otherwise
 */
export function isValidPrivateKey(privateKey: string): boolean {
    try {
        const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
        return /^[0-9a-fA-F]{64}$/.test(cleanKey);
    } catch {
        return false;
    }
}

/**
 * Create a master password for wallet encryption
 * This should be derived from user's authentication or stored securely
 */
export function createMasterPassword(userWalletAddress: string, additionalEntropy?: string): string {
    const baseString = `${userWalletAddress}_${additionalEntropy || 'cupi_basic_wallet'}_${process.env.ENCRYPTION_SECRET || 'default_secret'}`;
    return crypto.createHash('sha256').update(baseString).digest('hex');
}
