import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('customer support reply atomicity',()=>{
  test('customer reply relies on the tenant-safe message trigger instead of a second ticket update',()=>{
    const route=read('src/app/api/account/support/[id]/messages/route.ts');
    const sql=read('supabase/migrations/20260901165100_communication_tenant_closure.sql');
    expect(route).toContain(".from('support_ticket_messages').insert(");
    expect(route).toContain(".select('id').single()");
    expect(route).toContain('message?.id');
    expect(route).not.toContain(".from('support_tickets').update(");
    expect(sql).toMatch(/sync_support_ticket_from_message[\s\S]*status='open'[\s\S]*instance_id=new\.instance_id/);
  });

  test('closed-ticket guard rolls back the message insert if state changes concurrently',()=>{
    const sql=read('supabase/migrations/20260901165100_communication_tenant_closure.sql');
    expect(sql).toMatch(/guard_closed_support_thread[\s\S]*for update/);
    expect(sql).toContain("if v_status='closed' then raise exception");
    expect(sql).toMatch(/guard_closed_support_thread_trigger[\s\S]*before insert on public\.support_ticket_messages/);
  });
});
