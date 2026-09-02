import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = () =>
  readFileSync(
    'supabase/migrations/20260902155600_drop_remaining_legacy_place_order_overload.sql',
    'utf8',
  ).toLowerCase();

describe('legacy upgrade closure', () => {
  it('drops the earliest 11-text-plus-jsonb legacy checkout overload', () => {
    const sql = source().replace(/\s+/g, ' ');
    expect(sql).toContain(
      'drop function if exists public.place_order( text, text, text, text, text, text, text, text, text, text, text, jsonb );',
    );
  });

  it('fails closed if any legacy public.place_order overload survives', () => {
    const sql = source();
    expect(sql).toContain("n.nspname = 'public'");
    expect(sql).toContain("p.proname = 'place_order'");
    expect(sql).toContain('raise exception');
  });

  it('restores the current service-role-only grants missing from legacy upgrades', () => {
    const sql = source();
    for (const table of [
      'communication_job_events',
      'inventory_snapshots',
      'purchase_order_items',
      'purchase_orders',
      'suppliers',
    ]) {
      expect(sql).toContain(
        `revoke all privileges on table public.${table} from public, anon, authenticated`,
      );
      expect(sql).toContain(
        `grant all privileges on table public.${table} to service_role`,
      );
    }
  });
});
