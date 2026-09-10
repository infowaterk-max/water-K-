import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_BINDING_NAMESPACES,validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {createStorefrontConfiguratorComponentRegistry} from '@/lib/builder/storefront-configurator';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {
  PLAYROOM_DESIGN_TOKENS,
  PLAYROOM_DISCOVERY_PATH,
  PLAYROOM_ENGINE_CONTRACT,
  PLAYROOM_HOME_PAGE,
  PLAYROOM_HOME_SECTION_ORDER,
  PLAYROOM_PRODUCT_PAGE,
  PLAYROOM_TEMPLATE_MANIFEST,
  PLAYROOM_TEMPLATE_PACKAGE,
  PLAYROOM_VISUAL_DNA,
} from '@/lib/builder/templates/playroom';
import {PLAYROOM_WAVE38_ACCEPTANCE} from '@/lib/builder/templates/playroom-wave38-acceptance';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));
const home=(id:string)=>nodeById(PLAYROOM_HOME_PAGE,id);
const product=(id:string)=>nodeById(PLAYROOM_PRODUCT_PAGE,id);

describe('Scale-out Wave 38 Playroom current-baseline reacceptance',()=>{
  it('re-accepts original Wave 19 Playroom directly after Spec Lab with its canonical identity',()=>{
    expect(PLAYROOM_WAVE38_ACCEPTANCE).toMatchObject({
      wave:38,
      historicalWave:19,
      mode:'current-baseline-reacceptance-and-builder-hardening',
      templateKey:'gaming.playroom',
      templateVersion:1,
      inheritedImplementation:true,
    });
    expect(PLAYROOM_WAVE38_ACCEPTANCE.historicalSequence).toEqual({
      previous:'tech.spec-lab',
      current:'gaming.playroom',
      relationship:'original-wave19-directly-on-spec-lab',
    });
    expect(PLAYROOM_TEMPLATE_MANIFEST.templateKey).toBe('gaming.playroom');
    expect(PLAYROOM_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(PLAYROOM_TEMPLATE_MANIFEST.demoContent.namespace).toBe('gaming-playroom');
  });

  it('locks broad console discovery DNA, the historical discovery path and exact Home composition',()=>{
    expect(PLAYROOM_VISUAL_DNA).toMatchObject({
      character:'playful-console-discovery-graphic-premium-social-gaming',
      category:'gaming-geek',
      position:'broad-gaming-console-discovery-store',
    });
    expect(PLAYROOM_DISCOVERY_PATH).toEqual(['Válassz platformot','Nézd meg az újdonságokat','Találd meg a játékot','Játssz együtt','Egészítsd ki']);
    expect(PLAYROOM_HOME_PAGE.metadata?.sectionOrder).toEqual(PLAYROOM_HOME_SECTION_ORDER);
    expect(PLAYROOM_HOME_SECTION_ORDER).toEqual(['Playroom Hero','Shop by Platform','New & Noteworthy','Game Finder','Play Together','Genre Rooms','Accessories by Platform','Platform Match','Editor’s Picks','Guides & Reviews','Footer']);
    expect(JSON.stringify(PLAYROOM_HOME_PAGE)).not.toMatch(/configurator\.builder|loot.?box|gambling|fake.?countdown/i);
  });

  it('maps the historical intent onto shared E1/E2/E3/E6/E7/E10/E13 authorities only',()=>{
    expect(PLAYROOM_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E3','E6','E7','E10','E13']);
    expect(PLAYROOM_ENGINE_CONTRACT.compatibilityPrinciples).toEqual({unknownIsCompatible:false,explainable:true,serverFinalValidation:true,noSilentReplacement:true});
    expect(PLAYROOM_WAVE38_ACCEPTANCE.sharedAuthority).toMatchObject({
      discovery:'E2-only-for-catalog-search-channel-and-product-eligibility',
      guidedFinder:'E3-guidance-and-ranking-only-over-E2-eligible-products',
      compatibility:'E6-explainable-evidence-only-unknown-is-not-compatible',
      structuredProduct:'E7-authoritative-platform-genre-player-and-product-facts',
      editorial:'E10-editorial-read-model-presentation-only',
      checkout:'shared-provider-neutral-E13',
    });
    expect(PLAYROOM_WAVE38_ACCEPTANCE.separation).toEqual({rigForge:'no-pc-build-configurator',lootVault:'no-collector-drop-or-merch-vault-authority'});
  });

  it('keeps discovery, finder, compatibility and editorial surfaces on stable shared bindings',()=>{
    expect(home('playroom-platform-navigation')?.bindings?.items?.path).toBe('collection.platforms');
    expect(home('playroomNewNoteworthy')?.bindings?.products?.path).toBe('catalog.newNoteworthy');
    expect(home('playroom-game-finder-block')?.bindings).toMatchObject({
      question:{path:'finder.currentQuestion.label'},
      options:{path:'finder.currentQuestion.options'},
      progressLabel:{path:'finder.progressLabel'},
      actionHref:{path:'finder.resultHref'},
      resultStatus:{path:'finder.resultStatus'},
    });
    expect(home('playroom-genre-navigation')?.bindings?.items?.path).toBe('catalog.genreNavigation');
    expect(home('playroomAccessories')?.bindings?.products?.path).toBe('recommendations.accessories');
    expect(home('playroom-platform-match-status')?.bindings?.status?.path).toBe('compatibility.status');
    expect(home('playroom-platform-match-evidence')?.bindings?.items?.path).toBe('compatibility.evidence');
    expect(home('playroom-guides-block')?.bindings?.items?.path).toBe('content.guides.items');
  });

  it('keeps product, price, stock, variants, reviews and structured facts outside template authority',()=>{
    expect(product('playroom-product-info')?.bindings).toMatchObject({
      title:{path:'product.name'},
      price:{path:'pricing.displayPrice'},
      compareAtPrice:{path:'pricing.compareAtPrice'},
      stockLabel:{path:'inventory.stockLabel'},
    });
    expect(product('playroom-product-option')?.bindings?.options?.path).toBe('variant.optionOptions');
    expect(product('playroom-product-key-specs')?.bindings?.items?.path).toBe('product.keySpecs');
    expect(product('playroom-product-review-summary')?.bindings).toMatchObject({rating:{path:'reviews.summary.rating'},count:{path:'reviews.summary.count'}});
    expect(product('playroom-product-spec-groups')?.bindings?.groups?.path).toBe('product.specGroups');
    expect(product('playroom-product-compatibility-evidence')?.bindings?.items?.path).toBe('compatibility.productEvidence');
    expect(product('playroomProductRecommendations')?.bindings?.products?.path).toBe('recommendations.products');
    expect(PLAYROOM_WAVE38_ACCEPTANCE.sharedAuthority).toMatchObject({pricing:'shared-commerce-binding-only',inventory:'shared-commerce-binding-only',variants:'shared-commerce-binding-only',reviews:'shared-review-binding-only-no-fabricated-score'});
  });

  it('keeps every binding inside the current shared binding namespaces',()=>{
    const paths=PLAYROOM_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    expect(paths.some(path=>path.startsWith('system.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('story.'))).toBe(false);
  });

  it('preserves stable node identity, 14 Alap presets and shared Desktop/Tablet/Mobile validation',()=>{
    const registry=createStorefrontConfiguratorComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:PLAYROOM_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(PLAYROOM_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    expect(PLAYROOM_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    for(const page of PLAYROOM_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);
      const ids=nodes.map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
    expect(PLAYROOM_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(PLAYROOM_DESIGN_TOKENS['--shoporation-heading-font']).toContain('--merchant-heading-font');
    expect(PLAYROOM_DESIGN_TOKENS['--shoporation-body-font']).toContain('--merchant-body-font');
  });

  it('preserves the historical 7/5 PDP grid and mobile 12/12 collapse',()=>{
    expect(product('playroom-product-gallery')?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(product('playroom-product-buybox')?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
  });

  it('keeps installation draft-only and demo fixtures claim-neutral',()=>{
    const plan=planStorefrontTemplateInstallation({template:PLAYROOM_TEMPLATE_PACKAGE,componentRegistry:createStorefrontConfiguratorComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='gaming-playroom')).toBe(true);
    expect(JSON.stringify(PLAYROOM_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/releaseDate|countdown|reviewScore|rating|compatible.?true|platformSupport|lootBox|odds|guaranteed|fixedPrice|stockCount/i);
  });

  it('keeps checkout provider-neutral E13 and Wave 38 free of SQL, production, main or Visual Builder side effects',()=>{
    const checkout=PLAYROOM_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(PLAYROOM_WAVE38_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['payment-provider-change','sql-migration','vercel-production-deploy','supabase-mutation','main-merge','visual-builder-drag-drop-ui','live-canvas','inline-editing']));
  });
});
