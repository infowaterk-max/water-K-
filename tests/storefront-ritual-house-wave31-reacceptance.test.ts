import {describe,expect,it} from 'vitest';
import {BEAUTY_LAB_HOME_SECTION_ORDER,BEAUTY_LAB_VISUAL_DNA} from '@/lib/builder/templates/beauty-lab';
import {DERMA_STUDIO_HOME_SECTION_ORDER,DERMA_STUDIO_VISUAL_DNA} from '@/lib/builder/templates/derma-studio';
import {RITUAL_HOUSE_HOME_PAGE,RITUAL_HOUSE_HOME_SECTION_ORDER,RITUAL_HOUSE_MARKETING_LAYER_CONTRACT,RITUAL_HOUSE_TEMPLATE_MANIFEST,RITUAL_HOUSE_TEMPLATE_PACKAGE,RITUAL_HOUSE_VISUAL_DNA} from '@/lib/builder/templates/ritual-house';
import {RITUAL_HOUSE_WAVE31_ACCEPTANCE} from '@/lib/builder/templates/ritual-house-wave31-acceptance';
import {STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES,createStorefrontStoryVisualComponentRegistry} from '@/lib/builder/storefront-story-visual';
import {PLANS} from '@/lib/plans/catalog';
import {planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const allNodes=(nodes:readonly any[]):any[]=>nodes.flatMap(node=>[node,...allNodes(node.children??[])]);

describe('Wave 31 Ritual House current-baseline re-acceptance',()=>{
  it('re-accepts the inherited canonical v1 instead of defining a second template',()=>{
    expect(RITUAL_HOUSE_WAVE31_ACCEPTANCE.wave).toBe(31);
    expect(RITUAL_HOUSE_WAVE31_ACCEPTANCE.inheritedImplementation).toBe(true);
    expect(RITUAL_HOUSE_WAVE31_ACCEPTANCE.templateKey).toBe('beauty.ritual-house');
    expect(RITUAL_HOUSE_WAVE31_ACCEPTANCE.templateVersion).toBe(1);
    expect(RITUAL_HOUSE_TEMPLATE_PACKAGE.manifest.templateKey).toBe(RITUAL_HOUSE_WAVE31_ACCEPTANCE.templateKey);
  });

  it('protects Beauty family distinctness beyond palette changes',()=>{
    expect(RITUAL_HOUSE_VISUAL_DNA.journey).toBe('mood-to-ritual-to-format-to-scent-or-ingredient-to-product');
    expect(RITUAL_HOUSE_VISUAL_DNA.journey).not.toBe(BEAUTY_LAB_VISUAL_DNA.journey);
    expect(RITUAL_HOUSE_VISUAL_DNA.journey).not.toBe(DERMA_STUDIO_VISUAL_DNA.journey);
    expect(RITUAL_HOUSE_HOME_SECTION_ORDER).not.toEqual(BEAUTY_LAB_HOME_SECTION_ORDER);
    expect(RITUAL_HOUSE_HOME_SECTION_ORDER).not.toEqual(DERMA_STUDIO_HOME_SECTION_ORDER);
    expect(RITUAL_HOUSE_VISUAL_DNA.typography).not.toEqual(DERMA_STUDIO_VISUAL_DNA.typography);
    expect(RITUAL_HOUSE_VISUAL_DNA.imagery).not.toBe(BEAUTY_LAB_VISUAL_DNA.imagery);
    expect(RITUAL_HOUSE_WAVE31_ACCEPTANCE.distinctness.separationIncludes).toEqual(expect.arrayContaining(['layout','section-order','rhythm','typography','imagery','card-treatment','merchandising-journey']));
  });

  it('uses shared Story + Visual composition with independently editable hero layers',()=>{
    expect(STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES.authority).toBe('composition-only-no-new-commerce-content-or-guidance-authority');
    expect(RITUAL_HOUSE_MARKETING_LAYER_CONTRACT.composition).toBe('shared-visual-layers-plus-story-no-template-local-engine');
    expect(RITUAL_HOUSE_MARKETING_LAYER_CONTRACT.hero).toEqual(['image','overlay','decoration','eyebrow','heading','copy','primary-cta','secondary-cta']);
    const nodes=allNodes(RITUAL_HOUSE_HOME_PAGE.sections);
    expect(nodes.filter(node=>node.componentKey==='visual.layer')).toHaveLength(8);
    const bindings=JSON.stringify(nodes.filter(node=>String(node.id).startsWith('ritual-hero-')).map(node=>node.bindings??{}));
    for(const path of ['content.atmosphereHero.image','content.atmosphereHero.decoration','content.atmosphereHero.eyebrow','content.atmosphereHero.title','content.atmosphereHero.copy','content.atmosphereHero.primaryLabel','content.atmosphereHero.primaryHref','content.atmosphereHero.secondaryLabel','content.atmosphereHero.secondaryHref'])expect(bindings).toContain(path);
  });

  it('retains Page Schema, 14 presets, Alap compatibility, responsive manifest and namespaced demo lifecycle',()=>{
    expect(RITUAL_HOUSE_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(RITUAL_HOUSE_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(RITUAL_HOUSE_TEMPLATE_MANIFEST.demoContent.namespace).toBe('beauty-ritual-house');
    expect(RITUAL_HOUSE_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    const registry=createStorefrontStoryVisualComponentRegistry();
    for(const page of RITUAL_HOUSE_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
    const plan=planStorefrontTemplateInstallation({template:RITUAL_HOUSE_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='beauty-ritual-house')).toBe(true);
  });

  it('keeps mood and ritual guidance outside medical or psychological authority',()=>{
    expect(RITUAL_HOUSE_WAVE31_ACCEPTANCE.guidanceAuthority.mode).toBe('editorial-merchandising-navigation-only');
    expect(RITUAL_HOUSE_WAVE31_ACCEPTANCE.guidanceAuthority.diagnosis).toBe(false);
    expect(RITUAL_HOUSE_WAVE31_ACCEPTANCE.guidanceAuthority.psychologicalAssessment).toBe(false);
    expect(RITUAL_HOUSE_WAVE31_ACCEPTANCE.guidanceAuthority.healthOutcomeScoring).toBe(false);
    expect(RITUAL_HOUSE_WAVE31_ACCEPTANCE.guidanceAuthority.sleepStressAnxietyOutcomeAuthority).toBe(false);
    expect(RITUAL_HOUSE_WAVE31_ACCEPTANCE.guidanceAuthority.productEligibilityAuthority).toBe('E2-shared-discovery-only');
  });

  it('keeps price, stock, variants, ratings and product facts outside template authority',()=>{
    expect(RITUAL_HOUSE_WAVE31_ACCEPTANCE.commerceAuthority).toMatchObject({pricing:'pricing-binding-only',inventory:'inventory-binding-only',variants:'variant-binding-only',reviews:'review-binding-only',checkout:'shared-provider-neutral-E13',noFakeIngredientConcentration:true,noFakeScentOrMaterialFact:true,noFakeWellnessClaim:true,noFakePriceStockRatingOrProductAttribute:true});
    const nodes=allNodes(RITUAL_HOUSE_TEMPLATE_PACKAGE.pages.flatMap(page=>page.sections));
    const review=nodes.find(node=>node.id==='ritual-review-summary');
    expect(review.bindings.rating.fallback).toBeNull();
    expect(review.bindings.count.fallback).toBeNull();
    const productInfo=nodes.find(node=>node.id==='ritual-product-info');
    expect(productInfo.bindings.price.fallback).toBe('');
    expect(productInfo.bindings.stockLabel.fallback).toBe('');
    const keySpecs=nodes.find(node=>node.id==='ritual-product-key-specs');
    expect(keySpecs.bindings.items.fallback).toEqual([]);
    const specs=nodes.find(node=>node.id==='ritual-product-spec-groups');
    expect(specs.bindings.groups.fallback).toEqual([]);
  });

  it('keeps checkout provider-neutral and all release-side effects out of scope',()=>{
    const checkout=RITUAL_HOUSE_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId/i);
    expect(RITUAL_HOUSE_WAVE31_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['payment-provider-change','sql-migration','vercel-production-deploy','supabase-mutation','main-merge']));
  });
});
