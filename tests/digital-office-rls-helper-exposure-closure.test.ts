import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');
const migration=()=>read('supabase/migrations/20260908024000_digital_office_rls_helper_exposure_closure_v1.sql');

describe('Digital Office RLS helper exposure closure',()=>{
  it('removes authenticated execution from the actor-parameterized public helper',()=>{
    const sql=migration();
    expect(sql).toContain('revoke all on function public.can_read_office_thread_v1(uuid,uuid,uuid) from public,anon,authenticated');
    expect(sql).toContain('grant execute on function public.can_read_office_thread_v1(uuid,uuid,uuid) to service_role');
  });

  it('uses a current-user private helper for browser RLS',()=>{
    const sql=migration();
    expect(sql).toContain('private.current_user_can_read_office_thread_v1');
    expect(sql).toContain('auth.uid()');
    expect(sql).toContain('grant execute on function private.current_user_can_read_office_thread_v1(uuid,uuid) to authenticated');
    expect(sql).toContain('using (private.current_user_can_read_office_thread_v1(instance_id,id))');
    expect(sql).toContain('using (private.current_user_can_read_office_thread_v1(instance_id,thread_id))');
    expect(sql).not.toContain('using (public.can_read_office_thread_v1(instance_id,id,(select auth.uid())))');
  });
});
