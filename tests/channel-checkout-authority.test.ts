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

  test('application runtime uses v2 quote and v5 atomic checkout',()=>{
    const quote=read('src/lib/commerce/checkout-quote.ts');
    const order=read('src/lib/orders/tenant-checkout.ts');
    expect(quote).toContain("admin.rpc('quote_tenant_checkout_v2'");
    expect(quote).not.toContain("admin.rpc('quote_tenant_checkout_v1'");
    expect(order).toContain("admin.rpc('place_order_provider_v5_idempotent'");
    expect(order).not.toContain("admin.rpc('place_order_provider_v4_idempotent'");
  });

  test('storefront channel settings do not hide products from admin catalogue',()=>{
    const catalog=read('src/lib/catalog-server.ts');
    const admin=read('src/app/admin/termekek/page.tsx');
    expect(catalog).toContain("from('product_channel_settings')");
    expect(catalog).toContain("approvedReseller?'b2b':'b2c'");
    expect(catalog).toContain('setting?setting.visible');
    expect(catalog).toContain('includeAllChannels');
    expect(admin).toContain('getProducts({includeAllChannels:true})');
  });

  test('cart quantities align minimum order quantity to the order multiple',()=>{
    expect(normalizeMinimumQuantity(3,2)).toBe(4);
    expect(normalizeQuantity(1,20,3,2)).toBe(4);
    expect(normalizeQuantity(5,20,3,2)).toBe(6);
    expect(normalizeQuantity(99,9,3,2)).toBe(8);
    expect(normalizeQuantity(1,3,4,2)).toBe(0);
  });

  test('checkout quote API returns the contract consumed by checkout UI',()=>{
    const route=read('src/app/api/checkout/quote/route.ts');
    const form=read('src/components/checkout/checkout-form.tsx');
    expect(route).toContain('subtotal_gross_huf:quote.subtotalGrossHuf');
    expect(route).toContain('discount_gross_huf:quote.discountGrossHuf');
    expect(route).toContain('shipping_gross_huf:quote.shippingGrossHuf');
    expect(route).toContain('total_gross_huf:quote.totalGrossHuf');
    expect(route).toContain('coupon_code:quote.couponCode');
    expect(form).toContain('subtotal_gross_huf');
    expect(form).toContain('total_gross_huf');
  });

  test('core-engine batch branch is covered by the release CI',()=>{
    const ci=read('.github/workflows/ci.yml');
    expect(ci).toContain('- core-engine-2-batch');
    expect(ci).toContain('npm test');
    expect(ci).toContain('npm run typecheck');
    expect(ci).toContain('npm run build');
  });
});
