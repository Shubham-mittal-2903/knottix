import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT = 'knottix-integration-credentials';

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
}

function getKey(): Buffer {
  const secret = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY is not set — cannot encrypt or decrypt integration credentials');
  }
  return scryptSync(secret, SALT, 32);
}

/**
 * AES-256-GCM, Node's built-in `crypto` — no new dependency (coding-rules.md rule 14).
 * Used to store third-party integration secrets (e.g. a GitHub token) in `Integration.credentials`
 * without ever writing plaintext to the database, closing IDEA-004.
 */
export function encryptSecret(plaintext: string): EncryptedPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decryptSecret(payload: EncryptedPayload): string {
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

export function maskSecret(plaintext: string, visibleChars = 4): string {
  if (plaintext.length <= visibleChars) return '•'.repeat(Math.max(plaintext.length, 4));
  return `${'•'.repeat(8)}${plaintext.slice(-visibleChars)}`;
}
