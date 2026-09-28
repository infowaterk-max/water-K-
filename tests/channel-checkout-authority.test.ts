import fs from 'node:fs';
import path from 'node:path';
import { describe,expect,test } from 'vitest';
import { normalizeMinimumQuantity,normalizeQuantity } from '../src/lib/commerce/cart-engine';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('B2C/B2B channel checkout authority',()=>{
  test('new database entry points are private and channel-aware',()=>{
    const sql=read('supabase/migrations/20260901170000_channel_checkout_authority.sql');
    expect(sql).toContain('quote_tenant_checkout_v2');
    expect(sql).toContain('place_order_provider_v5_idempotent');
    expect((sql.match(/product_channel_settings/g)??[]).length).toBeGreaterThanOrEqual(2);
    expect(sql).toContain("v_channel text:='b2c'");
    expect(sql).toContain("v_channel:='b2b'");
    expect(sql).toContain('minimum_order_quantity');
    expect(sql).toContain('order_multiple');
    expect(sql).toContain('Minimum rendelési mennyiség');
    expect(sql).toContain('from public,anon,authenticated');
    expect(sql).toContain('to service_role');
  });

  test('application runtime uses v2 quote and the current fulfillment-aware checkout wrapper over historical v5/v6 authority',()=>{
    const quote=read('src/lib/commerce/checkout-quote.ts');
    const order=read('src/lib/orders/tenant-checkout.ts');
    const wave5=read('supabase/migrations/20260913062000_special_commerce_existing_engine_closure.sql');
    expect(quote).toContain("admin.rpc('quote_tenant_checkout_v2'");
    expect(quote).not.toContain("admin.rpc('quote_tenant_checkout_v1'");
    expect(order).toContain("admin.rpc('place_order_provider_v7_fulfillment_idempotent'");
    expect(wave5).toContain('v_result:=public.place_order_provider_v5_idempotent');
    expect(order).not.toContain("admin.rpc('place_order_provider_v4_idempotent'");
  });

  test('storefront channel settings do not hide products from admin catalogue',()=>{
    const catalog=read('src/lib/catalog-server.ts');
    const admin=read('src/app/admin/termekek/page.tsx');
    expect(catalog).toContain("from('product_channel_settings')");
    expect(catalog).toContain("approvedReseller?'b2b':'b2c'");
    expect(catalog).toContain('setting?setting.visible');
    expect(catalog).toContain('includeAllChannels');
    expect(admin).toContain('getProducts({includeAllChannels:true,throwOnError:true})');
  });

  test('cart quantities align minimum order quantity to the order multiple',()=>{
    expect(normalizeMinimumQuantity(3,2)).toBe(4);
    expect(normalizeQuantity(1,20,3,2)).toBe(4);
    expect(normalizeQuantity(5,20,3,2)).toBe(6);
    expect(normalizeQuantity(99,9,3,2)).toBe(8);
    expect(normalizeQuantity(1,3,4,2)).toBe(0);
  });

  test('checkout quote API returns the fulfillment-aware contract consumed by checkout UI',()=>{
    const route=read('src/app/api/checkout/quote/route.ts');
    const form=read('src/components/checkout/checkout-form.tsx');
    expect(route).toContain('subtotal_gross_huf:quote.subtotalGrossHuf');
    expect(route).toContain('discount_gross_huf:quote.discountGrossHuf');
    expect(route).toContain("mode:z.enum(['cart','checkout'])");
    expect(route).toContain('shipping_gross_huf:cartMode?0:fulfillment.requiresShipping?quote.shippingGrossHuf:0');
    expect(route).toContain('total_gross_huf:cartMode?cartTotal:fulfillment.requiresShipping?quote.totalGrossHuf:cartTotal');
    expect(route).toContain('coupon_code:quote.couponCode');
    expect(route).toContain('fulfillment_mode:fulfillment.mode');
    expect(route).toContain('requires_shipping:fulfillment.requiresShipping');
    expect(form).toContain('subtotal_gross_huf');
    expect(form).toContain('total_gross_huf');
  });

  test('core-engine batch branch is covered by the centrally orchestrated release CI',()=>{
    const ci=read('.github/workflows/ci.yml');
    const registry=JSON.parse(read('quality/knowledge/guard-registry.v1.json')) as {guards:Array<{id:string;execution?:{profiles?:string[];command?:string;args?:string[]}}>} ;
    const byId=new Map(registry.guards.map(guard=>[guard.id,guard]));
    expect(ci).toContain('- core-engine-2-batch');
    expect(ci).toContain('shoperation-control-plane.mjs');
    expect(ci).toContain('--run-external');
    expect(ci).not.toContain('run: npm test');
    expect(ci).not.toContain('run: npm run typecheck');
    expect(ci).not.toContain('run: npm run build');
    expect(byId.get('GUARD-QUALITY-TESTS')?.execution).toMatchObject({command:'npm',args:['test']});
    expect(byId.get('GUARD-TYPECHECK')?.execution).toMatchObject({command:'npm',args:['run','typecheck']});
    expect(byId.get('GUARD-PRODUCTION-BUILD')?.execution).toMatchObject({command:'npm',args:['run','build']});
    expect(byId.get('GUARD-QUALITY-TESTS')?.execution?.profiles).toContain('branch');
    expect(byId.get('GUARD-TYPECHECK')?.execution?.profiles).toContain('branch');
    expect(byId.get('GUARD-PRODUCTION-BUILD')?.execution?.profiles).toContain('branch');
  });
});
