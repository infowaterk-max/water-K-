import fs from 'node:fs';
import path from 'node:path';
import { describe,expect,test } from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('merchant B2C promotion acceptance control',()=>{
  test('promotion writes through a tenant-scoped audited RPC',()=>{
    const sql=read('supabase/migrations/20260904102500_product_promotion_acceptance_control.sql');
    const actions=read('src/app/admin/termekek/actions.ts');
    expect(sql).toContain('admin_set_product_promotion_v1');
    expect(sql).toContain('public.can_manage_catalog(p_instance_id,p_actor)');
    expect(sql).toContain("channel_code='b2c'");
    expect(sql).toContain('product_channel_settings');
    expect(sql).toContain('admin_audit_log');
    expect(sql).toContain("'catalog.product_promotion_updated'");
    expect(sql).toContain('from public,anon,authenticated');
    expect(sql).toContain('to service_role');
    expect(actions).toContain('setB2CProductPromotionAction');
    expect(actions).toContain("admin.rpc('admin_set_product_promotion_v1'");
    expect(actions).toContain("requireCurrentStoreContext('catalog.manage')");
  });

  test('merchant admin exposes create and clear controls without direct table writes',()=>{
    const page=read('src/app/admin/termekek/page.tsx');
    const actions=read('src/app/admin/termekek/actions.ts');
    expect(page).toContain('B2C akciók');
    expect(page).toContain('Akció mentése');
    expect(page).toContain('Akció törlése');
    expect(page).toContain("eq('channel_code','b2c')");
    expect(actions).not.toContain("from('product_channel_settings').upsert");
    expect(actions).not.toContain("from('product_channel_settings').update");
  });

  test('storefront keeps checkout discount authority and exposes promotion evidence',()=>{
    const catalog=read('src/lib/catalog-server.ts');
    const productType=read('src/lib/catalog.ts');
    const shop=read('src/components/catalog/shop-catalog.tsx');
    const detail=read('src/app/termek/[slug]/page.tsx');
    const checkoutSql=read('supabase/migrations/20260901170000_channel_checkout_authority.sql');
    expect(catalog).toContain('setting?.discount_percent');
    expect(catalog).toContain('originalGrossPrice');
    expect(catalog).toContain('discountPercent');
    expect(productType).toContain('originalGrossPrice?: number');
    expect(productType).toContain('discountPercent?: number');
    expect(shop).toContain('Akció · −');
    expect(shop).toContain("textDecoration:'line-through'");
    expect(detail).toContain('Akció · −');
    expect((checkoutSql.match(/discount_percent/g)??[]).length).toBeGreaterThanOrEqual(2);
  });
});
