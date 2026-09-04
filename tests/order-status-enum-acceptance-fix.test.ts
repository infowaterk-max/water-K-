import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const migrationPath='supabase/migrations/20260904190500_order_status_enum_text_acceptance_fix.sql';
const read=()=>fs.readFileSync(path.join(process.cwd(),migrationPath),'utf8').toLowerCase().replace(/\s+/g,' ');

describe('production pilot order status enum acceptance fix',()=>{
  test('casts the PostgREST text argument once and uses enum-safe lifecycle comparisons',()=>{
    const sql=read();
    expect(sql).toContain('v_target_status public.order_status');
    expect(sql).toContain('v_target_status:=p_target_status::public.order_status');
    expect(sql).toContain('if v_order.status=v_target_status then');
    expect(sql).not.toContain('if v_order.status=p_target_status then');
  });

  test('persists enum status consistently to order state and order-event evidence',()=>{
    const sql=read();
    expect(sql).toContain('set status=v_target_status');
    expect(sql).toContain("'status_changed',v_order.status,v_target_status,p_actor");
    expect(sql).toContain("when v_target_status='paid'");
    expect(sql).toContain("if v_target_status='cancelled' then");
  });

  test('keeps the lifecycle RPC server-only',()=>{
    const sql=read();
    expect(sql).toContain('revoke all on function public.transition_tenant_order_v1(uuid,uuid,uuid,text,text) from public,anon,authenticated');
    expect(sql).toContain('grant execute on function public.transition_tenant_order_v1(uuid,uuid,uuid,text,text) to service_role');
  });
});
