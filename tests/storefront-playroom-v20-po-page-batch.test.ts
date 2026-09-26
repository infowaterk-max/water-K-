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
  });
});
