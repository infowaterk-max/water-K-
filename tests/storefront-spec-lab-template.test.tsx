import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontConfiguratorRendererRegistry} from '@/components/builder/storefront-configurator';
import {createStorefrontConfiguratorComponentRegistry} from '@/lib/builder/storefront-configurator';
import {PLANS} from '@/lib/plans/catalog';
import {
  SPEC_LAB_DECISION_PATH,
  SPEC_LAB_DESIGN_TOKENS,
  SPEC_LAB_ENGINE_CONTRACT,
  SPEC_LAB_HOME_PAGE,
  SPEC_LAB_HOME_SECTION_ORDER,
  SPEC_LAB_LEGACY_WORKING_NAME,
  SPEC_LAB_PRODUCT_PAGE,
  SPEC_LAB_TEMPLATE_KEY,
  SPEC_LAB_TEMPLATE_PACKAGE,
  SPEC_LAB_TEMPLATE_VERSION,
  SPEC_LAB_VISUAL_DNA,
} from '@/lib/builder/templates/spec-lab';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const capability={plan:'alap' as const,features:PLANS.alap.features};

describe('Scale-out Wave 18 Spec Lab',()=>{
  it('locks Electronics & Technology #3 as canonical Spec Lab with preserved Tech Command alias',()=>{
    expect(SPEC_LAB_TEMPLATE_KEY).toBe('tech.spec-lab');
    expect(SPEC_LAB_TEMPLATE_VERSION).toBe(1);
    expect(SPEC_LAB_LEGACY_WORKING_NAME).toBe('Tech Command');
    expect(SPEC_LAB_VISUAL_DNA.character).toBe('dark-navy-specialist-tech-decision-lab');
    expect(SPEC_LAB_VISUAL_DNA.palette).toMatchObject({background:'deep-navy',accentPrimary:'controlled-orange-ochre'});
    expect(SPEC_LAB_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['gamer-rgb','white-background-block','fake-compatibility','fake-trade-in-valuation']));
    expect(SPEC_LAB_DESIGN_TOKENS['--shoporation-color-background']).toBe('#08111F');
  });

  it('locks the accepted decision path and Home composition',()=>{
    expect(SPEC_LAB_DECISION_PATH).toEqual(['Mit keresel?','Mire használod?','Hasonlítsd össze','Tech Finder','Építsd fel a szetted']);
    expect(SPEC_LAB_HOME_PAGE.metadata?.sectionOrder).toEqual(SPEC_LAB_HOME_SECTION_ORDER);
    expect(SPEC_LAB_HOME_SECTION_ORDER).toEqual(['Mit keresel?','Mire használod?','Hasonlítsd össze','Tech Finder','Építsd fel a szetted','Compatibility Matrix','System Requirements','Accessory Matcher','Trade-in','Tech Magazine','Footer']);
    expect(JSON.stringify(SPEC_LAB_HOME_PAGE)).not.toMatch(/gamer-rgb|neon-rainbow|white-background/i);
  });

  it('reuses current shared engines instead of creating duplicate tech authorities',()=>{
    expect(SPEC_LAB_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E3','E5','E6','E7','E10','E13']);
    expect(SPEC_LAB_ENGINE_CONTRACT.integration.E3).toMatch(/finder/);
    expect(SPEC_LAB_ENGINE_CONTRACT.integration.E5).toMatch(/configurator/);
    expect(SPEC_LAB_ENGINE_CONTRACT.integration.E6).toMatch(/compatibility/);
    expect(SPEC_LAB_ENGINE_CONTRACT.integration.E7).toMatch(/specification/);
    expect(SPEC_LAB_ENGINE_CONTRACT.compatibilityPrinciples.unknownIsCompatible).toBe(false);
    expect(SPEC_LAB_ENGINE_CONTRACT.compatibilityPrinciples.noSilentReplacement).toBe(true);
    expect(SPEC_LAB_ENGINE_CONTRACT.integrationHooks.tradeIn).toMatch(/no-valuation-authority/);
    expect(SPEC_LAB_ENGINE_CONTRACT.integrationHooks.product3dViewer).toMatch(/no-template-owned-3d-engine/);
  });

  it('ships 14 Alap-compatible presets through the existing configurator registry',()=>{
    const registry=createStorefrontConfiguratorComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:SPEC_LAB_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(gate.ok).toBe(true);
    expect(SPEC_LAB_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(new Set(SPEC_LAB_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).size).toBe(14);
    for(const page of SPEC_LAB_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('renders comparison, Finder, builder, Unknown compatibility, requirements, trade-in guard and Magazine in the shared runtime',()=>{
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer
      page={SPEC_LAB_HOME_PAGE}
      viewport="desktop"
      bindingContext={{
        brand:{name:'Spec Lab Demo',homeHref:'/',copyright:'© Spec Lab Demo'},navigation:{primary:[],footer:[]},
        collection:{techCategories:[{id:'display',label:'Kijelzők',href:'/webaruhaz?c=display'}]},
        catalog:{useCaseNavigation:[{id:'creator',label:'Creator',href:'#creator'}]},
        commerce:{compareProducts:[{id:'a',name:'Model A',href:'#a',price:'—'},{id:'b',name:'Model B',href:'#b',price:'—'}],compareRows:[{label:'USB',values:['USB-C','USB-C']}],compareHref:'/oldal/osszehasonlitas',tradeInHref:'/oldal/trade-in'},
        finder:{currentStep:{title:'1. lépés',copy:'Válaszd ki a célt.'},currentQuestion:{label:'Mire használod?',options:[{id:'creator',label:'Creator',href:'#creator',selected:true}]},progressLabel:'1 / 3',resultHref:'#spec-builder',resultStatus:'exact'},
        configurator:{slots:[{id:'host',label:'Host',required:true,href:'#host'},{id:'display',label:'Display',required:true,href:'#display'}],selectedCount:1,requiredCount:2,currentSubtotal:'',currency:'HUF',actionHref:'#spec-compatibility'},
        compatibility:{status:'unknown',summary:'A DisplayPort verzió még nincs megadva.',evidence:[]},
        product:{systemRequirements:[{specKey:'displayport',label:'DisplayPort',displayValue:'1.4',missing:false}]},
        recommendations:{accessories:[]},
        content:{techMagazineItems:[{id:'ports',title:'Portok és szabványok',href:'/blog/ports',image:'/storefront-demo/spec-lab/matrix.svg',imageAlt:'Port mátrix'}]},
      }}
      componentRegistry={createStorefrontConfiguratorComponentRegistry()}
      rendererRegistry={createStorefrontConfiguratorRendererRegistry()}
      capability={capability}
    />);
    expect(html).toContain('Mire használod?');
    expect(html).toContain('Model A');
    expect(html).toContain('Creator');
    expect(html).toContain('Host');
    expect(html).toContain('data-status="unknown"');
    expect(html).toContain('A DisplayPort verzió még nincs megadva.');
    expect(html).toContain('DisplayPort');
    expect(html).toContain('Trade-in');
    expect(html).toContain('Portok és szabványok');
  });

  it('renders PDP 7/12 + 5/12 with structured specs, compatibility evidence and an external 3D-viewer hook',()=>{
    const context={brand:{name:'Spec Lab Demo',homeHref:'/'},navigation:{primary:[],footer:[]},product:{name:'Connectivity Hub',description:'Műszaki hub.',gallery:[{src:'https://example.com/hub.jpg',alt:'Hub'}],badges:['USB4'],keySpecs:[{specKey:'usb',label:'USB',displayValue:'USB4',missing:false}],specGroups:[{groupKey:'io',label:'I/O',rows:[{specKey:'dp',label:'DisplayPort',displayValue:'1.4',missing:false}]}],viewerHref:'#viewer-demo'},variant:{optionLabel:'Változat',optionOptions:[]},pricing:{displayPrice:'49 900 Ft',compareAtPrice:''},inventory:{stockLabel:'Raktáron'},commerce:{purchaseLabel:'Kosárba teszem',purchaseHref:'#purchase',compareHref:'#compare',compareCount:1},compatibility:{status:'compatible',summary:'A kiválasztott rendszerrel kompatibilis.',productEvidence:[{ruleId:'usb4',label:'USB4',status:'compatible',explanation:'Mindkét oldal USB4.',leftDisplay:'USB4',rightDisplay:'USB4'}]},recommendations:{accessories:[]}};
    const desktop=renderToStaticMarkup(<StorefrontRuntimeRenderer page={SPEC_LAB_PRODUCT_PAGE} viewport="desktop" bindingContext={context} componentRegistry={createStorefrontConfiguratorComponentRegistry()} rendererRegistry={createStorefrontConfiguratorRendererRegistry()} capability={capability}/>);
    const mobile=renderToStaticMarkup(<StorefrontRuntimeRenderer page={SPEC_LAB_PRODUCT_PAGE} viewport="mobile" bindingContext={context} componentRegistry={createStorefrontConfiguratorComponentRegistry()} rendererRegistry={createStorefrontConfiguratorRendererRegistry()} capability={capability}/>);
    expect(desktop).toContain('span 7 / span 7');
    expect(desktop).toContain('span 5 / span 5');
    expect(mobile).toContain('span 12 / span 12');
    expect(desktop).toContain('data-storefront-structured="key-specs"');
    expect(desktop).toContain('data-storefront-compatibility="evidence"');
    expect(desktop).toContain('3D nézet');
    expect(desktop).toContain('#viewer-demo');
  });

  it('keeps install draft-only and demo data free from fabricated authority',()=>{
    const demo=JSON.stringify(SPEC_LAB_TEMPLATE_PACKAGE.demoFixtures??[]);
    expect(demo).not.toMatch(/compatible.?true|compatibilityStatus|guaranteed|fps|latency.?guarantee|tradeInValue|fixedSetupPrice/i);
    const plan=planStorefrontTemplateInstallation({template:SPEC_LAB_TEMPLATE_PACKAGE,componentRegistry:createStorefrontConfiguratorComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='tech-spec-lab')).toBe(true);
  });

  it('keeps checkout provider-neutral and E13-authoritative',()=>{
    const checkout=SPEC_LAB_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId/i);
  });
});
