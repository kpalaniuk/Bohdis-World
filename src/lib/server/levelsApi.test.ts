import { createHash } from 'node:crypto';
import { Level, Position } from 'elmajs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDb } from './fakeDb.test-helper';
import { TABLES } from './tables';

const mocked = vi.hoisted(() => ({ db: null as any }));
vi.mock('./db', () => ({ getDb: () => mocked.db }));
import { GET as listLevels, POST as postLevels } from '@/app/api/levels/route';
import { GET as getLevel } from '@/app/api/levels/[id]/route';

const TOKEN = 'levels-token';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const PROFILE_ID = '00000000-0000-4000-8000-000000000002';
const OTHER_PROFILE = '00000000-0000-4000-8000-000000000003';
const LEVEL_ID = '00000000-0000-4000-8000-000000000004';
function rows(role: 'user' | 'admin' = 'user') { return {
  [TABLES.simpleUsers]: [{ id: USER_ID, username: 'rider', display_name: 'Rider', role, can_gift_items: false }],
  [TABLES.userProfiles]: [{ id: PROFILE_ID, simple_user_id: USER_ID }],
  [TABLES.sessions]: [{ id: 's1', user_id: USER_ID, token_hash: createHash('sha256').update(TOKEN).digest('hex'), expires_at: new Date(Date.now() + 60_000).toISOString(), last_seen_at: new Date().toISOString() }],
}; }
function request(path: string, method = 'GET', body?: unknown) { return new Request(`http://localhost${path}`, { method,
  headers: { cookie: `bw_session=${TOKEN}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); }
const apiFixture = new Level();
apiFixture.polygons[0].vertices = [new Position(0, -2), new Position(10, -2), new Position(10, 8), new Position(0, 8)];
apiFixture.objects[0].position = new Position(2, 7.2);
apiFixture.objects[1].position = new Position(8, 7.3);
const bytesB64 = apiFixture.toBuffer().toString('base64');

describe('levels API', () => {
  beforeEach(() => { mocked.db = new FakeDb(rows()); });
  it('forbids a regular user from posting community levels', async () => {
    expect((await postLevels(request('/api/levels', 'POST', { shelf: 'community', files: [{ fileName: 'a.lev', bytesB64 }] }))).status).toBe(403);
  });
  it('rejects bad files and per-file size violations', async () => {
    expect((await postLevels(request('/api/levels', 'POST', { shelf: 'mine', files: [{ fileName: 'bad.lev', bytesB64: 'AQID' }] }))).status).toBe(400);
    const huge = Buffer.alloc(300_001).toString('base64');
    expect((await postLevels(request('/api/levels', 'POST', { shelf: 'mine', files: [{ fileName: 'huge.lev', bytesB64: huge }] }))).status).toBe(400);
    const unsafe = new Level(); unsafe.objects[0].position = new Position(10_001, 0);
    expect((await postLevels(request('/api/levels', 'POST', { shelf: 'mine', files: [{ fileName: 'unsafe.lev', bytesB64: unsafe.toBuffer().toString('base64') }] }))).status).toBe(400);
  });
  it('deduplicates valid uploads by sha256', async () => {
    const first = await postLevels(request('/api/levels', 'POST', { shelf: 'mine', files: [{ fileName: 'a.lev', bytesB64 }] }));
    const second = await postLevels(request('/api/levels', 'POST', { shelf: 'mine', files: [{ fileName: 'copy.lev', bytesB64 }] }));
    expect(await first.json()).toMatchObject({ added: 1, duplicates: 0 });
    expect(await second.json()).toMatchObject({ added: 0, duplicates: 1 });
  });
  it("does not list or return another user's private level", async () => {
    mocked.db.tables[TABLES.levels].push({ id: LEVEL_ID, shelf: 'mine', owner_profile_id: OTHER_PROFILE, file_name: 'secret.lev', level_name: 'Secret', sha256: 'a', bytes_b64: bytesB64, size_bytes: 850 });
    const listed = await listLevels(request('/api/levels?shelf=mine'));
    expect((await listed.json()).levels).toEqual([]);
    const fetched = await getLevel(request(`/api/levels/${LEVEL_ID}`), { params: Promise.resolve({ id: LEVEL_ID }) });
    expect(fetched.status).toBe(403);
  });
  it('paginates past PostgREST max rows without truncating results', async () => {
    mocked.db.tables[TABLES.levels].push(...Array.from({ length: 1050 }, (_, index) => ({
      id: crypto.randomUUID(), shelf: 'community', owner_profile_id: null, file_name: `${String(index).padStart(4, '0')}.lev`,
      level_name: `Level ${index}`, sha256: `sha-${index}`, bytes_b64: bytesB64, size_bytes: 850,
    })));
    const response = await listLevels(request('/api/levels?shelf=community&page=21'));
    expect((await response.json()).levels).toHaveLength(50);
  });
  it('enforces exact per-user count and 100 MB total byte caps', async () => {
    mocked.db.tables[TABLES.levels].push(...Array.from({ length: 2000 }, () => ({
      id: crypto.randomUUID(), shelf: 'mine', owner_profile_id: PROFILE_ID, file_name: 'owned.lev', level_name: 'Owned',
      sha256: crypto.randomUUID(), bytes_b64: bytesB64, size_bytes: 1,
    })));
    expect((await postLevels(request('/api/levels', 'POST', { shelf: 'mine', files: [{ fileName: 'one-more.lev', bytesB64 }] }))).status).toBe(400);

    mocked.db = new FakeDb(rows());
    mocked.db.tables[TABLES.levels].push(...Array.from({ length: 350 }, () => ({
      id: crypto.randomUUID(), shelf: 'mine', owner_profile_id: PROFILE_ID, file_name: 'large.lev', level_name: 'Large',
      sha256: crypto.randomUUID(), bytes_b64: '', size_bytes: 300_000,
    })));
    expect((await postLevels(request('/api/levels', 'POST', { shelf: 'mine', files: [{ fileName: 'over-cap.lev', bytesB64 }] }))).status).toBe(400);
  });
});
