import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.cwd();
const read=(name:string)=>readFileSync(join(root,'supabase','migrations',name),'utf8').toLowerCase();

describe('operational tenant isolation contracts',()=>{
  it('scopes order-adjacent operational tables',()=>{
    const sql=read('20260901151000_operational_tenant_scope.sql');
    for(const table of ['payment_attempts','payment_events','fulfillment_events','integration_jobs','order_events','order_operations','purchase_orders','purchase_order_items','return_cases','return_case_items','support_tickets','support_ticket_messages']){
      expect(sql).toContain(`alter table public.${table} add column if not exists instance_id`);
      expect(sql).toContain(`'${table}'`);
    }
    expect(sql).toContain('tenant_operational_scope_gaps');
  });

  it('refuses strict activation while any operational tenant gap remains',()=>{
    const sql=read('20260901152000_operational_strict_tenant_rls.sql');
    expect(sql).toContain('operational tenant hardening blocked');
    expect(sql).toContain('tenant_operational_scope_gaps');
    expect(sql).toContain('alter table public.payment_attempts alter column instance_id set not null');
    expect(sql).toContain('alter table public.support_ticket_messages alter column instance_id set not null');
  });

  it('prevents cross-store parent-child relations',()=>{
    const sql=read('20260901152000_operational_strict_tenant_rls.sql');
    expect(sql).toContain('cross-store order relation is not allowed');
    expect(sql).toContain('cross-store purchase order relation is not allowed');
    expect(sql).toContain('cross-store return relation is not allowed');
    expect(sql).toContain('cross-store support relation is not allowed');
    expect(sql).toContain('tenant_order_match_payment_attempts');
    expect(sql).toContain('tenant_support_match_messages');
  });

  it('enables RLS for payments, fulfillment, integrations, procurement, returns and support',()=>{
    const sql=read('20260901152000_operational_strict_tenant_rls.sql');
    expect(sql).toContain('payment_attempts_store_read');
    expect(sql).toContain('integration_jobs_store_read');
    expect(sql).toContain('purchase_orders_store_all');
    expect(sql).toContain('return_cases_store_all');
    expect(sql).toContain('support_tickets_store_all');
  });
});
