import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PLANS } from '../src/lib/plans/catalog';

const migration=readFileSync(
  join(process.cwd(),'supabase/migrations/20260902213500_atomic_tenant_provisioning.sql'),
  'utf8',
);
const sql=migration.toLowerCase();
const actions=readFileSync(
  join(process.cwd(),'src/app/admin/platform/webaruhazak/actions.ts'),
  'utf8',
);
const page=readFileSync(
  join(process.cwd(),'src/app/admin/platform/webaruhazak/page.tsx'),
  'utf8',
);

describe('atomic tenant provisioning gate',()=>{
  it('fails closed to Alap/Pilot with B2C on and B2B off',()=>{
    expect(sql).toContain("v_organization_id,v_slug,v_name,v_name,'alap','pilot'");
    expect(sql).toContain("(v_instance_id,'b2c',true)");
    expect(sql).toContain("(v_instance_id,'b2b',false)");
    expect(page).toContain('Shoperation Alap');
    expect(page).not.toContain('name="plan" defaultValue="pro"');
  });

  it('creates the complete ownership and RBAC bootstrap inside one RPC',()=>{
    expect(sql).toContain('insert into public.organizations');
    expect(sql).toContain('insert into public.webshop_instances');
    expect(sql).toContain('insert into public.organization_members');
    expect(sql).toContain('insert into public.webshop_instance_members');
    expect(sql).toContain('insert into public.role_bindings');
    expect(sql).toContain('insert into public.webshop_sales_channels');
    expect(sql).toContain('insert into public.admin_audit_log');
    expect(sql).toContain("'platform.tenant_provisioned'");
    expect(sql).not.toContain('exception when');
  });

  it('makes organization scope mandatory for every new webshop instance',()=>{
    expect(sql).toContain('alter column organization_id set not null');
    expect(sql).toContain('tenant_provisioning_organization_backfill_failed');
  });

  it('keeps plan entitlements synchronized and boots every Alap feature',()=>{
    expect(sql).toContain('webshop_instance_plan_entitlements_sync');
    expect(sql).toContain('create or replace function private.sync_webshop_plan_entitlements_trigger()');
    expect(sql).toContain('perform private.sync_webshop_plan_entitlements(new.id)');
    expect(sql).toContain('execute function private.sync_webshop_plan_entitlements_trigger()');
    expect(sql).not.toContain('execute function private.sync_webshop_plan_entitlements(new.id)');
    expect(sql).toContain("where instance_id=p_instance_id and source='plan'");
    for(const feature of PLANS.alap.features){
      expect(migration).toContain(`'${feature}'`);
    }
  });

  it('exposes provisioning only to the service role and requires a platform actor',()=>{
    expect(sql).toContain('tenant_provisioning_actor_not_platform_operator');
    expect(sql).toContain('tenant_provisioning_owner_not_found');
    expect(sql).toContain('revoke all on function public.provision_webshop_tenant_v1');
    expect(sql).toContain('to service_role');
  });

  it('routes the platform create action through the atomic provisioning RPC',()=>{
    const start=actions.indexOf('export async function createWebshopInstanceAction');
    const end=actions.indexOf('export async function updateWebshopInstanceAction');
    const createAction=actions.slice(start,end);
    expect(createAction).toContain(".rpc('provision_webshop_tenant_v1'");
    expect(createAction).toContain("formData.get('ownerEmail')");
    expect(createAction).not.toContain(".from('webshop_instances').insert");
  });
});
