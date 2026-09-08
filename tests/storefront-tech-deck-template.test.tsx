import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontStructuredProductRendererRegistry} from '@/components/builder/storefront-structured-product';
import {PLANS} from '@/lib/plans/catalog';
import {createStorefrontStructuredProductComponentRegistry} from '@/lib/builder/storefront-structured-product';
import {
  StructuredProductSpecificationRegistry,
  buildStructuredProductComparison,
  buildStructuredSpecGroups,
  normalizeStructuredProductDocuments,
  type StructuredSpecAssignments,
} from '@/lib/commerce/structured-product';
import {
  TECH_DECK_ENGINE_CONTRACT,
  TECH_DECK_HOME_PAGE,
  TECH_DECK_HOME_SECTION_ORDER,
  TECH_DECK_PRODUCT_PAGE,
  TECH_DECK_TEMPLATE_KEY,
  TECH_DECK_TEMPLATE_PACKAGE,
  TECH_DECK_TEMPLATE_VERSION,
  TECH_DECK_VISUAL_DNA,
} from '@/lib/builder/templates/tech-deck';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const specRegistry=new StructuredProductSpecificationRegistry({groups:[{key:'core',label:'Fő adatok'},{key:'display',label:'Kijelző'}],specs:[{key:'weight',label:'Tömeg',groupKey:'core',valueType:'measurement',scope:'product',unitFamily:'mass',keySpec:true,comparable:true},{key:'storage',label:'Tárhely',groupKey:'core',valueType:'measurement',scope:'variant',unitFamily:'storage',keySpec:true,comparable:true},{key:'refresh',label:'Képfrissítés',groupKey:'display',valueType:'measurement',scope:'product',unitFamily:'frequency',keySpec:true,comparable:true}]});
const productValues:StructuredSpecAssignments={weight:{type:'measurement',value:195,unit:'g'},refresh:{type:'measurement',value:120,unit:'Hz'}};
const variantValues:StructuredSpecAssignments={storage:{type:'measurement',value:512,unit:'GB'}};
const keySpecs=buildStructuredSpecGroups({registry:specRegistry,productValues,variantValues,keySpecsOnly:true}).flatMap(group=>group.rows);
const specGroups=buildStructuredSpecGroups({registry:specRegistry,productValues,variantValues});
const compareGroups=buildStructuredProductComparison({registry:specRegistry,items:[{id:'nova',label:'Nova Phone',productValues,variantValues},{id:'nova-pro',label:'Nova Phone Pro',productValues:{weight:{type:'measurement',value:205,unit:'g'},refresh:{type:'measurement',value:144,unit:'Hz'}},variantValues:{storage:{type:'measurement',value:1,unit:'TB'}}}],differencesOnly:true});

describe('Golden #2 Tech Deck + E7 Structured Product',()=>{
  it('keeps the agreed consumer-tech identity and engine boundary',()=>{
    expect(TECH_DECK_TEMPLATE_KEY).toBe('tech.tech-deck');
    expect(TECH_DECK_TEMPLATE_VERSION).toBe(1);
    expect(TECH_DECK_VISUAL_DNA.character).toBe('clean-consumer-electronics-decision-commerce');
    expect(TECH_DECK_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['gamer-rgb','industrial-dashboard','dark-spec-lab']));
    expect(TECH_DECK_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E13']);
    expect(TECH_DECK_ENGINE_CONTRACT.wave2Integration.E7).toBe('compare-spec-engine-v1-implemented');
  });

  it('ships one preset for every declared page type and passes the Alap Template Capability Gate',()=>{
    const registry=createStorefrontStructuredProductComponentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:TECH_DECK_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.violations.filter(item=>item.severity==='error')).toEqual([]);
    expect(gate.ok).toBe(true);
    expect(TECH_DECK_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(new Set(TECH_DECK_TEMPLATE_PACKAGE.pages.map(page=>page.pageType)).size).toBe(14);
    for(const page of TECH_DECK_TEMPLATE_PACKAGE.pages){const result=validateStorefrontPageDocument(page,registry,capability);expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);}
  });

  it('locks the approved Home decision-commerce sequence',()=>{
    expect(TECH_DECK_HOME_PAGE.metadata?.sectionOrder).toEqual(TECH_DECK_HOME_SECTION_ORDER);
    expect(TECH_DECK_HOME_SECTION_ORDER).toEqual(['Product Launch Hero','Shop by Category','Featured Technology','Best Sellers','Compare Spotlight','Use Case Navigation','Feature Story','Recommendations','Buying Guides','Footer']);
  });

  it('renders the Tech Deck Home through common Wave 0/1 registries plus E7 components',()=>{
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer page={TECH_DECK_HOME_PAGE} viewport="desktop" bindingContext={{brand:{name:'Nova Store',homeHref:'/',copyright:'© Nova Store'},navigation:{primary:[{label:'Telefonok',href:'/webaruhaz'}],footer:[]},content:{launchHero:{title:'Nova Phone X',copy:'Több teljesítmény. Kevesebb zaj.',price:'349 900 Ft'},categoryNavigation:{title:'Kategóriák'},featuredTechnology:{title:'Kiemelt technológia'},bestSellers:{title:'Legnépszerűbbek'},compareSpotlight:{title:'Válassz könnyebben'},useCases:{title:'Mire használod?'},techFeature:{title:'120 Hz, amit tényleg érzel.'},homeRecommendations:{title:'Neked ajánljuk'},buyingGuides:{title:'Vásárlási útmutatók',items:[{title:'Melyik telefon való neked?',href:'/journal/telefon'}]}},collection:{navigation:[{label:'Telefonok',href:'/webaruhaz?cat=phone'}],useCases:[{label:'Munka',href:'/webaruhaz?use=work'}]},catalog:{featuredTechnology:[{id:'nova',name:'Nova Phone X',href:'/termek/nova',price:'349 900 Ft'}],bestSellers:[{id:'buds',name:'Air Buds',href:'/termek/buds',price:'69 900 Ft'}]},commerce:{compareSpotlight:{products:[{id:'nova',label:'Nova Phone X'},{id:'pro',label:'Nova Phone Pro'}],rows:[{specKey:'storage',label:'Tárhely',summary:'512 GB vs 1000 GB'}]}},recommendations:{home:[]}}} componentRegistry={createStorefrontStructuredProductComponentRegistry()} rendererRegistry={createStorefrontStructuredProductRendererRegistry()} capability={capability}/>);
    expect(html).toContain('data-storefront-structured="product-launch-hero"');
    expect(html).toContain('data-storefront-structured="compare-spotlight"');
    expect(html).toContain('Nova Phone X');
    expect(html).toContain('512 GB vs 1000 GB');
    expect(html).toContain('Nova Store');
  });

  it('renders the 7/12 + 5/12 product decision layout with E7 key specs, spec groups and technical documents',()=>{
    const context={brand:{name:'Nova Store',homeHref:'/'},navigation:{primary:[],footer:[]},product:{eyebrow:'Nova',name:'Nova Phone X',description:'Tiszta forma, gyors kijelző.',gallery:[{src:'https://example.com/phone.jpg',alt:'Nova Phone X'}],badges:['New'],keySpecs,specGroups,documents:normalizeStructuredProductDocuments([{id:'manual',type:'manual' as const,href:'/docs/manual.pdf'},{id:'unsafe',type:'datasheet' as const,href:'javascript:alert(1)'}])},pricing:{displayPrice:'349 900 Ft',compareAtPrice:''},inventory:{stockLabel:'Raktáron'},variant:{colorLabel:'Szín',colorOptions:[{id:'black',label:'Fekete',swatch:'#111111',available:true,selected:true,href:'/termek/nova?color=black'}],optionLabel:'Tárhely',optionOptions:[{id:'512',label:'512 GB',available:true,selected:true,href:'/termek/nova?storage=512'},{id:'1tb',label:'1 TB',available:false,selected:false,href:'javascript:alert(1)'}]},commerce:{compareLabel:'Összehasonlítás',compareHref:'/osszehasonlitas?add=nova',compareCount:1,purchaseLabel:'Kosárba teszem',purchaseHref:'#purchase'},recommendations:{products:[]}};
    const desktop=renderToStaticMarkup(<StorefrontRuntimeRenderer page={TECH_DECK_PRODUCT_PAGE} viewport="desktop" bindingContext={context} componentRegistry={createStorefrontStructuredProductComponentRegistry()} rendererRegistry={createStorefrontStructuredProductRendererRegistry()} capability={capability}/>);
    const mobile=renderToStaticMarkup(<StorefrontRuntimeRenderer page={TECH_DECK_PRODUCT_PAGE} viewport="mobile" bindingContext={context} componentRegistry={createStorefrontStructuredProductComponentRegistry()} rendererRegistry={createStorefrontStructuredProductRendererRegistry()} capability={capability}/>);
    expect(desktop).toContain('span 7 / span 7');
    expect(desktop).toContain('span 5 / span 5');
    expect(mobile).toContain('span 12 / span 12');
    expect(desktop).toContain('data-storefront-structured="key-specs"');
    expect(desktop).toContain('data-storefront-structured="specification-groups"');
    expect(desktop).toContain('data-storefront-structured="technical-documents"');
    expect(desktop).toContain('Használati útmutató');
    expect(desktop).toContain('aria-disabled="true"');
    expect(desktop).not.toContain('javascript:');
  });

  it('renders an E7 compare table from the same structured spec model',()=>{
    const comparePage=TECH_DECK_TEMPLATE_PACKAGE.pages.find(page=>page.metadata?.contentRole==='product-compare')!;
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer page={comparePage} viewport="desktop" bindingContext={{brand:{name:'Nova Store',homeHref:'/'},navigation:{primary:[],footer:[]},content:{compare:{title:'Nova összehasonlítás'}},commerce:{compare:{products:[{id:'nova',label:'Nova Phone',href:'/termek/nova'},{id:'nova-pro',label:'Nova Phone Pro',href:'/termek/nova-pro'}],groups:compareGroups}}} componentRegistry={createStorefrontStructuredProductComponentRegistry()} rendererRegistry={createStorefrontStructuredProductRendererRegistry()} capability={capability}/>);
    expect(html).toContain('data-storefront-structured="compare-table"');
    expect(html).toContain('Nova Phone Pro');
    expect(html).toContain('144 Hz');
  });

  it('materializes Tech Deck as draft-only presentation documents with a separate demo namespace',()=>{
    const plan=planStorefrontTemplateInstallation({template:TECH_DECK_TEMPLATE_PACKAGE,componentRegistry:createStorefrontStructuredProductComponentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(record=>record.namespace==='tech-tech-deck')).toBe(true);
    expect(plan.demoLifecycle.install.every(record=>record.namespacedKey.startsWith('tech-tech-deck:'))).toBe(true);
  });

  it('keeps checkout as an E13 binding surface and provider neutral',()=>{
    const checkout=TECH_DECK_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='checkout');
    expect(checkout?.metadata?.engineBinding).toBe('E13');
    const source=JSON.stringify(checkout);
    expect(source).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId/i);
    expect(source).toContain('commerce.checkout-summary');
  });
});
