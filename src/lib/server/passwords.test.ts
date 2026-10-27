import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './passwords';

describe('passwords', () => {
  it('round-trips a password through scrypt', async () => {
    const stored = await hashPassword('turtle-power');
    expect(stored).toMatch(/^scrypt\$16384\$8\$1\$/);
    await expect(verifyPassword('turtle-power', stored)).resolves.toEqual({ ok: true, needsRehash: false });
  });

  it('rejects a wrong password', async () => {
    const stored = await hashPassword('right-password');
    await expect(verifyPassword('wrong-password', stored)).resolves.toEqual({ ok: false, needsRehash: false });
  });

  it('accepts the legacy sha256 format and requests a rehash', async () => {
    const stored = createHash('sha256').update('wavebohdi_salt_2024').digest('hex');
    await expect(verifyPassword('wave', stored)).resolves.toEqual({ ok: true, needsRehash: true });
  });

  it('fails safely for garbage stored values', async () => {
    await expect(verifyPassword('anything', 'not-a-password-hash')).resolves.toEqual({ ok: false, needsRehash: false });
  });
});

