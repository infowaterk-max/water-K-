import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('Shoperation baseline snapshot structural review',()=>{
  it('requires the core customer schema and provider-neutral checkout',()=>{
    const review=read('scripts/review-customer-baseline-snapshot.mjs');
    for(const required of [
      'public.webshop_instances',
      'public.profiles',
      'public.products',
      'public.product_variants',
      'public.orders',
      'public.commerce_provider_catalog',
      'public.webshop_instance_commerce_settings',
      'place_order_provider_v2_idempotent',
    ]) expect(review).toContain(required);
  });

  it('blocks customer-facing data and historical migration state',()=>{
    const review=read('scripts/review-customer-baseline-snapshot.mjs');
    expect(review).toContain('customer-facing data statements');
    expect(review).toContain('supabase_migrations');
    expect(review).toContain('schema_migrations');
    expect(review).toContain('historical Supabase migration state');
    expect(review).toContain('enable\\s+row\\s+level\\s+security');
    expect(review).toContain('create\\s+policy');
  });

  it('runs structural review automatically after generating a candidate snapshot',()=>{
    const generator=read('scripts/generate-customer-baseline.mjs');
    const pkg=JSON.parse(read('package.json'));
    expect(generator).toContain('scripts/review-customer-baseline-snapshot.mjs');
    expect(generator).toContain('candidate snapshot failed structural review');
    expect(pkg.scripts['db:customer:review']).toBe('node scripts/review-customer-baseline-snapshot.mjs');
  });
});
