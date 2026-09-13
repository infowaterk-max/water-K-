import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_BINDING_NAMESPACES,validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {createStorefrontConfiguratorComponentRegistry} from '@/lib/builder/storefront-configurator';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {
  PLAYROOM_CONTENT_PAGE,
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
import {PLAYROOM_WAVE57_ACCEPTANCE} from '@/lib/builder/templates/playroom-wave57-acceptance';
import {SPEC_LAB_VISUAL_DNA} from '@/lib/builder/templates/spec-lab';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));
const home=(id:string)=>nodeById(PLAYROOM_HOME_PAGE,id);
const product=(id:string)=>nodeById(PLAYROOM_PRODUCT_PAGE,id);
const content=(id:string)=>nodeById(PLAYROOM_CONTENT_PAGE,id);

describe('Scale-out Wave 57 Playroom current-baseline reacceptance',()=>{
  it('reconstructs historical Wave 38 / PR #210 and original Wave 19 / PR #142 directly after Spec Lab',()=>{
    expect(PLAYROOM_WAVE57_ACCEPTANCE).toMatchObject({
      wave:57,historicalCounterpartWave:38,historicalPullRequest:210,originalTemplateWave:19,originalTemplatePullRequest:142,
      historicalAcceptance:PLAYROOM_WAVE38_ACCEPTANCE.mode,mode:'current-baseline-reacceptance-and-builder-hardening',
      templateKey:'gaming.playroom',templateVersion:1,inheritedImplementation:true,
    });
    expect(PLAYROOM_WAVE57_ACCEPTANCE.sequence).toEqual({
      previous:'wave56-tech.spec-lab',current:'gaming.playroom',historicalPrevious:'wave37-tech.spec-lab',historicalCurrent:'wave38-gaming.playroom',
      originalPrevious:'wave18-tech.spec-lab',originalCurrent:'wave19-gaming.playroom',
      relationship:'historical-wave38-successor-replayed-on-current-stacked-baseline',releaseCheckpointBeforeCurrent:false,
    });
    expect(PLAYROOM_TEMPLATE_MANIFEST.templateKey).toBe('gaming.playroom');
    expect(PLAYROOM_TEMPLATE_MANIFEST.templateVersion).toBe(1);
    expect(PLAYROOM_TEMPLATE_MANIFEST.demoContent.namespace).toBe('gaming-playroom');
  });

  it('keeps Playroom visually and structurally distinct from Spec Lab with the locked discovery path and Home order',()=>{
    expect(PLAYROOM_VISUAL_DNA).toMatchObject({character:'playful-console-discovery-graphic-premium-social-gaming',category:'gaming-geek',position:'broad-gaming-console-discovery-store'});
    expect(PLAYROOM_VISUAL_DNA.character).not.toBe(SPEC_LAB_VISUAL_DNA.character);
    expect(PLAYROOM_DISCOVERY_PATH).toEqual(['Válassz platformot','Nézd meg az újdonságokat','Találd meg a játékot','Játssz együtt','Egészítsd ki']);
    expect(PLAYROOM_HOME_PAGE.metadata?.sectionOrder).toEqual(PLAYROOM_HOME_SECTION_ORDER);
    expect(PLAYROOM_HOME_SECTION_ORDER).toEqual(['Playroom Hero','Shop by Platform','New & Noteworthy','Game Finder','Play Together','Genre Rooms','Accessories by Platform','Platform Match','Editor’s Picks','Guides & Reviews','Footer']);
    expect(PLAYROOM_WAVE57_ACCEPTANCE.distinctness.separationIncludes).toEqual(expect.arrayContaining(['layout','section-order','discovery-path','palette','typography','platform-navigation','genre-rooms']));
  });

  it('proves the inherited Wave 38 hardening corrections remain present instead of replaying the historical patch',()=>{
    expect(home('playroom-platform-match-status')?.componentKey).toBe('compatibility.status');
    expect(home('playroom-platform-match-evidence')).toBeUndefined();
    expect(product('playroom-product-compatibility-status')).toBeUndefined();
    expect(product('playroom-product-compatibility-evidence')?.componentKey).toBe('compatibility.evidence');
    expect(content('playroom-content-guides-block')?.componentKey).toBe('editorial.split-feature');
    const catalog=PLAYROOM_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='catalog')!;
    const ids=walk(catalog.sections).map(node=>node.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PLAYROOM_WAVE57_ACCEPTANCE.historicalHardening).toMatchObject({currentBlobExpectedToContainCorrections:true,noAutomaticReplayOfHistoricalPatch:true});
  });

  it('uses only current shared binding namespaces without allowlist, registry or namespace widening',()=>{
    const paths=PLAYROOM_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    expect(paths.some(path=>path.startsWith('system.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('story.'))).toBe(false);
    expect(PLAYROOM_WAVE57_ACCEPTANCE.builderContract).toMatchObject({runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false});
  });

  it('keeps E2/E3/E6/E7/E10 discovery and product truth on shared authoritative engines',()=>{
    expect(PLAYROOM_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E3','E6','E7','E10','E13']);
    expect(home('playroom-platform-navigation')?.bindings?.items?.path).toBe('collection.platforms');
    expect(home('playroom-game-finder-block')?.bindings?.options?.path).toBe('finder.currentQuestion.options');
    expect(home('playroom-platform-match-status')?.bindings?.status?.path).toBe('compatibility.status');
    expect(product('playroom-product-info')?.bindings).toMatchObject({title:{path:'product.name'},price:{path:'pricing.displayPrice'},compareAtPrice:{path:'pricing.compareAtPrice'},stockLabel:{path:'inventory.stockLabel'}});
    expect(product('playroom-product-option')?.bindings?.options?.path).toBe('variant.optionOptions');
    expect(product('playroom-product-key-specs')?.bindings?.items?.path).toBe('product.keySpecs');
    expect(product('playroom-product-review-summary')?.bindings).toMatchObject({rating:{path:'reviews.summary.rating'},count:{path:'reviews.summary.count'}});
    expect(product('playroom-product-spec-groups')?.bindings?.groups?.path).toBe('product.specGroups');
    expect(PLAYROOM_WAVE57_ACCEPTANCE.commerceAuthority).toMatchObject({noTemplateProductAuthority:true,noTemplatePricingAuthority:true,noTemplateInventoryAuthority:true,noTemplateVariantAuthority:true,noTemplateGuidanceAuthority:true,noTemplateCompatibilityAuthority:true,noTemplateStructuredProductAuthority:true});
  });

  it('keeps broad gaming discovery separated from Rig Forge and Loot Vault without local configurator or collector authority',()=>{
    expect(PLAYROOM_WAVE57_ACCEPTANCE.distinctness).toMatchObject({rigForge:'no-pc-build-configurator',lootVault:'no-collector-drop-or-merch-vault-authority'});
    expect(JSON.stringify(PLAYROOM_HOME_PAGE)).not.toMatch(/configurator\.builder|loot.?box|gambling|odds|fake.?countdown/i);
    expect(JSON.stringify(PLAYROOM_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/releaseDate|countdown|reviewScore|rating|compatible.?true|platformSupport|lootBox|odds|guaranteed|fixedPrice|stockCount/i);
  });

  it('keeps all 14 Alap-compatible Desktop/Tablet/Mobile presets valid with stable unique node IDs',()=>{
    const registry=createStorefrontConfiguratorComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:PLAYROOM_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(PLAYROOM_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(PLAYROOM_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(PLAYROOM_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    for(const page of PLAYROOM_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);
      const ids=nodes.map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('keeps merchant-editable design tokens and the accepted responsive 7/5 product composition',()=>{
    expect(PLAYROOM_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(PLAYROOM_DESIGN_TOKENS['--shoporation-heading-font']).toContain('--merchant-heading-font');
    expect(PLAYROOM_DESIGN_TOKENS['--shoporation-body-font']).toContain('--merchant-body-font');
    expect(PLAYROOM_WAVE57_ACCEPTANCE.builderContract.marketingCopyBakedIntoImages).toBe(false);
    expect(product('playroom-product-gallery')?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(product('playroom-product-buybox')?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
  });

  it('keeps installation draft-only and template switching unable to mutate commerce, customer, order or B2B authority',()=>{
    const plan=planStorefrontTemplateInstallation({template:PLAYROOM_TEMPLATE_PACKAGE,componentRegistry:createStorefrontConfiguratorComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='gaming-playroom')).toBe(true);
    expect(PLAYROOM_WAVE57_ACCEPTANCE.installationContract).toMatchObject({draftOnly:true,demoNamespace:'gaming-playroom'});
    expect(PLAYROOM_WAVE57_ACCEPTANCE.commerceAuthority).toMatchObject({noTemplateCheckoutAuthority:true,noTemplatePaymentAuthority:true});
  });

  it('preserves provider-neutral E13 and inherited Wave 38 authority while excluding SQL, production, Supabase, main merge and Wave 58',()=>{
    const checkout=PLAYROOM_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(PLAYROOM_WAVE57_ACCEPTANCE.commerceAuthority.checkout).toBe('shared-provider-neutral-E13');
    expect(PLAYROOM_WAVE57_ACCEPTANCE.historicalAcceptance).toBe(PLAYROOM_WAVE38_ACCEPTANCE.mode);
    expect(PLAYROOM_WAVE57_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening','visual-builder-roadmap-expansion',
      'payment-provider-change','sql-migration','vercel-production-deploy','supabase-mutation','fresh-install-activation','tenant-status-change','tenant-plan-change','main-merge','wave58-implementation',
    ]));
  });
});
