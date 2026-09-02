import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const sql = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260901162500_core_checkout_line_normalization.sql'),
  'utf8',
);

describe('core checkout line normalization', () => {
  test('aggregates duplicate variant lines before quote and order creation', () => {
    expect(sql).toMatch(/group by \(e->>'variant_id'\)::uuid/);
    expect(sql).toMatch(/sum\(\(e->>'quantity'\)::integer\)/);
    expect(sql).toMatch(/quantity[^;]*>99/);
  });

  test('uses the canonical line set for idempotency and deterministic processing', () => {
    expect(sql).toMatch(/'items',v_items/);
    expect(sql).toMatch(/jsonb_array_elements\(v_items\) order by \(value->>'variant_id'\)::uuid/);
  });

  test('keeps both checkout RPCs private to the service role', () => {
    expect(sql).toMatch(/revoke all on function public\.quote_tenant_checkout_v1[\s\S]*from public,anon,authenticated/);
    expect(sql).toMatch(/grant execute on function public\.quote_tenant_checkout_v1[\s\S]*to service_role/);
    expect(sql).toMatch(/revoke all on function public\.place_order_provider_v4_idempotent[\s\S]*from public,anon,authenticated/);
    expect(sql).toMatch(/grant execute on function public\.place_order_provider_v4_idempotent[\s\S]*to service_role/);
  });
});
