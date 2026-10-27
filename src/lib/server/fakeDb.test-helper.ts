import { RPC, TABLE_COLUMNS, TABLES } from './tables';

type Row = Record<string, any>;
type Operation = 'select' | 'insert' | 'upsert' | 'update' | 'delete';

function splitProjection(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index++) {
    if (value[index] === '(') depth++;
    if (value[index] === ')') depth--;
    if (value[index] === ',' && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

function validateProjection(table: string, projection: string): string | null {
  const knownColumns = TABLE_COLUMNS[table];
  if (!knownColumns) return `Unknown table ${table}`;
  for (const part of splitProjection(projection)) {
    if (part === '*') continue;
    const relationMarker = part.indexOf('!');
    const open = part.indexOf('(');
    if (relationMarker > 0 && open > relationMarker) {
      const relation = part.slice(0, relationMarker).trim();
      const relationError = validateProjection(relation, part.slice(open + 1, -1));
      if (relationError) return relationError;
      continue;
    }
    const column = part.includes(':') ? part.slice(part.indexOf(':') + 1).trim() : part.trim();
    if (!knownColumns.includes(column)) return `Unknown column ${table}.${column}`;
  }
  return null;
}

class FakeQuery implements PromiseLike<{ data: any; error: any }> {
  private operation: Operation = 'select';
  private values: Row | Row[] | null = null;
  private filters: Array<(row: Row) => boolean> = [];
  private maximum: number | null = null;
  private rangeStart: number | null = null;
  private rangeEnd: number | null = null;
  private countRequested = false;
  private headOnly = false;
  private projection = '*';
  private conflictColumn: string | null = null;
  private ignoreDuplicates = false;

  constructor(private tables: Record<string, Row[]>, private table: string) {}
  select(columns = '*', options?: { count?: string; head?: boolean }) {
    this.projection = columns;
    this.countRequested = options?.count === 'exact';
    this.headOnly = Boolean(options?.head);
    return this;
  }
  insert(values: Row | Row[]) { this.operation = 'insert'; this.values = values; return this; }
  upsert(values: Row | Row[], options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.operation = 'upsert';
    this.values = values;
    this.conflictColumn = options?.onConflict || null;
    this.ignoreDuplicates = Boolean(options?.ignoreDuplicates);
    return this;
  }
  update(values: Row) { this.operation = 'update'; this.values = values; return this; }
  delete() { this.operation = 'delete'; return this; }
  eq(column: string, value: unknown) { this.filters.push(row => row[column] === value); return this; }
  neq(column: string, value: unknown) { this.filters.push(row => row[column] !== value); return this; }
  lt(column: string, value: unknown) { this.filters.push(row => row[column] < (value as any)); return this; }
  order(_column: string, _options?: unknown) { return this; }
  limit(value: number) { this.maximum = value; return this; }
  range(start: number, end: number) { this.rangeStart = start; this.rangeEnd = end; return this; }
  single() { return Promise.resolve(this.execute(true)); }
  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute(false)).then(onfulfilled, onrejected);
  }
  private execute(single: boolean) {
    const schemaError = validateProjection(this.table, this.projection);
    if (schemaError) return { data: null, error: { message: schemaError } };
    const rows = this.tables[this.table] ||= [];
    const matches = (row: Row) => this.filters.every(filter => filter(row));
    if (this.operation === 'insert' || this.operation === 'upsert') {
      let additions = (Array.isArray(this.values) ? this.values : [this.values]).filter(Boolean).map(value => ({
        id: value!.id || crypto.randomUUID(), created_at: value!.created_at || new Date().toISOString(), ...value,
      }));
      const returned: Row[] = [];
      if (this.operation === 'upsert' && this.conflictColumn) {
        const inserted: Row[] = [];
        for (const addition of additions) {
          const existing = rows.find(row => row[this.conflictColumn!] === addition[this.conflictColumn!]);
          if (!existing) {
            inserted.push(addition);
            returned.push(addition);
          } else if (!this.ignoreDuplicates) {
            Object.assign(existing, addition);
            returned.push(existing);
          }
        }
        additions = inserted;
      } else {
        returned.push(...additions);
      }
      rows.push(...additions);
      return { data: single ? returned[0] : returned, error: null };
    }
    if (this.operation === 'update') {
      const changed = rows.filter(matches);
      changed.forEach(row => Object.assign(row, this.values));
      return { data: single ? changed[0] || null : changed, error: null };
    }
    if (this.operation === 'delete') {
      const deleted = rows.filter(matches);
      this.tables[this.table] = rows.filter(row => !matches(row));
      return { data: single ? deleted[0] || null : deleted, error: null };
    }
    let selected = rows.filter(matches);
    const count = this.countRequested ? selected.length : null;
    if (this.rangeStart !== null && this.rangeEnd !== null) selected = selected.slice(this.rangeStart, this.rangeEnd + 1);
    if (this.maximum !== null) selected = selected.slice(0, this.maximum);
    if (this.headOnly) return { data: null, error: null, count };
    return single
      ? { data: selected[0] || null, error: selected[0] ? null : { code: 'PGRST116', message: 'not found' }, count }
      : { data: selected, error: null, count };
  }
}

export class FakeDb {
  constructor(public tables: Record<string, Row[]>) {
    for (const table of Object.values(TABLES)) this.tables[table] ||= [];
  }
  from(table: string) { return new FakeQuery(this.tables, table); }
  async rpc(name: string, parameters: Record<string, any>) {
    if (name === RPC.registerClaimAttempt) {
      const rows = this.tables[TABLES.claimAttempts];
      let attempt = rows.find(row => row.ip === parameters.p_ip);
      const now = Date.now();
      if (!attempt) {
        attempt = { ip: parameters.p_ip, attempt_count: 0, locked_until: null };
        rows.push(attempt);
      }
      const expired = attempt.locked_until && new Date(attempt.locked_until).getTime() <= now;
      attempt.attempt_count = expired ? 1 : attempt.attempt_count + 1;
      attempt.locked_until = attempt.attempt_count >= 5 ? new Date(now + 5 * 60_000).toISOString() : null;
      return { data: [{ attempt_count: attempt.attempt_count, locked_until: attempt.locked_until }], error: null };
    }
    if (name === RPC.registerLoginFailure) {
      const rows = this.tables[TABLES.loginFailures];
      let failure = rows.find(row => row.username === parameters.p_username && row.ip === parameters.p_ip);
      const now = Date.now();
      if (!failure) {
        failure = { id: crypto.randomUUID(), user_id: parameters.p_user_id, username: parameters.p_username, ip: parameters.p_ip, failed_login_count: 0, locked_until: null };
        rows.push(failure);
      }
      const expired = failure.locked_until && new Date(failure.locked_until).getTime() <= now;
      failure.failed_login_count = expired ? 1 : failure.failed_login_count + 1;
      failure.locked_until = failure.failed_login_count >= 5 ? new Date(now + 5 * 60_000).toISOString() : null;
      const user = this.tables[TABLES.simpleUsers].find(row => row.id === parameters.p_user_id);
      if (user) Object.assign(user, { failed_login_count: failure.failed_login_count, locked_until: failure.locked_until });
      return { data: [{ failed_login_count: failure.failed_login_count, locked_until: failure.locked_until }], error: null };
    }
    if (name === RPC.giftCoins) {
      const progress = this.tables[TABLES.userProgress].find(row => row.user_id === parameters.p_profile_id);
      if (!progress) return { data: [], error: null };
      progress.coins = Math.max(0, progress.coins + parameters.p_amount);
      if (parameters.p_amount > 0) progress.total_earned += parameters.p_amount;
      return { data: [{ new_balance: progress.coins }], error: null };
    }
    return { data: null, error: { message: `Unknown RPC ${name}` } };
  }
}

export { validateProjection };
