import { randomBytes, scrypt as nodeScrypt, timingSafeEqual, createHash } from 'node:crypto';

if (typeof window !== 'undefined') {
  throw new Error('Password helpers cannot be used in the browser');
}

const N = 16_384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const LEGACY_SALT = 'bohdi_salt_2024';

function scrypt(password: string, salt: Buffer, length: number, options: { N: number; r: number; p: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, length, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<{ ok: boolean; needsRehash: boolean }> {
  try {
    if (/^[a-f0-9]{64}$/i.test(stored)) {
      const actual = createHash('sha256').update(password + LEGACY_SALT).digest();
      const expected = Buffer.from(stored, 'hex');
      const ok = actual.length === expected.length && timingSafeEqual(actual, expected);
      return { ok, needsRehash: ok };
    }

    const [algorithm, nValue, rValue, pValue, saltValue, hashValue, extra] = stored.split('$');
    if (algorithm !== 'scrypt' || extra !== undefined) return { ok: false, needsRehash: false };

    const n = Number(nValue);
    const r = Number(rValue);
    const p = Number(pValue);
    if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p) || n < 2 || r < 1 || p < 1) {
      return { ok: false, needsRehash: false };
    }

    const salt = Buffer.from(saltValue, 'base64');
    const expected = Buffer.from(hashValue, 'base64');
    if (salt.length !== 16 || expected.length !== KEY_LENGTH) return { ok: false, needsRehash: false };

    const actual = await scrypt(password, salt, expected.length, { N: n, r, p });
    return {
      ok: actual.length === expected.length && timingSafeEqual(actual, expected),
      needsRehash: n !== N || r !== R || p !== P,
    };
  } catch {
    return { ok: false, needsRehash: false };
  }
}

export function constantTimeSecretEqual(actual: string, expected: string): boolean {
  const actualHash = createHash('sha256').update(actual).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(actualHash, expectedHash);
}
