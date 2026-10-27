'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { unzipSync } from 'fflate';
import { LEVELS } from './elasto/levels';
import { parseLev } from './elasto/elma';
import { clearGuestLevels, loadGuestLevels, saveGuestLevels, type StoredLevel } from './elasto/storage';
import type { ElmaLevel } from './elasto/types';
import { useElastoStore } from '@/stores/elastoStore';

export interface LoadedLevel {
  id?: string;
  fileName: string;
  sha256: string;
  bytes: Uint8Array;
  level: ElmaLevel;
}
interface ListedLevel { id: string; file_name: string; level_name: string; sha256: string; size_bytes: number }
interface Props {
  visible: boolean;
  selectedBuiltIn: number;
  onSelectBuiltIn: (index: number) => void;
  onPlayBuiltIn: (index: number) => void;
  onPlayLoaded: (level: LoadedLevel) => void;
}
type Shelf = 'built-in' | 'community' | 'mine';
const MAX_LEVELS = 1000;
const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 60 * 1024 * 1024;
const MAX_LEVEL_BYTES = 300_000;
const MAX_UPLOAD_BODY_BYTES = 3 * 1024 * 1024;

function formatMs(ms?: number): string {
  if (ms === undefined) return '--:--.--';
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}.${String(Math.floor(ms / 10) % 100).padStart(2, '0')}`;
}
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
}
function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value); const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
async function hashBytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function uploadLevels(levels: LoadedLevel[], shelf: 'community' | 'mine'): Promise<number> {
  const encoder = new TextEncoder();
  const files = levels.map((item) => {
    const file = { fileName: item.fileName, bytesB64: bytesToBase64(item.bytes) };
    return { file, jsonBytes: encoder.encode(JSON.stringify(file)).byteLength };
  });
  const envelopeBytes = encoder.encode(JSON.stringify({ shelf, files: [] })).byteLength;
  const batches: Array<Array<(typeof files)[number]['file']>> = [];
  let batch: Array<(typeof files)[number]['file']> = [];
  let batchBytes = envelopeBytes;
  let failed = 0;
  for (const { file, jsonBytes } of files) {
    const addedBytes = jsonBytes + (batch.length > 0 ? 1 : 0);
    if (batchBytes + addedBytes > MAX_UPLOAD_BODY_BYTES) {
      if (batch.length) batches.push(batch);
      if (envelopeBytes + jsonBytes > MAX_UPLOAD_BODY_BYTES) {
        failed += 1;
        batch = [];
        batchBytes = envelopeBytes;
        continue;
      }
      batch = [file];
      batchBytes = envelopeBytes + jsonBytes;
    } else {
      batch.push(file);
      batchBytes += addedBytes;
    }
  }
  if (batch.length) batches.push(batch);
  for (const filesBatch of batches) {
    const body = JSON.stringify({ shelf, files: filesBatch });
    try {
      const response = await fetch('/api/levels', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
      if (!response.ok) failed += filesBatch.length;
    } catch { failed += filesBatch.length; }
  }
  return failed;
}

export default function ElmaLevelBrowser({ visible, selectedBuiltIn, onSelectBuiltIn, onPlayBuiltIn, onPlayLoaded }: Props) {
  const [shelf, setShelf] = useState<Shelf>('built-in');
  const [mine, setMine] = useState<LoadedLevel[]>([]);
  const [community, setCommunity] = useState<ListedLevel[]>([]);
  const [serverMine, setServerMine] = useState<ListedLevel[]>([]);
  const [guestLevelsToSave, setGuestLevelsToSave] = useState<LoadedLevel[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [report, setReport] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [addCommunity, setAddCommunity] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const unlocked = useElastoStore((state) => state.unlockedLevel);
  const bestTimes = useElastoStore((state) => state.bestTimes);
  const loadedBestTimes = useElastoStore((state) => state.loadedBestTimes);

  const refreshShelf = useCallback(async (target: 'community' | 'mine') => {
    try {
      const levels: ListedLevel[] = [];
      for (let pageNumber = 1; ; pageNumber += 1) {
        const response = await fetch(`/api/levels?shelf=${target}&page=${pageNumber}`);
        if (!response.ok) return;
        const data = await response.json() as { levels?: ListedLevel[]; hasMore?: boolean };
        levels.push(...(data.levels ?? []));
        if (!data.hasMore) break;
      }
      if (target === 'community') setCommunity(levels); else setServerMine(levels);
    } catch { /* Local levels remain usable offline. */ }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const stored = await loadGuestLevels();
        const parsedGuest = stored.flatMap((item) => {
          try { const bytes = new Uint8Array(item.bytes); return [{ fileName: item.fileName, sha256: item.sha256, bytes, level: parseLev(bytes) }]; }
          catch { return []; }
        });
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json() as { user?: { role?: string } };
          setSignedIn(true); setIsAdmin(data.user?.role === 'admin' || data.user?.role === 'superuser');
          setGuestLevelsToSave(parsedGuest);
          await refreshShelf('mine');
        } else {
          setMine(parsedGuest);
        }
      } catch { /* Guest/offline mode. */ }
      await refreshShelf('community');
    })();
  }, [refreshShelf]);

  const loadFiles = useCallback(async (files: File[]) => {
    const candidates: Array<{ fileName: string; bytes: Uint8Array }> = [];
    let skipped = 0; let tooLarge = 0; let uncompressedBytes = 0; let uncompressedOverflow = false;
    if (files.reduce((sum, file) => sum + file.size, 0) > MAX_INPUT_BYTES) { setReport('That drop is over the 20 MB input limit.'); return; }
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (file.name.toLowerCase().endsWith('.lev')) {
        uncompressedBytes += bytes.length;
        if (bytes.length > MAX_LEVEL_BYTES) tooLarge += 1;
        else candidates.push({ fileName: file.name, bytes });
      }
      else if (file.name.toLowerCase().endsWith('.zip')) {
        try {
          const archive = unzipSync(bytes, { filter: (entry) => {
            if (!/\.lev$/i.test(entry.name) || entry.name.includes('__MACOSX')) return false;
            uncompressedBytes += entry.originalSize;
            if (entry.originalSize > MAX_LEVEL_BYTES) { tooLarge += 1; return false; }
            if (uncompressedBytes > MAX_UNCOMPRESSED_BYTES) { uncompressedOverflow = true; return false; }
            return true;
          } });
          for (const [name, contents] of Object.entries(archive)) candidates.push({ fileName: name.split('/').pop() || name, bytes: contents });
        } catch { skipped += 1; }
      } else skipped += 1;
    }
    if (uncompressedOverflow || uncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
      setReport('A drop may contain at most 60 MB of uncompressed .lev files.'); return;
    }
    if (candidates.length > MAX_LEVELS) {
      setReport('A drop may contain at most 1000 levels.'); return;
    }
    const loaded: LoadedLevel[] = [];
    for (const candidate of candidates) {
      try {
        loaded.push({ ...candidate, sha256: await hashBytes(candidate.bytes), level: parseLev(candidate.bytes) });
      } catch { skipped += 1; }
    }
    const unique = [...new Map(loaded.map((item) => [item.sha256, item])).values()];
    if (!addCommunity) setMine((current) => [...new Map([...current, ...unique].map((item) => [item.sha256, item])).values()].sort((a, b) => a.fileName.localeCompare(b.fileName)));
    setShelf(addCommunity ? 'community' : 'mine');
    if (signedIn && unique.length) {
      const target = addCommunity ? 'community' : 'mine';
      skipped += await uploadLevels(unique, target);
      await refreshShelf(target);
    } else if (!signedIn) {
      const stored: StoredLevel[] = unique.map((item) => ({ sha256: item.sha256, fileName: item.fileName, bytes: item.bytes.buffer.slice(item.bytes.byteOffset, item.bytes.byteOffset + item.bytes.byteLength) as ArrayBuffer }));
      await saveGuestLevels(stored);
    }
    setReport(`Loaded ${unique.length} level${unique.length === 1 ? '' : 's'}, skipped ${skipped} broken file${skipped === 1 ? '' : 's'}${tooLarge ? `, ${tooLarge} too large` : ''}.`);
  }, [addCommunity, refreshShelf, signedIn]);

  useEffect(() => {
    const prevent = (event: DragEvent) => event.preventDefault();
    const drop = (event: DragEvent) => { event.preventDefault(); if (event.dataTransfer?.files.length) void loadFiles([...event.dataTransfer.files]); };
    window.addEventListener('dragover', prevent); window.addEventListener('drop', drop);
    return () => { window.removeEventListener('dragover', prevent); window.removeEventListener('drop', drop); };
  }, [loadFiles]);

  const openServerLevel = useCallback(async (item: ListedLevel) => {
    try {
      const response = await fetch(`/api/levels/${item.id}`); if (!response.ok) throw new Error();
      const data = await response.json() as { level: { bytes_b64: string } }; const bytes = base64ToBytes(data.level.bytes_b64);
      onPlayLoaded({ id: item.id, fileName: item.file_name, sha256: item.sha256, bytes, level: parseLev(bytes) });
    } catch { setReport('That level could not be opened.'); }
  }, [onPlayLoaded]);

  const saveGuestLevelsToAccount = useCallback(async () => {
    const failed = await uploadLevels(guestLevelsToSave, 'mine');
    if (failed === 0) {
      await clearGuestLevels();
      setMine((current) => [...new Map([...current, ...guestLevelsToSave].map((item) => [item.sha256, item])).values()]);
      setGuestLevelsToSave([]);
      await refreshShelf('mine');
      setReport('Saved your guest levels to your account.');
    } else setReport(`Could not save ${failed} guest level${failed === 1 ? '' : 's'}.`);
  }, [guestLevelsToSave, refreshShelf]);

  const filteredLoaded = useMemo(() => mine.filter((item) => `${item.fileName} ${item.level.name}`.toLowerCase().includes(query.toLowerCase())), [mine, query]);
  const combinedMine = useMemo<Array<{ kind: 'local'; item: LoadedLevel } | { kind: 'server'; item: ListedLevel }>>(() => {
    const localHashes = new Set(filteredLoaded.map((item) => item.sha256));
    const serverItems = serverMine.filter((item) => !localHashes.has(item.sha256) && `${item.file_name} ${item.level_name}`.toLowerCase().includes(query.toLowerCase()));
    const entries: Array<{ kind: 'local'; item: LoadedLevel } | { kind: 'server'; item: ListedLevel }> = [
      ...filteredLoaded.map((item) => ({ kind: 'local' as const, item })),
      ...serverItems.map((item) => ({ kind: 'server' as const, item })),
    ];
    return entries.sort((a, b) => (a.kind === 'local' ? a.item.fileName : a.item.file_name).localeCompare(b.kind === 'local' ? b.item.fileName : b.item.file_name));
  }, [filteredLoaded, query, serverMine]);
  const filteredServer = useMemo(() => community.filter((item) => `${item.file_name} ${item.level_name}`.toLowerCase().includes(query.toLowerCase())), [community, query]);
  const total = shelf === 'built-in' ? LEVELS.length : shelf === 'mine' ? combinedMine.length : filteredServer.length;
  useEffect(() => { setCursor(0); setPage(1); }, [shelf, query]);
  useEffect(() => {
    if (!visible) return;
    const key = (event: KeyboardEvent) => {
      const target = event.target;
      const isTextInput = target instanceof HTMLInputElement && ['text', 'search', 'email', 'url', 'number', 'password'].includes(target.type);
      if (isTextInput || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable)) return;
      if (event.code === 'ArrowLeft' || event.code === 'ArrowUp') { event.preventDefault(); setCursor((value) => Math.max(0, value - (event.code === 'ArrowUp' ? 5 : 1))); }
      if (event.code === 'ArrowRight' || event.code === 'ArrowDown') { event.preventDefault(); setCursor((value) => Math.min(Math.max(0, total - 1), value + (event.code === 'ArrowDown' ? 5 : 1))); }
      if (event.code === 'Enter') {
        event.preventDefault();
        if (shelf === 'built-in') onPlayBuiltIn(cursor);
        else if (shelf === 'mine') {
          const selected = combinedMine[cursor];
          if (selected?.kind === 'local') onPlayLoaded(selected.item);
          else if (selected) void openServerLevel(selected.item);
        }
        else { const item = filteredServer[cursor]; if (item) void openServerLevel(item); }
      }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [combinedMine, cursor, filteredServer, onPlayBuiltIn, onPlayLoaded, openServerLevel, shelf, total, visible]);

  if (!visible) return null;
  const pageSize = 50; const start = (page - 1) * pageSize;
  return <div className="absolute inset-0 flex flex-col bg-pixel-black/90 p-3 sm:p-5">
    <div className="flex flex-wrap items-center gap-2">
      {([['built-in', "Bohdi's World"], ['community', 'Community'], ['mine', 'My levels']] as const).map(([key, label]) =>
        <button type="button" key={key} onClick={() => setShelf(key)} className={`border-2 px-3 py-2 font-pixel text-[8px] sm:text-xs ${shelf === key ? 'border-foamy-green bg-ocean-blue' : 'border-white/40 text-white'}`}>{label}</button>)}
      <button type="button" onClick={() => inputRef.current?.click()} className="ml-auto border-2 border-yellow-300 px-3 py-2 font-pixel text-[8px] text-yellow-300 sm:text-xs">LOAD LEVELS</button>
      <input ref={inputRef} className="hidden" type="file" multiple accept=".lev,.zip" onChange={(event) => { if (event.target.files) void loadFiles([...event.target.files]); event.target.value = ''; }} />
    </div>
    {isAdmin && <label className="mt-2 self-end font-lcd text-lg text-white"><input type="checkbox" checked={addCommunity} onChange={(event) => setAddCommunity(event.target.checked)} /> Add to Community</label>}
    {signedIn && guestLevelsToSave.length > 0 && <button type="button" onClick={() => void saveGuestLevelsToAccount()} className="mt-2 self-end border-2 border-foamy-green px-3 py-2 font-pixel text-[8px] text-foamy-green sm:text-xs">SAVE {guestLevelsToSave.length} LEVEL{guestLevelsToSave.length === 1 ? '' : 'S'} TO MY ACCOUNT</button>}
    {shelf !== 'built-in' && <input aria-label="Search levels" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search level or file name…" className="mt-3 border-2 border-white/50 bg-black/40 px-3 py-2 font-lcd text-xl text-white" />}
    {report && <p className="mt-2 font-lcd text-lg text-foamy-green">{report}</p>}
    <div className="mt-3 grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
      {shelf === 'built-in' && LEVELS.map((level, index) => <button type="button" disabled={index > unlocked} key={level.name} onMouseEnter={() => setCursor(index)} onClick={() => { onSelectBuiltIn(index); onPlayBuiltIn(index); }} className={`min-h-20 border-2 p-2 ${cursor === index || selectedBuiltIn === index ? 'border-foamy-green bg-ocean-blue/70' : 'border-white/40'} ${index > unlocked ? 'opacity-40' : ''}`}><span className="block font-pixel text-xs text-sand-beige">{index > unlocked ? '🔒' : index + 1}</span><span className="mt-1 block font-pixel text-[7px] text-white">{level.name}</span><span className="mt-1 block font-lcd text-sm text-yellow-300">{formatMs(bestTimes[index])}</span></button>)}
      {shelf === 'mine' ? combinedMine.slice(start, start + pageSize).map((entry, index) => {
        if (entry.kind === 'local') {
          const item = entry.item;
          return <button type="button" key={`local-${item.sha256}`} onMouseEnter={() => setCursor(start + index)} onClick={() => onPlayLoaded(item)} className={`min-h-20 border-2 p-2 text-left ${cursor === start + index ? 'border-foamy-green' : 'border-white/40'}`}><span className="block truncate font-pixel text-[7px] text-white">{item.level.name}</span><span className="mt-2 block truncate font-lcd text-sm text-sand-beige">{item.fileName}</span><span className="font-lcd text-sm text-yellow-300">{formatMs(loadedBestTimes[item.sha256])}</span></button>;
        }
        const item = entry.item;
        return <button type="button" key={`server-${item.id}`} onMouseEnter={() => setCursor(start + index)} onClick={() => void openServerLevel(item)} className={`min-h-20 border-2 p-2 text-left ${cursor === start + index ? 'border-foamy-green' : 'border-white/40'}`}><span className="block truncate font-pixel text-[7px] text-white">{item.level_name}</span><span className="mt-2 block truncate font-lcd text-sm text-sand-beige">{item.file_name}</span><span className="font-lcd text-sm text-yellow-300">{formatMs(loadedBestTimes[item.sha256])}</span></button>;
      }) : shelf !== 'built-in' && filteredServer.slice(start, start + pageSize).map((item, index) => <button type="button" key={item.id} onMouseEnter={() => setCursor(start + index)} onClick={() => void openServerLevel(item)} className={`min-h-20 border-2 p-2 text-left ${cursor === start + index ? 'border-foamy-green' : 'border-white/40'}`}><span className="block truncate font-pixel text-[7px] text-white">{item.level_name}</span><span className="mt-2 block truncate font-lcd text-sm text-sand-beige">{item.file_name}</span><span className="font-lcd text-sm text-yellow-300">{formatMs(loadedBestTimes[item.sha256])}</span></button>)}
    </div>
    {total > pageSize && <div className="mt-2 flex justify-center gap-3"><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="font-pixel text-xs text-white">← PREV</button><span className="font-lcd text-xl text-sand-beige">{page} / {Math.ceil(total / pageSize)}</span><button type="button" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((value) => value + 1)} className="font-pixel text-xs text-white">NEXT →</button></div>}
  </div>;
}
