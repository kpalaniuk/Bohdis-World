import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDb } from './fakeDb.test-helper';
import { TABLES } from './tables';

const mocked = vi.hoisted(() => ({ db: null as any }));
vi.mock('./db', () => ({ getDb: () => mocked.db }));

import { GET as getMe } from '@/app/api/auth/me/route';
import { POST as login } from '@/app/api/auth/login/route';
import { hashPassword } from './passwords';

describe('session handlers', () => {
  beforeEach(() => {
    mocked.db = new FakeDb({});
  });

  it('sets an httpOnly session cookie on login', async () => {
    mocked.db.tables[TABLES.simpleUsers].push({
      id: 'user-1', username: 'bohdi', display_name: 'Bohdi', password_hash: await hashPassword('secret1'),
      created_at: new Date().toISOString(), role: 'user', can_gift_items: false, failed_login_count: 0, locked_until: null,
    });
    mocked.db.tables[TABLES.userProfiles].push({ id: 'profile-1', simple_user_id: 'user-1' });
    const response = await login(new Request('http://localhost/api/auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'bohdi', password: 'secret1' }),
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('bw_session=');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(mocked.db.tables[TABLES.sessions]).toHaveLength(1);
    expect(mocked.db.tables[TABLES.sessions][0].token_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns 401 and null without a cookie', async () => {
    const response = await getMe(new Request('http://localhost/api/auth/me'));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ user: null });
  });

  it('treats a malformed percent-encoded cookie as no session', async () => {
    const response = await getMe(new Request('http://localhost/api/auth/me', { headers: { cookie: 'bw_session=%E0%A4%A' } }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ user: null });
  });

  it('resolves a stored token by its sha256 hash', async () => {
    const token = 'known-token';
    mocked.db.tables[TABLES.sessions].push({ id: 'session-1', user_id: 'user-1', token_hash: createHash('sha256').update(token).digest('hex'), expires_at: new Date(Date.now() + 60_000).toISOString(), last_seen_at: new Date().toISOString() });
    mocked.db.tables[TABLES.simpleUsers].push({ id: 'user-1', username: 'bohdi', display_name: 'Bohdi', role: 'user', can_gift_items: false });
    mocked.db.tables[TABLES.userProfiles].push({ id: 'profile-1', simple_user_id: 'user-1' });
    const response = await getMe(new Request('http://localhost/api/auth/me', { headers: { cookie: `bw_session=${token}` } }));
    expect(response.status).toBe(200);
    expect((await response.json()).user.username).toBe('bohdi');
  });
});
