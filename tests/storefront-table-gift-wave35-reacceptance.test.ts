import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_EDITORIAL_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-editorial';
import {STOREFRONT_GUIDED_FINDER_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-guided-finder';
import {createStorefrontMultiProductComposerComponentRegistry,STOREFRONT_MULTI_PRODUCT_COMPOSER_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-multi-product-composer';
import {GALLERY_EDIT_VISUAL_DNA} from '@/lib/builder/templates/gallery-edit';
import {MARKET_PANTRY_VISUAL_DNA} from '@/lib/builder/templates/market-pantry';
import {
  TABLE_GIFT_BUILDER_HARDENING_CONTRACT,
  TABLE_GIFT_DESIGN_TOKENS,
  TABLE_GIFT_ENGINE_CONTRACT,
  TABLE_GIFT_HOME_PAGE,
  TABLE_GIFT_HOME_SECTION_ORDER,
  TABLE_GIFT_PRODUCT_PAGE,
  TABLE_GIFT_TEMPLATE_MANIFEST,
  TABLE_GIFT_TEMPLATE_PACKAGE,
  TABLE_GIFT_VISUAL_DNA,
} from '@/lib/builder/templates/table-gift';
import {TABLE_GIFT_WAVE35_ACCEPTANCE} from '@/lib/builder/templates/table-gift-wave35-acceptance';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument,type StorefrontComponentNode} from '@/lib/builder/storefront-runtime';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const homeNodes=walk(TABLE_GIFT_HOME_PAGE.sections);
const home=(id:string)=>homeNodes.find(node=>node.id===id);
const productNodes=walk(TABLE_GIFT_PRODUCT_PAGE.sections);
const product=(id:string)=>productNodes.find(node=>node.id===id);
const bindingSlots=(componentKey:string)=>[
  ...STOREFRONT_GUIDED_FINDER_COMPONENT_DEFINITIONS,
  ...STOREFRONT_MULTI_PRODUCT_COMPOSER_COMPONENT_DEFINITIONS,
  ...STOREFRONT_EDITORIAL_COMPONENT_DEFINITIONS,
].find(definition=>definition.manifest.componentKey===componentKey)?.bindingSlots??[];

describe('Scale-out Wave 35 Table & Gift current-baseline reacceptance',()=>{
  it('re-accepts the inherited canonical Table & Gift v1 with the exact shared engine contract',()=>{
    expect(TABLE_GIFT_WAVE35_ACCEPTANCE).toMatchObject({wave:35,mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'food.table-gift',templateVersion:1,inheritedImplementation:true});
    expect(TABLE_GIFT_TEMPLATE_PACKAGE.manifest.templateKey).toBe('food.table-gift');
    expect(TABLE_GIFT_TEMPLATE_MANIFEST.demoContent.namespace).toBe('food-table-gift');
    expect(TABLE_GIFT_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E3','E4','E13']);
    expect(TABLE_GIFT_ENGINE_CONTRACT.requiredForFullExperience).not.toContain('E10');
    expect(TABLE_GIFT_WAVE35_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['second-table-gift-template','E10-required-dependency']));
  });

  it('locks the premium gifting visual identity apart from Gallery Edit and Market Pantry',()=>{
    expect(TABLE_GIFT_VISUAL_DNA.character).toBe('premium-gifting-occasion-table-curated-commerce');
    expect(TABLE_GIFT_VISUAL_DNA.category).toBe('food-gifting');
    expect(TABLE_GIFT_VISUAL_DNA.palette).toEqual({background:'ivory',primary:'deep-burgundy',secondary:'forest-green',accent:'champagne',text:'black'});
    expect(TABLE_GIFT_VISUAL_DNA.character).not.toBe(GALLERY_EDIT_VISUAL_DNA.character);
    expect(TABLE_GIFT_VISUAL_DNA.character).not.toBe(MARKET_PANTRY_VISUAL_DNA.character);
    expect(TABLE_GIFT_WAVE35_ACCEPTANCE.distinctness.ownPosition).toContain('occasion-recipient-gifting-first');
    expect(TABLE_GIFT_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['market-pantry-copy','fake-fixed-price-gift-box','virtual-bundle-sku','fake-scarcity','baked-marketing-copy']));
  });

  it('preserves the exact seven-step Home flow and forbids previously rejected extra sections',()=>{
    expect(TABLE_GIFT_HOME_PAGE.metadata?.sectionOrder).toEqual(TABLE_GIFT_HOME_SECTION_ORDER);
    expect(TABLE_GIFT_HOME_SECTION_ORDER).toEqual(['Gift Builder','Shop by Occasion','Curated Gift Sets','Build Your Gift','Gift Message','Corporate Gift CTA','Footer']);
    expect(TABLE_GIFT_BUILDER_HARDENING_CONTRACT.homeAdditionsForbidden).toEqual(['Gift Hero','Gift Story','Reviews']);
    const serialized=JSON.stringify(TABLE_GIFT_HOME_PAGE.metadata?.sectionOrder);
    expect(serialized).not.toMatch(/Gift Hero|Gift Story|Reviews/);
  });

  it('binds every supported Guided Finder slot without moving guidance authority into the template',()=>{
    const finder=home('table-gift-finder')!;
    expect(finder.componentKey).toBe('guided.finder');
    expect(Object.keys(finder.bindings??{}).sort()).toEqual([...bindingSlots('guided.finder')].sort());
    const source=JSON.stringify(finder.bindings);
    for(const path of ['content.giftBuilder.eyebrow','content.giftBuilder.title','content.giftBuilder.copy','finder.currentStep.title','finder.currentStep.copy','finder.currentQuestion.label','finder.currentQuestion.options','finder.progressLabel','content.giftBuilder.actionLabel','finder.resultHref','finder.resultStatus'])expect(source).toContain(path);
    expect(TABLE_GIFT_WAVE35_ACCEPTANCE.commerceAuthority.guidedFinder).toBe('E3-guidance-and-ranking-only');
  });

  it('binds every supported E4 composer slot while keeping composition intent non-authoritative',()=>{
    const composer=home('table-gift-composer')!;
    expect(composer.componentKey).toBe('composer.builder');
    expect(Object.keys(composer.bindings??{}).sort()).toEqual([...bindingSlots('composer.builder')].sort());
    const source=JSON.stringify(composer.bindings);
    for(const path of ['content.buildYourGift.eyebrow','content.buildYourGift.title','content.buildYourGift.copy','composer.modeLabel','composer.progressLabel','composer.slots','composer.availableItems','content.buildYourGift.summaryLabel','composer.currentSubtotal','composer.currency','content.buildYourGift.actionLabel','composer.actionHref','content.buildYourGift.revalidationLabel'])expect(source).toContain(path);
    expect(TABLE_GIFT_WAVE35_ACCEPTANCE.commerceAuthority.composer).toBe('E4-real-product-composition-intent-only');
    expect(TABLE_GIFT_WAVE35_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['virtual-bundle-sku-authority','fixed-gift-price-authority']));
  });

  it('fully binds shared Gift Message and Corporate Gift presentation slots without persistence or B2B authority',()=>{
    for(const [id,root] of [['table-gift-message','content.giftMessage'],['table-gift-corporate','content.corporateGift']] as const){
      const target=home(id)!;
      expect(target.componentKey).toBe('editorial.split-feature');
      expect(Object.keys(target.bindings??{}).sort()).toEqual([...bindingSlots('editorial.split-feature')].sort());
      const source=JSON.stringify(target.bindings);
      for(const slot of ['eyebrow','title','copy','image','imageAlt','ctaLabel','ctaHref'])expect(source).toContain(`${root}.${slot}`);
    }
    expect(TABLE_GIFT_WAVE35_ACCEPTANCE.commerceAuthority).toMatchObject({giftMessage:'presentation-only-no-persistence-authority',corporateGift:'contact-presentation-only-no-b2b-pricing-or-approval-authority'});
  });

  it('keeps unique node identity, merchant-adjustable tokens, all 14 Alap presets and Desktop/Tablet/Mobile support',()=>{
    const registry=createStorefrontMultiProductComposerComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:TABLE_GIFT_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(TABLE_GIFT_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(TABLE_GIFT_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(TABLE_GIFT_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found']);
    for(const page of TABLE_GIFT_TEMPLATE_PACKAGE.pages){
      const ids=walk(page.sections).map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
    expect(TABLE_GIFT_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(TABLE_GIFT_DESIGN_TOKENS['--shoporation-heading-font']).toContain('--merchant-heading-font');
  });

  it('preserves PDP authority bindings, explainable E3 evidence and the 7/5 to 12/12 responsive contract',()=>{
    expect(product('table-gift-product-gallery')?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(product('table-gift-product-buybox')?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    const source=JSON.stringify(TABLE_GIFT_PRODUCT_PAGE);
    for(const path of ['product.gallery','product.name','pricing.displayPrice','pricing.compareAtPrice','inventory.stockLabel','commerce.purchaseHref','finder.productEvidence','recommendations.products'])expect(source).toContain(path);
    expect(JSON.stringify(product('table-gift-product-explanation')?.bindings??{})).toContain('content.productGiftFit.title');
    expect(JSON.stringify(product('table-gift-product-recommendations-block')?.bindings??{})).toContain('content.productRecommendations.title');
  });

  it('keeps installation draft-only and demo fixtures free from fake bundle, price, stock or scarcity authority',()=>{
    const registry=createStorefrontMultiProductComposerComponentRegistry();
    const plan=planStorefrontTemplateInstallation({template:TABLE_GIFT_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='food-table-gift')).toBe(true);
    expect(JSON.stringify(TABLE_GIFT_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/fixed price|guaranteed stock|limited time|bundle sku|virtual sku|exclusive price|only [0-9]+ left/i);
  });

  it('keeps E13 provider-neutral, gift-message persistence external and release-side effects outside Wave 35',()=>{
    const checkout=TABLE_GIFT_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(TABLE_GIFT_WAVE35_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['gift-message-persistence-authority','corporate-pricing-or-b2b-authority','payment-provider-change','sql-migration','vercel-production-deploy','supabase-mutation','main-merge','visual-builder-drag-drop-ui']));
  });
});
