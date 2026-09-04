import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('admin pre-render authorization closure',()=>{
  test('middleware rejects unauthenticated and unauthorized admin pages before App Router rendering',()=>{
    const source=read('src/middleware.ts');
    const gate=source.indexOf('if(isAdminPage(request)){');
    const authReject=source.indexOf("if(authError||!user)return accountRedirect(request,'login',pendingCookies);",gate);
    const rpc=source.indexOf("supabase.rpc('can_access_admin_context'",gate);
    const authzReject=source.indexOf("if(accessError||allowed!==true)return accountRedirect(request,'forbidden',pendingCookies);",rpc);
    const render=source.lastIndexOf('return withCookies(nextResponse(request),pendingCookies);');
    expect(gate).toBeGreaterThan(-1);
    expect(authReject).toBeGreaterThan(gate);
    expect(rpc).toBeGreaterThan(authReject);
    expect(authzReject).toBeGreaterThan(rpc);
    expect(render).toBeGreaterThan(authzReject);
  });

  test('middleware uses the caller session and never imports the service-role admin client',()=>{
    const source=read('src/middleware.ts');
    expect(source).toContain('await supabase.auth.getUser()');
    expect(source).not.toContain('createAdminClient');
    expect(source).not.toContain('SUPABASE_SERVICE_ROLE');
  });

  test('database gate is tenant-bound, fail-closed, and only callable by authenticated users',()=>{
    const sql=read('supabase/migrations/20260904090000_admin_prerender_authz_gate.sql').toLowerCase().replace(/\s+/g,' ');
    expect(sql).toContain('private.can_access_admin_context_current');
    expect(sql).toContain('security definer');
    expect(sql).toContain("set search_path=''");
    expect(sql).toContain("r.revoked_at is null");
    expect(sql).toContain("r.valid_from<=now()");
    expect(sql).toContain("w.status in ('pilot','active')");
    expect(sql).toContain("lower(w.slug)=lower(trim(p_instance_slug))");
    expect(sql).toContain("p.role='admin'");
    expect(sql).toContain("m.role in ('owner','admin')");
    expect(sql).toContain('revoke all on function public.can_access_admin_context(text) from public, anon, service_role;');
    expect(sql).toContain('grant execute on function public.can_access_admin_context(text) to authenticated;');
  });

  test('public RPC wrapper remains SECURITY INVOKER',()=>{
    const source=read('supabase/migrations/20260904090000_admin_prerender_authz_gate.sql').toLowerCase();
    const wrapper=source.slice(source.indexOf('create or replace function public.can_access_admin_context'));
    expect(wrapper).not.toContain('security definer');
  });

  test('layout keeps requireAdmin as defense in depth',()=>{
    const layout=read('src/app/admin/layout.tsx');
    expect(layout).toContain("import { requireAdmin } from '@/lib/auth/require-admin';");
    expect(layout).toContain('await requireAdmin();');
  });
});
