import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const migration='supabase/migrations/20260903185000_support_submission_atomic_v2.sql';

describe('support submission atomicity',()=>{
  test('public route delegates dedupe, order resolution and ticket persistence to one RPC',()=>{
    const route=read('src/app/api/support/route.ts');
    expect(route).toContain('create_support_ticket_v2');
    expect(route).toContain('result.instanceId!==instance.id');
    expect(route).toContain('result.duplicate===true');
    expect(route).not.toContain(".from('orders')");
    expect(route).not.toContain(".from('support_tickets')");
  });

  test('semantic duplicate check is serialized and returns existing evidence',()=>{
    const sql=read(migration);
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain("created_at>=now()-interval '5 minutes'");
    expect(sql).toContain("'duplicate',true");
  });

  test('ticket insert verifies the trigger-created initial message in the same transaction',()=>{
    const sql=read(migration);
    expect(sql).toContain('insert into public.support_tickets');
    expect(sql).toContain('SUPPORT_TICKET_EVIDENCE_MISSING');
    expect(sql).toContain('SUPPORT_INITIAL_MESSAGE_EVIDENCE_MISSING');
    expect(sql).toContain('public.support_ticket_messages');
  });

  test('support submission RPC is service-runtime only',()=>{
    const sql=read(migration);
    expect(sql).toContain('revoke all on function public.create_support_ticket_v2');
    expect(sql).toMatch(/grant execute on function public\.create_support_ticket_v2[\s\S]{0,220}to service_role/);
  });
});
