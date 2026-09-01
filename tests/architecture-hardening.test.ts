import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');

describe('Shoperation architecture hardening contracts',()=>{
  it('routes checkout through the tenant-safe order bridge',()=>{
    const route=read('src/app/api/orders/route.ts');
    expect(route).toContain("import { placeTenantOrder } from '@/lib/orders/tenant-checkout'");
    expect(route).toContain('instanceId: instance.id');
    expect(route).toContain(".eq('instance_id', instance.id)");
    expect(route).not.toContain("admin.rpc('place_order_provider_v2_idempotent'");
  });

  it('rejects cross-store checkout items and namespaces idempotency',()=>{
    const sql=read('supabase/migrations/20260901141000_tenant_safe_checkout.sql').toLowerCase();
    expect(sql).toContain('v.instance_id=p_instance_id');
    expect(sql).toContain('p.instance_id=p_instance_id');
    expect(sql).toContain('másik webshophoz tartozó');
    expect(sql).toContain("md5(p_instance_id::text||':'||trim");
  });

  it('blocks strict tenant activation while legacy scope gaps exist',()=>{
    const sql=read('supabase/migrations/20260901150000_strict_tenant_rls.sql').toLowerCase();
    expect(sql).toContain('tenant_scope_gaps');
    expect(sql).toContain('rows_without_instance>0');
    expect(sql).toContain('alter column instance_id set not null');
  });

  it('uses store-local business identifiers instead of global catalogue identifiers',()=>{
    const sql=read('supabase/migrations/20260901150000_strict_tenant_rls.sql').toLowerCase();
    expect(sql).toContain('products_instance_slug_unique');
    expect(sql).toContain('product_variants_instance_sku_unique');
    expect(sql).toContain('content_pages_instance_slug_unique');
    expect(sql).toContain('coupons_instance_code_unique');
    expect(sql).toContain('marketing_campaigns_instance_utm_unique');
  });

  it('keeps organization-wide RBAC inside the selected organization',()=>{
    const source=read('src/lib/auth/store-rbac.ts');
    expect(source).toContain(".eq('organization_id',instance.organization_id)");
    expect(source).toContain('row.instance_id===instanceId||row.instance_id===null');
  });

  it('lets explicit feature entitlements override plan defaults',()=>{
    const access=read('src/lib/plans/access.ts');
    const entitlements=read('src/lib/entitlements/access.ts');
    expect(access).toContain('getFeatureEntitlementDecision');
    expect(access).toContain('if(explicit!==null)return explicit.enabled');
    expect(entitlements).toContain('specificity');
    expect(entitlements).toContain('Boolean(row.enabled)');
  });

  it('resolves organization-wide store bindings without crossing organizations',()=>{
    const source=read('src/lib/instances/access.ts');
    expect(source).toContain(".in('organization_id',orgIds)");
    expect(source).toContain('if(candidates.size!==1)return null');
  });
});
