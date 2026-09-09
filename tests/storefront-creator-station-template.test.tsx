import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontConfiguratorRendererRegistry} from '@/components/builder/storefront-configurator';
import {createStorefrontConfiguratorComponentRegistry} from '@/lib/builder/storefront-configurator';
import {PLANS} from '@/lib/plans/catalog';
import {
  CREATOR_STATION_DESIGN_TOKENS,
  CREATOR_STATION_ENGINE_CONTRACT,
  CREATOR_STATION_HOME_PAGE,
  CREATOR_STATION_HOME_SECTION_ORDER,
  CREATOR_STATION_PRODUCT_PAGE,
  CREATOR_STATION_TEMPLATE_KEY,
  CREATOR_STATION_TEMPLATE_PACKAGE,
  CREATOR_STATION_TEMPLATE_VERSION,
  CREATOR_STATION_VISUAL_DNA,
  CREATOR_STATION_WORKFLOWS,
} from '@/lib/builder/templates/creator-station';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const capability={plan:'alap' as const,features:PLANS.alap.features};

describe('Scale-out Wave 17 Creator Station',()=>{
  it('locks the accepted Electronics & Tech creator-workflow identity',()=>{
    expect(CREATOR_STATION_TEMPLATE_KEY).toBe('tech.creator-station');
    expect(CREATOR_STATION_TEMPLATE_VERSION).toBe(1);
    expect(CREATOR_STATION_VISUAL_DNA.character).toBe('dark-digital-creator-workflow-commerce');
    expect(CREATOR_STATION_VISUAL_DNA.palette).toMatchObject({background:'deep-graphite-charcoal',text:'cool-white',accentPrimary:'controlled-cyan',accentSecondary:'controlled-magenta-violet'});
    expect(CREATOR_STATION_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['white-background-block','sterile-saas','fake-compatibility']));
    expect(CREATOR_STATION_DESIGN_TOKENS['--shoporation-color-background']).toBe('#0B0D10');
    expect(CREATOR_STATION_WORKFLOWS).toEqual(['YouTube','Podcast','Stream','Fotó','Short Video','Home Studio']);
  });

  it('uses the current shared engine meanings without a second setup system',()=>{
    expect(CREATOR_STATION_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E3','E5','E6','E7','E10','E13']);
    expect(CREATOR_STATION_ENGINE_CONTRACT.integration.E3).toMatch(/workflow-finder/);
    expect(CREATOR_STATION_ENGINE_CONTRACT.integration.E5).toMatch(/configurator/);
    expect(CREATOR_STATION_ENGINE_CONTRACT.integration.E6).toMatch(/compatibility/);
    expect(CREATOR_STATION_ENGINE_CONTRACT.compatibilityPrinciples.unknownIsCompatible).toBe(false);
    expect(CREATOR_STATION_ENGINE_CONTRACT.compatibilityPrinciples.noSilentReplacement).toBe(true);
  });

  it('ships 14 Alap-compatible presets through the existing configurator registry chain',()=>{
    const registry=createStorefrontConfiguratorComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:CREATOR_STATION_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(gate.ok).toBe(true);
    expect(CREATOR_STATION_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(new Set(CREATOR_STATION_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).size).toBe(14);
    for(const page of CREATOR_STATION_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('locks the exact accepted Home workflow order with no extra white hero block',()=>{
    expect(CREATOR_STATION_HOME_PAGE.metadata?.sectionOrder).toEqual(CREATOR_STATION_HOME_SECTION_ORDER);
    expect(CREATOR_STATION_HOME_SECTION_ORDER).toEqual(['Build Your Workflow','Visual Equipment Chain','Timeline','Setup Scenes','Compatibility Checker','System Requirements','Starter / Advanced / Studio','Creator Magazine','Footer']);
    expect(JSON.stringify(CREATOR_STATION_HOME_PAGE)).not.toMatch(/bright-white|white-background/i);
  });

  it('renders workflow Finder, equipment chain, Unknown compatibility, requirements and Magazine in one shared runtime',()=>{
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer
      page={CREATOR_STATION_HOME_PAGE}
      viewport="desktop"
      bindingContext={{
        brand:{name:'Creator Station Demo',homeHref:'/',copyright:'© Creator Station Demo'},
        navigation:{primary:[],footer:[]},
        finder:{currentStep:{title:'1. lépés',copy:'Válassz workflow-t.'},currentQuestion:{label:'Milyen workflow-t építesz?',options:[{id:'youtube',label:'YouTube',href:'#youtube',selected:true}]},progressLabel:'1 / 3',resultHref:'#equipment-chain',resultStatus:'exact'},
        configurator:{chainTitle:'Visual Equipment Chain',slots:[{id:'camera',label:'Camera',required:true,href:'#camera'},{id:'lens',label:'Lens',required:true,href:'#lens'},{id:'light',label:'Light',required:true,href:'#light'},{id:'microphone',label:'Microphone',required:true,href:'#mic'},{id:'capture',label:'Capture',required:true,href:'#capture'},{id:'computer',label:'Computer',required:true,href:'#computer'},{id:'software',label:'Software',required:true,href:'#software'}]},
        workflow:{timeline:[{id:'record',label:'REC',href:'#record',copy:'Capture'},{id:'edit',label:'EDIT',href:'#edit',copy:'Timeline'}],systemRequirements:[{specKey:'usb',label:'USB',displayValue:'USB-C',missing:false}],tiers:{products:[{id:'starter',name:'Starter',href:'#starter',price:'—'},{id:'advanced',name:'Advanced',href:'#advanced',price:'—'},{id:'studio',name:'Studio',href:'#studio',price:'—'}],rows:[{label:'Capture',values:['1080p','4K','4K multi-source']}],compareHref:'/oldal/creator-workflow'}},
        collection:{setupScenes:[{id:'desk',label:'Desk Creator',href:'/webaruhaz?scene=desk'},{id:'mobile',label:'Mobile Creator',href:'/webaruhaz?scene=mobile'}]},
        compatibility:{status:'unknown',summary:'A capture card portadata még hiányzik.'},
        story:{creatorMagazine:{items:[{id:'signal',title:'Signal Chain',href:'/blog/signal-chain',image:'/storefront-demo/creator-station/magazine.svg',imageAlt:'Signal chain'}]}},
      }}
      componentRegistry={createStorefrontConfiguratorComponentRegistry()}
      rendererRegistry={createStorefrontConfiguratorRendererRegistry()}
      capability={capability}
    />);
    expect(html).toContain('Milyen workflow-t építesz?');
    expect(html).toContain('YouTube');
    expect(html).toContain('Camera');
    expect(html).toContain('Software');
    expect(html).toContain('data-storefront-compatibility="status"');
    expect(html).toContain('data-status="unknown"');
    expect(html).toContain('A capture card portadata még hiányzik.');
    expect(html).toContain('USB-C');
    expect(html).toContain('Signal Chain');
  });

  it('renders PDP 7/12 + 5/12 with E7 specs and explainable E6 evidence',()=>{
    const context={
      brand:{name:'Creator Station Demo',homeHref:'/'},navigation:{primary:[],footer:[]},
      product:{name:'Capture Interface',description:'Creator I/O interface.',gallery:[{src:'https://example.com/interface.jpg',alt:'Capture Interface'}],badges:['USB-C'],keySpecs:[{specKey:'input',label:'Input',displayValue:'HDMI',missing:false}],specGroups:[{groupKey:'io',label:'I/O',rows:[{specKey:'usb',label:'USB',displayValue:'USB-C',missing:false}]}]},
      variant:{optionLabel:'Változat',optionOptions:[]},pricing:{displayPrice:'89 900 Ft',compareAtPrice:''},inventory:{stockLabel:'Raktáron'},commerce:{purchaseLabel:'Kosárba teszem',purchaseHref:'#purchase',compareHref:'#compare',compareCount:1},
      compatibility:{productEvidence:[{ruleId:'usb-capture',label:'Capture port',status:'compatible',explanation:'A kiválasztott számítógép USB-C portja támogatott.',leftDisplay:'USB-C',rightDisplay:'USB-C'}]},recommendations:{products:[]},
    };
    const desktop=renderToStaticMarkup(<StorefrontRuntimeRenderer page={CREATOR_STATION_PRODUCT_PAGE} viewport="desktop" bindingContext={context} componentRegistry={createStorefrontConfiguratorComponentRegistry()} rendererRegistry={createStorefrontConfiguratorRendererRegistry()} capability={capability}/>);
    const mobile=renderToStaticMarkup(<StorefrontRuntimeRenderer page={CREATOR_STATION_PRODUCT_PAGE} viewport="mobile" bindingContext={context} componentRegistry={createStorefrontConfiguratorComponentRegistry()} rendererRegistry={createStorefrontConfiguratorRendererRegistry()} capability={capability}/>);
    expect(desktop).toContain('span 7 / span 7');
    expect(desktop).toContain('span 5 / span 5');
    expect(mobile).toContain('span 12 / span 12');
    expect(desktop).toContain('data-storefront-structured="key-specs"');
    expect(desktop).toContain('data-storefront-compatibility="evidence"');
    expect(desktop).toContain('A kiválasztott számítógép USB-C portja támogatott.');
  });

  it('keeps template install draft-only and demo data free from fake compatibility or performance authority',()=>{
    const demo=JSON.stringify(CREATOR_STATION_TEMPLATE_PACKAGE.demoFixtures??[]);
    expect(demo).not.toMatch(/compatible.?true|compatibilityStatus|guaranteed|fps|latency.?guarantee|fixedSetupPrice/i);
    const plan=planStorefrontTemplateInstallation({template:CREATOR_STATION_TEMPLATE_PACKAGE,componentRegistry:createStorefrontConfiguratorComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='tech-creator-station')).toBe(true);
  });

  it('keeps checkout provider-neutral and final commerce authority in E13',()=>{
    const checkout=CREATOR_STATION_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId/i);
  });
});
