import fs from'node:fs';
import{describe,expect,it}from'vitest';

type Node={id:string;config:Record<string,unknown>;children?:Node[]};
type Page={pageType:string;sections:Node[]};
const pkg=JSON.parse(fs.readFileSync('src/lib/builder/templates/playroom-v20-canonical-package.json','utf8')) as {pages:Page[]};
const walk=(nodes:Node[]):Node[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const find=(pageType:string,id:string)=>{const page=pkg.pages.find(item=>item.pageType===pageType);if(!page)throw new Error('missing page '+pageType);const node=walk(page.sections).find(item=>item.id===id);if(!node)throw new Error('missing node '+id);return node;};
const obj=(value:unknown)=>value as Record<string,unknown>;

describe('Playroom v20 final visual defect pass',()=>{
 it('keeps header, catalog hero, contact wizard and cart rhythm on the accepted template',()=>{
  for(const page of pkg.pages){
   const header=walk(page.sections).find(node=>node.id==='playroom-account-header');
   if(!header)continue;
   const slots=obj(header.config.styleSlots),category=obj(slots.categoryTrigger),desktop=obj(category.desktop);
   expect(desktop.display).toBe('none');
  }
  const heroImage=find('catalog','playroom-catalog-hero-image');
  const heroCopy=find('catalog','playroom-catalog-hero-copy');
  expect(obj(obj(heroImage.config.style).desktop)).toMatchObject({height:'19rem',minHeight:'19rem',maxHeight:'19rem'});
  expect(obj(obj(heroCopy.config.style).desktop)).toMatchObject({minHeight:'19rem'});
  expect(find('contact','playroom-contact-form').config.style).toMatchObject({maxWidth:'64rem',margin:'1rem auto 2rem'});
  expect(obj(obj(find('cart','playroom-cart-recommendation-preset').config.style).base)).toMatchObject({paddingTop:'1rem'});
 });
 it('locks catalog and account route polish without creating separate category pages',()=>{
  const publicCss=fs.readFileSync('src/app/public-pages-polish.css','utf8');
  const accountCss=fs.readFileSync('src/app/account-workflow.css','utf8');
  const marketing=fs.readFileSync('src/components/account/marketing-consent-form.tsx','utf8');
  const shop=fs.readFileSync('src/app/webaruhaz/page.tsx','utf8');
  expect(publicCss).toContain('.shopPage[data-storefront-catalog-route="new"] .selectionHelp + .newsletterPanel');
  expect(publicCss).toContain('.shopPage .shopActions .button');
  expect(publicCss).toContain('.shopPage .stockDot');
  expect(accountCss).toContain('.storefrontAccountShell .accountEmptyState');
  expect(accountCss).toContain('.storefrontAccountShell .marketingConsentRow');
  expect(accountCss).toContain('padding-bottom:clamp(2rem,3vw,3rem)');
  expect(marketing).toContain('marketingConsentRow');
  expect(shop).toContain("data-storefront-catalog-route={newDiscovery?'new':'catalog'}");
  expect(shop).toContain('<ShopCatalog products={products}');
 });
});
