import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const forbiddenCustomerSpecificPatterns = [
  /Water-K/i,
  /water-k-native/i,
  /info\.waterk/i,
  /WK-(?:040|750|25K)/i,
];

function collectSqlFiles(root: string): string[] {
  const absolute = resolve(process.cwd(), root);
  if (statSync(absolute).isFile()) return root.endsWith('.sql') ? [root] : [];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = `${root}/${entry.name}`;
    return entry.isDirectory() ? collectSqlFiles(relative) : entry.name.endsWith('.sql') ? [relative] : [];
  });
}

describe('Shoperation database bootstrap neutrality', () => {
  it.each(collectSqlFiles('supabase'))('%s contains no customer-specific identity or SKU assumptions', (file) => {
    const sql = readFileSync(resolve(process.cwd(), file), 'utf8');
    for (const pattern of forbiddenCustomerSpecificPatterns) expect(sql).not.toMatch(pattern);
  });

  it('keeps the default seed customer-empty', () => {
    const seed = readFileSync(resolve(process.cwd(), 'supabase/seed.sql'), 'utf8');
    expect(seed).not.toMatch(/insert\s+into\s+public\.products/i);
    expect(seed).not.toMatch(/insert\s+into\s+public\.product_variants/i);
  });

  it('fails closed to Alap at the database default layer', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/20260831122000_fail_closed_plan_defaults.sql'),
      'utf8',
    );
    expect(migration).toMatch(/alter\s+table\s+public\.profiles/i);
    expect(migration).toMatch(/alter\s+column\s+subscription_plan\s+set\s+default\s+'alap'/i);
    expect(migration).toMatch(/alter\s+table\s+public\.webshop_instances/i);
  });
});
