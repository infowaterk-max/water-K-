import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const migration='supabase/migrations/20260904191500_orders_paid_at_baseline_fix.sql';
const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),'utf8').toLowerCase().replace(/\s+/g,' ');

describe('orders paid_at production baseline fix',()=>{
  test('restores the runtime column idempotently',()=>{
    const sql=read(migration);
    expect(sql).toContain('alter table public.orders add column if not exists paid_at timestamptz');
  });

  test('matches the existing lifecycle and payment runtime contract',()=>{
    expect(read('supabase/migrations/20260904190500_order_status_enum_text_acceptance_fix.sql')).toContain("paid_at=case when v_target_status='paid' and paid_at is null then now() else paid_at end");
    expect(read('supabase/migrations/20260903192000_payment_event_evidence_atomic_v3.sql')).toContain('paid_at=coalesce(paid_at,v_now)');
    expect(read('src/lib/integrations/processor.ts')).toContain('paid_at');
  });
});
