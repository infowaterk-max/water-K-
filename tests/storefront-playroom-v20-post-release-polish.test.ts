import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v20';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const page=(type:typeof PLAYROOM_V20_TEMPLATE_PACKAGE.pages[number]['pageType'])=>PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(candidate=>candidate.pageType===type)!;
const find=(nodes:readonly typeof PLAYROOM_V20_TEMPLATE_PACKAGE.pages[number]['sections'][number][],id:string):any=>{
  for(const node of nodes){
    if(node.id===id)return node;
    const child=find(node.children??[],id);
    if(child)return child;
  }
  return null;
};

describe('Playroom v20 post-release UI polish',()=>{
  it('keeps the catalog hero media balanced and adds section breathing room',()=>{
    const catalog=page('catalog');
    const image=find(catalog.sections,'playroom-catalog-hero-image');
    expect(image.config.style.desktop.height).toBe('20rem');
    expect(image.config.style.tablet.height).toBe('18rem');
    expect(find(catalog.sections,'playroom-catalog-platform-presets').config.style.base.paddingTop).toBe('.75rem');
  });

  it('uses Playroom purchase and stock colors instead of historical merchant green',()=>{
    const product=page('product');
    const info=find(product.sections,'playroom-product-info');
    const purchase=find(product.sections,'playroom-product-purchase');
    expect(info.config.styleSlots.stock.base.color).toBe('#ff5f68');
    expect(purchase.config.style.base.background).toBe('#5c7cfa');
    expect(purchase.config.style.base.color).toBe('#ffffff');
  });

  it('keeps the shared contact wizard present and desktop-bounded',()=>{
    const contact=page('contact');
    expect(find(contact.sections,'playroom-contact-form')?.componentKey).toBe('support.contact-form');
    const client=read('src/components/builder/storefront-support-contact-form-client.tsx');
    expect(client).toContain("maxWidth:'54rem'");
    expect(client).toContain('StorefrontFormWizard');
  });

  it('removes symbol-only category triggers while retaining the real mobile menu',()=>{
    const header=read('src/components/builder/storefront-commerce-header.tsx');
    expect(header).toContain('const categoryTrigger=categoryLabel?');
    expect(header).toContain('data-storefront-mobile-menu="true"');
  });

  it('ships a final Playroom route bridge for catalog, cart, checkout and account surfaces',()=>{
    const css=read('src/app/playroom-runtime-polish.css');
    expect(css).toContain('[data-storefront-template="gaming.playroom"] .shopPage');
    expect(css).toContain('[data-storefront-cart-runtime="template-native"][data-storefront-template-key="gaming.playroom"]');
    expect(css).toContain('[data-storefront-checkout-runtime="template-native"][data-storefront-template-key="gaming.playroom"]');
    expect(css).toContain('.storefrontAccountShell[data-storefront-template="gaming.playroom"] .consentRow');
    expect(css).toContain('color:#ff5f68!important');
  });

  it('keeps category deep links on one catalog implementation with contextual titles',()=>{
    const route=read('src/app/webaruhaz/page.tsx');
    expect(route).toContain("console:'Konzolok'");
    expect(route).toContain("accessory:'Kiegészítők'");
    expect(route).toContain("merch:'Rajongói termékek'");
    expect(route).toContain("categoryTitle||'Válassz egyszerűen a teljes kínálatból.'");
  });
});
