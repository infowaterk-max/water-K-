import{readFileSync}from'node:fs';
import{describe,expect,it}from'vitest';

const read=(path:string)=>readFileSync(path,'utf8');
const foundation=read('supabase/migrations/20260914130000_digital_commerce_foundation.sql');
const foundationBaseline=read('supabase/customer-baseline/migrations/0024_digital_commerce_foundation.sql');
const hardening=read('supabase/migrations/20260914131500_digital_commerce_admin_hardening.sql');
const hardeningBaseline=read('supabase/customer-baseline/migrations/0025_digital_commerce_admin_hardening.sql');

describe('Digital Commerce Foundation',()=>{
  it('keeps production and customer forward migrations byte-identical',()=>{
    expect(foundationBaseline).toBe(foundation);
    expect(hardeningBaseline).toBe(hardening);
  });

  it('models physical/digital fulfillment and cart-level mixed fulfillment without template authority',()=>{
    expect(foundation).toContain("fulfillment_type in('physical','digital')");
    expect(foundation).toContain("fulfillment_mode in('physical','digital','mixed')");
    expect(foundation).toContain('classify_checkout_fulfillment_v1');
    expect(foundation).toContain("'requiresShipping',v_physical>0");
    expect(read('src/lib/orders/tenant-checkout.ts')).toContain('classifyCheckoutFulfillment(input.instanceId,input.items)');
    expect(read('src/lib/orders/tenant-checkout.ts')).not.toContain('templateKey');
  });

  it('keeps purchased files private and tenant scoped',()=>{
    expect(foundation).toContain("'digital-products-private','digital-products-private',false");
    expect(foundation).toContain('DIGITAL_ASSET_PRODUCT_TENANT_MISMATCH');
    expect(foundation).toContain('DIGITAL_ASSET_VARIANT_TENANT_MISMATCH');
    expect(foundation).toContain('DIGITAL_DOWNLOAD_ACCOUNT_FORBIDDEN');
    expect(foundation).toContain('DIGITAL_DOWNLOAD_GUEST_FORBIDDEN');
    expect(foundation).not.toMatch(/public\s*,\s*true/i);
  });

  it('derives entitlement from authoritative paid order state and revokes cancellation/refund access',()=>{
    expect(foundation).toContain("v_order.status::text in('paid','processing','shipped','completed')");
    expect(foundation).toContain("v_order.status::text in('cancelled','refunded')");
    expect(foundation).toContain("status='revoked'");
    expect(hardening).toContain('on conflict(instance_id,order_item_id,asset_id) do nothing');
    expect(hardening).not.toContain("status='active',customer_id=excluded.customer_id");
  });

  it('uses hashed guest access, bounded download issuance and a short-lived signed URL',()=>{
    const helper=read('src/lib/commerce/digital-commerce.ts');
    const route=read('src/app/api/digital-downloads/[assetId]/route.ts');
    expect(foundation).toContain("token_hash text not null check(token_hash ~ '^[a-f0-9]{64}$')");
    expect(hardening).toContain("v_recent>=30");
    expect(hardening).toContain('download_count>=v_ent.max_downloads');
    expect(helper).toContain('authorize_digital_download_v2');
    expect(helper).toContain('const SIGNED_DOWNLOAD_SECONDS=300');
    expect(helper).toContain('.createSignedUrl(');
    expect(route).toContain("headers:{'Cache-Control':'no-store'}");
    expect(route).toContain('requestFingerprint:fingerprint');
  });

  it('requires catalog authority and object existence before a digital asset becomes active',()=>{
    const start=read('src/app/api/admin/catalog/digital-assets/route.ts');
    const finish=read('src/app/api/admin/catalog/digital-assets/[assetId]/route.ts');
    expect(hardening).toContain('public.can_manage_catalog(p_instance_id,p_actor)');
    expect(hardening).toContain('storage.objects');
    expect(start).toContain('createSignedUploadUrl');
    expect(start).toContain('create_digital_asset_draft_v1');
    expect(finish).toContain('activate_digital_asset_v1');
    expect(finish).toContain('deactivate_digital_asset_v1');
  });

  it('exposes fulfillment type through Product Intake',()=>{
    const intake=read('src/app/api/admin/catalog/onboarding/route.ts');
    expect(intake).toContain("fulfillmentType:z.enum(['physical','digital']).default('physical')");
    expect(intake).toContain("rpc('set_product_fulfillment_v1'");
    expect(intake).toContain('fulfillmentType:parsed.data.fulfillmentType');
  });
});
