import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDb } from './fakeDb.test-helper';
import { TABLES } from './tables';

const mocked = vi.hoisted(() => ({ db: null as any }));
vi.mock('./db', () => ({ getDb: () => mocked.db }));

import { POST as login } from '@/app/api/auth/login/route';
import { POST as signup } from '@/app/api/auth/signup/route';
import { PUT as putProgress } from '@/app/api/progress/route';
import { GET as adminUsers } from '@/app/api/admin/users/route';
import { POST as giftCoins } from '@/app/api/admin/gift-coins/route';
import { POST as unlockItem } from '@/app/api/admin/unlock-item/route';
import { POST as resetPassword } from '@/app/api/admin/reset-password/route';
import { PUT as changeRole } from '@/app/api/admin/role/route';
import { DELETE as deleteUser } from '@/app/api/admin/delete-user/route';
import { GET as getAdminSettings, PUT as putAdminSettings } from '@/app/api/admin/game-settings/route';
import { GET as adminActivities } from '@/app/api/admin/activities/route';
import { GET as getForum } from '@/app/api/forum/route';
import { PUT as changeOwnPassword } from '@/app/api/auth/password/route';
import { hashPassword } from './passwords';

const TOKEN = 'test-session-token';
function request(path: string, method = 'GET', body?: Record<string, unknown>) {
  return new Request(`http://localhost${path}`, {
    method, headers: { cookie: `bw_session=${TOKEN}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}
function sessionRows(role: 'user' | 'admin' | 'superuser' = 'user') {
  return {
    [TABLES.simpleUsers]: [{ id: 'real-user', username: 'kiddo', display_name: 'Kid', role, can_gift_items: false }],
    [TABLES.userProfiles]: [{ id: 'real-profile', simple_user_id: 'real-user', has_completed_gate: false }],
    [TABLES.userProgress]: [
      { id: 'p1', user_id: 'real-profile', coins: 1, total_earned: 1, high_score: 0, unlocked_themes: [], unlocked_powerups: [] },
      { id: 'p2', user_id: 'forged-profile', coins: 2, total_earned: 2, high_score: 0, unlocked_themes: [], unlocked_powerups: [] },
    ],
    [TABLES.sessions]: [{ id: 's1', user_id: 'real-user', token_hash: createHash('sha256').update(TOKEN).digest('hex'), expires_at: new Date(Date.now() + 60_000).toISOString(), last_seen_at: new Date().toISOString() }],
  };
}

describe('security-sensitive handlers', () => {
  beforeEach(() => {
    delete process.env.SIGNUP_CODE;
    mocked.db = new FakeDb(sessionRows());
  });

  it('locks an account for five minutes after five failures', async () => {
    mocked.db = new FakeDb({
      [TABLES.simpleUsers]: [{ id: 'u1', username: 'bohdi', display_name: 'B', password_hash: await hashPassword('correct1'), created_at: '', role: 'user', can_gift_items: false, failed_login_count: 0, locked_until: null }],
      [TABLES.userProfiles]: [{ id: 'p1', simple_user_id: 'u1' }],
    });
    let response!: Response;
    for (let i = 0; i < 5; i++) {
      response = await login(new Request('http://localhost/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'bohdi', password: 'wrong' }) }));
    }
    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({ error: 'Too many tries. Wait 5 minutes and try again.' });
  });

  it('limits lockout to the failing username and IP pair', async () => {
    mocked.db = new FakeDb({
      [TABLES.simpleUsers]: [{ id: 'u1', username: 'bohdi', display_name: 'B', password_hash: await hashPassword('correct1'), created_at: '', role: 'user', can_gift_items: false, failed_login_count: 0, locked_until: null }],
      [TABLES.userProfiles]: [{ id: 'p1', simple_user_id: 'u1' }],
    });
    for (let index = 0; index < 5; index++) {
      await login(new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.1' },
        body: JSON.stringify({ username: 'bohdi', password: 'wrong' }),
      }));
    }
    const response = await login(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.0.2' },
      body: JSON.stringify({ username: 'bohdi', password: 'correct1' }),
    }));
    expect(response.status).toBe(200);
  });

  it('ignores a forged user_id when saving progress', async () => {
    const response = await putProgress(request('/api/progress', 'PUT', { user_id: 'forged-profile', coins: 99 }));
    expect(response.status).toBe(200);
    expect(mocked.db.tables[TABLES.userProgress].find((row: any) => row.user_id === 'real-profile').coins).toBe(99);
    expect(mocked.db.tables[TABLES.userProgress].find((row: any) => row.user_id === 'forged-profile').coins).toBe(2);
  });

  it('clamps progress fields and ignores unknown power-ups', async () => {
    const response = await putProgress(request('/api/progress', 'PUT', {
      coins: -20,
      highScore: 12.9,
      ownedPowerUps: { shield: 1_500, 'slow-mo': -2, cheat: 10 },
    }));
    expect(response.status).toBe(200);
    const progress = mocked.db.tables[TABLES.userProgress].find((row: any) => row.user_id === 'real-profile');
    expect(progress.coins).toBe(0);
    expect(progress.high_score).toBe(12);
    expect(progress.unlocked_powerups).toHaveLength(999);
    expect(new Set(progress.unlocked_powerups)).toEqual(new Set(['shield']));
  });

  it('returns 403 for a non-admin on every admin route', async () => {
    const cases: Array<() => Promise<Response>> = [
      () => adminUsers(request('/api/admin/users')),
      () => giftCoins(request('/api/admin/gift-coins', 'POST', {})),
      () => unlockItem(request('/api/admin/unlock-item', 'POST', {})),
      () => resetPassword(request('/api/admin/reset-password', 'POST', {})),
      () => changeRole(request('/api/admin/role', 'PUT', {})),
      () => deleteUser(request('/api/admin/delete-user', 'DELETE', {})),
      () => getAdminSettings(request('/api/admin/game-settings')),
      () => putAdminSettings(request('/api/admin/game-settings', 'PUT', {})),
      () => adminActivities(request('/api/admin/activities')),
    ];
    for (const invoke of cases) expect((await invoke()).status).toBe(403);
  });

  it('forbids an admin (not superuser) from changing roles', async () => {
    mocked.db = new FakeDb(sessionRows('admin'));
    expect((await changeRole(request('/api/admin/role', 'PUT', { targetUserId: 'other', role: 'user' }))).status).toBe(403);
  });

  it('never promotes a regular account during login', async () => {
    mocked.db = new FakeDb({
      [TABLES.simpleUsers]: [{ id: 'u1', username: 'bohdi', display_name: 'B', password_hash: await hashPassword('correct1'), created_at: '', role: 'user', can_gift_items: false, failed_login_count: 0, locked_until: null }],
      [TABLES.userProfiles]: [{ id: 'p1', simple_user_id: 'u1' }],
    });
    const response = await login(new Request('http://localhost/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'bohdi', password: 'correct1' }) }));
    expect(response.status).toBe(200);
    expect((await response.json()).user.role).toBe('user');
    expect(mocked.db.tables[TABLES.simpleUsers][0].role).toBe('user');
  });

  it('requires the optional signup code and still creates only a regular user', async () => {
    process.env.SIGNUP_CODE = 'family-code';
    mocked.db = new FakeDb({});
    const denied = await signup(new Request('http://localhost/api/auth/signup', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'new_kid', password: 'secret1' }),
    }));
    expect(denied.status).toBe(403);

    const response = await signup(new Request('http://localhost/api/auth/signup', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'new_kid', password: 'secret1', code: 'family-code' }),
    }));
    expect(response.status).toBe(201);
    expect((await response.json()).user.role).toBe('user');
  });

  it('forbids an admin from resetting an admin or superuser password', async () => {
    mocked.db = new FakeDb(sessionRows('admin'));
    mocked.db.tables[TABLES.simpleUsers].push({ id: 'target', username: 'director', role: 'superuser' });
    const response = await resetPassword(request('/api/admin/reset-password', 'POST', { targetUserId: 'target', newPassword: 'new-secret' }));
    expect(response.status).toBe(403);
  });

  it('invalidates every target session after an admin password reset', async () => {
    mocked.db = new FakeDb(sessionRows('admin'));
    mocked.db.tables[TABLES.simpleUsers].push({ id: 'target', username: 'friend', role: 'user' });
    mocked.db.tables[TABLES.sessions].push({
      id: 'target-session', user_id: 'target', token_hash: 'target-hash',
      expires_at: new Date(Date.now() + 60_000).toISOString(), last_seen_at: new Date().toISOString(),
    });
    const response = await resetPassword(request('/api/admin/reset-password', 'POST', { targetUserId: 'target', newPassword: 'new-secret' }));
    expect(response.status).toBe(200);
    expect(mocked.db.tables[TABLES.sessions].some((row: any) => row.user_id === 'target')).toBe(false);
  });

  it('keeps only the current session after changing a password', async () => {
    mocked.db.tables[TABLES.simpleUsers][0].password_hash = await hashPassword('old-secret');
    mocked.db.tables[TABLES.sessions].push({
      id: 's2', user_id: 'real-user', token_hash: createHash('sha256').update('other-token').digest('hex'),
      expires_at: new Date(Date.now() + 60_000).toISOString(), last_seen_at: new Date().toISOString(),
    });
    const response = await changeOwnPassword(request('/api/auth/password', 'PUT', { currentPassword: 'old-secret', newPassword: 'new-secret' }));
    expect(response.status).toBe(200);
    expect(mocked.db.tables[TABLES.sessions].map((row: any) => row.id)).toEqual(['s1']);
  });

  it('restricts delegated gifters and applies valid gifts atomically', async () => {
    mocked.db.tables[TABLES.simpleUsers][0].can_gift_items = true;
    mocked.db.tables[TABLES.simpleUsers].push({ id: 'target', username: 'friend', role: 'user', can_gift_items: false });
    mocked.db.tables[TABLES.userProfiles].push({ id: 'target-profile', simple_user_id: 'target' });
    mocked.db.tables[TABLES.userProgress].push({ id: 'target-progress', user_id: 'target-profile', coins: 10, total_earned: 10 });
    expect((await giftCoins(request('/api/admin/gift-coins', 'POST', { targetUserId: 'real-user', amount: 1 }))).status).toBe(403);
    expect((await giftCoins(request('/api/admin/gift-coins', 'POST', { targetUserId: 'target', amount: -1 }))).status).toBe(403);
    expect((await giftCoins(request('/api/admin/gift-coins', 'POST', { targetUserId: 'target', amount: 101 }))).status).toBe(403);
    const response = await giftCoins(request('/api/admin/gift-coins', 'POST', { targetUserId: 'target', amount: 100 }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ newBalance: 110 });
  });

  it('uses schema-checked profile embeds for forum display names', async () => {
    mocked.db.tables[TABLES.forumProblems].push({
      id: 'problem-1', user_id: 'real-profile', is_active: true, custom_words: {}, difficulty_level: 1,
      bohdi_user_profiles: { username: 'kiddo', bohdi_simple_users: { display_name: 'Kid' } },
    });
    const response = await getForum(request('/api/forum'));
    expect(response.status).toBe(200);
    expect((await response.json()).problems[0]).toMatchObject({ username: 'kiddo', display_name: 'Kid' });

    const invalid = await mocked.db.from(TABLES.userProfiles).select('display_name');
    expect(invalid.error?.message).toContain('Unknown column');
  });
});
