import {describe,expect,it} from 'vitest';
import {materializeStorefrontFidelityPage,readStorefrontFidelityMetadata} from '@/lib/builder/storefront-fidelity-engine';
import {resolveStorefrontVisualStyle} from '@/lib/builder/storefront-visual-style';
import {BEAUTY_LAB_REFERENCE_V25_HOME_PAGE,BEAUTY_LAB_TEMPLATE_PACKAGE} from '@/lib/builder/templates/beauty-lab-reference-v25';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);

describe('Beauty Lab reference v2.5 composition recovery',()=>{
  it('keeps one canonical package and adds shared Fidelity Engine responsive composition',()=>{
    expect(BEAUTY_LAB_TEMPLATE_PACKAGE.pages.filter(page=>page.pageType==='home')).toHaveLength(1);
    const metadata=readStorefrontFidelityMetadata(BEAUTY_LAB_REFERENCE_V25_HOME_PAGE);
    expect(metadata).toMatchObject({
      editMode:'normal',
      designGuard:{mode:'warn',presetId:'beauty-lab-reference-v2.5-home',baselineVersion:5},
    });
    expect(metadata?.sectionOrder?.mobile?.slice(0,5)).toEqual([
      'beauty-home-site-header','beauty-formula-hero','beauty-usp-row','beauty-new-formulas','beauty-formula-finder',
    ]);
  });

  it('materializes the Bestseller-led mobile flow without changing desktop source order',()=>{
    const mobile=materializeStorefrontFidelityPage(BEAUTY_LAB_REFERENCE_V25_HOME_PAGE,'mobile');
    const desktop=materializeStorefrontFidelityPage(BEAUTY_LAB_REFERENCE_V25_HOME_PAGE,'desktop');
    expect(mobile.sections.slice(0,5).map(section=>section.id)).toEqual([
      'beauty-home-site-header','beauty-formula-hero','beauty-usp-row','beauty-new-formulas','beauty-formula-finder',
    ]);
    expect(desktop.sections.slice(0,5).map(section=>section.id)).toEqual([
      'beauty-home-site-header','beauty-formula-hero','beauty-usp-row','beauty-formula-finder','beauty-ingredient-index',
    ]);
  });

  it('locks the two-line hero, shorter mobile hero and compact reference rhythm',()=>{
    const title=nodeById(BEAUTY_LAB_REFERENCE_V25_HOME_PAGE,'beauty-hero-title');
    expect(title?.bindings?.text?.fallback).toBe('YOUR SKIN.\nYOUR FORMULA.');
    const hero=nodeById(BEAUTY_LAB_REFERENCE_V25_HOME_PAGE,'beauty-formula-hero');
    expect(resolveStorefrontVisualStyle(hero?.config.style,'mobile')).toMatchObject({height:'24.5rem',minHeight:'24.5rem'});
    for(const id of ['beauty-formula-finder','beauty-ingredient-index','beauty-texture-lab','beauty-new-formulas','beauty-routine-feature']){
      const section=nodeById(BEAUTY_LAB_REFERENCE_V25_HOME_PAGE,id);
      expect(resolveStorefrontVisualStyle(section?.config.style,'desktop').paddingBlock).toBe('1.45rem');
      expect(resolveStorefrontVisualStyle(section?.config.style,'mobile').paddingBlock).toBe('1.05rem');
    }
  });

  it('matches the approved four texture labels and leads featured products with the Bestseller',()=>{
    const texture=nodeById(BEAUTY_LAB_REFERENCE_V25_HOME_PAGE,'beauty-texture-navigation');
    const items=texture?.bindings?.items?.fallback as Array<{label:string}>;
    expect(items.map(item=>item.label)).toEqual(['GÉL','KRÉM','MILK','OLAJ']);
    const featured=nodeById(BEAUTY_LAB_REFERENCE_V25_HOME_PAGE,'newFormulas');
    const products=featured?.bindings?.products?.fallback as Array<{badge?:string}>;
    expect(products[0]?.badge).toBe('BESTSELLER');
  });
});
