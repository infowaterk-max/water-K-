import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {createStorefrontStoryComponentRegistry} from '@/lib/builder/storefront-story';
import {
  evaluateStorefrontTemplateCapabilityGate,
  planStorefrontTemplateInstallation,
} from '@/lib/builder/storefront-template-installation';
import {
  STOREFRONT_BINDING_NAMESPACES,
  validateStorefrontPageDocument,
  type StorefrontComponentNode,
  type StorefrontPageDocument,
} from '@/lib/builder/storefront-runtime';
import {
  HERITAGE_ATELIER_CONTENT_PAGE,
  HERITAGE_ATELIER_DESIGN_TOKENS,
  HERITAGE_ATELIER_ENGINE_CONTRACT,
  HERITAGE_ATELIER_HOME_PAGE,
  HERITAGE_ATELIER_HOME_SECTION_ORDER,
  HERITAGE_ATELIER_PRODUCT_PAGE,
  HERITAGE_ATELIER_TEMPLATE_PACKAGE,
  HERITAGE_ATELIER_VISUAL_DNA,
} from '@/lib/builder/templates/heritage-atelier';
import {HERITAGE_ATELIER_WAVE47_ACCEPTANCE} from '@/lib/builder/templates/heritage-atelier-wave47-acceptance';
import {HERITAGE_ATELIER_WAVE66_ACCEPTANCE} from '@/lib/builder/templates/heritage-atelier-wave66-acceptance';
import {MODERN_LUXE_VISUAL_DNA} from '@/lib/builder/templates/modern-luxe';
import {MODERN_LUXE_WAVE65_ACCEPTANCE} from '@/lib/builder/templates/modern-luxe-wave65-acceptance';
import {STATEMENT_LAB_VISUAL_DNA} from '@/lib/builder/templates/statement-lab';
import {
  STORY_ENGINE_VERSION,
  STORY_TEMPLATE_SWITCH_MUTATION_BOUNDARY,
  validateStoryDocument,
  type StoryDocument,
} from '@/lib/content/story-engine';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));

describe('Scale-out Wave 66 Heritage Atelier current-baseline reacceptance',()=>{
  it('reconstructs Heritage Atelier as the direct canonical successor to Wave 65 Modern Luxe',()=>{
    expect(HERITAGE_ATELIER_WAVE66_ACCEPTANCE).toMatchObject({
      wave:66,historicalCounterpartWave:47,historicalReacceptanceWave:28,historicalOriginalWave:3,
      historicalPullRequest:232,historicalReacceptancePullRequest:151,originalTemplatePullRequest:124,
      predecessorAcceptance:MODERN_LUXE_WAVE65_ACCEPTANCE.mode,historicalAcceptance:HERITAGE_ATELIER_WAVE47_ACCEPTANCE.mode,
      mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'jewelry.heritage-atelier',templateVersion:1,inheritedImplementation:true,
    });
    expect(HERITAGE_ATELIER_WAVE66_ACCEPTANCE.sequence).toEqual({
      previous:'jewelry.modern-luxe',current:'jewelry.heritage-atelier',
      reacceptancePrevious:'wave27-jewelry.modern-luxe',reacceptanceCurrent:'wave28-jewelry.heritage-atelier',
      hardenedPrevious:'wave46-jewelry.modern-luxe',hardenedCurrent:'wave47-jewelry.heritage-atelier',
      currentPrevious:'wave65-jewelry.modern-luxe',currentCurrent:'wave66-jewelry.heritage-atelier',
      relationship:'historical-heritage-successor-replayed-on-current-wave65-stacked-baseline',releaseCheckpointBeforeCurrent:false,
    });
  });

  it('records original provenance and byte-identical inheritance from accepted hardened Wave 47',()=>{
    expect(HERITAGE_ATELIER_WAVE66_ACCEPTANCE.provenance).toEqual({
      currentParentWave:65,currentParentHead:'e4fe565482e7b081f445ece7ad88323093cea38c',
      originalImplementationHead:'ccedcf22527646533a8aa0f45d8d87499ff0eb20',originalFinalHead:'3b8e1853ae92237e8cc72ca7e7f348446d5259f5',
      originalTemplateBlob:'64e3631750cd160ff73ef0cfe3956c8afc5a9ae7',
      historicalReacceptanceFinalHead:'533e37870ad2ced51fa18f4680d6a186ff39467d',historicalReacceptanceTemplateBlob:'64e3631750cd160ff73ef0cfe3956c8afc5a9ae7',
      historicalFailClosedAcceptanceHead:'2ebfd1f2d307d01d1e019f0ffc10bfe40d475e3e',
      historicalHardenedImplementationHead:'4caaddf2259b6398af988ecb8e22635c555f1df8',historicalAcceptedFinalHead:'c11fa8bb0b863f87c3605870d23327e519c45b57',
      historicalAcceptedTemplateBlob:'ec219d963b8cbadf3480acbb7a5e5da75543e59f',currentInheritedTemplateBlob:'ec219d963b8cbadf3480acbb7a5e5da75543e59f',
      byteIdenticalToHistoricalAcceptedTemplate:true,templateModifiedByWave66:false,
    });
    expect(HERITAGE_ATELIER_WAVE66_ACCEPTANCE.historicalHardening).toMatchObject({
      historicalDriftFound:true,violation:'non-allowed-story-binding-namespace',currentBlobContainsAcceptedWave47Fix:true,
      noCurrentContractDrift:true,noAutomaticReplayOfHistoricalPatch:true,sharedAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false,
    });
    expect(HERITAGE_ATELIER_WAVE66_ACCEPTANCE.historicalHardening.failingBindings).toEqual(['story.provenance.claims','story.timeline.items','story.journal.items']);
    expect(HERITAGE_ATELIER_WAVE66_ACCEPTANCE.historicalHardening.correctedBindings).toEqual(['origin.verifiedClaims','content.storyTimeline.items','content.storyJournal.items']);
  });

  it('preserves Heritage Atelier visual DNA instead of becoming a Modern Luxe reskin',()=>{
    expect(HERITAGE_ATELIER_VISUAL_DNA.character).toBe('heritage-luxury-craftsmanship-provenance-editorial-commerce');
    expect(HERITAGE_ATELIER_VISUAL_DNA.character).not.toBe(MODERN_LUXE_VISUAL_DNA.character);
    expect(HERITAGE_ATELIER_VISUAL_DNA.character).not.toBe(STATEMENT_LAB_VISUAL_DNA.character);
    expect(HERITAGE_ATELIER_WAVE66_ACCEPTANCE.portfolio.direction).toBe('heritage-craftsmanship-provenance-editorial-story-led-luxury');
    expect(HERITAGE_ATELIER_WAVE66_ACCEPTANCE.visualContract.palette).toEqual(['warm-ivory-parchment','deep-charcoal','burgundy-antique-brass','muted-stone']);
    expect(HERITAGE_ATELIER_WAVE66_ACCEPTANCE.visualContract.typography).toEqual(['heritage-editorial-serif','clean-sans']);
    expect(HERITAGE_ATELIER_WAVE66_ACCEPTANCE.visualContract.imagery).toBe('macro-material-workshop-craft');
    expect(HERITAGE_ATELIER_WAVE66_ACCEPTANCE.visualContract.rhythm).toBe('story-provenance-craft-commerce-journal-care');
    expect(HERITAGE_ATELIER_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
  });

  it('preserves the eleven-stage Home narrative and independently editable marketing bindings',()=>{
    expect(HERITAGE_ATELIER_HOME_SECTION_ORDER).toEqual(['Heritage Hero','Featured Collection Story','Craftsmanship Feature','Product Selection','Maker/Atelier Story','Material & Origin','Timeline/Heritage','Editorial Commerce Grid','Journal','Service/Care','Footer']);
    expect(HERITAGE_ATELIER_HOME_PAGE.metadata?.sectionOrder).toEqual(HERITAGE_ATELIER_HOME_SECTION_ORDER);
    const hero=nodeById(HERITAGE_ATELIER_HOME_PAGE,'heritage-hero');
    expect(hero?.componentKey).toBe('story.hero');
    expect(Object.keys(hero?.bindings??{})).toEqual(expect.arrayContaining(['eyebrow','title','excerpt','image','imageAlt','ctaLabel','ctaHref']));
    const collection=nodeById(HERITAGE_ATELIER_HOME_PAGE,'heritage-featured-collection');
    expect(Object.keys(collection?.bindings??{})).toEqual(expect.arrayContaining(['title','copy','image','imageAlt','ctaLabel','ctaHref']));
    expect(HERITAGE_ATELIER_WAVE66_ACCEPTANCE.builderContract.marketingLayerRule).toBe('image-text-copy-cta-bindings-remain-independently-builder-editable');
  });

  it('keeps shared E10 authority and fails closed for unverified provenance',()=>{
    expect(STORY_ENGINE_VERSION).toBe('shoporation.editorial-story-engine.v1');
    expect(HERITAGE_ATELIER_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E10','E13']);
    expect(HERITAGE_ATELIER_ENGINE_CONTRACT.useful).toEqual(['E7']);
    expect(HERITAGE_ATELIER_WAVE66_ACCEPTANCE.storyContract.sharedEngineOnly).toBe(true);
    const invalid:StoryDocument={version:1,id:'origin-story',slug:'origin-story',storyType:'origin',status:'published',title:'Origin',author:{id:'editor',name:'Editor'},publishedAt:'2026-09-11T08:00:00Z',relations:[{id:'origin-one',type:'origin',entityId:'origin-one',verified:false}],blocks:[{id:'claim-one',type:'provenance',claims:[{label:'Eredet',value:'Műhely A',originRelationId:'origin-one'}]}]};
    const result=validateStoryDocument(invalid);
    expect(result.ok).toBe(false);
    expect(result.violations.map(item=>item.code)).toContain('STORY_PROVENANCE_UNVERIFIED');
  });

  it('keeps the accepted hardened bindings inside current shared namespaces',()=>{
    const paths=HERITAGE_ATELIER_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    expect(paths).toEqual(expect.arrayContaining(['origin.verifiedClaims','content.storyTimeline.items','content.storyJournal.items']));
    for(const prefix of ['story.','heritage.','jewelry.','price.','stock.','checkout.','payment.']) expect(paths.some(path=>path.startsWith(prefix))).toBe(false);
  });

  it('keeps all 14 Alap-compatible Desktop/Tablet/Mobile presets valid with page-local unique node IDs',()=>{
    const registry=createStorefrontStoryComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:HERITAGE_ATELIER_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(HERITAGE_ATELIER_TEMPLATE_PACKAGE.manifest.minPlan).toBe('alap');
    expect(HERITAGE_ATELIER_TEMPLATE_PACKAGE.manifest.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(HERITAGE_ATELIER_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    for(const page of HERITAGE_ATELIER_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections); const ids=nodes.map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('keeps the accepted 7/12 + 5/12 PDP under shared product, price, inventory and variant authority',()=>{
    const gallery=nodeById(HERITAGE_ATELIER_PRODUCT_PAGE,'heritage-product-gallery');
    const buybox=nodeById(HERITAGE_ATELIER_PRODUCT_PAGE,'heritage-product-buybox');
    expect(gallery?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(buybox?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    expect(bindingPaths(HERITAGE_ATELIER_PRODUCT_PAGE)).toEqual(expect.arrayContaining(['product.gallery','pricing.displayPrice','inventory.stockLabel','variant.optionOptions','commerce.purchaseHref','origin.verifiedClaims']));
    expect(HERITAGE_ATELIER_WAVE66_ACCEPTANCE.sharedAuthority).toMatchObject({
      runtime:'E1-shared-page-schema-runtime',discovery:'E2-shared-product-discovery',story:'E10-shared-editorial-story-engine',
      pricing:'pricing-binding-only',inventory:'inventory-binding-only',variants:'variant-binding-only',checkout:'shared-provider-neutral-E13',
    });
  });

  it('keeps draft-only installation and demo fixtures outside sellable authority',()=>{
    const registry=createStorefrontStoryComponentRegistry();
    const plan=planStorefrontTemplateInstallation({template:HERITAGE_ATELIER_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='jewelry-heritage-atelier')).toBe(true);
    expect(HERITAGE_ATELIER_WAVE66_ACCEPTANCE.installationContract.inheritedDemoFixturesAreNonAuthoritative).toBe(true);
    for(const fixture of HERITAGE_ATELIER_TEMPLATE_PACKAGE.demoFixtures??[]){
      expect(fixture.payload).toMatchObject({demo:true});
      for(const forbidden of ['price','stock','inventory','rating','reviewCount','verifiedClaims','materialClaim','provenanceClaim']) expect(Object.prototype.hasOwnProperty.call(fixture.payload,forbidden)).toBe(false);
    }
  });

  it('preserves Story documents and commerce authority across template switching',()=>{
    expect(STORY_TEMPLATE_SWITCH_MUTATION_BOUNDARY).toEqual({storyDocuments:false,products:false,collections:false,makers:false,orders:false,customers:false,storefrontPageDrafts:true});
    expect(HERITAGE_ATELIER_WAVE66_ACCEPTANCE.installationContract).toMatchObject({
      draftOnly:true,demoNamespace:'jewelry-heritage-atelier',mutableAuthority:['storefrontPageDrafts'],
      immutableAuthority:['products','variants','pricing','inventory','customers','orders','b2b','storyDocuments','collections','makers'],
    });
    const contentSource=JSON.stringify(HERITAGE_ATELIER_CONTENT_PAGE);
    expect(contentSource).toContain('story.body');
  });

  it('keeps provider-neutral E13 checkout and excludes shared-authority, baseline, production, main and Wave 67 changes',()=>{
    const checkout=HERITAGE_ATELIER_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(HERITAGE_ATELIER_WAVE66_ACCEPTANCE.builderContract).toMatchObject({
      hierarchy:'template-page-presets-section-presets-components',stableIdentity:'stable-page-local-unique-node-ids-and-stable-binding-paths',
      responsiveModes:['desktop','tablet','mobile'],pagePresetCount:14,minimumPlan:'alap',protectedHomeSequence:true,
      protectedPdpGrid:'desktop-tablet-7-5-mobile-12-12',runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false,
      visualBuilder:'future-compatible-no-template-local-builder-engine',
    });
    expect(HERITAGE_ATELIER_WAVE66_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'artificial-canonical-template-diff','template-local-layout-engine','template-local-builder-engine','parallel-page-schema-authority',
      'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening',
      'payment-provider-change','kh-vpos-change','sql-migration','customer-baseline-change','vercel-production-deploy','supabase-mutation',
      'fresh-install-project-state-change','tenant-status-change','tenant-plan-change','parallel-main-import',
      'visual-builder-ux-scope','email-builder-scope','template-library-ux-scope','main-merge','wave67-implementation',
    ]));
  });
});
