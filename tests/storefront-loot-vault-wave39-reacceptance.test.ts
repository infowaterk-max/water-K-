import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_BINDING_NAMESPACES,validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {createStorefrontConfiguratorComponentRegistry} from '@/lib/builder/storefront-configurator';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {
  LOOT_VAULT_DESIGN_TOKENS,
  LOOT_VAULT_ENGINE_CONTRACT,
  LOOT_VAULT_HOME_PAGE,
  LOOT_VAULT_HOME_SECTION_ORDER,
  LOOT_VAULT_PRODUCT_PAGE,
  LOOT_VAULT_RARITY_LEVELS,
  LOOT_VAULT_TEMPLATE_MANIFEST,
  LOOT_VAULT_TEMPLATE_PACKAGE,
  LOOT_VAULT_VISUAL_DNA,
} from '@/lib/builder/templates/loot-vault';
import {LOOT_VAULT_WAVE39_ACCEPTANCE} from '@/lib/builder/templates/loot-vault-wave39-acceptance';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const expectedPages=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'];
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);
const bindingPaths=(page:StorefrontPageDocument)=>walk(page.sections).flatMap(node=>Object.values(node.bindings??{}).map(binding=>binding.path));
const product=(id:string)=>nodeById(LOOT_VAULT_PRODUCT_PAGE,id);

describe('Scale-out Wave 39 Loot Vault current-baseline reacceptance',()=>{
  it('re-accepts original Wave 20 Loot Vault directly after Playroom with canonical identity',()=>{
    expect(LOOT_VAULT_WAVE39_ACCEPTANCE).toMatchObject({
      wave:39,
      historicalWave:20,
      mode:'current-baseline-reacceptance-and-builder-hardening',
      templateKey:'gaming.loot-vault',
      templateVersion:1,
      inheritedImplementation:true,
    });
    expect(LOOT_VAULT_WAVE39_ACCEPTANCE.historicalSequence).toEqual({
      previous:'gaming.playroom',
      current:'gaming.loot-vault',
      relationship:'original-wave20-directly-on-playroom',
    });
    expect(LOOT_VAULT_TEMPLATE_MANIFEST.templateKey).toBe('gaming.loot-vault');
    expect(LOOT_VAULT_TEMPLATE_MANIFEST.minPlan).toBe('alap');
    expect(LOOT_VAULT_TEMPLATE_MANIFEST.demoContent.namespace).toBe('gaming-loot-vault');
  });

  it('locks collector/drop DNA, rarity labels and exact historical Home composition',()=>{
    expect(LOOT_VAULT_VISUAL_DNA).toMatchObject({
      character:'dark-theatrical-collector-vault-commerce',
      category:'gaming-geek',
      position:'collectibles-merch-drop-preorder-rarity',
    });
    expect(LOOT_VAULT_RARITY_LEVELS).toEqual(['Common','Rare','Epic','Legendary','Mythic']);
    expect(LOOT_VAULT_HOME_PAGE.metadata?.sectionOrder).toEqual(LOOT_VAULT_HOME_SECTION_ORDER);
    expect(LOOT_VAULT_HOME_SECTION_ORDER).toEqual(['Vault Hero','Universe Selector','Limited / Exclusive / Preorder','Collector Selection','Vault Feature','Drop Alert','Join the Hunt','Footer']);
    expect(LOOT_VAULT_HOME_PAGE.metadata?.largestCommerceSection).toBe('Collector Selection');
  });

  it('maps collector presentation onto shared E1/E2/E7/E10/E13 authority only',()=>{
    expect(LOOT_VAULT_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(LOOT_VAULT_ENGINE_CONTRACT.explicitlyNotRequired).toEqual(['E8','E9']);
    expect(LOOT_VAULT_ENGINE_CONTRACT.collectionTracker).toMatch(/deferred/);
    expect(LOOT_VAULT_WAVE39_ACCEPTANCE.sharedAuthority).toMatchObject({
      discovery:'E2-only-for-catalog-search-channel-and-product-eligibility',
      structuredCollectorFacts:'E7-only-when-authoritative-product-data-supplies-them',
      editorial:'E10-editorial-read-model-presentation-only',
      releaseAndPreorder:'catalog-product-commerce-inventory-read-models-only',
      checkout:'shared-provider-neutral-E13',
    });
    expect(LOOT_VAULT_WAVE39_ACCEPTANCE.separation).toEqual({playroom:'no-broad-console-discovery-duplication',rigForge:'no-pc-build-configurator'});
  });

  it('keeps loot-box, scarcity, countdown, stock and release authority outside the template',()=>{
    expect(LOOT_VAULT_WAVE39_ACCEPTANCE.safety).toEqual({
      lootBoxOrGambling:false,
      fabricatedScarcity:false,
      fabricatedCountdown:false,
      fabricatedStock:false,
      fabricatedRarity:false,
      fabricatedExclusivity:false,
      templateReleaseAuthority:false,
      collectionTrackerV1:false,
    });
    expect(LOOT_VAULT_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['loot-box-gambling-ui','fake-scarcity','fake-countdown','fake-rarity','fake-exclusive','fake-numbered-edition','fake-preorder-date','collection-tracker-v1','pc-builder-duplication','broad-console-discovery-duplication']));
    expect(LOOT_VAULT_ENGINE_CONTRACT.authorityRule).toMatch(/never-invents-scarcity-rarity-exclusivity-numbering-preorder-release-price-stock-or-order-authority/);
  });

  it('keeps every binding inside current shared namespaces and never creates template-local truth namespaces',()=>{
    const paths=LOOT_VAULT_TEMPLATE_PACKAGE.pages.flatMap(bindingPaths);
    expect(paths.length).toBeGreaterThan(0);
    for(const path of paths){
      const namespace=path.split('.')[0];
      expect(STOREFRONT_BINDING_NAMESPACES,`Unexpected binding namespace for ${path}`).toContain(namespace as never);
    }
    expect(paths.some(path=>path.startsWith('lootVault.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('drop.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('release.'))).toBe(false);
    expect(paths.some(path=>path.startsWith('rarity.'))).toBe(false);
  });

  it('preserves stable node identity, 14 Alap presets and current shared runtime validation',()=>{
    const registry=createStorefrontConfiguratorComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:LOOT_VAULT_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.ok,JSON.stringify(gate.violations)).toBe(true);
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(LOOT_VAULT_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).toEqual(expectedPages);
    expect(LOOT_VAULT_TEMPLATE_MANIFEST.responsive).toEqual({desktop:true,tablet:true,mobile:true});
    for(const page of LOOT_VAULT_TEMPLATE_PACKAGE.pages){
      const nodes=walk(page.sections);
      const ids=nodes.map(node=>node.id);
      expect(new Set(ids).size,`${page.pageType} contains duplicate node ids`).toBe(ids.length);
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
    expect(LOOT_VAULT_DESIGN_TOKENS['--shoporation-color-accent']).toContain('--merchant-accent');
    expect(LOOT_VAULT_DESIGN_TOKENS['--shoporation-heading-font']).toContain('--merchant-heading-font');
    expect(LOOT_VAULT_DESIGN_TOKENS['--shoporation-body-font']).toContain('--merchant-body-font');
  });

  it('keeps PDP responsive layout and product commerce facts on shared bindings',()=>{
    expect(product('loot-product-gallery')?.responsive).toEqual({desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}});
    expect(product('loot-product-buybox')?.responsive).toEqual({desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}});
    expect(product('loot-product-info')?.bindings).toMatchObject({
      title:{path:'product.name'},
      price:{path:'pricing.displayPrice'},
      compareAtPrice:{path:'pricing.compareAtPrice'},
      stockLabel:{path:'inventory.stockLabel'},
    });
    expect(product('loot-product-option')?.bindings?.options?.path).toBe('variant.optionOptions');
    expect(product('loot-product-key-specs')?.bindings?.items?.path).toBe('product.keySpecs');
  });

  it('keeps installation draft-only and demo fixtures claim-neutral',()=>{
    const plan=planStorefrontTemplateInstallation({template:LOOT_VAULT_TEMPLATE_PACKAGE,componentRegistry:createStorefrontConfiguratorComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(item=>item.namespace==='gaming-loot-vault')).toBe(true);
    expect(JSON.stringify(LOOT_VAULT_TEMPLATE_PACKAGE.demoFixtures??[])).not.toMatch(/rarity|legendary|exclusive|limited|numbered|preorderDate|releaseDate|stockCount|countdown|collectionTracker|odds|lootBox/i);
  });

  it('keeps checkout provider-neutral E13 with no payment-provider authority',()=>{
    const checkout=LOOT_VAULT_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl|paymentStatus/i);
    expect(LOOT_VAULT_WAVE39_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['payment-provider-change','sql-migration','vercel-production-deploy','supabase-mutation','main-merge']));
  });

  it('remains Builder-ready without introducing a template-local Builder, release or collector-state engine',()=>{
    expect(LOOT_VAULT_WAVE39_ACCEPTANCE.builderContract).toMatchObject({
      hierarchy:'template-page-presets-section-presets-components',
      stableIdentity:'stable-node-ids-and-stable-binding-paths',
      responsiveGrid:'shared-desktop-tablet-mobile-grid',
      pagePresetCount:14,
      minimumPlan:'alap',
      visualBuilder:'future-compatible-no-template-local-builder-engine',
    });
    expect(LOOT_VAULT_WAVE39_ACCEPTANCE.nonScope).toEqual(expect.arrayContaining(['template-local-collector-engine','template-local-drop-or-preorder-engine','template-local-release-authority','visual-builder-drag-drop-ui','live-canvas','inline-editing']));
  });
});
