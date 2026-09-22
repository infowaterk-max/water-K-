import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const migration='supabase/migrations/20260904191500_orders_paid_at_baseline_fix.sql';
const baselineMigration='supabase/customer-baseline/migrations/0026_orders_paid_at_baseline_fix.sql';
const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),'utf8').toLowerCase().replace(/\s+/g,' ');

describe('orders paid_at production baseline fix',()=>{
  test('restores the runtime column idempotently in production and Fresh Install baseline',()=>{
    const sql=read(migration);
    const baseline=read(baselineMigration);
    expect(sql).toContain('alter table public.orders add column if not exists paid_at timestamptz');
    expect(baseline).toBe(sql);
  });

  test('orders the Fresh Install predecessor before the digital fulfillment lifecycle migration',()=>{
    const names=fs.readdirSync(path.join(process.cwd(),'supabase/customer-baseline/migrations')).filter(name=>name.endsWith('.sql')).sort();
    expect(names.indexOf('0026_orders_paid_at_baseline_fix.sql')).toBeGreaterThan(names.indexOf('0026_order_customer_document_vault.sql'));
    expect(names.indexOf('0026_orders_paid_at_baseline_fix.sql')).toBeLessThan(names.indexOf('0027_digital_fulfillment_checkout_closure.sql'));
  });

  test('matches the existing lifecycle and payment runtime contract',()=>{
    expect(read('supabase/migrations/20260904190500_order_status_enum_text_acceptance_fix.sql')).toContain("paid_at=case when v_target_status='paid' and paid_at is null then now() else paid_at end");
    expect(read('supabase/migrations/20260903192000_payment_event_evidence_atomic_v3.sql')).toContain('paid_at=coalesce(paid_at,v_now)');
    expect(read('src/lib/integrations/processor.ts')).toContain('paid_at');
    expect(read('supabase/customer-baseline/migrations/0027_digital_fulfillment_checkout_closure.sql')).toContain('v_order.paid_at');
  });
});
