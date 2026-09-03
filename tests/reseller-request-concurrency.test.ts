import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const migration='supabase/migrations/20260903183500_reseller_request_concurrency_v2.sql';

describe('reseller request concurrency safety',()=>{
  test('customer request is an evidence-returning RPC instead of read then upsert',()=>{
    const route=read('src/app/api/account/reseller-request/route.ts');
    expect(route).toContain('request_reseller_status_v2');
    expect(route).toContain('result.userId!==user.id');
    expect(route).toContain("result.role!=='reseller'");
    expect(route).not.toContain(".from('customer_instance_roles').upsert(");
    expect(route).not.toContain(".from('customer_instance_roles').select(");
  });

  test('approved reseller can never be downgraded by a concurrent customer request',()=>{
    const sql=read(migration);
    expect(sql).toContain('for update');
    expect(sql).toContain("v_row.role='reseller' and v_row.reseller_approved=true");
    expect(sql).toContain("'approved',true");
    expect(sql).toContain('on conflict(instance_id,user_id) do nothing');
    expect(sql).toContain('RESELLER_REQUEST_EVIDENCE_MISMATCH');
  });

  test('reseller request RPC is service-runtime only',()=>{
    const sql=read(migration);
    expect(sql).toContain('revoke all on function public.request_reseller_status_v2');
    expect(sql).toMatch(/grant execute on function public\.request_reseller_status_v2[\s\S]{0,180}to service_role/);
  });
});
