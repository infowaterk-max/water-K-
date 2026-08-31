import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const preflight = readFileSync('supabase/customer-baseline/source-preflight.sql', 'utf8');

describe('customer baseline source preflight', () => {
  it('requires the core sellable Shoperation schema before snapshotting', () => {
    for (const object of [
      'public.webshop_instances',
      'public.profiles',
      'public.products',
      'public.orders',
      'public.commerce_provider_catalog',
      'public.webshop_instance_commerce_settings',
    ]) {
      expect(preflight).toContain(object);
    }
  });

  it('fails closed to Alap and rejects obsolete checkout overloads', () => {
    expect(preflight).toContain("not ilike '%alap%'");
    expect(preflight).toContain("p.proname = 'place_order'");
    expect(preflight).toContain("p.proname = 'place_order_provider_v2_idempotent'");
    expect(preflight).toContain('source-preflight-ok');
  });

  it('keeps control-plane and commerce configuration tables service-role only', () => {
    for (const table of [
      'webshop_instances',
      'webshop_instance_members',
      'webshop_instance_commerce_settings',
      'webshop_instance_provider_connections',
      'commerce_provider_catalog',
      'platform_operators',
      'communication_job_events',
      'inventory_snapshots',
      'purchase_order_items',
      'purchase_orders',
      'suppliers',
    ]) {
      expect(preflight).toContain(`'${table}'`);
    }
    expect(preflight).toContain("grantee in ('anon','authenticated','PUBLIC')");
    expect(preflight).toContain("grantee = 'service_role'");
    expect(preflight).toContain("privilege_type = 'SELECT'");
    expect(preflight).toContain('protected_policy_count <> 0');
    expect(preflight).toContain('not protected_rls');
  });

  it('rejects every public no-policy RLS table that retains browser grants', () => {
    expect(preflight).toContain('exposed_no_policy_count');
    expect(preflight).toContain("n.nspname = 'public'");
    expect(preflight).toContain('and c.relrowsecurity');
    expect(preflight).toContain('not exists (select 1 from pg_policy p where p.polrelid = c.oid)');
    expect(preflight).toContain("tp.grantee in ('anon','authenticated','PUBLIC')");
    expect(preflight).toContain('Public RLS tables without policies still expose browser-role grants');
  });
});
