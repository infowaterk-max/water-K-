import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('checkout strict-tenant preflight',()=>{
  it('sets transaction-local webshop context before the wrapped order engine inserts',()=>{
    const sql=read('supabase/migrations/20260901141500_checkout_tenant_context.sql');
    expect(sql).toContain("set_config('shoperation.instance_id',p_instance_id::text,true)");
    expect(sql).toContain('before insert on public.orders');
    expect(sql).toContain("raise exception 'Order insert blocked: explicit webshop tenant context is required.'");
  });

  it('uses channel-aware v5 from application code',()=>{
    const source=read('src/lib/orders/tenant-checkout.ts');
    expect(source).toContain("admin.rpc('place_order_provider_v5_idempotent'");
    expect(source).not.toContain("admin.rpc('place_order_provider_v4_idempotent'");
  });

  it('locks v3 and exposes v4 only to the trusted service role',()=>{
    const sql=read('supabase/migrations/20260901160000_legacy_rpc_lockdown.sql');
    expect(sql).toContain("'place_order_provider_v3_idempotent'");
    expect(sql).toContain("'place_order_provider_v4_idempotent'");
  });
});
