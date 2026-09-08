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

  it('never falls back to the legacy global thread read timestamp in the workspace',()=>{
    const page=read('src/app/admin/kommunikacio/iroda/page.tsx');
    expect(page).toContain('const lastReadFor=(thread:Thread)=>readMap.get(thread.id)??null');
    expect(page).not.toContain('readMap.has(thread.id)?readMap.get(thread.id)??null:thread.last_read_at');
  });
});
