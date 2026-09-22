import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
describe('storefront real-route template authority',()=>{
 it('uses a page-type-aware shared route shell',()=>{
  const shell=read('src/components/content/storefront-content-shell.tsx');
  const source=read('src/lib/builder/storefront-runtime-source.ts');
  expect(shell).toContain("pageKey='content'");
  expect(shell).toContain('pageKey?:StorefrontBuilderPageType');
  expect(shell).toContain('resolveCurrentStorefrontRouteRuntimePage(pageKey)');
  expect(shell).toContain('data-storefront-route-page={pageKey}');
  expect(source).toContain('resolveCurrentStorefrontRouteRuntimePage(pageKey:StorefrontBuilderPageType)');
  expect(source).toContain('page.pageType!==pageKey');
 });
 it.each([
  ['src/app/webaruhaz/page.tsx','catalog'],
  ['src/app/kereses/page.tsx','search'],
  ['src/app/termek/[slug]/layout.tsx','product'],
  ['src/app/blog/page.tsx','blog-index'],
  ['src/app/blog/[slug]/page.tsx','blog-article'],
  ['src/app/gyik/page.tsx','faq'],
 ])('%s selects its own Page Schema authority',(path,pageKey)=>expect(read(path)).toContain(`pageKey="${pageKey}"`));
});
