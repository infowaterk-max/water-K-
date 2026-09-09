import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontConfiguratorRendererRegistry} from '@/components/builder/storefront-configurator';
import {createStorefrontConfiguratorComponentRegistry} from '@/lib/builder/storefront-configurator';
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
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const capability={plan:'alap' as const,features:PLANS.alap.features};

describe('Scale-out Wave 19 Playroom',()=>{
  it('opens Gaming & Geek #7 with a distinct broad-discovery identity',()=>{
    expect(PLAYROOM_TEMPLATE_KEY).toBe('gaming.playroom');
    expect(PLAYROOM_TEMPLATE_VERSION).toBe(1);
    expect(PLAYROOM_VISUAL_DNA.character).toBe('playful-console-discovery-graphic-premium-social-gaming');
    expect(PLAYROOM_VISUAL_DNA.position).toBe('broad-gaming-console-discovery-store');
    expect(PLAYROOM_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['rgb-rainbow-chaos','military-esports-black-red','loot-box-gambling-ui','pc-builder-duplication','collector-vault-duplication']));
    expect(PLAYROOM_DESIGN_TOKENS['--shoporation-color-background']).toBe('#111025');
  });

  it('locks a discovery-first path and Home composition distinct from Rig Forge and Loot Vault',()=>{
    expect(PLAYROOM_DISCOVERY_PATH).toEqual(['Válassz platformot','Nézd meg az újdonságokat','Találd meg a játékot','Játssz együtt','Egészítsd ki']);
    expect(PLAYROOM_HOME_PAGE.metadata?.sectionOrder).toEqual(PLAYROOM_HOME_SECTION_ORDER);
    expect(PLAYROOM_HOME_SECTION_ORDER).toEqual(['Playroom Hero','Shop by Platform','New & Noteworthy','Game Finder','Play Together','Genre Rooms','Accessories by Platform','Platform Match','Editor’s Picks','Guides & Reviews','Footer']);
    expect(JSON.stringify(PLAYROOM_HOME_PAGE)).not.toMatch(/configurator\.builder|loot.?vault|rgb-rainbow|countdown|loot.?box/i);
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

  it('ships 14 Alap-compatible presets through the existing shared registry',()=>{
    const registry=createStorefrontConfiguratorComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:PLAYROOM_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(gate.ok).toBe(true);
    expect(PLAYROOM_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(new Set(PLAYROOM_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).size).toBe(14);
    for(const page of PLAYROOM_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('renders platform discovery, Game Finder, Unknown compatibility and editorial guidance in the shared runtime',()=>{
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer
      page={PLAYROOM_HOME_PAGE}
      viewport="desktop"
      bindingContext={{
        brand:{name:'Playroom Demo',homeHref:'/',copyright:'© Playroom Demo'},navigation:{primary:[],footer:[]},
        content:{playroomHero:{title:'Ma mivel játszunk?',copy:'Fedezd fel a játékokat.',image:'/storefront-demo/playroom/hero.svg',imageAlt:'Playroom'},platformNavigation:{title:'Platformok'},playTogether:{title:'Játssz együtt',copy:'Közös játék.'},guides:{title:'Útmutatók',items:[{id:'guide',title:'Platformválasztó',href:'/blog/platform',image:'/storefront-demo/playroom/platforms.svg',imageAlt:'Platformok'}]}},
        collection:{platforms:[{id:'console',label:'Console',href:'/webaruhaz?platform=console'}]},
        catalog:{newNoteworthy:[],genreNavigation:[{id:'adventure',label:'Adventure',href:'#adventure'}],editorPicks:[]},
        finder:{currentStep:{title:'1. lépés',copy:'Válassz.'},currentQuestion:{label:'Mivel szeretnél játszani?',options:[{id:'coop',label:'Co-op',href:'#coop',selected:true}]},progressLabel:'1 / 3',resultHref:'#playroom-editor-picks',resultStatus:'exact'},
        recommendations:{accessories:[]},
        compatibility:{status:'unknown',summary:'A platform támogatás nincs teljesen megadva.',evidence:[]},
      }}
      componentRegistry={createStorefrontConfiguratorComponentRegistry()}
      rendererRegistry={createStorefrontConfiguratorRendererRegistry()}
      capability={capability}
    />);
    expect(html).toContain('Ma mivel játszunk?');
    expect(html).toContain('Platformok');
    expect(html).toContain('Mivel szeretnél játszani?');
    expect(html).toContain('Co-op');
    expect(html).toContain('Adventure');
    expect(html).toContain('data-status="unknown"');
    expect(html).toContain('A platform támogatás nincs teljesen megadva.');
    expect(html).toContain('Platformválasztó');
  });

  it('renders PDP 7/12 + 5/12 with structured facts, real review binding and compatibility evidence',()=>{
    const context={brand:{name:'Playroom Demo',homeHref:'/'},navigation:{primary:[],footer:[]},product:{eyebrow:'Playroom',name:'Adventure Game',description:'Játék.',gallery:[{src:'https://example.com/game.jpg',alt:'Game'}],badges:['New'],keySpecs:[{specKey:'platform',label:'Platform',displayValue:'Console',missing:false}],specGroups:[{groupKey:'game',label:'Játékadatok',rows:[{specKey:'players',label:'Játékosok',displayValue:'1–2',missing:false}]}]},variant:{optionLabel:'Kiadás',optionOptions:[]},pricing:{displayPrice:'19 990 Ft',compareAtPrice:''},inventory:{stockLabel:'Raktáron'},reviews:{summary:{rating:4.8,count:24,label:'Ellenőrzött értékelések'}},commerce:{purchaseLabel:'Kosárba teszem',purchaseHref:'#purchase'},compatibility:{status:'compatible',summary:'A kiválasztott platformhoz támogatott.',productEvidence:[{ruleId:'platform',label:'Platform',status:'compatible',explanation:'A termék platformadata egyezik.',leftDisplay:'Console',rightDisplay:'Console'}]},recommendations:{products:[]}};
    const desktop=renderToStaticMarkup(<StorefrontRuntimeRenderer page={PLAYROOM_PRODUCT_PAGE} viewport="desktop" bindingContext={context} componentRegistry={createStorefrontConfiguratorComponentRegistry()} rendererRegistry={createStorefrontConfiguratorRendererRegistry()} capability={capability}/>);
    const mobile=renderToStaticMarkup(<StorefrontRuntimeRenderer page={PLAYROOM_PRODUCT_PAGE} viewport="mobile" bindingContext={context} componentRegistry={createStorefrontConfiguratorComponentRegistry()} rendererRegistry={createStorefrontConfiguratorRendererRegistry()} capability={capability}/>);
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
    const plan=planStorefrontTemplateInstallation({template:PLAYROOM_TEMPLATE_PACKAGE,componentRegistry:createStorefrontConfiguratorComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='gaming-playroom')).toBe(true);
  });

  it('keeps checkout provider-neutral and E13-authoritative',()=>{
    const checkout=PLAYROOM_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId/i);
  });
});
