import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrations = ['000_full_schema.sql', '001_bohdi_claim.sql', '002_elma_levels.sql'].map(file => ({
  file,
  sql: readFileSync(resolve(process.cwd(), 'migrations', file), 'utf8'),
}));

function filesBelow(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

describe('shared Kanons schema migration', () => {
  it('does not contain schema-wide or destructive statements', () => {
    for (const { file, sql } of migrations) {
      expect(sql, file).not.toMatch(/ALL\s+TABLES\s+IN\s+SCHEMA/i);
      expect(sql, file).not.toMatch(/DEFAULT\s+PRIVILEGES/i);
      expect(sql, file).not.toMatch(/\bDROP\s/i);
    }
  });

  it('creates and alters only Bohdi-prefixed objects', () => {
    const patterns: Array<[RegExp, string]> = [
      [/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-z0-9_]+)/gi, 'bohdi_'],
      [/ALTER\s+TABLE\s+([a-z0-9_]+)/gi, 'bohdi_'],
      [/CREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION\s+([a-z0-9_]+)/gi, 'bohdi_'],
      [/CREATE\s+TRIGGER\s+([a-z0-9_]+)/gi, 'bohdi_'],
      [/CREATE(?:\s+UNIQUE)?\s+INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-z0-9_]+)/gi, 'idx_bohdi_'],
    ];
    for (const { sql } of migrations) {
      for (const [pattern, prefix] of patterns) {
        for (const match of sql.matchAll(pattern)) expect(match[1], match[0]).toMatch(new RegExp(`^${prefix}`));
      }
    }
  });

  it('does not contain the real secret answer in public files', () => {
    for (const directory of ['src', 'migrations', 'docs']) {
      for (const file of filesBelow(resolve(process.cwd(), directory))) {
        const contents = readFileSync(file, 'utf8');
        expect(contents.toLowerCase(), file).not.toContain('cheese' + 'cake');
      }
    }
  });
});
