import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const migration='supabase/migrations/20260903210000_loyalty_legacy_service_lockdown.sql';
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('loyalty legacy service-role lockdown',()=>{
  const legacy=[
    'accrue_loyalty_points_from_paid_orders',
    'apply_loyalty_tier_bonus_points',
    'refresh_customer_value_profiles',
    'reverse_loyalty_points_for_ineligible_orders',
    'process_loyalty_lifecycle',
    'plan_loyalty_retention_opportunities',
    'get_customer_loyalty_snapshot',
    'redeem_loyalty_points',
    'use_loyalty_benefit',
    'use_discount_loyalty_benefit',
  ];

  test('all legacy global loyalty SECURITY DEFINER names are included in final service-role revocation',()=>{
    const sql=read(migration);
    for(const name of legacy)expect(sql).toContain(`'${name}'`);
    expect(sql).toContain(
      "'revoke execute on function %s from public, anon, authenticated, service_role'"
    );
  });

  test('tenant-explicit v2 loyalty entrypoints remain service-only',()=>{
    const sql=read(migration);
    for(const name of[
      'refresh_customer_value_profiles_v2',
      'accrue_loyalty_points_from_paid_orders_v2',
      'get_customer_loyalty_snapshot_v2',
    ])expect(sql).toContain(`'${name}'`);
    expect(sql).toContain("'grant execute on function %s to service_role'");
  });

  test('tenant loyalty data model and snapshot are instance scoped',()=>{
    const sql=read('supabase/migrations/20260901159000_loyalty_tenant_scope.sql');
    expect(sql).toContain('primary key(instance_id,customer_id)');
    expect(sql).toContain('from public.loyalty_ledger group by instance_id,customer_id');
    expect(sql).toContain('where s.instance_id=p_instance_id and s.customer_id=p_customer_id');
    expect(sql).toContain('where instance_id=p_instance_id and customer_id=p_customer_id');
  });

  test('storefront uses only tenant-aware loyalty snapshot',()=>{
    const page=read('src/app/fiokom/huseg/page.tsx');
    expect(page).toContain("rpc('get_customer_loyalty_snapshot_v2'");
    expect(page).toContain('p_instance_id:instance.id');
    expect(page).not.toContain("rpc('get_customer_loyalty_snapshot',");
  });

  test('previous migration documents that service-role compatibility was intentionally temporary',()=>{
    const previous=read('supabase/migrations/20260901160100_loyalty_legacy_rpc_client_lockdown.sql');
    expect(previous).toContain('service_role compatibility is temporarily retained');
    expect(previous).toContain('until the full loyalty lifecycle is migrated to explicit instance_id variants');
  });
});
