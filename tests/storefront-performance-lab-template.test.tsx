import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontStoryRendererRegistry} from '@/components/builder/storefront-story';
import {createStorefrontStoryComponentRegistry} from '@/lib/builder/storefront-story';
import {PLANS} from '@/lib/plans/catalog';
import {
  PERFORMANCE_LAB_DESIGN_TOKENS,
  PERFORMANCE_LAB_ENGINE_CONTRACT,
  PERFORMANCE_LAB_GOAL_CONTRACT,
  PERFORMANCE_LAB_HOME_PAGE,
  PERFORMANCE_LAB_HOME_SECTION_ORDER,
  PERFORMANCE_LAB_PRODUCT_PAGE,
  PERFORMANCE_LAB_TEMPLATE_KEY,
  PERFORMANCE_LAB_TEMPLATE_PACKAGE,
  PERFORMANCE_LAB_TEMPLATE_VERSION,
  PERFORMANCE_LAB_VISUAL_DNA,
} from '@/lib/builder/templates/performance-lab';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const capability={plan:'alap' as const,features:PLANS.alap.features};

describe('Scale-out Wave 23 Performance Lab',()=>{
  it('locks a technical performance-dashboard identity distinct from Trail and Sport Hub',()=>{
    expect(PERFORMANCE_LAB_TEMPLATE_KEY).toBe('sport.performance-lab');
    expect(PERFORMANCE_LAB_TEMPLATE_VERSION).toBe(1);
    expect(PERFORMANCE_LAB_VISUAL_DNA.character).toBe('dark-technical-performance-dashboard-lab');
    expect(PERFORMANCE_LAB_VISUAL_DNA.position).toBe('goal-spec-compare-performance-specialist');
    expect(PERFORMANCE_LAB_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining([
      'trail-expedition-cinematic-clone',
      'sport-hub-mainstream-clone',
      'diamond-route-selector-clone',
      'generic-hero-card-grid-store',
      'fake-lab-results',
      'fake-performance-gains',
    ]));
    expect(PERFORMANCE_LAB_DESIGN_TOKENS['--shoporation-color-background']).toBe('#07111F');
    expect(PERFORMANCE_LAB_DESIGN_TOKENS['--shoporation-color-primary']).toBe('#2F80ED');
    expect(PERFORMANCE_LAB_DESIGN_TOKENS['--shoporation-color-accent']).toContain('#45E08C');
  });

  it('uses shared engines only and keeps Gear Finder declarative in v1',()=>{
    expect(PERFORMANCE_LAB_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
    expect(PERFORMANCE_LAB_ENGINE_CONTRACT.gearFinder).toMatch(/declarative-discovery/);
    expect(PERFORMANCE_LAB_ENGINE_CONTRACT.gearFinder).toMatch(/not-stateful-guided-finder-authority/);
    expect(PERFORMANCE_LAB_ENGINE_CONTRACT.metricRule).toMatch(/source-supplied-measurements/);
    expect(PERFORMANCE_LAB_ENGINE_CONTRACT.chartRule).toMatch(/never-infers-missing-axis-values/);
    expect(PERFORMANCE_LAB_ENGINE_CONTRACT.authorityRule).toMatch(/never-invents-test-results-performance-gains/);
  });

  it('ships 14 Alap-compatible Page Schema presets through shared component contracts',()=>{
    const registry=createStorefrontStoryComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:PERFORMANCE_LAB_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(gate.ok).toBe(true);
    expect(PERFORMANCE_LAB_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(new Set(PERFORMANCE_LAB_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).size).toBe(14);
    for(const page of PERFORMANCE_LAB_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('locks the dashboard-style Home order',()=>{
    expect(PERFORMANCE_LAB_HOME_PAGE.metadata?.sectionOrder).toEqual(PERFORMANCE_LAB_HOME_SECTION_ORDER);
    expect(PERFORMANCE_LAB_HOME_SECTION_ORDER).toEqual([
      'Performance Lab Hero',
      'Goal Console',
      'Metric Snapshot',
      'Gear Finder',
      'Compare Spotlight',
      'Lab Tested',
      'Expert Review',
      'Research Notes',
      'Footer',
    ]);
  });

  it('locks Mi a célod and the implementation goal console without claiming suitability',()=>{
    expect(PERFORMANCE_LAB_GOAL_CONTRACT.question).toBe('Mi a célod?');
    expect(PERFORMANCE_LAB_GOAL_CONTRACT.goals).toEqual(['Gyorsaság','Állóképesség','Erő','Technika']);
    expect(PERFORMANCE_LAB_GOAL_CONTRACT.presentation).toBe('dashboard-goal-console');
    expect(PERFORMANCE_LAB_GOAL_CONTRACT.authority).toMatch(/does-not-imply-product-suitability/);
    expect(PERFORMANCE_LAB_HOME_PAGE.metadata?.shoppingEntryQuestion).toBe('Mi a célod?');
    expect(PERFORMANCE_LAB_HOME_PAGE.metadata?.gearFinderBoundary).toMatch(/not-stateful-guided-finder-authority/);
  });

  it('renders goal console, metric snapshot, Gear Finder, compare, Lab Tested and expert layers together',()=>{
    const bindingContext={
      brand:{name:'Performance Lab Demo',homeHref:'/',copyright:'© Performance Lab Demo'},
      navigation:{primary:[],footer:[]},
      content:{
        performanceGoals:{speedHref:'/webaruhaz?goal=speed',enduranceHref:'/webaruhaz?goal=endurance',strengthHref:'/webaruhaz?goal=strength',techniqueHref:'/webaruhaz?goal=technique'},
        metricSnapshot:{title:'Metric Snapshot'},
        performanceGearFinder:{title:'Goal-matched gear'},
        compareSpotlight:{title:'Compare Spotlight',copy:'Spec-based comparison'},
        labTested:{title:'Lab Tested',copy:'Forrásból érkező mérési háttér.'},
        expertReview:{title:'Expert Review',copy:'Szakértői videó kontextus.'},
        researchNotes:[{id:'note',storyType:'journal',title:'Research Note',href:'/blog/research-note',excerpt:'Módszertani háttér.'}],
      },
      performance:{metricSnapshot:[{specKey:'mass',label:'Tömeg',displayValue:'Megadott adat',missing:false}]},
      catalog:{goalRecommendations:[{id:'runner',name:'Lab Runner',href:'/termek/lab-runner',price:'49 900 Ft'}]},
      compare:{products:[],rows:[]},
    };
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer page={PERFORMANCE_LAB_HOME_PAGE} viewport="desktop" bindingContext={bindingContext} componentRegistry={createStorefrontStoryComponentRegistry()} rendererRegistry={createStorefrontStoryRendererRegistry()} capability={capability}/>);
    expect(html).toContain('Mi a célod?');
    expect(html).toContain('Gyorsaság');
    expect(html).toContain('Állóképesség');
    expect(html).toContain('Erő');
    expect(html).toContain('Technika');
    expect(html).toContain('Metric Snapshot');
    expect(html).toContain('Lab Runner');
    expect(html).toContain('Compare Spotlight');
    expect(html).toContain('Lab Tested');
    expect(html).toContain('Expert Review');
    expect(html).toContain('Research Note');
  });

  it('renders a deliberately different 6/12 + 6/12 PDP and supplied structured facts only',()=>{
    const context={
      brand:{name:'Performance Lab Demo',homeHref:'/'},navigation:{primary:[],footer:[]},
      product:{name:'Lab Runner',description:'Performance-oriented footwear.',gallery:[{src:'https://example.com/lab-runner.jpg',alt:'Lab Runner'}],badges:[],keySpecs:[{specKey:'mass',label:'Tömeg',displayValue:'245 g',missing:false}],specGroups:[{groupKey:'lab',label:'Megadott mérési adatok',rows:[{specKey:'drop',label:'Drop',displayValue:'8 mm',missing:false}]}]},
      variant:{optionLabel:'Méret',optionOptions:[{id:'42',label:'42',href:'#42',available:true}]},pricing:{displayPrice:'49 900 Ft',compareAtPrice:''},inventory:{stockLabel:'Raktáron'},commerce:{purchaseLabel:'Kosárba teszem',purchaseHref:'#purchase'},
      compare:{label:'Összehasonlítom',href:'#compare',count:1,products:[],groups:[]},content:{productLabNote:{title:'Lab Note',copy:'Forrásból érkező mérési kontextus.'}},recommendations:{products:[]},
    };
    const desktop=renderToStaticMarkup(<StorefrontRuntimeRenderer page={PERFORMANCE_LAB_PRODUCT_PAGE} viewport="desktop" bindingContext={context} componentRegistry={createStorefrontStoryComponentRegistry()} rendererRegistry={createStorefrontStoryRendererRegistry()} capability={capability}/>);
    const mobile=renderToStaticMarkup(<StorefrontRuntimeRenderer page={PERFORMANCE_LAB_PRODUCT_PAGE} viewport="mobile" bindingContext={context} componentRegistry={createStorefrontStoryComponentRegistry()} rendererRegistry={createStorefrontStoryRendererRegistry()} capability={capability}/>);
    expect(desktop).toContain('span 6 / span 6');
    expect(mobile).toContain('span 12 / span 12');
    expect(desktop).toContain('245 g');
    expect(desktop).toContain('8 mm');
    expect(desktop).toContain('Összehasonlítom');
    expect(desktop).toContain('Lab Note');
  });

  it('keeps demo content free from fabricated lab and performance authority',()=>{
    const demo=JSON.stringify(PERFORMANCE_LAB_TEMPLATE_PACKAGE.demoFixtures??[]);
    expect(demo).not.toMatch(/labResult|performanceGain|fasterBy|enduranceGain|fitnessSuitable|athleteEndorsement|verifiedTestScore|ranking|guaranteedPerformance/i);
    const goals=(PERFORMANCE_LAB_TEMPLATE_PACKAGE.demoFixtures??[]).filter(item=>item.entityType==='collection').map(item=>item.entityKey);
    expect(goals).toEqual(['speed-goal','endurance-goal','strength-goal','technique-goal']);
  });

  it('keeps template installation draft-only',()=>{
    const plan=planStorefrontTemplateInstallation({template:PERFORMANCE_LAB_TEMPLATE_PACKAGE,componentRegistry:createStorefrontStoryComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='sport-performance-lab')).toBe(true);
  });

  it('keeps checkout provider-neutral and E13-authoritative',()=>{
    const checkout=PERFORMANCE_LAB_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId/i);
  });
});