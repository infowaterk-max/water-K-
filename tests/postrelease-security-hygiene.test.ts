import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const lockdownPath='supabase/migrations/20260904083000_recommendation_trigger_privilege_lockdown.sql';
const recommendationPath='supabase/migrations/20260903104000_recommendation_tenant_closure.sql';
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8').toLowerCase();

describe('post-release security hygiene contracts',()=>{
  test('recommendation tenant sync remains a trigger-only SECURITY DEFINER helper',()=>{
    const source=read(recommendationPath);
    expect(source).toContain('create or replace function public.sync_product_recommendation_instance()');
    expect(source).toContain('security definer');
    expect(source).toContain("set search_path=''\n");
    expect(source).toContain('for each row execute function public.sync_product_recommendation_instance()');
  });

  test('direct recommendation trigger execution is denied to every API/service role',()=>{
    const sql=read(lockdownPath).replace(/\s+/g,' ');
    expect(sql).toContain('revoke all on function public.sync_product_recommendation_instance() from public, anon, authenticated, service_role;');
    expect(sql).not.toMatch(/grant\s+execute[\s\S]*\b(anon|authenticated|service_role)\b/);
  });
});
