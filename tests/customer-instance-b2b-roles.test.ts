import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test}from'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('tenant B2B customer and storefront contract',()=>{
  test('registration carries the requested webshop but never approval',()=>{
    const auth=read('src/components/auth/auth-form.tsx');
    expect(auth).toMatch(/instanceId:string\|null/);
    expect(auth).toMatch(/requested_instance_id:instanceId/);
    const sql=read('supabase/migrations/20260901169000_customer_instance_b2b_roles.sql');
    expect(sql).toMatch(/raw_user_meta_data->>'requested_instance_id'/);
    expect(sql).toMatch(/'customer'::public\.customer_role,false/);
    expect(sql).toMatch(/case when v_account_type='reseller' then 'reseller'/);
  });

  test('partner role is unique per webshop and self-readable only',()=>{
    const sql=read('supabase/migrations/20260901169000_customer_instance_b2b_roles.sql');
    expect(sql).toMatch(/primary key\(instance_id,user_id\)/);
    expect(sql).toMatch(/customer_instance_roles_self_select/);
    expect(sql).toMatch(/auth\.uid\(\)\)=user_id/);
  });

  test('quote and atomic checkout use tenant partner relation and protect professional products',()=>{
    const sql=read('supabase/migrations/20260901169000_customer_instance_b2b_roles.sql');
    const relation=/customer_instance_roles where instance_id=p_instance_id and user_id=p_customer_id/g;
    expect((sql.match(relation)??[]).length).toBeGreaterThanOrEqual(2);
    expect((sql.match(/product_audience/g)??[]).length).toBeGreaterThanOrEqual(2);
    expect((sql.match(/csak jóváhagyott viszonteladói partnernek rendelhető/g)??[]).length).toBeGreaterThanOrEqual(2);
    expect(sql).toMatch(/reseller_gross_price_huf/);
  });

  test('account and admin partner flows are tenant scoped',()=>{
    const account=read('src/app/fiokom/page.tsx');
    expect(account).toMatch(/customer_instance_roles/);
    expect(account).toMatch(/eq\('instance_id',instance\.id\)/);
    expect(account).toMatch(/ResellerRequestButton/);

    const admin=read('src/app/admin/ugyfelek/page.tsx');
    expect(admin).toMatch(/customer_instance_roles/);
    expect(admin).toMatch(/eq\('instance_id',scope\.instanceId\)/);

    const api=read('src/app/api/admin/customers/[id]/route.ts');
    expect(api).toMatch(/customer_instance_roles/);
    expect(api).toMatch(/eq\('instance_id',scope\.instanceId\)/);
    expect(api).toMatch(/from\('profiles'\)\.select/);
    expect(api).toMatch(/from\('customer_instance_roles'\)\.update/);
  });

  test('existing customer can request tenant reseller status without self approval',()=>{
    const api=read('src/app/api/account/reseller-request/route.ts');
    expect(api).toMatch(/getCurrentWebshopInstance/);
    expect(api).toMatch(/instance_id:instance\.id/);
    expect(api).toMatch(/reseller_approved:false/);
    expect(api).not.toMatch(/reseller_approved:true/);
  });

  test('growth and CRM partner views use tenant relation',()=>{
    const growth=read('src/app/admin/novekedes/page.tsx');
    expect(growth).toMatch(/reseller_growth_priorities_v2/);
    const followup=read('src/app/admin/utanakovetes/page.tsx');
    expect(followup).toMatch(/customer_instance_roles/);
    expect(followup).toMatch(/eq\('instance_id',scope\.instanceId\)/);
  });

  test('storefront resolves tenant channel settings while admin keeps the complete catalogue',()=>{
    const code=read('src/lib/catalog-server.ts');
    expect(code).toMatch(/customer_instance_roles/);
    expect(code).toMatch(/approvedReseller=relation\?\.role==='reseller'&&relation\.reseller_approved===true/);
    expect(code).toMatch(/product_channel_settings/);
    expect(code).toMatch(/approvedReseller\?'b2b':'b2c'/);
    expect(code).toMatch(/setting\?setting\.visible/);
    expect(code).toMatch(/reseller_gross_price_huf/);
    expect(code).toMatch(/minimumQuantity/);
    const admin=read('src/app/admin/termekek/page.tsx');
    expect(admin).toMatch(/getProducts\(\{includeAllChannels:true\}\)/);
  });
});
