/**
 * AES-256-GCM encryption service.
 * ENCRYPTION_KEY env var must be a 32-byte (64 hex char) hex string, or a 32-char UTF-8 string.
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  // Accept hex-encoded 32-byte key (64 hex chars) or raw 32-char string
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  const buf = Buffer.from(raw, 'utf8');
  if (buf.length < 32) {
    // Pad with zeros to 32 bytes
    const padded = Buffer.alloc(32);
    buf.copy(padded);
    return padded;
  }
  return buf.slice(0, 32);
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns: "iv:authTag:ciphertext" all as hex strings.
 */
function encrypt(text) {
  if (text === null || text === undefined) return null;
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an "iv:authTag:ciphertext" hex string.
 * Returns the original plaintext string.
 */
function decrypt(encryptedStr) {
  if (encryptedStr === null || encryptedStr === undefined) return null;
  const parts = encryptedStr.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format. Expected "iv:authTag:ciphertext"');
  }
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
