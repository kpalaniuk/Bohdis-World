import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDb } from './fakeDb.test-helper';
import { hashPassword } from './passwords';
import * as passwordHelpers from './passwords';
import {
  CLAIM_ANSWER_KEY,
  CLAIM_TOKEN_KEY,
  CLAIMED_USER_KEY,
  hashClaimToken,
  normalizeBohdiAnswer,
} from './bohdiClaim';
import { TABLES } from './tables';

const mocked = vi.hoisted(() => ({ db: null as any }));
vi.mock('./db', () => ({ getDb: () => mocked.db }));

import { GET as getConfig } from '@/app/api/auth/config/route';
import { POST as verifyAnswer } from '@/app/api/auth/bohdi/verify/route';
import { POST as claimAccount } from '@/app/api/auth/bohdi/claim/route';

const MADE_UP_ANSWER = 'pineapple pie';

function post(path: string, body: Record<string, unknown>, options?: { ip?: string; cookie?: string }) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (options?.ip) headers['x-forwarded-for'] = options.ip;
  if (options?.cookie) headers.cookie = options.cookie;
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

async function configuredDb() {
  return new FakeDb({
    [TABLES.appSecrets]: [{
      key: CLAIM_ANSWER_KEY,
      value: await hashPassword(normalizeBohdiAnswer(MADE_UP_ANSWER)),
      expires_at: null,
    }],
  });
}

async function verifiedCookie(ip = '10.0.0.1'): Promise<string> {
  const response = await verifyAnswer(post('/api/auth/bohdi/verify', { answer: 'Pineapple Pie!' }, { ip }));
  expect(response.status).toBe(200);
  const setCookie = response.headers.get('set-cookie') || '';
  expect(setCookie).toContain('bw_claim=');
  expect(setCookie.toLowerCase()).toContain('httponly');
  return `bw_claim=${setCookie.split('bw_claim=')[1].split(';')[0]}`;
}

describe('Bohdi claim answer normalization', () => {
  it('matches case, spaces, and punctuation but not a different answer', () => {
    expect(normalizeBohdiAnswer('Pineapple Pie!')).toBe('pineapplepie');
    expect(normalizeBohdiAnswer(' pineapplepie ')).toBe('pineapplepie');
    expect(normalizeBohdiAnswer('pineapple')).not.toBe('pineapplepie');
  });
});

describe('Bohdi claim handlers', () => {
  beforeEach(async () => {
    delete process.env.SIGNUP_CODE;
    mocked.db = await configuredDb();
    vi.restoreAllMocks();
  });

  it('rejects a wrong answer and accepts a normalized right answer with a token cookie', async () => {
    const wrong = await verifyAnswer(post('/api/auth/bohdi/verify', { answer: 'pineapple' }, { ip: '10.0.0.1' }));
    expect(wrong.status).toBe(401);
    await expect(wrong.json()).resolves.toEqual({ error: "That's not it. Try again!" });

    const cookie = await verifiedCookie('10.0.0.2');
    expect(cookie).toMatch(/^bw_claim=.+/);
    const tokenRow = mocked.db.tables[TABLES.appSecrets].find((row: any) => row.key === CLAIM_TOKEN_KEY);
    expect(tokenRow.value).toMatch(/^[a-f0-9]{64}$/);
    expect(new Date(tokenRow.expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it('refuses the sixth attempt without verifying and leaves another IP unaffected', async () => {
    const verifySpy = vi.spyOn(passwordHelpers, 'verifyPassword');
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await verifyAnswer(post('/api/auth/bohdi/verify', { answer: 'wrong' }, { ip: '10.0.0.1' }));
      expect(response.status).toBe(401);
    }
    expect(verifySpy).toHaveBeenCalledTimes(5);

    const sixth = await verifyAnswer(post('/api/auth/bohdi/verify', { answer: 'wrong' }, { ip: '10.0.0.1' }));
    expect(sixth.status).toBe(429);
    expect(verifySpy).toHaveBeenCalledTimes(5);

    const otherIp = await verifyAnswer(post('/api/auth/bohdi/verify', { answer: ' pineapplepie ' }, { ip: '10.0.0.2' }));
    expect(otherIp.status).toBe(200);
  });

  it('returns gone after the account has already been claimed', async () => {
    mocked.db.tables[TABLES.appSecrets].push({ key: CLAIMED_USER_KEY, value: 'existing-user' });
    const response = await verifyAnswer(post('/api/auth/bohdi/verify', { answer: MADE_UP_ANSWER }));
    expect(response.status).toBe(410);
  });

  it('requires a valid, unexpired claim cookie', async () => {
    const missing = await claimAccount(post('/api/auth/bohdi/claim', { username: 'new_bohdi', password: 'secret1' }));
    expect(missing.status).toBe(403);

    const expiredToken = 'expired-token';
    mocked.db.tables[TABLES.appSecrets].push({
      key: CLAIM_TOKEN_KEY,
      value: hashClaimToken(expiredToken),
      expires_at: new Date(Date.now() - 1_000).toISOString(),
    });
    const expired = await claimAccount(post('/api/auth/bohdi/claim', {
      username: 'new_bohdi',
      password: 'secret1',
    }, { cookie: `bw_claim=${expiredToken}` }));
    expect(expired.status).toBe(403);
  });

  it('claims once, creates a regular signed-in account, and flips config availability', async () => {
    process.env.SIGNUP_CODE = 'unrelated-signup-code';
    expect(await (await getConfig()).json()).toMatchObject({ bohdiClaimAvailable: true });
    const cookie = await verifiedCookie();

    const response = await claimAccount(post('/api/auth/bohdi/claim', {
      username: 'new_bohdi',
      password: 'secret1',
    }, { cookie }));
    expect(response.status).toBe(201);
    expect((await response.json()).user).toMatchObject({ username: 'new_bohdi', display_name: 'Bohdi', role: 'user' });
    expect(response.headers.get('set-cookie')).toContain('bw_session=');
    expect(mocked.db.tables[TABLES.appSecrets]).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: CLAIMED_USER_KEY }),
    ]));
    expect(mocked.db.tables[TABLES.appSecrets].some((row: any) => row.key === CLAIM_TOKEN_KEY)).toBe(false);
    expect(mocked.db.tables[TABLES.userActivities]).toEqual(expect.arrayContaining([
      expect.objectContaining({ activity_type: 'signup' }),
    ]));
    expect(await (await getConfig()).json()).toMatchObject({ bohdiClaimAvailable: false });

    const second = await claimAccount(post('/api/auth/bohdi/claim', {
      username: 'another_bohdi',
      password: 'secret1',
    }, { cookie }));
    expect(second.status).toBe(403);
  });

  it('stores only the hash of the random claim token', async () => {
    const cookie = await verifiedCookie();
    const rawToken = cookie.slice('bw_claim='.length);
    const tokenRow = mocked.db.tables[TABLES.appSecrets].find((row: any) => row.key === CLAIM_TOKEN_KEY);
    expect(tokenRow.value).toBe(createHash('sha256').update(rawToken).digest('hex'));
    expect(tokenRow.value).not.toBe(rawToken);
  });
});
