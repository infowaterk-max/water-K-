import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd(),read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const migration='supabase/migrations/20260903170000_admin_workspace_settings_evidence_atomic_v2.sql';

describe('admin workspace and settings evidence atomicity',()=>{
  test('Digital Office business writes no longer use direct table mutations',()=>{
    const actions=read('src/app/admin/kommunikacio/iroda/actions.ts');
    const sql=read(migration);
    expect(actions.match(/admin_mutate_office_workspace_v2/g)?.length).toBeGreaterThanOrEqual(7);
    for(const fragment of [
      ".from('office_threads').insert(",
      ".from('office_threads').update(",
      ".from('office_messages').insert(",
      ".from('office_tasks').insert(",
      ".from('office_tasks').update(",
    ])expect(actions).not.toContain(fragment);
    expect(sql).toContain("'office.thread_created'");
    expect(sql).toContain("'office.message_added'");
    expect(sql).toContain("'office.thread_updated'");
    expect(sql).toContain("'office.customer_email_queued'");
    expect(sql).toContain("'office.task_created'");
    expect(sql).toContain("'office.task_completed'");
  });

  test('office customer email job, message, thread state and audit share one transaction',()=>{
    const sql=read(migration);
    expect(sql).toContain("v_job:=public.enqueue_communication_v2(");
    expect(sql).toContain("kind,body,communication_job_id,recipient_email,subject");
    expect(sql).toContain("'office.customer_email_queued'");
    expect(sql).toContain('OFFICE_COMMUNICATION_JOB_MISSING');
  });

  test('platform plan, branding, storefront and addon changes are audited in the same RPC',()=>{
    const actions=read('src/app/admin/platform/webaruhazak/actions.ts');
    const sql=read(migration);
    expect(actions.match(/platform_mutate_webshop_config_v3/g)?.length).toBeGreaterThanOrEqual(4);
    expect(sql).toContain("'platform.webshop_plan_status_updated'");
    expect(sql).toContain("'platform.webshop_branding_updated'");
    expect(sql).toContain("'platform.webshop_storefront_updated'");
    expect(sql).toContain("'platform.webshop_addon_updated'");
    expect(sql).toContain('insert into public.admin_audit_log');
  });

  test('commerce provider save and verification mutations are store-manager scoped and audited',()=>{
    const actions=read('src/app/admin/beallitasok/fizetes-szallitas/actions.ts');
    const sql=read(migration);
    expect(actions).toContain("getAdminRequestUser('store.manage')");
    expect(actions).toContain('admin_mutate_commerce_provider_connection_v2');
    expect(sql).toContain("public.has_store_role(p_instance_id,array['owner','admin'],p_actor)");
    expect(sql).toContain("'commerce.provider_updated'");
    expect(sql).toContain("'commerce.provider_verified'");
    expect(sql).toContain('COMMERCE_PROVIDER_CONNECTION_NOT_FOUND');
  });

  test('launch activation and audit commit atomically',()=>{
    const actions=read('src/app/admin/indulas/actions.ts');
    const sql=read(migration);
    expect(actions).toContain('admin_activate_webshop_v2');
    expect(actions).not.toContain(".from('webshop_instances').update(");
    expect(sql).toContain("'store.activated'");
    expect(sql).toContain("where id=p_instance_id and status='pilot'");
  });

  test('all privileged RPCs are executable only by service runtime',()=>{
    const sql=read(migration);
    for(const name of [
      'admin_mutate_office_workspace_v2',
      'platform_mutate_webshop_config_v3',
      'admin_mutate_commerce_provider_connection_v2',
      'admin_activate_webshop_v2',
    ]){
      expect(sql).toContain(`revoke all on function public.${name}`);
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${name}[\\s\\S]{0,220}to service_role`));
    }
  });
});
