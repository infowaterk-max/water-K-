import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/playroom/v20';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const page=(type:typeof PLAYROOM_V20_TEMPLATE_PACKAGE.pages[number]['pageType'])=>PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(candidate=>candidate.pageType===type)!;
const find=(nodes:readonly typeof PLAYROOM_V20_TEMPLATE_PACKAGE.pages[number]['sections'][number][],id:string):any=>{
  for(const node of nodes){if(node.id===id)return node;const child=find(node.children??[],id);if(child)return child;}return null;
};

describe('Playroom v20 post-release UI polish',()=>{
  it('balances the catalog hero and restores breathing room',()=>{
    const catalog=page('catalog'),image=find(catalog.sections,'playroom-catalog-hero-image'),copy=find(catalog.sections,'playroom-catalog-hero-copy');
    expect(image.config.style.desktop.height).toBe('20rem');
    expect(image.config.style.tablet.height).toBe('18rem');
    expect(copy.config.style.desktop.minHeight).toBe('20rem');
    expect(copy.config.style.tablet.minHeight).toBe('18rem');
    expect(find(catalog.sections,'playroom-catalog-platform-presets').config.style.base.paddingTop).toBe('.75rem');
  });
  it('paints the full shared contact runtime canvas with active template tokens',()=>{
    const css=read('src/app/public-pages-polish.css');
    expect(css).toContain('main[data-storefront-contact-runtime="page-schema"]>[data-storefront-global-styles-v1]');
    expect(css).toContain('background:var(--shoporation-color-background,#fff)');
  });
  it('keeps the shared contact wizard present, materialized, desktop-bounded and topic-first',()=>{
    const form=find(page('contact').sections,'playroom-contact-form');
    expect(form?.componentKey).toBe('support.contact-form');
    expect(form.config.style).toBeUndefined();
    const client=read('src/components/builder/storefront-support-contact-form-client.tsx');
    const wizard=read('src/components/forms/storefront-form-wizard.tsx');
    expect(client).toContain("maxWidth:'54rem'");
    expect(client).toContain("margin:'1rem auto 2rem'");
    expect(client).toContain('StorefrontFormWizard');
    expect(client).toContain("kind:'topic'");
    expect(client).toContain("whenTopic:'general'");
    expect(wizard).toContain('data-wizard-topic-layout="desktop"');
    expect(wizard).toContain('data-wizard-topic-layout="mobile"');
  });
  it('hides the misleading Playroom desktop trigger while retaining mobile navigation',()=>{
    for(const current of PLAYROOM_V20_TEMPLATE_PACKAGE.pages){const header=find(current.sections,'playroom-account-header');if(header)expect(header.config.styleSlots.categoryTrigger.desktop.display).toBe('none');}
    expect(read('src/components/builder/storefront-commerce-header.tsx')).toContain('data-storefront-mobile-menu="true"');
  });
  it('uses Playroom purchase and inventory colors on canonical and live commerce surfaces',()=>{
    const product=page('product');
    expect(find(product.sections,'playroom-product-info').config.styleSlots.stock.base.color).toBe('#ff5f68');
    expect(find(product.sections,'playroom-product-purchase').config.style.base.background).toBe('#5c7cfa');
    const css=read('src/app/playroom-runtime-polish.css');
    expect(css).toContain('.shopPage .stockDot');
    expect(css).toContain('.shopPage .button');
    expect(css).toContain('.productPage .productStockCount');
    expect(read('src/app/termek/[slug]/page.tsx')).toContain('className="productStockCount"');
  });
  it('keeps category links in one contextual catalog route',()=>{
    const route=read('src/app/webaruhaz/page.tsx');
    expect(route).toContain("console:'Konzolok'");
    expect(route).toContain("accessory:'Kiegészítők'");
    expect(route).toContain("merch:'Rajongói termékek'");
    expect(route).toContain("categoryTitle||'Válassz egyszerűen a teljes kínálatból.'");
    expect(route).toContain('<ShopCatalog products={products}');
  });
  it('adds Playroom-only gap and account readability fixes',()=>{
    const css=read('src/app/playroom-runtime-polish.css');
    expect(css).toContain('.shopPage .newsletterPanel{margin-top:2rem}');
    expect(css).toContain('[data-storefront-live-cart="shared-cart-v1"]');
    expect(css).toContain('.storefrontAccountWorkspace');
    expect(css).toContain('.accountEmptyState');
    expect(css).toContain('.consentRow span');
    expect(css).not.toContain('.productPage .productPriceBlock .muted');
  });
});
