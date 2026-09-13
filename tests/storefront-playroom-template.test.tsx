import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {createStorefrontPresetBundle} from '@/lib/builder/storefront-presets';
import {createStorefrontTemplatePreviewBindingContext} from '@/lib/builder/storefront-template-preview-demo';
import {getStorefrontGlobalStyleState} from '@/lib/builder/storefront-global-styles';
import {PLANS} from '@/lib/plans/catalog';
import {
  PLAYROOM_DESIGN_TOKENS,
  PLAYROOM_DISCOVERY_PATH,
  PLAYROOM_ENGINE_CONTRACT,
  PLAYROOM_HOME_PAGE,
  PLAYROOM_HOME_SECTION_ORDER,
  PLAYROOM_PRODUCT_PAGE,
  PLAYROOM_TEMPLATE_KEY,
  PLAYROOM_TEMPLATE_PACKAGE,
  PLAYROOM_TEMPLATE_VERSION,
  PLAYROOM_VISUAL_DNA,
} from '@/lib/builder/templates/playroom';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const registry=()=>createStorefrontVisualBuilderComponentRegistry();
const renderers=()=>createStorefrontVisualBuilderRendererRegistry();
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);

describe('Playroom canonical template — visual fidelity recovery',()=>{
  it('preserves canonical identity while replacing the obsolete visual baseline',()=>{
    expect(PLAYROOM_TEMPLATE_KEY).toBe('gaming.playroom');
    expect(PLAYROOM_TEMPLATE_VERSION).toBe(1);
    expect(PLAYROOM_VISUAL_DNA.character).toBe('playful-console-discovery-graphic-premium-social-gaming');
    expect(PLAYROOM_VISUAL_DNA.position).toBe('broad-gaming-console-discovery-store');
    expect(PLAYROOM_VISUAL_DNA.visualLanguage).toEqual(expect.arrayContaining(['two-tier-commerce-header','neon-panel-system','layered-gaming-hero','platform-and-play-style-selectors']));
    expect(PLAYROOM_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['loot-box-gambling-ui','pc-builder-duplication','collector-vault-duplication']));
    expect(PLAYROOM_DESIGN_TOKENS['--shoporation-color-background']).toBe('#0B0A1A');
    expect(PLAYROOM_DESIGN_TOKENS['--shoporation-color-accent-secondary']).toBe('#5C7CFA');
    expect(PLAYROOM_DESIGN_TOKENS['--shoporation-color-accent-tertiary']).toBe('#B8E34A');
  });

  it('locks the recovered authority composition without creating a Playroom-only renderer',()=>{
    expect(PLAYROOM_DISCOVERY_PATH).toEqual(['Válassz platformot','Nézd meg az újdonságokat','Találd meg a játékot','Játssz együtt','Egészítsd ki']);
    expect(PLAYROOM_HOME_PAGE.metadata?.sectionOrder).toEqual(PLAYROOM_HOME_SECTION_ORDER);
    expect(PLAYROOM_HOME_PAGE.metadata?.visualAuthority).toBe('Neon Gamer Webáruház Kezdőlap');
    expect(PLAYROOM_HOME_SECTION_ORDER).toEqual(['Commerce Header','Gaming Hero','USP Row','Play Style & Platform','Gaming Setup','Player 2','Upgrade Your Game Night','Featured Games','Platform Compatibility & Gift','Play Together Community','Footer']);
    expect(PLAYROOM_HOME_PAGE.sections[0]?.componentKey).toBe('system.commerce-header');
    expect(PLAYROOM_HOME_PAGE.sections[0]?.children?.map(child=>child.componentKey)).toEqual(['system.search','system.navigation']);
    expect(nodeById(PLAYROOM_HOME_PAGE,'playroom-hero-title')?.componentKey).toBe('content.heading');
    expect(nodeById(PLAYROOM_HOME_PAGE,'playroom-hero-support')?.componentKey).toBe('content.text');
    expect(nodeById(PLAYROOM_HOME_PAGE,'playroom-hero-primary')?.componentKey).toBe('content.button');
    expect(nodeById(PLAYROOM_HOME_PAGE,'playroom-hero-art')?.componentKey).toBe('content.image');
    expect(JSON.stringify(PLAYROOM_HOME_PAGE)).not.toMatch(/PlayroomOnly|template-local|configurator\.builder|loot.?box|gambling|fake.?countdown/i);
  });

  it('uses original production-safe artwork with no baked UI copy and retires old Playroom demo SVGs',()=>{
    const source=JSON.stringify(PLAYROOM_TEMPLATE_PACKAGE);
    expect(source).not.toContain('/storefront-demo/playroom/');
    for(const file of ['hero-neon.svg','setup-neon.svg','player-two.svg','gift-neon.svg']){
      const svg=readFileSync(`public/storefront/playroom/${file}`,'utf8');
      expect(svg).toContain('<svg');
      expect(svg).not.toMatch(/<text\b|<foreignObject\b|javascript:/i);
    }
    expect(source).toContain('/storefront/playroom/hero-neon.svg');
    expect(source).toContain('/storefront/playroom/setup-neon.svg');
    expect(source).toContain('/storefront/playroom/player-two.svg');
    expect(source).toContain('/storefront/playroom/gift-neon.svg');
  });

  it('reuses E3/E6/E7 rather than creating a gaming-specific duplicate engine',()=>{
    expect(PLAYROOM_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E3','E6','E7','E10','E13']);
    expect(PLAYROOM_ENGINE_CONTRACT.integration.E3).toMatch(/finder/);
    expect(PLAYROOM_ENGINE_CONTRACT.integration.E6).toMatch(/compatibility/);
    expect(PLAYROOM_ENGINE_CONTRACT.integration.E7).toMatch(/structured/);
    expect(PLAYROOM_ENGINE_CONTRACT.compatibilityPrinciples.unknownIsCompatible).toBe(false);
    expect(PLAYROOM_ENGINE_CONTRACT.compatibilityPrinciples.noSilentReplacement).toBe(true);
    expect(PLAYROOM_ENGINE_CONTRACT.separation.rigForge).toBe('no-pc-build-configurator');
  });

  it('ships 14 Alap-compatible page presets through the full shared Visual Builder registry',()=>{
    const components=registry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:PLAYROOM_TEMPLATE_PACKAGE,componentRegistry:components,capability});
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(gate.ok).toBe(true);
    expect(PLAYROOM_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(new Set(PLAYROOM_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).size).toBe(14);
    for(const page of PLAYROOM_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,components,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
      expect(page.sections[0]?.componentKey).toBe('system.commerce-header');
    }
  });

  it('automatically exposes the recovered Home sections through the canonical Preset Library',()=>{
    const bundle=createStorefrontPresetBundle(PLAYROOM_TEMPLATE_PACKAGE);
    const homeSectionIds=new Set(bundle.sectionPresets.filter(item=>item.pageKey==='playroom.home').map(item=>item.nodeId));
    for(const id of ['playroom-hero','playroom-trust','playroom-selectors','playroom-setup','playroom-player-two','playroom-upgrade','playroom-featured-games','playroom-platform-match','playroom-play-together'])expect(homeSectionIds.has(id),id).toBe(true);
    expect(bundle.componentPresets.some(item=>item.componentKey==='system.search')).toBe(true);
  });

  it('renders the recovered Home through one shared runtime at Desktop, Tablet and Mobile',()=>{
    const context=createStorefrontTemplatePreviewBindingContext({template:PLAYROOM_TEMPLATE_PACKAGE,page:PLAYROOM_HOME_PAGE});
    for(const viewport of ['desktop','tablet','mobile'] as const){
      const html=renderToStaticMarkup(<StorefrontRuntimeRenderer page={PLAYROOM_HOME_PAGE} viewport={viewport} bindingContext={context} componentRegistry={registry()} rendererRegistry={renderers()} capability={capability}/>);
      expect(html).toContain('data-storefront-component="system.commerce-header"');
      expect(html).toContain('data-storefront-component="system.search"');
      expect(html).toContain('PLAY YOUR WAY');
      expect(html).toContain('How do you play?');
      expect(html).toContain('Choose your platform');
      expect(html).toContain('Upgrade your game night');
      expect(html).toContain('Platform Compatibility');
      expect(html).toContain('PLAY TOGETHER');
      expect(html).toContain('data-storefront-global-styles-v1');
    }
  });

  it('materializes the recovered multi-accent palette into normal Global Styles authority',()=>{
    const state=getStorefrontGlobalStyleState(PLAYROOM_HOME_PAGE);
    expect(state.tokens).toMatchObject({accent:'#ff6b5e',accentSecondary:'#5c7cfa',accentTertiary:'#b8e34a',headingFont:'geometric-sans',bodyFont:'system-sans'});
  });

  it('renders PDP 7/12 + 5/12 with authoritative price, stock, reviews and compatibility evidence',()=>{
    const context={brand:{name:'Playroom Demo',homeHref:'/'},product:{name:'Adventure Game',description:'Játék.',gallery:[{src:'https://example.com/game.jpg',alt:'Game'}],badges:['New'],keySpecs:[{specKey:'platform',label:'Platform',displayValue:'Console',missing:false}]},variant:{optionLabel:'Kiadás',optionOptions:[]},pricing:{displayPrice:'19 990 Ft',compareAtPrice:''},inventory:{stockLabel:'Raktáron'},reviews:{summary:{rating:4.8,count:24,label:'Ellenőrzött értékelések'}},compatibility:{productEvidence:[{ruleId:'platform',label:'Platform',status:'compatible',explanation:'A termék platformadata egyezik.',leftDisplay:'Console',rightDisplay:'Console'}]},recommendations:{products:[]}};
    const desktop=renderToStaticMarkup(<StorefrontRuntimeRenderer page={PLAYROOM_PRODUCT_PAGE} viewport="desktop" bindingContext={context} componentRegistry={registry()} rendererRegistry={renderers()} capability={capability}/>);
    const mobile=renderToStaticMarkup(<StorefrontRuntimeRenderer page={PLAYROOM_PRODUCT_PAGE} viewport="mobile" bindingContext={context} componentRegistry={registry()} rendererRegistry={renderers()} capability={capability}/>);
    expect(desktop).toContain('span 7 / span 7');
    expect(desktop).toContain('span 5 / span 5');
    expect(mobile).toContain('span 12 / span 12');
    expect(desktop).toContain('data-storefront-structured="key-specs"');
    expect(desktop).toContain('Ellenőrzött értékelések');
    expect(desktop).toContain('data-storefront-compatibility="evidence"');
  });

  it('keeps install draft-only and demo fixtures free from fabricated gaming authority',()=>{
    const demo=JSON.stringify(PLAYROOM_TEMPLATE_PACKAGE.demoFixtures??[]);
    expect(demo).not.toMatch(/releaseDate|reviewScore|rating|compatible.?true|platformSupport|countdown|lootBox|odds|guaranteed/i);
    const plan=planStorefrontTemplateInstallation({template:PLAYROOM_TEMPLATE_PACKAGE,componentRegistry:registry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='gaming-playroom')).toBe(true);
  });

  it('keeps checkout provider-neutral and E13-authoritative',()=>{
    const checkout=PLAYROOM_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId|callbackUrl/i);
  });
});
