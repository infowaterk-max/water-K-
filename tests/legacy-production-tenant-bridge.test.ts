import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const bridgeSql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260901133000_legacy_production_tenant_bridge.sql'),
  'utf8',
).toLowerCase();

const runtimeBootstrapSql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260901133500_legacy_runtime_instance_bootstrap.sql'),
  'utf8',
).toLowerCase();

describe('legacy production tenant bridge', () => {
  it('creates a deterministic tenant only when legacy commerce data exists', () => {
    expect(bridgeSql).toContain('v_instance_count = 0 and v_legacy_rows > 0');
    expect(bridgeSql).toContain("values('legacy-main','migrált webshop','alap','active')");
  });

  it('keeps fresh neutral installs empty', () => {
    expect(bridgeSql).not.toContain('if v_instance_count = 0 then');
    expect(bridgeSql).toContain('(select count(*) from public.products)');
    expect(bridgeSql).toContain('(select count(*) from public.product_variants)');
  });

  it('fails closed unless legacy backfill has exactly one runtime tenant', () => {
    expect(bridgeSql).toContain("where status in ('pilot','active')");
    expect(bridgeSql).toContain('v_legacy_rows > 0 and v_runtime_instances <> 1');
    expect(bridgeSql).toContain('legacy tenant bootstrap requires exactly one active/pilot webshop instance');
  });

  it('defines the single-runtime helper before the legacy bootstrap comments it', () => {
    const createAt = runtimeBootstrapSql.indexOf('create or replace function public.single_runtime_instance_id()');
    const commentAt = runtimeBootstrapSql.indexOf('comment on function public.single_runtime_instance_id()');
    expect(createAt).toBeGreaterThanOrEqual(0);
    expect(commentAt).toBeGreaterThan(createAt);
    expect(runtimeBootstrapSql).toContain('revoke all on function public.single_runtime_instance_id() from public,anon,authenticated,service_role');
  });
});
