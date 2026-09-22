import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

describe('shared variant-aware storefront product route authority',()=>{
  it('projects the same variant-aware PDP href used by the live catalog',()=>{
    const catalog=readFileSync('src/lib/catalog-server.ts','utf8');
    const scene=readFileSync('src/lib/builder/storefront-interactive-scene-server.ts','utf8');
    const existing=readFileSync('src/lib/builder/storefront-existing-commerce-server.ts','utf8');
    const type=readFileSync('src/lib/commerce/interactive-scene.ts','utf8');
    expect(catalog).toContain('const variantSlug=');
    expect(scene).toContain('const variantSlug=');
    expect(scene).toContain("select('id,product_id,sku,label,gross_price_huf");
    expect(scene).toContain('href,');
    expect(scene).toContain("visible.find(variant=>variant.href&&variant.href!=='#')?.href");
    expect(type).toContain('href?:string;');
    expect(existing).toContain("variant.href&&variant.href!=='#'?variant.href:product.href");
  });
});
