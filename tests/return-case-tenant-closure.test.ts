import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test}from'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('return-case tenant closure',()=>{
  test('account return creation is scoped to the active webshop',()=>{
    const code=read('src/app/api/account/returns/route.ts');
    expect(code).toMatch(/getCurrentWebshopInstance/);
    expect(code).toMatch(/eq\('instance_id',instance\.id\)/);
    expect(code).toMatch(/create_return_case_v2/);
    expect(code).toMatch(/p_instance_id:instance\.id/);
    expect(code).not.toMatch(/rpc\('create_return_case'/);
  });

  test('v2 return RPC persists tenant ids on cases and items',()=>{
    const sql=read('supabase/migrations/20260901167000_return_case_tenant_and_internal_rpc_lockdown.sql');
    expect(sql).toMatch(/create or replace function public\.create_return_case_v2/);
    expect(sql).toMatch(/where id=p_order_id and instance_id=p_instance_id and customer_id=p_user_id/);
    expect(sql).toMatch(/insert into public\.return_cases\([\s\S]*instance_id,order_id,user_id/);
    expect(sql).toMatch(/insert into public\.return_case_items\([\s\S]*instance_id,return_case_id,order_item_id/);
  });

  test('return integrity triggers validate tenant relationships',()=>{
    const sql=read('supabase/migrations/20260901167000_return_case_tenant_and_internal_rpc_lockdown.sql');
    expect(sql).toMatch(/validate_refund_total\(\)[\s\S]*id=new\.order_id and instance_id=new\.instance_id/);
    expect(sql).toMatch(/validate_return_case_item_quantity\(\)[\s\S]*id=new\.order_item_id and instance_id=new\.instance_id/);
    expect(sql).toMatch(/rc\.instance_id=rci\.instance_id/);
    expect(sql).toMatch(/guard_order_status_against_operations\(\)[\s\S]*order_id=new\.id and instance_id=new\.instance_id/);
  });

  test('legacy return and internal definer RPC surfaces are closed',()=>{
    const sql=read('supabase/migrations/20260901167000_return_case_tenant_and_internal_rpc_lockdown.sql');
    expect(sql).toMatch(/p\.proname='create_return_case'/);
    expect(sql).toMatch(/revoke execute on function %s from public, anon, authenticated, service_role/);
    expect(sql).toMatch(/t\.typname='trigger'[\s\S]*p\.prosecdef/);
    for(const name of ['allow_stock_notification_request','consume_security_rate_limit','preview_promotion_margin','record_observability_event']){
      expect(sql).toContain("'" + name + "'");
    }
  });
});
