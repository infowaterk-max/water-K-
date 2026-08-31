import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('Shoperation fresh-install target postflight',()=>{
  it('proves core schema, fail-closed plan defaults and provider-neutral checkout',()=>{
    const sql=read('supabase/customer-baseline/target-postflight.sql');
    expect(sql).toContain("public.webshop_instances");
    expect(sql).toContain("public.products");
    expect(sql).toContain("public.product_variants");
    expect(sql).toContain("public.orders");
    expect(sql).toContain("not ilike '%alap%'");
    expect(sql).toContain("p.proname = 'place_order'");
    expect(sql).toContain("p.proname = 'place_order_provider_v2_idempotent'");
    expect(sql).toContain("'target-postflight-ok'::text as status");
  });

  it('requires customer-facing seed data to remain empty before provisioning',()=>{
    const sql=read('supabase/customer-baseline/target-postflight.sql');
    expect(sql).toContain('select count(*) from public.products');
    expect(sql).toContain('select count(*) from public.product_variants');
    expect(sql).toContain('select count(*) from public.webshop_instances');
    expect(sql).toContain('select count(*) from public.orders');
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
