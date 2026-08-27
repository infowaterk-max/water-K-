import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (name: string) => readFileSync(join(root, 'supabase', 'migrations', name), 'utf8');

describe('critical commerce and governance SQL contracts', () => {
  it('does not decrement physical stock again during fulfillment pack', () => {
    const sql = read('088_legacy_inventory_semantics_alignment.sql');
    expect(sql.toLowerCase()).toContain('checkout already decrements stock_quantity');
    expect(sql.toLowerCase()).toContain("p_target_status='packed'");
    expect(sql.toLowerCase()).toContain("'stock_changed',false");
    const transitionSection = sql.slice(sql.indexOf('create or replace function public.transition_order_operation'), sql.indexOf('-- V12-aware cancellation restore'));
    expect(transitionSection.toLowerCase()).not.toMatch(/update\s+public\.product_variants\s+set\s+stock_quantity\s*=\s*stock_quantity\s*-/);
  });

  it('keeps refund/restock recovery aggregated by order and variant', () => {
    const sql = read('092_refund_inventory_aggregate_integrity.sql').toLowerCase();
    expect(sql).toContain('sum(oi.quantity)');
    expect(sql).toContain('group by o.id,o.order_number,oi.variant_id,op.operational_status');
    expect(sql).toContain('least(r.ordered_quantity,greatest(-r.net_inventory_change,0))');
  });

  it('owns loyalty redemption idempotency keys by customer and operation', () => {
    const sql = read('082_loyalty_debt_redemption_integrity.sql');
    expect(sql).toContain('Az eseménykulcs már más hűségművelethez tartozik.');
    expect(sql).toContain("v_row.entry_type<>'redeem'");
    expect(sql).toContain('v_row.customer_id<>p_customer_id');
  });

  it('requires trusted release CI evidence', () => {
    const sql = read('137_release_approval_evidence_integrity.sql').toLowerCase();
    expect(sql).toContain("in('github_actions','vercel')");
    expect(sql).toContain("ci_evidence->>'verification'='trusted'");
    expect(sql).toContain('release_ci_is_trusted');
  });

  it('keeps post-release evidence hardened against mutation', () => {
    const sql = read('147_post_release_integrity_hardening.sql').toLowerCase();
    expect(sql).toContain('post_release_evidence');
    expect(sql).toMatch(/immutable|append|revoke\s+(update|delete)|before\s+(update|delete)/);
  });

  it('recovery drill records measured RTO and RPO and restore validation', () => {
    const sql = read('151_recovery_evidence_drill_control.sql').toLowerCase();
    expect(sql).toContain('measured_rto_minutes');
    expect(sql).toContain('measured_rpo_minutes');
    expect(sql).toContain('restore_validated');
  });

  it('prevents runtime service-role bypass of recovery lifecycle', () => {
    const sql = read('159_recovery_strict_mutation_boundary.sql').toLowerCase();
    expect(sql).toContain('revoke');
    expect(sql).toContain('service_role');
    expect(sql).toContain('recovery_evidence');
  });
});
