import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {BEAUTY_LAB_HOME_PAGE,BEAUTY_LAB_PRODUCT_PAGE,BEAUTY_LAB_MARKETING_LAYER_CONTRACT} from '@/lib/builder/templates/beauty-lab';
import {PLANS} from '@/lib/plans/catalog';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const registry=createStorefrontVisualBuilderComponentRegistry();
const renderers=createStorefrontVisualBuilderRendererRegistry();
const capability={plan:'alap' as const,features:PLANS.alap.features};
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const find=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const render=(page:StorefrontPageDocument,viewport:'desktop'|'tablet'|'mobile')=>renderToStaticMarkup(createElement(StorefrontRuntimeRenderer,{page,viewport,bindingContext:{},componentRegistry:registry,rendererRegistry:renderers,capability}));

describe('Beauty Lab Visual Fidelity Recovery canary technical gate',()=>{
  it('uses the reference-driven hero without hidden compatibility DOM',()=>{
    expect(BEAUTY_LAB_HOME_PAGE.metadata?.visualFidelityRecovery).toBe('canary-reference-schema-v1');
    expect(BEAUTY_LAB_MARKETING_LAYER_CONTRACT.hero).toEqual(['image','overlay','decoration','badge','title','copy','primary-cta']);
    const hero=find(BEAUTY_LAB_HOME_PAGE,'beauty-formula-hero')!;
    expect(hero.children?.map(node=>node.id)).toEqual(['beauty-hero-image-layer','beauty-hero-overlay-layer','beauty-hero-decoration-layer','beauty-hero-badge-layer','beauty-hero-title-layer','beauty-hero-copy-layer','beauty-hero-primary-cta-layer']);
    const hiddenAliases=walk(BEAUTY_LAB_HOME_PAGE.sections).filter(node=>node.id.includes('wave32-binding')||((node.responsive?.desktop?.hidden&&node.responsive?.tablet?.hidden&&node.responsive?.mobile?.hidden)&&Number(node.config.opacity)===0));
    expect(hiddenAliases).toEqual([]);
    expect(JSON.stringify(hero)).not.toContain('editorial-copy-panel');
    expect(JSON.stringify(hero)).not.toContain('editorial-photo');
    expect(JSON.stringify(hero)).not.toContain('editorial-product-inset');
  });

  it('keeps visual geometry in canonical schema style objects and adapts D/T/M from the same page',()=>{
    const title=find(BEAUTY_LAB_HOME_PAGE,'beauty-hero-title')!;
    const titleStyle=title.config.style as Record<string,unknown>;
    expect(titleStyle).toHaveProperty('base');
    expect(titleStyle).toHaveProperty('mobile');
    expect(JSON.stringify(title.config)).toContain('fontStretch');
    const hero=find(BEAUTY_LAB_HOME_PAGE,'beauty-formula-hero')!;
    expect(JSON.stringify(hero.config.style)).toContain('minHeight');
    const desktop=render(BEAUTY_LAB_HOME_PAGE,'desktop');
    const tablet=render(BEAUTY_LAB_HOME_PAGE,'tablet');
    const mobile=render(BEAUTY_LAB_HOME_PAGE,'mobile');
    for(const html of [desktop,tablet,mobile]){
      expect(html).toContain('YOUR SKIN.');
      expect(html).toContain('YOUR FORMULA.');
      expect(html).toContain('SCIENCE MEETS BEAUTY');
      expect(html).toContain('data-storefront-visual="layered-canvas"');
    }
    expect(desktop).toContain('font-stretch:condensed');
    expect(mobile).toContain('color:#FFFFFF');
  });

  it('rebuilds the PDP shell without the legacy trust strip while preserving authoritative commerce bindings',()=>{
    expect(BEAUTY_LAB_PRODUCT_PAGE.sections.some(section=>section.id==='beauty-product-trust-bar')).toBe(false);
    expect(BEAUTY_LAB_PRODUCT_PAGE.metadata?.visualFidelityRecovery).toBe('canary-reference-schema-v1');
    expect(find(BEAUTY_LAB_PRODUCT_PAGE,'beauty-product-breadcrumb')).toBeTruthy();
    expect(find(BEAUTY_LAB_PRODUCT_PAGE,'beauty-product-gallery')?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(find(BEAUTY_LAB_PRODUCT_PAGE,'beauty-product-buybox')?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    const source=JSON.stringify(BEAUTY_LAB_PRODUCT_PAGE);
    for(const binding of ['product.gallery','product.name','pricing.displayPrice','inventory.stockLabel','commerce.purchaseHref','recommendations.products'])expect(source).toContain(binding);
    const desktop=render(BEAUTY_LAB_PRODUCT_PAGE,'desktop');
    const mobile=render(BEAUTY_LAB_PRODUCT_PAGE,'mobile');
    expect(desktop).toContain('HOME / SKIN / SERUMS / CLOUD SERUM');
    expect(desktop).toContain('ADD TO BAG');
    expect(mobile).toContain('ADD TO BAG');
  });
});
