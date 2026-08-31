import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const forbiddenCustomerSpecificPatterns = [
  /Water-K/i,
  /water-k-native/i,
  /info\.waterk/i,
  /WK-(?:040|750|25K)/i,
];

// These files predate Shoperation and are retained as historical migration
// provenance only. They are not an approved fresh-customer bootstrap source.
// The exact list is pinned so no new customer-specific SQL can silently appear.
const LEGACY_MIGRATION_EXCEPTIONS = [
  'supabase/migrations/002_store_runtime.sql',
  'supabase/migrations/004_commerce_audit.sql',
  'supabase/migrations/006_reseller_pricing.sql',
  'supabase/migrations/009_coupon_discount_engine.sql',
  'supabase/migrations/037_order_item_cost_snapshot.sql',
  'supabase/migrations/051_product_variant_shipping_weight.sql',
] as const;

function collectSqlFiles(root: string): string[] {
  const absolute = resolve(process.cwd(), root);
  if (statSync(absolute).isFile()) return root.endsWith('.sql') ? [root] : [];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = `${root}/${entry.name}`;
    return entry.isDirectory() ? collectSqlFiles(relative) : entry.name.endsWith('.sql') ? [relative] : [];
  });
}

function isCustomerSpecific(sql: string): boolean {
  return forbiddenCustomerSpecificPatterns.some((pattern) => pattern.test(sql));
}

const allSqlFiles = collectSqlFiles('supabase');
const legacyExceptions = new Set<string>(LEGACY_MIGRATION_EXCEPTIONS);
const currentBootstrapSql = allSqlFiles.filter((file) => !legacyExceptions.has(file));

describe('Shoperation database bootstrap neutrality', () => {
  it('pins every remaining customer-era SQL occurrence to the documented historical migration set', () => {
    const contaminated = allSqlFiles
      .filter((file) => isCustomerSpecific(readFileSync(resolve(process.cwd(), file), 'utf8')))
      .sort();
    expect(contaminated).toEqual([...LEGACY_MIGRATION_EXCEPTIONS].sort());
  });

  it.each(currentBootstrapSql)('%s contains no customer-specific identity or SKU assumptions', (file) => {
    const sql = readFileSync(resolve(process.cwd(), file), 'utf8');
    expect(isCustomerSpecific(sql)).toBe(false);
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
