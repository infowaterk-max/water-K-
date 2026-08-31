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
});
