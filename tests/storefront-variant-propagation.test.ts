import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const shop=read('src/components/catalog/shop-catalog.tsx');
const detail=read('src/app/termek/[slug]/page.tsx');
const recommendations=read('src/components/catalog/product-recommendations.tsx');
const reorder=read('src/components/catalog/reorder-loader.tsx');
const checkout=read('src/components/checkout/checkout-form.tsx');

describe('storefront variant identity propagation',()=>{
  test('catalogue and product detail pass the variant id into cart actions',()=>{
    expect(shop).toMatch(/<AddToCart id=\{product\.id\} variantId=\{product\.id\}/);
    expect(detail).toMatch(/<AddToCart id=\{product\.id\} variantId=\{product\.id\}/);
  });

  test('recommendation and reorder flows persist variant identity',()=>{
    expect(recommendations).toMatch(/variantId:product\.id/);
    expect(reorder).toMatch(/variantId:product\.id/);
    expect(recommendations).toMatch(/item\.variantId\?\?item\.productId/);
  });

  test('checkout only submits explicit variant ids to the order API',()=>{
    expect(checkout).toMatch(/\{variantId:i\.variantId as string,quantity:i\.quantity\}/);
    expect(checkout).toMatch(/missingVariant/);
    expect(checkout).not.toMatch(/productId:i\.variantId\?\?i\.productId/);
  });
});
