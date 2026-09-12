import {describe,expect,it} from 'vitest';
import {
  BEAUTY_LAB_HOME_PAGE,
  BEAUTY_LAB_PRESET_BUNDLE,
  BEAUTY_LAB_PRODUCT_PAGE,
  BEAUTY_LAB_TEMPLATE_PACKAGE,
} from '@/lib/builder/templates/beauty-lab';
import {
  materializeStorefrontComponentPreset,
  materializeStorefrontPagePreset,
  materializeStorefrontSectionPreset,
  materializeStorefrontTemplatePreset,
} from '@/lib/builder/storefront-presets';

const pagePreset=(pageKey:string)=>BEAUTY_LAB_PRESET_BUNDLE.pagePresets.find(item=>item.pageKey===pageKey)!;
const sectionPreset=(pageKey:string,nodeId:string)=>BEAUTY_LAB_PRESET_BUNDLE.sectionPresets.find(item=>item.pageKey===pageKey&&item.nodeId===nodeId)!;
const componentPreset=(pageKey:string,nodeId:string)=>BEAUTY_LAB_PRESET_BUNDLE.componentPresets.find(item=>item.pageKey===pageKey&&item.nodeId===nodeId)!;

describe('Beauty Lab canonical preset chain',()=>{
  it('materializes the template preset from the canonical package without a second page authority',()=>{
    expect(BEAUTY_LAB_PRESET_BUNDLE.templateKey).toBe('beauty.beauty-lab');
    expect(BEAUTY_LAB_PRESET_BUNDLE.pagePresets).toHaveLength(14);
    expect(materializeStorefrontTemplatePreset(BEAUTY_LAB_TEMPLATE_PACKAGE,BEAUTY_LAB_PRESET_BUNDLE)).toEqual(BEAUTY_LAB_TEMPLATE_PACKAGE.pages);
  });

  it('materializes canonical Home and PDP page presets',()=>{
    expect(materializeStorefrontPagePreset(BEAUTY_LAB_TEMPLATE_PACKAGE,pagePreset('beauty-lab.home'))).toEqual(BEAUTY_LAB_HOME_PAGE);
    expect(materializeStorefrontPagePreset(BEAUTY_LAB_TEMPLATE_PACKAGE,pagePreset('beauty-lab.product'))).toEqual(BEAUTY_LAB_PRODUCT_PAGE);
  });

  it('materializes the required canonical section presets',()=>{
    for(const id of ['beauty-formula-hero','beauty-formula-finder','beauty-ingredient-index','beauty-texture-lab','beauty-new-formulas','beauty-routine-feature','beauty-product-grid']){
      const preset=sectionPreset('beauty-lab.home',id);
      expect(preset).toBeDefined();
      const actual=materializeStorefrontSectionPreset(BEAUTY_LAB_TEMPLATE_PACKAGE,preset);
      expect(actual.id).toBe(id);
    }
    const pdp=sectionPreset('beauty-lab.product','beauty-product-main');
    expect(materializeStorefrontSectionPreset(BEAUTY_LAB_TEMPLATE_PACKAGE,pdp)).toEqual(BEAUTY_LAB_PRODUCT_PAGE.sections.find(section=>section.id==='beauty-product-main'));
  });

  it('materializes required component presets with the canonical presentations intact',()=>{
    const expected:[string,string,string][]=[
      ['beauty-lab.home','beauty-formula-hero','reference-driven'],
      ['beauty-lab.home','formula-finder','editorial-choice-grid'],
      ['beauty-lab.home','beauty-ingredient-index-block','media-index'],
      ['beauty-lab.home','beauty-texture-navigation','media-navigation'],
      ['beauty-lab.home','newFormulas','beauty-lab'],
      ['beauty-lab.product','beauty-product-gallery','editorial-thumbnails'],
      ['beauty-lab.product','beauty-product-buybox','sticky-buybox'],
      ['beauty-lab.product','beauty-product-content-tabs','editorial-tabs'],
    ];
    for(const [pageKey,nodeId,presentation] of expected){
      const preset=componentPreset(pageKey,nodeId);
      expect(preset).toBeDefined();
      expect(materializeStorefrontComponentPreset(BEAUTY_LAB_TEMPLATE_PACKAGE,preset).config.presentation).toBe(presentation);
    }
  });
});
