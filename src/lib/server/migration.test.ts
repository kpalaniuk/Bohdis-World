import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'migrations/000_full_schema.sql'), 'utf8');

describe('shared Kanons schema migration', () => {
  it('does not contain schema-wide or destructive statements', () => {
    expect(migration).not.toMatch(/ALL\s+TABLES\s+IN\s+SCHEMA/i);
    expect(migration).not.toMatch(/DEFAULT\s+PRIVILEGES/i);
    expect(migration).not.toMatch(/\bDROP\s/i);
  });

  it('creates and alters only Bohdi-prefixed objects', () => {
    const patterns: Array<[RegExp, string]> = [
      [/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-z0-9_]+)/gi, 'bohdi_'],
      [/ALTER\s+TABLE\s+([a-z0-9_]+)/gi, 'bohdi_'],
      [/CREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION\s+([a-z0-9_]+)/gi, 'bohdi_'],
      [/CREATE\s+TRIGGER\s+([a-z0-9_]+)/gi, 'bohdi_'],
      [/CREATE(?:\s+UNIQUE)?\s+INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-z0-9_]+)/gi, 'idx_bohdi_'],
    ];
    for (const [pattern, prefix] of patterns) {
      for (const match of migration.matchAll(pattern)) expect(match[1], match[0]).toMatch(new RegExp(`^${prefix}`));
    }
  });
});
