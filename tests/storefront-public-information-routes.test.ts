import fs from'node:fs';
import{describe,expect,it}from'vitest';

const page=fs.readFileSync('src/app/oldal/[slug]/page.tsx','utf8');
const shell=fs.readFileSync('src/components/content/storefront-content-shell.tsx','utf8');
const source=fs.readFileSync('src/lib/builder/storefront-runtime-source.ts','utf8');
const css=fs.readFileSync('src/app/public-pages-polish.css','utf8');

describe('storefront public information route integrity',()=>{
 it('keeps canonical footer information routes functional even without CMS content',()=>{
  expect(page).toMatch(/szallitas:\{title:'Szállítás'/);
  expect(page).toMatch(/fizetes:\{title:'Fizetés'/);
  expect(page).toMatch(/visszakuldes:\{title:'Visszaküldés'/);
  expect(page).toMatch(/if\(!SYSTEM_INFO\[slug\]\)notFound\(\)/);
  expect(page).toMatch(/getCommerceSettings\(\)/);
 });
 it('wraps public information pages in the active storefront template shell',()=>{
  expect(page).toMatch(/StorefrontContentShell/);
  expect(shell).toMatch(/resolveCurrentStorefrontContentRuntimePage/);
  expect(shell).toMatch(/data-storefront-template=\{runtime\.page\.templateKey\}/);
  expect(source).toMatch(/getPreviewStorefrontDraftPage\(instance\.id,'content'\)/);
  expect(css).toMatch(/\.storefrontContentShell\{/);
  expect(css).toMatch(/--shoporation-color-background/);
 });
 it('does not hardcode shipping providers into the public shipping fallback',()=>{
  expect(page).toMatch(/settings\.shippingOptions\.map/);
  expect(page).toMatch(/settings\.freeShippingThreshold/);
  expect(page).not.toMatch(/GLS|Foxpost|MPL|DPD/);
 });
});
