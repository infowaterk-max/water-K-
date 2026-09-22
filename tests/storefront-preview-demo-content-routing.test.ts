import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
describe('preview demo content and informational route integrity',()=>{
 it('resolves template-owned preview article links without mutating CMS content',()=>{
  const source=readFileSync('src/lib/builder/storefront-runtime-source.ts','utf8');
  const article=readFileSync('src/app/blog/[slug]/page.tsx','utf8');
  const index=readFileSync('src/app/blog/page.tsx','utf8');
  expect(source).toContain("process.env.VERCEL_ENV!=='preview'");
  expect(source).toContain("getPreviewStorefrontDraftPage(instance.id,'blog-index')");
  expect(source).toContain("resolveCurrentStorefrontPublicStaticRuntimePage('blog-article')");
  expect(source).toContain('resolveStorefrontPreviewDemoBlogArticleRuntime');
  expect(article).toContain('data-storefront-blog-demo-article="page-schema"');
  expect(index).toContain('data-storefront-blog-demo-runtime="page-schema"');
  for(const forbidden of['.insert(','.update(','.delete(','.upsert('])expect(source).not.toContain(forbidden);
 });
 it('keeps template footer information links routable without fabricated merchant claims',()=>{
  const page=readFileSync('src/app/oldal/[slug]/page.tsx','utf8');
  for(const slug of['rolunk','fenntarthatosag','karrier'])expect(page).toContain(`${slug}:{title:`);
  expect(page).toContain('nem jelenítünk meg kitalált céges állításokat');
  expect(page).toContain('Konkrét vállalást, minősítést vagy környezeti állítást csak');
  expect(page).toContain('Nyitott pozíciót vagy jelentkezési lehetőséget csak akkor');
 });
});
