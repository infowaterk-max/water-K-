import {describe,expect,it} from 'vitest';
import {readStorefrontFidelityMetadata,resolveStorefrontStyleSlot} from '@/lib/builder/storefront-fidelity-engine';
import {resolveStorefrontVisualStyle} from '@/lib/builder/storefront-visual-style';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {
  BEAUTY_LAB_REFERENCE_V26_HOME_PAGE,
  BEAUTY_LAB_REFERENCE_V26_PRODUCT_PAGE,
  BEAUTY_LAB_TEMPLATE_PACKAGE,
} from '@/lib/builder/templates/beauty-lab-reference-v26';

const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);

describe('Beauty Lab reference v2.6 fidelity recovery',()=>{
  it('keeps one canonical Home/PDP and compacts the shared Home composition',()=>{
    expect(BEAUTY_LAB_TEMPLATE_PACKAGE.pages.filter(page=>page.pageType==='home')).toHaveLength(1);
    expect(BEAUTY_LAB_TEMPLATE_PACKAGE.pages.filter(page=>page.pageType==='product')).toHaveLength(1);

    const title=nodeById(BEAUTY_LAB_REFERENCE_V26_HOME_PAGE,'beauty-hero-title');
    expect(resolveStorefrontVisualStyle(title?.config.style,'desktop')).toMatchObject({maxWidth:'15.5ch',lineHeight:.86});

    const finder=nodeById(BEAUTY_LAB_REFERENCE_V26_HOME_PAGE,'formula-finder');
    expect(finder?.config.actionLabel).toBe('Tovább');
    expect(finder?.config.copy).toBe('');
    expect(resolveStorefrontStyleSlot(finder?.config.styleSlots,'option','desktop')).toMatchObject({minHeight:'3.55rem',padding:'.42rem'});
    expect(resolveStorefrontStyleSlot(finder?.config.styleSlots,'aside','desktop')).toMatchObject({minHeight:'10.8rem'});

    const ingredient=nodeById(BEAUTY_LAB_REFERENCE_V26_HOME_PAGE,'beauty-ingredient-index-block');
    const texture=nodeById(BEAUTY_LAB_REFERENCE_V26_HOME_PAGE,'beauty-texture-navigation');
    const featured=nodeById(BEAUTY_LAB_REFERENCE_V26_HOME_PAGE,'newFormulas');
    expect(resolveStorefrontStyleSlot(ingredient?.config.styleSlots,'media','desktop').aspectRatio).toBe('1.48 / 1');
    expect(resolveStorefrontStyleSlot(texture?.config.styleSlots,'media','desktop').aspectRatio).toBe('2.5 / 1');
    expect(resolveStorefrontStyleSlot(featured?.config.styleSlots,'media','desktop').aspectRatio).toBe('1 / 1.08');
  });

  it('puts the PDP tabs before specifications and removes the redundant top trust bar',()=>{
    expect(BEAUTY_LAB_REFERENCE_V26_PRODUCT_PAGE.sections.slice(0,5).map(section=>section.id)).toEqual([
      'beauty-product-site-header',
      'beauty-product-main',
      'beauty-product-tabs',
      'beauty-product-specifications',
      'beauty-product-related',
    ]);
    expect(BEAUTY_LAB_REFERENCE_V26_PRODUCT_PAGE.sections.some(section=>section.id==='beauty-product-trust-bar')).toBe(false);
  });

  it('uses real three-item trust structure and responsive buybox ordering',()=>{
    const trust=nodeById(BEAUTY_LAB_REFERENCE_V26_PRODUCT_PAGE,'beauty-product-trust');
    expect(trust?.componentKey).toBe('layout.grid');
    expect(trust?.children?.map(child=>child.id)).toEqual([
      'beauty-product-trust-stock',
      'beauty-product-trust-shipping',
      'beauty-product-trust-returns',
    ]);

    const metadata=readStorefrontFidelityMetadata(BEAUTY_LAB_REFERENCE_V26_PRODUCT_PAGE);
    const expected=[
      'beauty-product-info',
      'beauty-product-rating',
      'beauty-product-key-specs',
      'beauty-product-variants',
      'beauty-product-purchase',
      'beauty-product-trust',
    ];
    expect(metadata?.nodeOrder?.['beauty-product-buybox']?.desktop).toEqual(expected);
    expect(metadata?.nodeOrder?.['beauty-product-buybox']?.mobile).toEqual(expected);
    expect(metadata?.designGuard).toMatchObject({presetId:'beauty-lab-reference-v2.6-product',baselineVersion:6});
  });

  it('limits related products to three and keeps the recovery purely shared/runtime-driven',()=>{
    const related=nodeById(BEAUTY_LAB_REFERENCE_V26_PRODUCT_PAGE,'beauty-product-recommendations');
    const fallback=related?.bindings?.products?.fallback as unknown[]|undefined;
    expect(related?.config.columns).toBe(3);
    expect(fallback).toHaveLength(3);
    expect(BEAUTY_LAB_REFERENCE_V26_PRODUCT_PAGE.metadata).toMatchObject({
      referencePass:'beauty-lab-reference-v2.6',
      pdpFlow:'main-tabs-ingredients-related-results',
    });
  });
});
