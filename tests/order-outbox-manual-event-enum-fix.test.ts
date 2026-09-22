import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const migration='supabase/migrations/20260904194500_order_outbox_manual_event_enum_fix.sql';
const read=()=>fs.readFileSync(path.join(process.cwd(),migration),'utf8').toLowerCase().replace(/\s+/g,' ');

describe('production pilot order outbox manual event enum fix',()=>{
  test('casts text status before writing typed order event evidence',()=>{
    const sql=read();
    expect(sql).toContain('p_target_status::public.order_status, p_target_status::public.order_status');
    expect(sql).not.toContain("'invoice_manual_required', p_target_status,p_target_status,p_actor");
  });

  test('keeps the transition outbox rpc service-runtime only',()=>{
    const sql=read();
    expect(sql).toContain('revoke all on function public.admin_transition_order_with_outbox_v3(uuid,uuid,uuid,text,text,jsonb,jsonb) from public,anon,authenticated');
    expect(sql).toContain('grant execute on function public.admin_transition_order_with_outbox_v3(uuid,uuid,uuid,text,text,jsonb,jsonb) to service_role');
  });
});
