import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('Shoperation fresh-install target postflight',()=>{
  it('proves current tenant/B2B schema, fail-closed plan defaults and Core Engine checkout',()=>{
    const sql=read('supabase/customer-baseline/target-postflight.sql');
    for(const required of [
      'public.webshop_instances',
      'public.products',
      'public.product_variants',
      'public.orders',
      'public.customer_instance_roles',
      'public.coupon_redemptions',
      "p.proname = 'place_order'",
      "p.proname = 'place_order_provider_v5_idempotent'",
      "p.proname = 'quote_tenant_checkout_v2'",
      'customer_instance_roles_self_select',
      'orders_customer_or_store_read',
      'can_manage_orders',
      'can_manage_support',
    ]) expect(sql).toContain(required);
    expect(sql).toContain("not ilike '%alap%'");
    expect(sql).toContain("'target-postflight-ok'::text as status");
  });

  it('requires hardened helper and checkout privilege models',()=>{
    const sql=read('supabase/customer-baseline/target-postflight.sql');
    expect(sql).toContain("has_function_privilege('public', p.oid, 'execute')");
    expect(sql).toContain("has_function_privilege('anon', p.oid, 'execute')");
    expect(sql).toContain("has_function_privilege('authenticated', p.oid, 'execute')");
    expect(sql).toContain("has_function_privilege('service_role', p.oid, 'execute')");
    expect(sql).toContain('helper_count <> 12');
    expect(sql).toContain('not p.prosecdef');
  });

  it('requires customer-facing seed data to remain empty before provisioning',()=>{
    const sql=read('supabase/customer-baseline/target-postflight.sql');
    expect(sql).toContain('select count(*) from public.products');
    expect(sql).toContain('select count(*) from public.product_variants');
    expect(sql).toContain('select count(*) from public.webshop_instances');
    expect(sql).toContain('select count(*) from public.orders');
    expect(sql).toContain('select count(*) from public.customer_instance_roles');
    expect(sql).toContain('customer_rows <> 0');
  });

  it('is read-only',()=>{
    const sql=read('supabase/customer-baseline/target-postflight.sql').toLowerCase();
    expect(sql).not.toMatch(/\bcreate\s+(table|function|view|schema|type|sequence)\b/);
    expect(sql).not.toMatch(/\balter\s+(table|function|view|schema|type|sequence)\b/);
    expect(sql).not.toMatch(/\bdrop\s+(table|function|view|schema|type|sequence)\b/);
    expect(sql).not.toMatch(/\binsert\s+into\b/);
    expect(sql).not.toMatch(/\bupdate\s+public\./);
    expect(sql).not.toMatch(/\bdelete\s+from\b/);
  });
});
