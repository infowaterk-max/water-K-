import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe,expect,it } from 'vitest';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('roadmap block 3 pilot UI acceptance batch 2',()=>{
  it('separates merchant and platform navigation while preserving body-driven desktop scrolling',()=>{
    const navigation=read('src/components/navigation/admin-navigation.tsx');
    const css=read('src/app/admin/block3-pilot-batch.css');
    const communication=read('src/app/admin/communication-pilot-fixes.css');
    expect(navigation).toContain('adminNav adminMerchantNav');
    expect(navigation).toContain('adminNav adminPlatformNav');
    expect(navigation).toContain('Aktuális webshop adminisztrációja');
    expect(navigation).toContain('Shoperation platform adminisztráció');
    expect(css).toContain('.adminNavigationStack');
    expect(css).toContain('overflow-y:auto!important');
    expect(css).toContain('scrollbar-width:none!important');
    expect(css).toContain('.adminSide::-webkit-scrollbar{display:none!important');
    expect(css).toContain('.adminGrid>.adminMain,.adminGrid>.adminContent{height:auto!important;max-height:none!important');
    expect(communication).toContain('@media(max-width:1050px){\n  .launchActions');
    expect(communication).toContain('@media(max-width:850px){\n  body:has(.adminGrid)');
  });

  it('uses B2B channel context for the storefront badge and explains cart ordering rules',()=>{
    const catalog=read('src/lib/catalog-server.ts');
    const cart=read('src/components/cart/cart-view.tsx');
    const css=read('src/app/block3-pilot-batch.css');
    expect(catalog).toContain("const audience:ProductAudience=!includeAllChannels&&channel==='b2b'?'professional'");
    expect(cart).toContain('Minimum {minimum} db · rendelési egység {multiple} db');
    expect(css).toContain('grid-template-columns:46px minmax(62px,82px) 46px');
    expect(css).toContain('padding:7px');
    expect(css).toContain('.cartLineTotal{display:grid;gap:8px');
  });

  it('stacks admin setting forms on mobile',()=>{
    const css=read('src/app/admin/block3-pilot-batch.css');
    expect(css).toContain('@media(max-width:850px)');
    expect(css).toContain('.adminMain .formGrid{display:grid!important;grid-template-columns:1fr!important');
    expect(css).toContain('.adminMain .formGrid input,.adminMain .formGrid select{width:100%!important');
  });
});
