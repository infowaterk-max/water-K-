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

  test('checkout aggregates duplicate cart lines but only submits explicit variant ids to quote and order APIs',()=>{
    expect(checkout).toContain('const quoteByVariant=new Map<string,number>()');
    expect(checkout).toContain('if(!item.variantId)continue');
    expect(checkout).toContain("quoteByVariant.set(item.variantId,(quoteByVariant.get(item.variantId)??0)+item.quantity)");
    expect(checkout).toContain('const quoteItems=[...quoteByVariant].map(([variantId,quantity])=>({variantId,quantity}))');
    expect(checkout).toContain('const items=quoteItems.map(i=>({productId:i.variantId,quantity:i.quantity}))');
    expect(checkout).toMatch(/missingVariant/);
    expect(checkout).not.toMatch(/productId:i\.variantId\?\?i\.productId/);
  });
});
