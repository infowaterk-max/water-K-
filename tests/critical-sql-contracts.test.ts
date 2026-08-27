import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (name: string) => readFileSync(join(root, 'supabase', 'migrations', name), 'utf8');

describe('critical commerce and governance SQL contracts', () => {
  it('does not decrement physical stock again during fulfillment pack', () => {
    const sql = read('088_checkout_stock_compatibility.sql');
    expect(sql).toContain('checkout');
    expect(sql.toLowerCase()).toContain('packed');
    expect(sql.toLowerCase()).not.toMatch(/set\s+stock_quantity\s*=\s*stock_quantity\s*-/);
  });

  it('keeps refund/restock recovery aggregated by order and variant', () => {
    const sql = read('092_refund_restock_aggregation_integrity.sql');
    expect(sql.toLowerCase()).toContain('group by');
    expect(sql.toLowerCase()).toContain('variant_id');
    expect(sql.toLowerCase()).toContain('order_id');
  });

  it('owns loyalty redemption idempotency keys by customer and operation', () => {
    const sql = read('082_loyalty_debt_redemption_integrity.sql');
    expect(sql).toContain('Az eseménykulcs már más hűségművelethez tartozik.');
    expect(sql).toContain("entry_type<>'redeem'");
    expect(sql).toContain('v_row.customer_id<>p_customer_id');
  });

  it('requires trusted release CI evidence', () => {
    const sql = read('137_release_trusted_ci_gate.sql');
    expect(sql.toLowerCase()).toContain('github_actions');
    expect(sql.toLowerCase()).toContain('vercel');
    expect(sql.toLowerCase()).toContain('trusted');
  });

  it('keeps post-release evidence append-only', () => {
    const sql = read('147_post_release_integrity_hardening.sql');
    expect(sql.toLowerCase()).toContain('post_release_evidence');
    expect(sql.toLowerCase()).toMatch(/append|immutable|update|delete/);
  });

  it('recovery drill records measured RTO and RPO and restore validation', () => {
    const sql = read('151_recovery_evidence_drill_control.sql');
    expect(sql.toLowerCase()).toContain('measured_rto');
    expect(sql.toLowerCase()).toContain('measured_rpo');
    expect(sql.toLowerCase()).toContain('restore');
  });

  it('prevents runtime service-role bypass of recovery lifecycle', () => {
    const sql = read('159_recovery_strict_mutation_boundary.sql');
    expect(sql.toLowerCase()).toContain('revoke');
    expect(sql.toLowerCase()).toContain('service_role');
  });
});
