import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,test} from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('storefront engagement tenant closure',()=>{
  test('loyalty account uses the tenant-aware v2 snapshot',()=>{
    const page=read('src/app/fiokom/huseg/page.tsx');
    expect(page).toContain('getCurrentWebshopInstance');
    expect(page).toContain("rpc('get_customer_loyalty_snapshot_v2'");
    expect(page).toContain('p_instance_id:instance.id');
    expect(page).not.toContain("rpc('get_customer_loyalty_snapshot',{");
  });

  test('product engagement reads are scoped to the active webshop',()=>{
    const engagement=read('src/lib/engagement.ts');
    expect(engagement).toContain('getCurrentWebshopInstance');
    expect(engagement).toMatch(/product_variants'[\s\S]*eq\('instance_id',instance\.id\)/);
    expect(engagement).toMatch(/product_reviews'[\s\S]*eq\('instance_id',instance\.id\)/);
    expect(engagement).toMatch(/wishlists'[\s\S]*eq\('instance_id',instance\.id\)/);
  });

  test('wishlist page and product actions carry tenant ownership',()=>{
    const wishlist=read('src/app/fiokom/kivansaglista/page.tsx');
    const actions=read('src/app/termek/[slug]/actions.ts');
    expect(wishlist).toMatch(/wishlists'[\s\S]*eq\('instance_id',instance\.id\)/);
    expect(actions).toContain('resolveCurrentVariant');
    expect(actions).toMatch(/product_variants'[\s\S]*eq\('instance_id',instance\.id\)/);
    expect(actions).toContain('instance_id:resolved.instance.id');
    expect(actions).toMatch(/order_items'[\s\S]*eq\('instance_id',resolved\.instance\.id\)/);
    expect(actions).toMatch(/product_reviews'\)\.insert\(\{instance_id:resolved\.instance\.id/);
  });
});
