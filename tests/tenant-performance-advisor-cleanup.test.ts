import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const sql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260902105000_tenant_performance_advisor_cleanup.sql'),
  'utf8',
);

const splitPolicies = [
  'content_store_insert',
  'content_store_update',
  'content_store_delete',
  'inventory_events_store_insert',
  'inventory_events_store_update',
  'inventory_events_store_delete',
  'inventory_reservations_store_insert',
  'inventory_reservations_store_update',
  'inventory_reservations_store_delete',
  'variants_store_insert',
  'variants_store_update',
  'variants_store_delete',
  'products_store_insert',
  'products_store_update',
  'products_store_delete',
];

describe('tenant performance advisor cleanup replay safety', () => {
  it('drops every split write policy before recreating it', () => {
    for (const policy of splitPolicies) {
      const drop = sql.indexOf(\`drop policy if exists \${policy} on public.\`);
      const create = sql.indexOf(\`create policy \${policy} \`);
      expect(drop, policy).toBeGreaterThanOrEqual(0);
      expect(create, policy).toBeGreaterThan(drop);
    }
  });
});
