import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const sql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260901133000_legacy_production_tenant_bridge.sql'),
  'utf8',
).toLowerCase();

describe('legacy production tenant bridge', () => {
  it('creates a deterministic tenant only when legacy commerce data exists', () => {
    expect(sql).toContain('v_instance_count = 0 and v_legacy_rows > 0');
    expect(sql).toContain("values('legacy-main','migrált webshop','alap','active')");
  });

  it('keeps fresh neutral installs empty', () => {
    expect(sql).not.toContain('if v_instance_count = 0 then');
    expect(sql).toContain('(select count(*) from public.products)');
    expect(sql).toContain('(select count(*) from public.product_variants)');
  });

  it('fails closed unless legacy backfill has exactly one runtime tenant', () => {
    expect(sql).toContain("where status in ('pilot','active')");
    expect(sql).toContain('v_legacy_rows > 0 and v_runtime_instances <> 1');
    expect(sql).toContain('legacy tenant bootstrap requires exactly one active/pilot webshop instance');
  });
});
