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
import {GALLERY_EDIT_WAVE72_ACCEPTANCE} from '@/lib/builder/templates/gallery-edit-wave72-acceptance';
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
import {TABLE_GIFT_WAVE73_ACCEPTANCE} from '@/lib/builder/templates/table-gift-wave73-acceptance';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const find=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));
const bindingSlots=(componentKey:string)=>[
  ...STOREFRONT_GUIDED_FINDER_COMPONENT_DEFINITIONS,
  ...STOREFRONT_MULTI_PRODUCT_COMPOSER_COMPONENT_DEFINITIONS,
  ...STOREFRONT_EDITORIAL_COMPONENT_DEFINITIONS,
].find(definition=>definition.manifest.componentKey===componentKey)?.bindingSlots??[];

describe('Scale-out Wave 73 Table & Gift current-baseline reacceptance',()=>{
  it('proves Table & Gift is the direct canonical successor of Gallery Edit across all authoritative replay chains',()=>{
    expect(TABLE_GIFT_WAVE73_ACCEPTANCE).toMatchObject({
      wave:73,mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'food.table-gift',templateVersion:1,inheritedImplementation:true,
      predecessorAcceptance:GALLERY_EDIT_WAVE72_ACCEPTANCE.mode,historicalAcceptance:TABLE_GIFT_WAVE35_ACCEPTANCE.mode,hardenedAcceptance:TABLE_GIFT_WAVE54_ACCEPTANCE.mode,
    });
    expect(TABLE_GIFT_WAVE73_ACCEPTANCE.sequence).toMatchObject({
      originalScaleOut:{previous:'wave15-pr138-home.gallery-edit',successor:'wave16-pr139-food.table-gift'},
      historicalReacceptance:{previous:'wave34-pr194-home.gallery-edit',successor:'wave35-pr195-food.table-gift'},
      hardenedReplay:{previous:'wave53-pr254-home.gallery-edit',successor:'wave54-pr255-food.table-gift'},
      currentReplay:{previous:'wave72-pr284-home.gallery-edit',successor:'wave73-food.table-gift'},
      releaseCheckpointBetweenOriginal:false,releaseCheckpointBetweenHistorical:false,releaseCheckpointBetweenHardened:false,
    });
    expect(TABLE_GIFT_TEMPLATE_PACKAGE.manifest.templateKey).toBe('food.table-gift');
    expect(TABLE_GIFT_TEMPLATE_MANIFEST.demoContent.namespace).toBe('food-table-gift');
  });

  it('locks original, Wave 35, Wave 54 and Wave 72-parent provenance and proves no current canonical drift',()=>{
    expect(TABLE_GIFT_WAVE73_ACCEPTANCE.provenance).toEqual({
      currentParentWave:72,currentParentHead:'6b83a2e472c029166be839be16c4553dffaedfcf',
      originalImplementationWave:16,originalPullRequest:139,originalImplementationHead:'d0cbdfc64fb94b53f8b1bba8c8246933f9f9d475',originalFinalDocumentationHead:'864b1bac40066b6f0e458644104400ca41d45ba7',originalTemplateBlob:'cd9e71509ce0b424b8a540107877db02512b8bee',
      historicalReacceptanceWave:35,historicalReacceptancePullRequest:195,historicalImplementationHead:'48deaae5dd31b26be395dec1993de1d6f94f0598',historicalFinalAcceptedHead:'f83d1f3bfad426ba1a74346ebf3f525798e5669f',historicalAcceptedTemplateBlob:'0147f740a22db23485adf3649bbe5fa0768ca6c9',
      hardenedCounterpartWave:54,hardenedCounterpartPullRequest:255,hardenedFinalAcceptedHead:'a3f8cda986ebceaf318c9908f66e34fa4f8ffaf2',hardenedAcceptedTemplateBlob:'0147f740a22db23485adf3649bbe5fa0768ca6c9',currentInheritedTemplateBlob:'0147f740a22db23485adf3649bbe5fa0768ca6c9',
      originalBlobDiffersFromHistoricalAccepted:true,wave35EqualsWave54:true,wave54EqualsCurrentParent:true,byteIdenticalToWave54AcceptedTemplate:true,templateModifiedByWave73:false,
    });
  });

  it('preserves the exact historical hardening instead of replaying legacy invalid contracts',()=>{
    expect(TABLE_GIFT_WAVE73_ACCEPTANCE.historicalHardening).toMatchObject({
      forbiddenCheckoutNamespaceRemoved:true,currentBlobContainsHistoricalAcceptedSource:true,noCurrentContractDrift:true,noAutomaticReplayOfHistoricalPatch:true,
      sharedAllowlistWidenedByWave73:false,componentRegistryWidenedByWave73:false,bindingNamespaceWidenedByWave73:false,pageSchemaAllowlistWidenedByWave73:false,
    });
    const checkout=TABLE_GIFT_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    const checkoutPaths=bindingPaths(checkout);
    expect(checkoutPaths).toEqual(expect.arrayContaining(['content.checkoutGiftMessage.title','content.checkoutGiftMessage.copy']));
    expect(checkoutPaths.some(path=>path.startsWith('checkout.'))).toBe(false);
    expect(TABLE_GIFT_BUILDER_HARDENING_CONTRACT.homeAdditionsForbidden).toEqual(['Gift Hero','Gift Story','Reviews']);
  });

  it('keeps the premium gifting identity and exact seven-step Home journey distinct from Gallery Edit and Market Pantry',()=>{
    expect(TABLE_GIFT_VISUAL_DNA.character).toBe('premium-gifting-occasion-table-curated-commerce');
    expect(TABLE_GIFT_VISUAL_DNA.category).toBe('food-gifting');
    expect(TABLE_GIFT_VISUAL_DNA.character).not.toBe(GALLERY_EDIT_VISUAL_DNA.character);
    expect(TABLE_GIFT_VISUAL_DNA.character).not.toBe(MARKET_PANTRY_VISUAL_DNA.character);
    expect(TABLE_GIFT_HOME_PAGE.metadata?.sectionOrder).toEqual(TABLE_GIFT_HOME_SECTION_ORDER);
    expect(TABLE_GIFT_HOME_SECTION_ORDER).toEqual(['Gift Builder','Shop by Occasion','Curated Gift Sets','Build Your Gift','Gift Message','Corporate Gift CTA','Footer']);
    expect(JSON.stringify(TABLE_GIFT_HOME_SECTION_ORDER)).not.toMatch(/Gift Hero|Gift Story|Reviews/);
    expect(TABLE_GIFT_WAVE73_ACCEPTANCE.visualContract.palette).toEqual(['ivory','deep-burgundy','forest-green','champagne','black']);
    expect(TABLE_GIFT_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['market-pantry-copy','rustic-farmhouse','fake-fixed-price-gift-box','virtual-bundle-sku','fake-scarcity','baked-marketing-copy']));
  });

  it('uses only current shared binding namespaces and introduces no Table & Gift-local truth authority',()=>{
    const paths=TABLE_GIFT_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths)expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(path.split('.')[0] as never);
    for(const forbidden of ['gift.','tableGift.','checkout.','payment.','price.','stock.'])expect(paths.some(path=>path.startsWith(forbidden))).toBe(false);
    expect(TABLE_GIFT_WAVE73_ACCEPTANCE.builderContract).toMatchObject({runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false,pageSchemaAllowlistWidened:false});
    expect(TABLE_GIFT_WAVE73_ACCEPTANCE.commerceAuthority).toMatchObject({noTemplateProductAuthority:true,noTemplatePricingAuthority:true,noTemplateInventoryAuthority:true,noTemplateVariantAuthority:true});
  });

  it('keeps Guided Finder and gift composition on complete shared E3/E4 surfaces without creating bundle authority',()=>{
    const finder=find(TABLE_GIFT_HOME_PAGE,'table-gift-finder')!;
    const composer=find(TABLE_GIFT_HOME_PAGE,'table-gift-composer')!;
    expect(finder.componentKey).toBe('guided.finder');
    expect(composer.componentKey).toBe('composer.builder');
    expect(Object.keys(finder.bindings??{}).sort()).toEqual([...bindingSlots('guided.finder')].sort());
    expect(Object.keys(composer.bindings??{}).sort()).toEqual([...bindingSlots('composer.builder')].sort());
    expect(JSON.stringify(finder.bindings)).toContain('finder.currentQuestion.options');
    expect(JSON.stringify(finder.bindings)).toContain('finder.resultStatus');
    expect(JSON.stringify(composer.bindings)).toContain('composer.availableItems');
    expect(JSON.stringify(composer.bindings)).toContain('composer.currentSubtotal');
    expect(TABLE_GIFT_WAVE73_ACCEPTANCE.commerceAuthority).toMatchObject({guidedFinder:'E3-guidance-and-ranking-only',composer:'E4-real-product-composition-intent-only',noTemplateGuidanceAuthority:true,noTemplateComposerAuthority:true,noVirtualBundleSkuAuthority:true,noFixedGiftPriceAuthority:true});
  });

  it('keeps Gift Message and Corporate Gift fully editable while images remain non-authoritative presentation',()=>{
    for(const [id,root] of [['table-gift-message','content.giftMessage'],['table-gift-corporate','content.corporateGift']] as const){
      const target=find(TABLE_GIFT_HOME_PAGE,id)!;
      expect(target.componentKey).toBe('editorial.split-feature');
      expect(Object.keys(target.bindings??{}).sort()).toEqual([...bindingSlots('editorial.split-feature')].sort());
      const source=JSON.stringify(target.bindings);
      for(const slot of ['eyebrow','title','copy','image','imageAlt','ctaLabel','ctaHref'])expect(source).toContain(`${root}.${slot}`);
    }
    expect(TABLE_GIFT_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(TABLE_GIFT_DESIGN_TOKENS['--shoporation-heading-font']).toContain('--merchant-heading-font');
    expect(TABLE_GIFT_WAVE73_ACCEPTANCE.builderContract).toMatchObject({marketingCopyBakedIntoImages:false,authoritativeCommerceTruthBakedIntoImages:false});
    for(const fixture of TABLE_GIFT_TEMPLATE_PACKAGE.demoFixtures??[])expect(JSON.stringify(fixture.payload)).not.toMatch(/fixed price|guaranteed stock|limited time|bundle sku|virtual sku|exclusive price|only [0-9]+ left/i);
  });

  it('validates all 14 Alap presets with current shared registry, unique IDs and Desktop/Tablet/Mobile support',()=>{
    const registry=createStorefrontMultiProductComposerComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:TABLE_GIFT_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(TABLE_GIFT_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(TABLE_GIFT_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(TABLE_GIFT_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    expect(TABLE_GIFT_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    for(const page of TABLE_GIFT_TEMPLATE_PACKAGE.pages){
      const ids=walk(page.sections).map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('preserves actual PDP 7/5 to 12/12 geometry and shared product/pricing/inventory/recommendation authority',()=>{
    const gallery=find(TABLE_GIFT_PRODUCT_PAGE,'table-gift-product-gallery');
    const buybox=find(TABLE_GIFT_PRODUCT_PAGE,'table-gift-product-buybox');
    expect(gallery?.componentKey).toBe('commerce.product-gallery');
    expect(gallery?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(buybox?.componentKey).toBe('layout.stack');
    expect(buybox?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    const source=JSON.stringify(TABLE_GIFT_PRODUCT_PAGE);
    for(const path of ['product.gallery','product.name','pricing.displayPrice','pricing.compareAtPrice','inventory.stockLabel','commerce.purchaseHref','finder.productEvidence','recommendations.products'])expect(source).toContain(path);
    expect(TABLE_GIFT_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E3','E4','E13']);
    expect(TABLE_GIFT_ENGINE_CONTRACT.requiredForFullExperience).not.toContain('E10');
  });

  it('keeps installation draft-only, demo namespaced and authoritative commerce/customer/B2B state immutable',()=>{
    const registry=createStorefrontMultiProductComposerComponentRegistry();
    const plan=planStorefrontTemplateInstallation({template:TABLE_GIFT_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='food-table-gift')).toBe(true);
    expect(TABLE_GIFT_WAVE73_ACCEPTANCE.installationContract).toMatchObject({draftOnly:true,demoNamespace:'food-table-gift',inheritedDemoFixturesAreNonAuthoritative:true});
  });

  it('keeps E13 provider-neutral and production/data/payment/Wave 74 mutations outside Wave 73',()=>{
    const checkout=TABLE_GIFT_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(TABLE_GIFT_WAVE73_ACCEPTANCE.commerceAuthority).toMatchObject({checkout:'E13-shared-provider-neutral-checkout-and-final-revalidation',giftMessage:'presentation-only-no-persistence-authority',corporateGift:'contact-presentation-only-no-b2b-pricing-approval-or-quote-authority'});
    expect(TABLE_GIFT_WAVE73_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening','page-schema-allowlist-widening',
      'sql-migration','customer-baseline-change','supabase-mutation','storefront-revision-reconciliation','kh-vpos-change','production-deploy','main-merge','wave74-implementation',
    ]));
  });
});
