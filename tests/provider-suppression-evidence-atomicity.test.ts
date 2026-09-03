import fs from 'node:fs';
import path from 'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const migration='supabase/migrations/20260903191000_provider_suppression_evidence_atomic_v2.sql';

describe('provider suppression evidence atomicity',()=>{
  test('webhook delegates tenant resolution and persistence to one RPC',()=>{
    const route=read('src/app/api/webhooks/communication/route.ts');
    expect(route).toContain('record_provider_communication_suppression_v2');
    expect(route).toContain('PROVIDER_SUPPRESSION_EVIDENCE_MISMATCH');
    expect(route).not.toContain(".from('communication_jobs')");
    expect(route).not.toContain(".from('communication_suppressions').insert");
  });

  test('provider bounce or complaint cannot acknowledge an empty recipient set',()=>{
    const route=read('src/app/api/webhooks/communication/route.ts');
    expect(route).toContain("if(to.length===0)return NextResponse.json({error:'Invalid provider event recipients'},{status:400})");
    expect(route).toContain('for(const email of to)');
  });

  test('tenant resolution, suppression and lifecycle event share one transaction',()=>{
    const sql=read(migration);
    expect(sql).toContain("from public.communication_jobs j");
    expect(sql).toContain('PROVIDER_SUPPRESSION_TENANT_AMBIGUOUS');
    expect(sql).toContain('insert into public.communication_suppressions');
    expect(sql).toContain('insert into public.communication_suppression_events');
    expect(sql).toContain('PROVIDER_SUPPRESSION_EVENT_EVIDENCE_MISSING');
  });

  test('provider event replay reuses the same suppression evidence',()=>{
    const sql=read(migration);
    expect(sql).toContain("v_provider_key:=v_provider_event_id||':'||v_email");
    expect(sql).toContain('exception when unique_violation');
    expect(sql).toContain("provider_event_id=v_provider_key");
    expect(sql).toContain("'duplicate',v_duplicate");
  });

  test('provider suppression RPC is service-runtime only',()=>{
    const sql=read(migration);
    expect(sql).toContain('revoke all on function public.record_provider_communication_suppression_v2');
    expect(sql).toMatch(/grant execute on function public\.record_provider_communication_suppression_v2[\s\S]{0,220}to service_role/);
  });
});
