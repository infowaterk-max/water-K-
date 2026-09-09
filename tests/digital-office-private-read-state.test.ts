import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.cwd();
const read=(file:string)=>readFileSync(join(root,file),'utf8');

describe('Digital Office private read-state invariants',()=>{
  it('marks the active private author read at the inserted message timestamp',()=>{
    const sql=read('supabase/migrations/20260908023500_digital_office_private_author_read_sync_v1.sql');
    expect(sql).toContain("new.kind<>'internal'");
    expect(sql).toContain("t.conversation_type in ('internal_private','internal_group')");
    expect(sql).toContain('p.last_read_at<new.created_at then new.created_at');
    expect(sql).toContain('p.left_at is null');
    expect(sql).toContain("raise exception 'OFFICE_PRIVATE_AUTHOR_PARTICIPANT_REQUIRED'");
    expect(sql).toContain('office_messages_private_author_read_sync');
  });

  it('uses only the current participant read timestamp in the dedicated Team Chat workspace',()=>{
    const page=read('src/app/admin/kommunikacio/chat/page.tsx');
    expect(page).toContain('const lastRead=new Map(participants.filter(p=>p.user_id===actor.id).map(p=>[p.thread_id,p.last_read_at]))');
    expect(page).toContain('!lastRead.get(thread.id)||new Date(m.created_at)>new Date(lastRead.get(thread.id)!)');
    expect(page).not.toContain('thread.last_read_at');
  });
});