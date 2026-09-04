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
    const atomic=read('supabase/migrations/20260903194500_customer_role_commercial_atomic_v3.sql');
    expect(api).toMatch(/customer_instance_roles/);
    expect(api).toMatch(/eq\('instance_id',scope\.instanceId\)/);
    expect(api).toMatch(/admin_update_customer_store_role_v4/);
    expect(api).toMatch(/p_instance_id:scope\.instanceId/);
    expect(api).not.toMatch(/from\('customer_instance_roles'\)\.update/);
    expect(api).not.toMatch(/recordAdminAudit/);
    expect(atomic).toMatch(/admin_update_customer_store_role_v2/);
    expect(atomic).toMatch(/o\.instance_id=p_instance_id/);
    expect(atomic).toMatch(/o\.reseller_id=p_user_id/);
    expect(atomic).toMatch(/customer\.store_role_commercial_reconciled/);
  });

  test('existing customer requests tenant reseller status through non-downgrading RPC',()=>{
    const api=read('src/app/api/account/reseller-request/route.ts');
    const sql=read('supabase/migrations/20260903183500_reseller_request_concurrency_v2.sql');
    expect(api).toMatch(/getCurrentWebshopInstance/);
    expect(api).toMatch(/request_reseller_status_v2/);
    expect(api).toMatch(/p_instance_id:instance\.id/);
    expect(api).not.toMatch(/customer_instance_roles'\)\.upsert/);
    expect(sql).toMatch(/reseller_approved=true/);
    expect(sql).toMatch(/for update/);
  });

  test('growth and CRM partner views use tenant relation',()=>{
    const growth=read('src/app/admin/novekedes/page.tsx');
    expect(growth).toMatch(/reseller_growth_priorities_v2/);
    const followup=read('src/app/admin/utanakovetes/page.tsx');
    expect(followup).toMatch(/customer_instance_roles/);
    expect(followup).toMatch(/eq\('instance_id',scope\.instanceId\)/);
  });

  test('storefront access and checkout use the tenant partner relation instead of the legacy global profile role',()=>{
    const access=read('src/lib/commerce/access.ts');
    const checkoutPage=read('src/app/penztar/page.tsx');
    const checkoutForm=read('src/components/checkout/checkout-form.tsx');
    const orderApi=read('src/app/api/orders/route.ts');
    expect(access).toMatch(/customer_instance_roles/);
    expect(access).toMatch(/eq\('instance_id',instance\.id\)/);
    expect(access).not.toMatch(/from\('profiles'\)/);
    expect(checkoutPage).toMatch(/resellerApproved=\{access\.resellerApproved\}/);
    expect(checkoutForm).toMatch(/resellerApproved\?'reseller':'retail'/);
    expect(checkoutForm).not.toMatch(/<option value="reseller">Viszonteladó<\/option>/);
    expect(orderApi).toMatch(/customer_instance_roles/);
    expect(orderApi).toMatch(/checkout\.customerType==='reseller'&&!approvedReseller/);
    expect(orderApi).toMatch(/approvedReseller&&checkout\.customerType!=='reseller'/);
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
    expect(admin).toMatch(/getProducts\(\{includeAllChannels:true,throwOnError:true\}\)/);
  });
});
