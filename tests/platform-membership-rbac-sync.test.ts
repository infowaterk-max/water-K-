import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';
const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('platform membership RBAC synchronization',()=>{
  test('atomic membership RPC synchronizes compatibility, organization and fine-grained RBAC state',()=>{
    const sql=read('supabase/migrations/20260903123000_platform_membership_atomic_v2.sql').toLowerCase();
    expect(sql).toContain('platform_set_webshop_member_v2');
    expect(sql).toContain('insert into public.webshop_instance_members');
    expect(sql).toContain('insert into public.organization_members');
    expect(sql).toContain('update public.role_bindings');
    expect(sql).toContain('insert into public.role_bindings');
    expect(sql).toContain("when 'admin' then 'admin' else 'viewer'");
    expect(sql).toContain("'platform.member_set'");
  });

  test('membership removal protects the final webshop owner and revokes store access atomically',()=>{
    const sql=read('supabase/migrations/20260903123000_platform_membership_atomic_v2.sql').toLowerCase();
    expect(sql).toContain('last_webshop_owner');
    expect(sql).toContain('delete from public.webshop_instance_members');
    expect(sql).toContain('set revoked_at=now()');
    expect(sql).toContain("'platform.member_removed'");
    expect(sql).toContain('grant execute on function public.platform_remove_webshop_member_v2');
    expect(sql).toContain('to service_role');
  });

  test('platform actions use the synchronization RPCs instead of direct legacy-only membership writes',()=>{
    const source=read('src/app/admin/platform/webaruhazak/actions.ts');
    const assign=source.slice(source.indexOf('assignWebshopMemberAction'),source.indexOf('inviteWebshopOwnerAction'));
    const remove=source.slice(source.indexOf('removeWebshopMemberAction'));
    expect(assign).toContain("rpc('platform_set_webshop_member_v2'");
    expect(assign).not.toContain("from('webshop_instance_members').upsert");
    expect(source).toContain("rpc('platform_remove_webshop_member_v2'");
    expect(remove).not.toContain("from('webshop_instance_members').delete");
    expect(source).toContain('ADDONS[addon].compatiblePlans.includes(instance.subscription_plan)');
  });

  test('platform webshop page fails closed when membership state is only partially readable',()=>{
    const page=read('src/app/admin/platform/webaruhazak/page.tsx');
    expect(page).toContain('instanceError||addonError||memberError||profileResult.error');
    expect(page).toContain('Biztonsági okból a módosító űrlapokat addig nem jelenítjük meg.');
    expect(page).toContain('!loadError&&<div className="cards">');
    expect(page).toContain("memberMessage");
    expect(page).toContain("'last-owner'");
  });
});
