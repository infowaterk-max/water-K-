import {describe,expect,it} from 'vitest';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {createStorefrontPresetBundle,materializeStorefrontSectionPreset} from '@/lib/builder/storefront-presets';
import {validateStorefrontPageDocument,type StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import {PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v19-canonical';

const page=(type:string)=>PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.find(item=>item.pageType===type)!;
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(item=>[item,...walk(item.children??[])]);
const find=(type:string,id:string)=>walk(page(type).sections).find(item=>item.id===id);

describe('Playroom v19 complete family acceptance contract',()=>{
  it('carries the accepted Home grammar across the full 14-page family',()=>{
    expect(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    for(const document of PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages){
      expect(document.metadata?.homeParityGrammar,document.pageType).toBe(true);
      expect(document.metadata?.compactMedia,document.pageType).toBe(true);
      const addon=document.metadata?.addonIntegration as Record<string,unknown>;
      expect(addon?.styleAuthority,document.pageType).toBe('current-storefront-design-system');
      expect(addon?.discoverability,document.pageType).toBe('contextual-plus-central');
      expect(addon?.localOverridePolicy,document.pageType).toBe('explicit-only-reset-to-inherited');
    }
  });

  it('replaces the disliked couch lifestyle hero only in v19 with a setup-focused editable media slot',()=>{
    const hero=find('home','playroom-hero-art');
    expect(hero?.componentKey).toBe('content.image');
    expect(hero?.config.src).toContain('pexels-photo-3945673');
    expect(hero?.config.src).not.toContain('7776096');
    expect(hero?.config.alt).toContain('gaming setup');
    expect(page('home').metadata?.heroVisual).toBe('premium-gaming-setup-no-couch-lifestyle');
  });

  it('keeps secondary page media compact rather than letting lifestyle images dominate the viewport',()=>{
    const ids=[
      ['catalog','playroom-catalog-hero-image'],['product','playroom-product-story-image'],['blog-article','playroom-blog-article-image'],
      ['content','playroom-content-feature-image'],['blog-index','playroom-blog-index-feature-image'],['faq','playroom-faq-help-image'],
    ] as const;
    for(const[type,id]of ids){
      const image=find(type,id);expect(image,`${type}:${id}`).toBeTruthy();
      const style=image?.config.style as Record<string,unknown>;
      expect(typeof style?.maxHeight).toBe('string');
      expect(String(style?.minHeight)).toBe('0');
    }
    expect(walk(page('account').sections).filter(item=>item.componentKey==='content.image')).toHaveLength(0);
    expect(walk(page('contact').sections).filter(item=>item.componentKey==='content.image')).toHaveLength(0);
    expect(walk(page('not-found').sections).filter(item=>item.componentKey==='content.image')).toHaveLength(0);
  });

  it('declares the shared checkout boundary and semantic add-on contexts instead of a Playroom-local checkout engine',()=>{
    expect(page('checkout').metadata?.checkoutPresentation).toBe('accordion-dropdown');
    expect(page('checkout').metadata?.checkoutFlow).toEqual(['cart','shipping','payment','summary']);
    expect(page('checkout').metadata?.checkoutUxContract).toBe('guided-accordion-owned-by-shared-e13-checkout-runtime-not-template-local');
    const checkoutAddon=(page('checkout').metadata?.addonIntegration as Record<string,unknown>).semanticContexts;
    expect(checkoutAddon).toEqual(['checkout.shipping.methods','checkout.payment.methods']);
    const productAddon=(page('product').metadata?.addonIntegration as Record<string,unknown>).semanticContexts;
    expect(productAddon).toEqual(['product.media.after','product.buybox.after','product.compatibility','product.related']);
    const cartAddon=(page('cart').metadata?.addonIntegration as Record<string,unknown>).semanticContexts;
    expect(cartAddon).toEqual(['cart.recommendations']);
  });

  it('keeps every completed page valid and every top-level section materializable as a Builder preset',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    const bundle=createStorefrontPresetBundle(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE);
    for(const document of PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages){
      const validation=validateStorefrontPageDocument(document,registry);
      expect(validation.violations.filter(item=>item.severity==='error'),document.pageType).toEqual([]);
      const presets=bundle.sectionPresets.filter(item=>item.pageKey===document.pageKey);
      expect(presets).toHaveLength(document.sections.length);
      for(const preset of presets)expect(materializeStorefrontSectionPreset(PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE,preset).id).toBe(preset.nodeId);
    }
  });
});
