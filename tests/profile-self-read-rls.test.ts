import{readFileSync}from'node:fs';import{resolve}from'node:path';import{describe,expect,it}from'vitest';
const read=(p:string)=>readFileSync(resolve(process.cwd(),p),'utf8');

describe('profile self-read RLS helper execution',()=>{
  it('keeps private.is_admin unavailable to anonymous callers but executable by authenticated RLS queries',()=>{
    const migration=read('supabase/migrations/20260906115000_profile_self_read_private_admin_execute_fix.sql');
    expect(migration).toContain('revoke all on function private.is_admin() from public, anon');
    expect(migration).toContain('grant execute on function private.is_admin() to authenticated');
  });
});
