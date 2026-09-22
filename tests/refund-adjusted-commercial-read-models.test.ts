import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const migration='supabase/migrations/20260903213000_refund_adjusted_commercial_read_models_v2.sql';
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('refund-adjusted commercial read models',()=>{
  test('recognized order authority nets completed refunds and excludes zero-value orders',()=>{
    const sql=read(migration);
    expect(sql).toContain('create or replace view public.commercial_recognized_orders_v2');
    expect(sql).toContain("filter(where rc.status='refunded')");
    expect(sql).toContain('o.total_gross_huf::bigint-least');
    expect(sql).toContain('where recognized_gross_huf>0');
    expect(sql).toContain('recognition_ratio');
  });

  test('customer commercial value is calculated only from recognized order value',()=>{
    const sql=read(migration);
    const section=sql.split('create or replace view public.customer_commercial_metrics')[1]
      .split('create or replace view public.reseller_reorder_signals_v2')[0];
    expect(section).toContain('from public.commercial_recognized_orders_v2 o');
    expect(section).toContain('sum(recognized_gross_huf)::bigint as revenue_gross_huf');
    expect(section).toContain('round(avg(recognized_gross_huf))::integer as aov_gross_huf');
    expect(section).toContain('original_cogs_net_huf,0)*o.recognition_ratio');
    expect(section).not.toContain("from public.orders o");
  });

  test('reseller reorder signals keep tenant role authority and use refund-adjusted orders',()=>{
    const sql=read(migration);
    const section=sql.split('create or replace view public.reseller_reorder_signals_v2')[1]
      .split('create or replace view public.v9_channel_retention_summary_v2')[0];
    expect(section).toContain('from public.commercial_recognized_orders_v2 o');
    expect(section).toContain('join public.customer_instance_roles cir');
    expect(section).toContain("cir.role='reseller'");
    expect(section).toContain('cir.reseller_approved=true');
    expect(section).not.toContain('from public.orders');
  });

  test('retention and cohort views share the same recognized-order authority',()=>{
    const sql=read(migration);
    const retention=sql.split('create or replace view public.v9_channel_retention_summary_v2')[1]
      .split('create or replace view public.v9_monthly_customer_cohorts_v2')[0];
    const cohorts=sql.split('create or replace view public.v9_monthly_customer_cohorts_v2')[1]
      .split('-- Reassert the tenant-only runtime surface')[0];
    expect(retention).toContain('from public.commercial_recognized_orders_v2 o');
    expect(retention).toContain('left join public.customer_instance_roles cir');
    expect(cohorts).toContain('from public.commercial_recognized_orders_v2 o');
    expect(retention).not.toContain('from public.orders');
    expect(cohorts).not.toContain('from public.orders');
  });

  test('loyalty and retention planners inherit refund-adjusted customer value',()=>{
    const loyalty=read('supabase/migrations/20260903211500_loyalty_tenant_lifecycle_engine_v2.sql');
    const retention=read('supabase/migrations/20260901168000_merchant_admin_tenant_closure.sql');
    expect(loyalty).toContain('from public.customer_commercial_metrics m');
    expect(retention).toContain('from public.customer_commercial_metrics');
  });

  test('replacement views remain unavailable to browser roles',()=>{
    const sql=read(migration);
    for(const view of[
      'commercial_recognized_orders_v2',
      'customer_commercial_metrics',
      'reseller_reorder_signals_v2',
      'v9_channel_retention_summary_v2',
      'v9_monthly_customer_cohorts_v2',
    ]){
      expect(sql).toMatch(new RegExp(`revoke all on public\\.${view}[\\s\\S]{0,140}public,anon,authenticated`));
      expect(sql).toContain(`grant select on public.${view} to service_role`);
    }
  });
});