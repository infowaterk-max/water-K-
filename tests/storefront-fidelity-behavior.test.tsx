import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {STOREFRONT_PAGE_SCHEMA_VERSION,type StorefrontViewport} from '@/lib/builder/storefront-foundation';
import {
  STOREFRONT_CORE_COMMERCE_COMPONENT_DEFINITIONS,
} from '@/lib/builder/storefront-commerce';
import {createStorefrontCoreCommerceRendererRegistry} from '@/components/builder/storefront-commerce';
import type {StorefrontPageDocument,StorefrontResolvedComponentNode} from '@/lib/builder/storefront-runtime';
import {
  resolveStorefrontContentTabsMode,
  sanitizeStorefrontContentTabsBehavior,
  sanitizeStorefrontMobileCollectionBehavior,
  setStorefrontNodeBehavior,
} from '@/lib/builder/storefront-fidelity-behavior';

const page:StorefrontPageDocument={schemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,pageKey:'behavior.product',pageType:'product',templateKey:'behavior.reference',templateVersion:1,metadata:{test:true},sections:[]};
const resolvedNode=(componentKey:string,config:Record<string,unknown>):StorefrontResolvedComponentNode=>({id:'behavior-node',componentKey,componentVersion:1,config,children:[],resolved:{hidden:false,gridSpan:12}});
const render=(componentKey:string,config:Record<string,unknown>,viewport:StorefrontViewport)=>{
  const renderer=createStorefrontCoreCommerceRendererRegistry().get(componentKey,1);
  if(!renderer)throw new Error('TEST_RENDERER_MISSING');
  const node=resolvedNode(componentKey,config);
  return renderToStaticMarkup(<>{renderer({node,config,children:null,page,viewport})}</>);
};
const tabs=[
  {id:'details',label:'Részletek',title:'Termékrészletek',copy:'Első panel'},
  {id:'usage',label:'Használat',title:'Használati útmutató',copy:'Második panel'},
];
const products=[
  {id:'one',name:'Első',href:'/termek/one',price:1000},
  {id:'two',name:'Második',href:'/termek/two',price:2000},
];

describe('Visual Builder shared behavior contract',()=>{
  it('fails closed to static/grid defaults and clamps bounded behavior values',()=>{
    expect(sanitizeStorefrontContentTabsBehavior({mode:'script',defaultIndex:900,allowCollapse:'yes'})).toEqual({mode:'static',defaultIndex:50,allowCollapse:false});
    expect(sanitizeStorefrontMobileCollectionBehavior({mobileMode:'carousel',mobilePeek:2})).toEqual({mobileMode:'carousel',mobilePeek:.95});
    expect(resolveStorefrontContentTabsMode({mode:'responsive'},'desktop')).toBe('tabs');
    expect(resolveStorefrontContentTabsMode({mode:'responsive'},'tablet')).toBe('tabs');
    expect(resolveStorefrontContentTabsMode({mode:'responsive'},'mobile')).toBe('accordion');
  });

  it('exposes behavior only on the bounded shared commerce surfaces',()=>{
    const behaviorComponents=STOREFRONT_CORE_COMMERCE_COMPONENT_DEFINITIONS.filter(definition=>definition.manifest.configurable.includes('behavior')).map(definition=>definition.manifest.componentKey);
    expect(behaviorComponents).toEqual(['commerce.collection-navigation','commerce.product-grid','commerce.content-tabs','commerce.recommendation-row']);
    expect(STOREFRONT_CORE_COMMERCE_COMPONENT_DEFINITIONS.find(definition=>definition.manifest.componentKey==='commerce.checkout-summary')?.manifest.configurable).not.toContain('behavior');
  });

  it('keeps content tabs byte-direction compatible in the default static behavior',()=>{
    const html=render('commerce.content-tabs',{tabs},'desktop');
    expect(html).toContain('href="#details"');
    expect(html).toContain('href="#usage"');
    expect(html).toContain('Első panel');
    expect(html).toContain('Második panel');
    expect(html).not.toContain('data-storefront-content-behavior');
    expect(html).not.toContain('role="tablist"');
  });

  it('renders accessible opt-in tabs and responsive mobile accordion without a second content authority',()=>{
    const desktop=render('commerce.content-tabs',{tabs,behavior:{mode:'tabs',defaultIndex:1}},'desktop');
    expect(desktop).toContain('data-storefront-content-behavior="tabs"');
    expect(desktop).toContain('role="tablist"');
    expect(desktop).toContain('role="tab"');
    expect(desktop).toContain('aria-selected="true"');
    expect(desktop).toContain('role="tabpanel"');
    const mobile=render('commerce.content-tabs',{tabs,behavior:{mode:'responsive',allowCollapse:true}},'mobile');
    expect(mobile).toContain('data-storefront-content-behavior="accordion"');
    expect(mobile).toContain('aria-expanded="true"');
    expect(mobile).toContain('role="region"');
  });

  it('activates the carousel only on mobile and keeps desktop as the regular grid',()=>{
    const config={products,columns:4,behavior:{mobileMode:'carousel',mobilePeek:.8}};
    const mobile=render('commerce.product-grid',config,'mobile');
    expect(mobile).toContain('data-storefront-mobile-carousel="true"');
    expect(mobile).toContain('scroll-snap-type:x mandatory');
    expect(mobile).toContain('grid-auto-columns:minmax(0,80%)');
    const desktop=render('commerce.product-grid',config,'desktop');
    expect(desktop).not.toContain('data-storefront-mobile-carousel');
    expect(desktop).not.toContain('scroll-snap-type');
  });

  it('writes sanitized behavior immutably and reset removes the explicit override',()=>{
    const document:StorefrontPageDocument={...page,sections:[{id:'tabs-node',componentKey:'commerce.content-tabs',componentVersion:1,config:{tabs}}]};
    const changed=setStorefrontNodeBehavior(document,'tabs-node',{mode:'responsive',defaultIndex:2,allowCollapse:true});
    expect(document.sections[0].config.behavior).toBeUndefined();
    expect(changed.sections[0].config.behavior).toEqual({mode:'responsive',defaultIndex:2,allowCollapse:true});
    const reset=setStorefrontNodeBehavior(changed,'tabs-node',null);
    expect(reset.sections[0].config.behavior).toBeUndefined();
    expect(()=>setStorefrontNodeBehavior({...page,sections:[{id:'heading',componentKey:'content.heading',componentVersion:1,config:{text:'Nem támogatott'}}]},'heading',{mode:'tabs'})).toThrow('FIDELITY_BEHAVIOR_COMPONENT_UNSUPPORTED');
  });
});
