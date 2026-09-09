import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontStoryRendererRegistry} from '@/components/builder/storefront-story';
import {createStorefrontStoryComponentRegistry} from '@/lib/builder/storefront-story';
import {PLANS} from '@/lib/plans/catalog';
import {
  TRAIL_EXPEDITION_DESIGN_TOKENS,
  TRAIL_EXPEDITION_ENGINE_CONTRACT,
  TRAIL_EXPEDITION_HOME_PAGE,
  TRAIL_EXPEDITION_HOME_SECTION_ORDER,
  TRAIL_EXPEDITION_PRODUCT_PAGE,
  TRAIL_EXPEDITION_SELECTOR_CONTRACT,
  TRAIL_EXPEDITION_TEMPLATE_KEY,
  TRAIL_EXPEDITION_TEMPLATE_PACKAGE,
  TRAIL_EXPEDITION_TEMPLATE_VERSION,
  TRAIL_EXPEDITION_VISUAL_DNA,
} from '@/lib/builder/templates/trail-expedition';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const capability={plan:'alap' as const,features:PLANS.alap.features};

describe('Scale-out Wave 22 Trail & Expedition',()=>{
  it('locks a cinematic route-first identity distinct from Sport Hub and Performance Lab',()=>{
    expect(TRAIL_EXPEDITION_TEMPLATE_KEY).toBe('sport.trail-expedition');
    expect(TRAIL_EXPEDITION_TEMPLATE_VERSION).toBe(1);
    expect(TRAIL_EXPEDITION_VISUAL_DNA.character).toBe('dark-cinematic-route-first-outdoor-editorial');
    expect(TRAIL_EXPEDITION_VISUAL_DNA.position).toBe('trail-trekking-camping-adventure-commerce');
    expect(TRAIL_EXPEDITION_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining([
      'sport-hub-mainstream-clone',
      'performance-lab-data-clone',
      'generic-hero-cards-grid-clone',
      'fake-route-safety',
      'fake-weather',
      'fake-difficulty',
    ]));
    expect(TRAIL_EXPEDITION_DESIGN_TOKENS['--shoporation-color-background']).toBe('#111714');
  });

  it('uses shared engines only and explicitly refuses stateful Guided Finder authority in v1',()=>{
    expect(TRAIL_EXPEDITION_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(TRAIL_EXPEDITION_ENGINE_CONTRACT.guidedFinder).toMatch(/declarative-navigation-presentation/);
    expect(TRAIL_EXPEDITION_ENGINE_CONTRACT.guidedFinder).toMatch(/not-stateful-guided-finder-authority/);
    expect(TRAIL_EXPEDITION_ENGINE_CONTRACT.authorityRule).toMatch(/never-invents-route-safety-weather-difficulty/);
    expect(TRAIL_EXPEDITION_ENGINE_CONTRACT.checklistRule).toMatch(/does-not-assert-completeness-safety/);
    expect(TRAIL_EXPEDITION_ENGINE_CONTRACT.mapRule).toMatch(/not-live-navigation-weather-or-safety-authority/);
  });

  it('ships 14 Alap-compatible Page Schema presets through the existing Story registry',()=>{
    const registry=createStorefrontStoryComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:TRAIL_EXPEDITION_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(gate.ok).toBe(true);
    expect(TRAIL_EXPEDITION_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(new Set(TRAIL_EXPEDITION_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).size).toBe(14);
    for(const page of TRAIL_EXPEDITION_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('locks the approved route-first Home order',()=>{
    expect(TRAIL_EXPEDITION_HOME_PAGE.metadata?.sectionOrder).toEqual(TRAIL_EXPEDITION_HOME_SECTION_ORDER);
    expect(TRAIL_EXPEDITION_HOME_SECTION_ORDER).toEqual([
      'Trail & Expedition Hero',
      'Adventure Selector',
      'Gear Checklist',
      'Adventure Kits',
      'Route / Map Feature',
      'Trail Essentials',
      'Field Notes',
      'Outdoor Guides',
      'Footer',
    ]);
  });

  it('locks Hová indulsz, six approved adventure routes and Diamond/Slant interaction metadata',()=>{
    expect(TRAIL_EXPEDITION_SELECTOR_CONTRACT.question).toBe('Hová indulsz?');
    expect(TRAIL_EXPEDITION_SELECTOR_CONTRACT.routes).toEqual([
      'Egynapos túra',
      'Hétvégi trekking',
      'Kemping',
      'Trail run',
      'Téli kaland',
      'Családi kiruccanás',
    ]);
    expect(TRAIL_EXPEDITION_SELECTOR_CONTRACT.geometry).toBe('diamond-slant');
    expect(TRAIL_EXPEDITION_SELECTOR_CONTRACT.defaultState).toBe('muted-desaturated');
    expect(TRAIL_EXPEDITION_SELECTOR_CONTRACT.activeState).toBe('color-detail-cta');
    expect(TRAIL_EXPEDITION_SELECTOR_CONTRACT.desktopInteraction).toBe('hover-focus');
    expect(TRAIL_EXPEDITION_SELECTOR_CONTRACT.mobileInteraction).toBe('tap-carousel');
    expect(TRAIL_EXPEDITION_HOME_PAGE.metadata?.shoppingEntryQuestion).toBe('Hová indulsz?');
    expect(TRAIL_EXPEDITION_HOME_PAGE.metadata?.guidedFinderBoundary).toMatch(/not-stateful-guided-finder-authority/);
  });

  it('renders route discovery, editorial checklist, kits, map context and field notes together',()=>{
    const bindingContext={
      brand:{name:'Trail & Expedition Demo',homeHref:'/',copyright:'© Trail Demo'},
      navigation:{primary:[],footer:[]},
      collection:{adventures:[
        {id:'day',label:'Egynapos túra',href:'/webaruhaz?adventure=day-hike'},
        {id:'weekend',label:'Hétvégi trekking',href:'/webaruhaz?adventure=weekend-trekking'},
        {id:'camp',label:'Kemping',href:'/webaruhaz?adventure=camping'},
        {id:'trail',label:'Trail run',href:'/webaruhaz?adventure=trail-run'},
        {id:'winter',label:'Téli kaland',href:'/webaruhaz?adventure=winter-adventure'},
        {id:'family',label:'Családi kiruccanás',href:'/webaruhaz?adventure=family-outing'},
      ]},
      content:{
        tripChecklist:[{id:'layers',storyType:'journal',title:'Réteges öltözet',href:'/blog/reteges-oltozet',excerpt:'Szerkesztett checklist elem.'}],
        trailAdventureKits:{title:'Adventure Kits'},
        routeFeature:{title:'Börzsöny Ridge Notes',copy:'Szerkesztett útvonalkontextus.'},
        trailEssentials:{title:'Trail Essentials'},
        fieldNotes:[{id:'ridge',storyType:'journal',title:'Ridge Field Note',href:'/blog/ridge',excerpt:'Tereptörténet.'}],
        outdoorGuides:[{id:'pack',storyType:'journal',title:'Csomagolási útmutató',href:'/blog/pack',excerpt:'Outdoor guide.'}],
      },
      catalog:{
        adventureKits:[{id:'kit',name:'Camp Kit',href:'/termek/camp-kit',price:'29 900 Ft'}],
        trailEssentials:[{id:'shell',name:'Trail Shell',href:'/termek/trail-shell',price:'49 900 Ft'}],
      },
    };

    const html=renderToStaticMarkup(
      <StorefrontRuntimeRenderer
        page={TRAIL_EXPEDITION_HOME_PAGE}
        viewport="desktop"
        bindingContext={bindingContext}
        componentRegistry={createStorefrontStoryComponentRegistry()}
        rendererRegistry={createStorefrontStoryRendererRegistry()}
        capability={capability}
      />,
    );
    expect(html).toContain('Hová indulsz?');
    expect(html).toContain('Egynapos túra');
    expect(html).toContain('Hétvégi trekking');
    expect(html).toContain('Kemping');
    expect(html).toContain('Trail run');
    expect(html).toContain('Téli kaland');
    expect(html).toContain('Családi kiruccanás');
    expect(html).toContain('Réteges öltözet');
    expect(html).toContain('Camp Kit');
    expect(html).toContain('Börzsöny Ridge Notes');
    expect(html).toContain('Trail Shell');
    expect(html).toContain('Ridge Field Note');
    expect(html).toContain('Csomagolási útmutató');
  });

  it('renders PDP 7/12 + 5/12 and uses only supplied structured outdoor facts',()=>{
    const context={
      brand:{name:'Trail Demo',homeHref:'/'},navigation:{primary:[],footer:[]},
      product:{name:'Trail Shell',description:'Outdoor héjkabát.',gallery:[{src:'https://example.com/shell.jpg',alt:'Trail Shell'}],badges:[],keySpecs:[{specKey:'material',label:'Anyag',displayValue:'Ripstop',missing:false}],specGroups:[{groupKey:'facts',label:'Termékadatok',rows:[{specKey:'weight',label:'Tömeg',displayValue:'320 g',missing:false}]}]},
      variant:{optionLabel:'Méret',optionOptions:[{id:'m',label:'M',href:'#m',available:true}]},
      pricing:{displayPrice:'49 900 Ft',compareAtPrice:''},inventory:{stockLabel:'Raktáron'},
      commerce:{purchaseLabel:'Kosárba teszem',purchaseHref:'#purchase'},
      content:{productFieldNote:{title:'Field Note',copy:'Szerkesztett termékkontextus.'}},recommendations:{products:[]},
    };
    const desktop=renderToStaticMarkup(<StorefrontRuntimeRenderer page={TRAIL_EXPEDITION_PRODUCT_PAGE} viewport="desktop" bindingContext={context} componentRegistry={createStorefrontStoryComponentRegistry()} rendererRegistry={createStorefrontStoryRendererRegistry()} capability={capability}/>);
    const mobile=renderToStaticMarkup(<StorefrontRuntimeRenderer page={TRAIL_EXPEDITION_PRODUCT_PAGE} viewport="mobile" bindingContext={context} componentRegistry={createStorefrontStoryComponentRegistry()} rendererRegistry={createStorefrontStoryRendererRegistry()} capability={capability}/>);
    expect(desktop).toContain('span 7 / span 7');
    expect(desktop).toContain('span 5 / span 5');
    expect(mobile).toContain('span 12 / span 12');
    expect(desktop).toContain('Ripstop');
    expect(desktop).toContain('320 g');
    expect(desktop).toContain('Field Note');
  });

  it('keeps demo content free from fabricated safety, weather, difficulty and performance authority',()=>{
    const demo=JSON.stringify(TRAIL_EXPEDITION_TEMPLATE_PACKAGE.demoFixtures??[]);
    expect(demo).not.toMatch(/safeRoute|safetyRating|weatherProofFor|guaranteedWeather|difficultyRating|fitnessSuitable|survivalGuarantee|performanceGuarantee|officialRoute/i);
    const routes=(TRAIL_EXPEDITION_TEMPLATE_PACKAGE.demoFixtures??[]).filter(item=>item.entityType==='collection').map(item=>item.entityKey);
    expect(routes).toEqual(['day-hike','weekend-trekking','camping','trail-run','winter-adventure','family-outing']);
  });

  it('keeps template installation draft-only',()=>{
    const plan=planStorefrontTemplateInstallation({template:TRAIL_EXPEDITION_TEMPLATE_PACKAGE,componentRegistry:createStorefrontStoryComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='sport-trail-expedition')).toBe(true);
  });

  it('keeps checkout provider-neutral and E13-authoritative',()=>{
    const checkout=TRAIL_EXPEDITION_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId/i);
  });
});