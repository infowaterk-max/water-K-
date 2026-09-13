import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_BINDING_NAMESPACES,validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {createStorefrontConfiguratorComponentRegistry} from '@/lib/builder/storefront-configurator';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {
  PLAYROOM_CONTENT_PAGE,
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
import {PLAYROOM_WAVE76_ACCEPTANCE} from '@/lib/builder/templates/playroom-wave76-acceptance';
import {SPEC_LAB_WAVE75_ACCEPTANCE} from '@/lib/builder/templates/spec-lab-wave75-acceptance';
import {SPEC_LAB_VISUAL_DNA} from '@/lib/builder/templates/spec-lab';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));
const home=(id:string)=>nodeById(PLAYROOM_HOME_PAGE,id);
const product=(id:string)=>nodeById(PLAYROOM_PRODUCT_PAGE,id);
const content=(id:string)=>nodeById(PLAYROOM_CONTENT_PAGE,id);

describe('Scale-out Wave 76 Playroom re-acceptance and Builder hardening',()=>{
  it('reconstructs the exact stacked successor chain after Wave 75 Spec Lab',()=>{
    expect(PLAYROOM_WAVE76_ACCEPTANCE).toMatchObject({
      wave:76,predecessorWave:75,predecessorAcceptance:SPEC_LAB_WAVE75_ACCEPTANCE.mode,
      currentBaselineCounterpartWave:57,currentBaselineCounterpartPullRequest:259,
      historicalCounterpartWave:38,historicalPullRequest:210,originalTemplateWave:19,originalTemplatePullRequest:142,
      historicalAcceptance:PLAYROOM_WAVE38_ACCEPTANCE.mode,currentBaselineAcceptance:PLAYROOM_WAVE57_ACCEPTANCE.mode,
      mode:'current-baseline-reacceptance-and-builder-hardening',templateKey:'gaming.playroom',templateVersion:1,inheritedImplementation:true,
    });
    expect(PLAYROOM_WAVE76_ACCEPTANCE.sequence).toEqual({
      previous:'wave75-tech.spec-lab',current:'gaming.playroom',nextCandidate:'wave77-gaming.loot-vault',
      currentBaselinePrevious:'wave56-tech.spec-lab',currentBaselineCurrent:'wave57-gaming.playroom',currentBaselineNext:'wave58-gaming.loot-vault',
      historicalPrevious:'wave37-tech.spec-lab',historicalCurrent:'wave38-gaming.playroom',historicalNext:'wave39-gaming.loot-vault',
      originalPrevious:'wave18-tech.spec-lab',originalCurrent:'wave19-gaming.playroom',originalNext:'wave20-gaming.loot-vault',
      relationship:'repository-proven-playroom-successor-replayed-on-wave75-exact-head',releaseCheckpointBeforeCurrent:false,
    });
  });

  it('locks exact provenance and proves there is no current canonical Playroom drift',()=>{
    expect(PLAYROOM_WAVE76_ACCEPTANCE.provenance).toEqual({
      originalFinalHead:'3d62a1da93d10b89ff855a86ee1971ab4dd6fea7',
      originalBlob:'40cf2c9445e58848a9c37e3bfbe6610fd2d47a46',
      historicalFinalHead:'d884d80686ccb6793eb74a486488d631b797bd01',
      historicalBlob:'c37c2bcd3d34699ca6903c8a1957d1f116c9624e',
      currentBaselineFinalHead:'d385550d92b2c85b1672b824407076662fffd0fb',
      currentBaselineBlob:'c37c2bcd3d34699ca6903c8a1957d1f116c9624e',
      wave75ParentBlob:'c37c2bcd3d34699ca6903c8a1957d1f116c9624e',
      historicalHardeningDrift:true,currentDrift:false,
    });
    expect(PLAYROOM_WAVE76_ACCEPTANCE.historicalHardening).toMatchObject({
      currentBlobExpectedToContainCorrections:true,noAutomaticReplayOfHistoricalPatch:true,
      originalToHistoricalBlobChanged:true,historicalToCurrentBaselineBlobChanged:false,currentBaselineToWave75ParentBlobChanged:false,
    });
  });

  it('keeps the accepted Playroom identity, discovery path and visual separation from Spec Lab',()=>{
    expect(PLAYROOM_TEMPLATE_MANIFEST).toMatchObject({templateKey:'gaming.playroom',templateVersion:1,minPlan:'alap'});
    expect(PLAYROOM_TEMPLATE_MANIFEST.demoContent.namespace).toBe('gaming-playroom');
    expect(PLAYROOM_VISUAL_DNA).toMatchObject({character:'playful-console-discovery-graphic-premium-social-gaming',category:'gaming-geek',position:'broad-gaming-console-discovery-store'});
    expect(PLAYROOM_VISUAL_DNA.character).not.toBe(SPEC_LAB_VISUAL_DNA.character);
    expect(PLAYROOM_DISCOVERY_PATH).toEqual(['Válassz platformot','Nézd meg az újdonságokat','Találd meg a játékot','Játssz együtt','Egészítsd ki']);
    expect(PLAYROOM_HOME_PAGE.metadata?.sectionOrder).toEqual(PLAYROOM_HOME_SECTION_ORDER);
    expect(PLAYROOM_WAVE76_ACCEPTANCE.distinctness).toMatchObject({rigForge:'no-pc-build-configurator',lootVault:'no-collector-drop-or-merch-vault-authority'});
  });

  it('retains the hardened shared component corrections without changing canonical runtime contracts',()=>{
    expect(home('playroom-platform-match-status')?.componentKey).toBe('compatibility.status');
    expect(home('playroom-platform-match-evidence')).toBeUndefined();
    expect(product('playroom-product-compatibility-status')).toBeUndefined();
    expect(product('playroom-product-compatibility-evidence')?.componentKey).toBe('compatibility.evidence');
    expect(content('playroom-content-guides-block')?.componentKey).toBe('editorial.split-feature');
    const catalog=PLAYROOM_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='catalog')!;
    const ids=walk(catalog.sections).map(node=>node.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PLAYROOM_WAVE76_ACCEPTANCE.builderContract).toMatchObject({runtimeAllowlistWidened:false,componentRegistryWidened:false,bindingNamespaceWidened:false,pageSchemaAllowlistWidened:false});
  });

  it('uses only current shared binding namespaces and canonical E2/E3/E6/E7/E10/E13 authority',()=>{
    const paths=PLAYROOM_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    expect(paths.some(path=>path.startsWith('system.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('story.'))).toBe(false);
    expect(PLAYROOM_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E3','E6','E7','E10','E13']);
    expect(home('playroom-platform-navigation')?.bindings?.items?.path).toBe('collection.platforms');
    expect(home('playroom-game-finder-block')?.bindings?.options?.path).toBe('finder.currentQuestion.options');
    expect(home('playroom-platform-match-status')?.bindings?.status?.path).toBe('compatibility.status');
    expect(product('playroom-product-info')?.bindings).toMatchObject({title:{path:'product.name'},price:{path:'pricing.displayPrice'},compareAtPrice:{path:'pricing.compareAtPrice'},stockLabel:{path:'inventory.stockLabel'}});
    expect(PLAYROOM_WAVE76_ACCEPTANCE.commerceAuthority).toMatchObject({noTemplateProductAuthority:true,noTemplatePricingAuthority:true,noTemplateInventoryAuthority:true,noTemplateVariantAuthority:true,noTemplateGuidanceAuthority:true,noTemplateCompatibilityAuthority:true,noTemplateStructuredProductAuthority:true,noTemplateCheckoutAuthority:true,noTemplatePaymentAuthority:true});
  });

  it('keeps all 14 Alap Desktop/Tablet/Mobile presets valid with unique node IDs',()=>{
    const registry=createStorefrontConfiguratorComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:PLAYROOM_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(PLAYROOM_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    expect(PLAYROOM_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    for(const page of PLAYROOM_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);
      const ids=nodes.map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
    expect(product('playroom-product-gallery')?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(product('playroom-product-buybox')?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
  });

  it('keeps installation draft-only and blocks commerce/customer/order authority mutation',()=>{
    const plan=planStorefrontTemplateInstallation({template:PLAYROOM_TEMPLATE_PACKAGE,componentRegistry:createStorefrontConfiguratorComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='gaming-playroom')).toBe(true);
    expect(PLAYROOM_WAVE76_ACCEPTANCE.installationContract).toMatchObject({draftOnly:true,demoNamespace:'gaming-playroom'});
  });

  it('keeps provider-neutral checkout and excludes gambling, fabricated truth, DB/prod/main and Wave 77 scope',()=>{
    const checkout=PLAYROOM_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(JSON.stringify(PLAYROOM_HOME_PAGE)).not.toMatch(/configurator\.builder|loot.?box|gambling|odds|fake.?countdown/i);
    expect(JSON.stringify(PLAYROOM_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/releaseDate|countdown|reviewScore|rating|compatible.?true|platformSupport|lootBox|odds|guaranteed|fixedPrice|stockCount/i);
    expect(PLAYROOM_WAVE76_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining([
      'canonical-template-churn','shared-runtime-allowlist-widening','shared-component-registry-widening','shared-binding-namespace-widening','page-schema-allowlist-widening',
      'loot-box-or-gambling-mechanics','fabricated-rating-or-review-score','fabricated-platform-support-or-compatibility','sql-migration','vercel-production-deploy','supabase-mutation',
      'fresh-install-activation','storefront-revision-reconciliation','main-rebase','main-merge','wave77-implementation',
    ]));
  });
});
