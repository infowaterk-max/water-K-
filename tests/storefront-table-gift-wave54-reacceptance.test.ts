import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_EDITORIAL_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-editorial';
import {STOREFRONT_GUIDED_FINDER_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-guided-finder';
import {
  createStorefrontMultiProductComposerComponentRegistry,
  STOREFRONT_MULTI_PRODUCT_COMPOSER_COMPONENT_DEFINITIONS,
} from '@/lib/builder/storefront-multi-product-composer';
import {
  STOREFRONT_BINDING_NAMESPACES,
  validateStorefrontPageDocument,
  type StorefrontComponentNode,
  type StorefrontPageDocument,
} from '@/lib/builder/storefront-runtime';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
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
import {TABLE_GIFT_WAVE54_ACCEPTANCE} from '@/lib/builder/templates/table-gift-wave54-acceptance';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const home=(id:string)=>walk(TABLE_GIFT_HOME_PAGE.sections).find(node=>node.id===id);
const product=(id:string)=>walk(TABLE_GIFT_PRODUCT_PAGE.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));
const bindingSlots=(componentKey:string)=>[
  ...STOREFRONT_GUIDED_FINDER_COMPONENT_DEFINITIONS,
  ...STOREFRONT_MULTI_PRODUCT_COMPOSER_COMPONENT_DEFINITIONS,
  ...STOREFRONT_EDITORIAL_COMPONENT_DEFINITIONS,
].find(definition=>definition.manifest.componentKey===componentKey)?.bindingSlots??[];

describe('Scale-out Wave 54 Table & Gift current-baseline reacceptance',()=>{
  it('reconstructs historical Wave 35 / PR #195 and original Wave 16 / PR #139 as the direct Gallery Edit successors',()=>{
    expect(TABLE_GIFT_WAVE54_ACCEPTANCE).toMatchObject({
      wave:54,historicalCounterpartWave:35,historicalPullRequest:195,originalTemplateWave:16,originalTemplatePullRequest:139,
      historicalAcceptance:TABLE_GIFT_WAVE35_ACCEPTANCE.mode,mode:'current-baseline-reacceptance-and-builder-hardening',
      templateKey:'food.table-gift',templateVersion:1,inheritedImplementation:true,
    });
    expect(TABLE_GIFT_WAVE54_ACCEPTANCE.sequence).toEqual({
      previous:'wave53-home.gallery-edit',current:'food.table-gift',historicalNext:'wave36-tech.creator-station',
      originalPrevious:'wave15-home.gallery-edit',originalCurrent:'wave16-food.table-gift',originalNext:'wave17-tech.creator-station',
      relationship:'historical-wave35-successor-replayed-on-current-stacked-baseline',releaseCheckpointBeforeCurrent:false,
    });
    expect(TABLE_GIFT_TEMPLATE_PACKAGE.manifest.templateKey).toBe('food.table-gift');
    expect(TABLE_GIFT_TEMPLATE_MANIFEST.demoContent.namespace).toBe('food-table-gift');
  });

  it('keeps the premium gifting identity materially distinct from Gallery Edit and Market Pantry',()=>{
    expect(TABLE_GIFT_VISUAL_DNA.character).toBe('premium-gifting-occasion-table-curated-commerce');
    expect(TABLE_GIFT_VISUAL_DNA.category).toBe('food-gifting');
    expect(TABLE_GIFT_VISUAL_DNA.palette).toEqual({background:'ivory',primary:'deep-burgundy',secondary:'forest-green',accent:'champagne',text:'black'});
    expect(TABLE_GIFT_VISUAL_DNA.character).not.toBe(GALLERY_EDIT_VISUAL_DNA.character);
    expect(TABLE_GIFT_VISUAL_DNA.character).not.toBe(MARKET_PANTRY_VISUAL_DNA.character);
    expect(TABLE_GIFT_WAVE54_ACCEPTANCE.distinctness.separationIncludes).toEqual(expect.arrayContaining(['layout','section-order','journey','palette','typography','imagery','occasion-navigation','gift-composition']));
    expect(TABLE_GIFT_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['market-pantry-copy','rustic-farmhouse','fake-fixed-price-gift-box','virtual-bundle-sku','fake-scarcity','baked-marketing-copy']));
  });

  it('preserves the exact accepted seven-step Home flow and rejected-section exclusions',()=>{
    expect(TABLE_GIFT_HOME_PAGE.metadata?.sectionOrder).toEqual(TABLE_GIFT_HOME_SECTION_ORDER);
    expect(TABLE_GIFT_HOME_SECTION_ORDER).toEqual(['Gift Builder','Shop by Occasion','Curated Gift Sets','Build Your Gift','Gift Message','Corporate Gift CTA','Footer']);
    expect(TABLE_GIFT_BUILDER_HARDENING_CONTRACT.homeAdditionsForbidden).toEqual(['Gift Hero','Gift Story','Reviews']);
    expect(JSON.stringify(TABLE_GIFT_HOME_PAGE.metadata?.sectionOrder)).not.toMatch(/Gift Hero|Gift Story|Reviews/);
  });

  it('uses only current shared binding namespaces and widens no runtime, registry or namespace contract',()=>{
    const paths=TABLE_GIFT_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    for(const forbidden of ['gift.','tableGift.','checkout.','payment.','price.','stock.'])expect(paths.some(path=>path.startsWith(forbidden))).toBe(false);
    expect(TABLE_GIFT_WAVE54_ACCEPTANCE.builderContract).toMatchObject({runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false});
  });

  it('keeps Guided Finder and multi-product composition on the complete shared E3/E4 binding surfaces',()=>{
    const finder=home('table-gift-finder')!;
    const composer=home('table-gift-composer')!;
    expect(finder.componentKey).toBe('guided.finder');
    expect(composer.componentKey).toBe('composer.builder');
    expect(Object.keys(finder.bindings??{}).sort()).toEqual([...bindingSlots('guided.finder')].sort());
    expect(Object.keys(composer.bindings??{}).sort()).toEqual([...bindingSlots('composer.builder')].sort());
    const finderSource=JSON.stringify(finder.bindings);
    for(const path of ['content.giftBuilder.eyebrow','finder.currentQuestion.options','finder.progressLabel','finder.resultHref','finder.resultStatus'])expect(finderSource).toContain(path);
    const composerSource=JSON.stringify(composer.bindings);
    for(const path of ['content.buildYourGift.eyebrow','composer.slots','composer.availableItems','composer.currentSubtotal','composer.currency','composer.actionHref'])expect(composerSource).toContain(path);
    expect(TABLE_GIFT_WAVE54_ACCEPTANCE.commerceAuthority).toMatchObject({guidedFinder:'E3-guidance-and-ranking-only',composer:'E4-real-product-composition-intent-only',noTemplateGuidanceAuthority:true,noTemplateComposerAuthority:true});
  });

  it('keeps Gift Message and Corporate Gift merchant-editable presentation without persistence or B2B authority',()=>{
    for(const [id,root] of [['table-gift-message','content.giftMessage'],['table-gift-corporate','content.corporateGift']] as const){
      const target=home(id)!;
      expect(target.componentKey).toBe('editorial.split-feature');
      expect(Object.keys(target.bindings??{}).sort()).toEqual([...bindingSlots('editorial.split-feature')].sort());
      const source=JSON.stringify(target.bindings);
      for(const slot of ['eyebrow','title','copy','image','imageAlt','ctaLabel','ctaHref'])expect(source).toContain(`${root}.${slot}`);
    }
    expect(TABLE_GIFT_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(TABLE_GIFT_DESIGN_TOKENS['--shoporation-heading-font']).toContain('--merchant-heading-font');
    expect(TABLE_GIFT_WAVE54_ACCEPTANCE.commerceAuthority).toMatchObject({giftMessage:'presentation-only-no-persistence-authority',corporateGift:'contact-presentation-only-no-b2b-pricing-or-approval-authority'});
  });

  it('keeps stable unique node identity and all 14 Alap-compatible Desktop/Tablet/Mobile Page Schema presets',()=>{
    const registry=createStorefrontMultiProductComposerComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:TABLE_GIFT_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(TABLE_GIFT_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(TABLE_GIFT_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(TABLE_GIFT_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    for(const page of TABLE_GIFT_TEMPLATE_PACKAGE.pages){
      const ids=walk(page.sections).map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('preserves shared product, pricing, inventory, variant, recommendation and provider-neutral E13 authority',()=>{
    expect(TABLE_GIFT_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E3','E4','E13']);
    expect(TABLE_GIFT_ENGINE_CONTRACT.requiredForFullExperience).not.toContain('E10');
    expect(product('table-gift-product-gallery')?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(product('table-gift-product-buybox')?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    const source=JSON.stringify(TABLE_GIFT_PRODUCT_PAGE);
    for(const path of ['product.gallery','product.name','pricing.displayPrice','pricing.compareAtPrice','inventory.stockLabel','commerce.purchaseHref','finder.productEvidence','recommendations.products'])expect(source).toContain(path);
    expect(TABLE_GIFT_WAVE54_ACCEPTANCE.commerceAuthority).toMatchObject({productEligibility:'E2-shared-discovery-only',pricing:'shared-commerce-binding-only',inventory:'shared-commerce-binding-only',variants:'shared-variant-binding-only',checkout:'shared-provider-neutral-E13',noTemplateVariantAuthority:true});
  });

  it('keeps template installation draft-only and unable to mutate commerce, customer, order or B2B authority',()=>{
    const registry=createStorefrontMultiProductComposerComponentRegistry();
    const plan=planStorefrontTemplateInstallation({template:TABLE_GIFT_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='food-table-gift')).toBe(true);
    expect(JSON.stringify(TABLE_GIFT_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/fixed price|guaranteed stock|limited time|bundle sku|virtual sku|exclusive price|only [0-9]+ left/i);
    expect(TABLE_GIFT_WAVE54_ACCEPTANCE.installationContract).toMatchObject({draftOnly:true,demoNamespace:'food-table-gift'});
  });

  it('keeps checkout provider-neutral and all release/data mutations plus Wave 55 outside Wave 54',()=>{
    const checkout=TABLE_GIFT_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(TABLE_GIFT_WAVE54_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening','visual-builder-roadmap-expansion',
      'payment-provider-change','sql-migration','vercel-production-deploy','supabase-mutation','tenant-status-change','tenant-plan-change','main-merge','wave55-implementation',
    ]));
  });
});
