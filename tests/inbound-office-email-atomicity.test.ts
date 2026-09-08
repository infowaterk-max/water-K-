import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const migration='supabase/migrations/20260908030000_digital_office_real_inbound_foundation_v1.sql';

describe('inbound office e-mail atomicity',()=>{
  test('webhook route delegates all business persistence to one evidence-returning RPC',()=>{
    const route=read('src/app/api/communication/inbound/route.ts');
    expect(route).toContain('record_inbound_office_email_v3');
    expect(route).toContain('result.id');
    expect(route).toContain('result.threadId');
    expect(route).toContain('result.instanceId');
    expect(route).not.toContain(".from('office_threads')");
    expect(route).not.toContain(".from('office_messages')");
    expect(route).not.toContain(".from('orders')");
  });

  test('tenant mailbox resolution and inbound message persistence share the same transaction',()=>{
    const sql=read(migration);
    expect(sql).toContain('from public.office_mailboxes m');
    expect(sql).toContain("m.is_active=true");
    expect(sql).toContain("m.provider='resend'");
    expect(sql).toContain("w.status in ('pilot','active')");
    expect(sql).toContain('INBOUND_MAILBOX_NOT_FOUND');
    expect(sql).toContain('insert into public.office_threads');
    expect(sql).toContain('insert into public.office_messages');
    expect(sql).toContain('update public.office_threads');
  });

  test('concurrent inbound messages cannot silently create orphan or duplicate state',()=>{
    const sql=read(migration);
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain('exception when unique_violation');
    expect(sql).toContain("'duplicate',true");
    expect(sql).toContain('INBOUND_THREAD_EVIDENCE_MISSING');
    expect(sql).toContain('INBOUND_MESSAGE_EVIDENCE_MISSING');
  });

  test('inbound v3 is service-runtime only and sender-only v2 is retired',()=>{
    const sql=read(migration);
    expect(sql).toContain('revoke all on function public.record_inbound_office_email_v3');
    expect(sql).toMatch(/grant execute on function public\.record_inbound_office_email_v3[\s\S]{0,260}to service_role/);
    expect(sql).toMatch(/revoke all on function public\.record_inbound_office_email_v2[\s\S]{0,220}public,anon,authenticated,service_role/);
  });
});
