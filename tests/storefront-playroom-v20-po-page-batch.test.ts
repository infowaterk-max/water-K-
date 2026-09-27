import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/playroom/v20';

const page=(type:string)=>PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(item=>item.pageType===type)!;
const all=(nodes:any[],out:any[]=[]):any[]=>{for(const node of nodes){out.push(node);all(node.children??[],out)}return out};
const find=(type:string,id:string)=>all(page(type).sections).find(node=>node.id===id);
const ids=(type:string)=>all(page(type).sections).map(node=>node.id);

describe('Playroom v20 Product Owner page batch',()=>{
  it('keeps the accepted Home out of this repair and compacts Catalog mobile discovery',()=>{
    const platform=find('catalog','playroom-catalog-platform-navigation');
    expect(platform.config.styleSlots.mediaImage.base).toMatchObject({width:'1.55rem',height:'1.55rem',margin:'0',objectFit:'contain'});
    expect(find('catalog','playroom-catalog-facets').config.mobilePresentation).toBe('dropdown');
    expect(find('catalog','playroomCatalogGrid').config.styleSlots.grid.mobile.gridTemplateColumns).toBe('repeat(2,minmax(0,1fr))');
    expect(find('catalog','playroom-catalog-discovery-presets').config.style.mobile.display).toBe('none');
    expect(find('home','playroomFeaturedGames').config.mobileSingleItem).toBe(true);
  });
  it('removes repeated Product filler while retaining concrete facts and downloads',()=>{
    const productIds=ids('product');
    for(const removed of ['playroom-product-buybox-signals','playroom-product-confidence','playroom-product-facts-compatibility','playroom-product-story-preset'])expect(productIds).not.toContain(removed);
    expect(productIds).toContain('playroom-product-key-specs');
    expect(productIds).toContain('playroom-product-downloads');
  });
  it('makes Cart recommendations direct-purchase and its preview controls client-interactive',()=>{
    const rec=find('cart','playroom-cart-recommendations');
    expect(rec.config).toMatchObject({showCta:true,ctaLabel:'Kosárba',ctaAction:'add-to-cart'});
    const client=fs.readFileSync('src/components/builder/storefront-cart-summary-client.tsx','utf8');
    expect(client).toContain('data-cart-interactive-controls="true"');
    expect(client).toContain('onClick={()=>remove(line.id)}');
    expect(client).toContain('onClick={()=>setQuantity(line.id,1)}');
    const preview=fs.readFileSync('src/lib/builder/storefront-template-preview-demo.ts','utf8');
    expect(preview).toContain("page.pageType==='cart'");
    expect(preview).toContain("name:item.name");
  });
  it('replaces placeholder Content/Legal copy and lengthens the Blog article',()=>{
    expect(find('content','playroom-content-information-body').config.text).not.toContain('Itt jelenik meg');
    expect(find('content','playroom-content-information-body').config.text.length).toBeGreaterThan(500);
    expect(find('blog-article','playroom-blog-article-body-copy').config.text.length).toBeGreaterThan(900);
    expect(find('legal','playroom-legal-reading-body').config.text.length).toBeGreaterThan(900);
    expect(find('legal','playroom-legal-reading-body').config.text).not.toBe('A kereskedő saját jogi tartalma.');
  });
  it('restores FAQ accordion depth and simplifies Contact + 404',()=>{
    const faq=find('faq','playroom-faq-accordion');
    expect(faq.componentKey).toBe('commerce.content-tabs');
    expect(faq.config.behavior).toMatchObject({mode:'accordion',allowCollapse:true});
    expect(faq.config.tabs.length).toBeGreaterThanOrEqual(10);
    expect(ids('contact')).not.toContain('playroom-contact-options-preset');
    expect(ids('contact')).toContain('playroom-contact-map');
    expect(ids('contact')).toContain('playroom-contact-company');
    expect(ids('not-found')).not.toContain('playroom-not-found-routes');
    const wizard=fs.readFileSync('src/components/builder/storefront-support-contact-form-client.tsx','utf8');
    expect(wizard).toContain("label:'Hibajelentés'");
    expect(wizard).not.toContain("label:'Panaszt szeretnék tenni'");
  });  it('locks the second PO pass without reopening accepted Home or Cart',()=>{
    const catalogPlatform=find('catalog','playroom-catalog-platform-navigation');
    expect(catalogPlatform.config.styleSlots.grid.mobile.gridTemplateColumns).toBe('repeat(3,minmax(0,1fr))');

    expect(find('product','playroom-product-info').config.eyebrow).toBe('TERMÉKISMERTETŐ');
    const digitalPreview=fs.readFileSync('src/lib/builder/storefront-digital-commerce-preview.ts','utf8');
    expect(digitalPreview).toContain("input.template?.manifest.templateKey==='gaming.playroom'");
    expect(digitalPreview).toContain("mode:'physical',documents:[]");

    const checkoutIds=ids('checkout');
    expect(checkoutIds).not.toContain('playroom-checkout-intro-note');
    expect(checkoutIds).not.toContain('playroom-checkout-runtime-points');
    expect(checkoutIds).toContain('playroom-checkout-progress-line');
    const preview=fs.readFileSync('src/lib/builder/storefront-template-preview-demo.ts','utf8');
    expect(preview).toContain("page.pageType==='cart'||page.pageType==='checkout'");

    expect(ids('search')).not.toContain('playroom-search-shortcuts');
    expect(ids('search')).not.toContain('playroom-search-hero-shortcuts');
    expect(ids('search')).toContain('playroom-search-quick-chips');
    expect(find('search','playroom-search-facets').config.mobilePresentation).toBe('dropdown');
    expect(find('search','playroomSearchResults').config.styleSlots.grid.mobile.gridTemplateColumns).toBe('repeat(2,minmax(0,1fr))');
    const quickSearch=find('search','playroom-search-quick-chips');
    expect(quickSearch.componentKey).toBe('system.navigation');
    expect(quickSearch.config.items.map((item:any)=>item.href)).toEqual(expect.arrayContaining([
      '/kereses?q=játék',
      '/kereses?q=kiegészítő',
      '/kereses?q=pc',
      '/kereses?q=playstation',
      '/kereses?q=xbox',
      '/kereses?q=nintendo',
    ]));

    expect(ids('blog-index')).not.toContain('playroom-blog-index-topic-presets');
    expect(ids('blog-article')).not.toContain('playroom-blog-article-aside');
    expect(ids('blog-article')).not.toContain('playroom-blog-article-related');

    expect(ids('legal')).not.toContain('playroom-legal-reading-note');
    const serialized=JSON.stringify(PLAYROOM_V20_TEMPLATE_PACKAGE);
    expect(serialized).not.toContain('/szallitas-es-fizetes');
    expect((PLAYROOM_V20_TEMPLATE_PACKAGE.demoFixtures??[]).some(item=>item.entityType==='content'&&item.payload.slug==='szallitas-es-fizetes')).toBe(false);

    expect(find('home','playroomFeaturedGames').config.mobileSingleItem).toBe(true);
    expect(find('cart','playroom-cart-recommendations').config.ctaAction).toBe('add-to-cart');
  });

  it('proves the Product description survives authored fallback resolution and makes Checkout task-first',()=>{
    const productInfo=find('product','playroom-product-info');
    expect(productInfo.bindings.description.path).toBe('product.description');
    expect(productInfo.config.styleSlots.description.base.fontSize).toBe('.86rem');
    const checkoutIds=ids('checkout');
    expect(checkoutIds).not.toContain('playroom-checkout-runtime-contract');
    expect(checkoutIds).not.toContain('playroom-checkout-trustline');
    expect(checkoutIds).toContain('playroom-checkout-form-preview');
    expect(checkoutIds).toContain('playroom-checkout-field-name');
    expect(checkoutIds).toContain('playroom-checkout-shipping-methods');
    expect(find('checkout','playroom-checkout-summary-shell').config.style.base.background).toBe('transparent');
    expect(find('checkout','playroom-checkout-summary').config.styleSlots.root.base.padding).toBe('.9rem');
    const previewCanonical=fs.readFileSync('src/lib/builder/storefront-template-preview-canonical.ts','utf8');
    expect(previewCanonical).toContain("if(typeof fallback==='string')return fallback.trim().length>0");
  });

});
