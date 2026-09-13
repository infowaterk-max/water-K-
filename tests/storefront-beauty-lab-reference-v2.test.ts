import {describe,expect,it} from 'vitest';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {applyAuthoredTemplatePreviewFallbacks} from '@/lib/builder/storefront-template-preview-canonical';

const flatten=(page:StorefrontPageDocument)=>{
  const result:StorefrontComponentNode[]=[];
  const visit=(node:StorefrontComponentNode)=>{result.push(node);for(const child of node.children??[])visit(child);};
  for(const section of page.sections)visit(section);
  return result;
};
const node=(page:StorefrontPageDocument,id:string)=>{
  const found=flatten(page).find(candidate=>candidate.id===id);
  if(!found)throw new Error(`TEST_NODE_MISSING:${id}`);
  return found;
};

describe('Beauty Lab reference-v2 catalog package',()=>{
  const template=getStorefrontTemplatePackage('beauty.beauty-lab');
  if(!template)throw new Error('BEAUTY_LAB_CATALOG_PACKAGE_MISSING');
  const home=template.pages.find(page=>page.pageType==='home');
  const product=template.pages.find(page=>page.pageType==='product');
  if(!home||!product)throw new Error('BEAUTY_LAB_REFERENCE_PAGES_MISSING');

  it('uses the approved-reference hero composition data without a second runtime',()=>{
    expect(node(home,'beauty-hero-photo').config.src).toContain('pexels-photo-8990301.jpeg');
    expect(node(home,'beauty-hero-copy').config.text).toContain('Hatékony összetevők.');
    expect(node(home,'beauty-hero-cta').config.label).toContain('Találd meg a formulád');
    expect(node(home,'formula-finder').config.title).toBe('Mi az, amin javítani szeretnél?');
    expect(node(home,'beauty-ingredient-index-block').config.title).toBe('Ismerd meg az összetevőket');
  });

  it('locks the approved top-page flow and shared three-item trust strip into Page Schema',()=>{
    const order=home.sections.map(section=>section.id);
    const finderAt=order.indexOf('beauty-formula-finder');
    expect(finderAt).toBeGreaterThan(-1);
    expect(order[finderAt+1]).toBe('beauty-ingredient-index');
    expect(order.indexOf('beauty-concern')).toBeGreaterThan(order.indexOf('beauty-routine-feature'));
    const trustGrid=node(home,'beauty-usp-grid');
    expect(trustGrid.componentKey).toBe('content.trust-strip');
    expect(trustGrid.children).toBeUndefined();
    const items=Array.isArray(trustGrid.config.items)?trustGrid.config.items as Array<Record<string,unknown>>:[];
    expect(items.map(item=>item.label)).toEqual(expect.arrayContaining(['Bőrbarát formulák','Tisztább összetevők','Valódi eredmények']));
  });

  it('uses the reference PDP product identity and structured ingredient content',()=>{
    expect(node(product,'beauty-product-gallery').config.images).toEqual(expect.arrayContaining([expect.objectContaining({src:expect.stringContaining('pexels-photo-14473397.jpeg')})]));
    expect(node(product,'beauty-product-info').config.title).toBe('Niacinamide 10% Serum');
    expect(node(product,'beauty-product-info').config.price).toBe(8990);
    expect(node(product,'beauty-product-rating').config.count).toBe(214);
    expect(node(product,'beauty-product-variants').config.label).toBe('Bőrtípus:');
    expect(node(product,'beauty-product-spec-groups').config.title).toBe('MI VAN BENNE?');
    expect(node(product,'beauty-product-recommendations').config.title).toBe('Jól kombinálható');
  });

  it('keeps authored scalar preview values ahead of generic fixtures while empty lists may still be filled',()=>{
    const preview=applyAuthoredTemplatePreviewFallbacks({
      page:product,
      context:{pricing:{displayPrice:'29 990 Ft'},product:{name:'Generic Product'},catalog:{emptyBusinessList:['demo-row']}},
    });
    expect((preview.pricing as Record<string,unknown>).displayPrice).toBe('8 990 Ft');
    expect((preview.product as Record<string,unknown>).name).toBe('Niacinamide 10% Serum');
    expect((preview.catalog as Record<string,unknown>).emptyBusinessList).toEqual(['demo-row']);
  });
});