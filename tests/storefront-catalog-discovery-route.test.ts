import fs from'node:fs';
import{describe,expect,it}from'vitest';

const route=fs.readFileSync('src/app/webaruhaz/page.tsx','utf8');
const catalog=fs.readFileSync('src/components/catalog/shop-catalog.tsx','utf8');
const shell=fs.readFileSync('src/components/content/storefront-content-shell.tsx','utf8');
const css=fs.readFileSync('src/app/public-pages-polish.css','utf8');

describe('storefront catalog discovery route',()=>{
 it('keeps filtered catalog entry points inside the active template shell',()=>{
  expect(route).toMatch(/StorefrontContentShell/);
  expect(route).toMatch(/data-storefront-catalog-route=\{newDiscovery\?'new':'catalog'\}/);
  expect(shell).toMatch(/data-storefront-template=\{runtime\.page\.templateKey\}/);
  expect(css).toMatch(/Shared catalog discovery route inheritance/);
  expect(css).toMatch(/\.storefrontContentShell \.shopPage\{background:var\(--shoporation-color-background/);
 });
 it('treats Újdonságok as a real catalog sort state rather than a duplicated content page',()=>{
  expect(route).toMatch(/sort==='new'/);
  expect(route).toMatch(/newDiscovery\?'Újdonságok'/);
  expect(route).toMatch(/Friss érkezések/);
  expect(catalog).toMatch(/requestedSort=params\.get\('sort'\)/);
  expect(catalog).toMatch(/if\(sort==='new'\)return new Date\(b\.createdAt/);
 });
 it('keeps the functional shared catalog core and current commerce data',()=>{
  expect(route).toMatch(/<ShopCatalog products=\{products\}/);
  expect(route).toMatch(/getProducts\(\)/);
  expect(route).toMatch(/getCommerceAccess\(\)/);
  expect(route).not.toMatch(/Acceptance ·/);
 });
});
