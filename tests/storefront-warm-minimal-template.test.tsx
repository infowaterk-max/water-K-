import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontStoryVisualRendererRegistry} from '@/components/builder/storefront-story-visual';
import {createStorefrontStoryVisualComponentRegistry} from '@/lib/builder/storefront-story-visual';
import {PLANS} from '@/lib/plans/catalog';
import {
  WARM_MINIMAL_ENGINE_CONTRACT,
  WARM_MINIMAL_HOME_PAGE,
  WARM_MINIMAL_HOME_SECTION_ORDER,
  WARM_MINIMAL_MARKETING_LAYER_CONTRACT,
  WARM_MINIMAL_PRODUCT_PAGE,
  WARM_MINIMAL_ROOM_LABELS,
  WARM_MINIMAL_TEMPLATE_KEY,
  WARM_MINIMAL_TEMPLATE_PACKAGE,
  WARM_MINIMAL_TEMPLATE_VERSION,
  WARM_MINIMAL_VISUAL_DNA,
} from '@/lib/builder/templates/warm-minimal';
import {STOREFRONT_TEMPLATE_PORTFOLIO_STATUS,getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {evaluateStorefrontTemplateCapabilityGate,planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const componentRegistry=()=>createStorefrontStoryVisualComponentRegistry();
const rendererRegistry=()=>createStorefrontStoryVisualRendererRegistry();

function walk(nodes:readonly any[]):any[]{
  return nodes.flatMap(node=>[node,...walk(node.children??[])]);
}

describe('Storefront portfolio package 25 — Warm Minimal',()=>{
  it('locks the accepted Warm Minimal identity without reusing an existing package',()=>{
    expect(WARM_MINIMAL_TEMPLATE_KEY).toBe('home.warm-minimal');
    expect(WARM_MINIMAL_TEMPLATE_VERSION).toBe(1);
    expect(WARM_MINIMAL_VISUAL_DNA.character).toBe('warm-minimal-natural-material-room-led-home-commerce');
    expect(WARM_MINIMAL_VISUAL_DNA.category).toBe('home-living-design');
    expect(WARM_MINIMAL_VISUAL_DNA.exclusions).toEqual(expect.arrayContaining(['cool-grey-dominance','high-gloss-luxury','cluttered-marketplace','rustic-farmhouse','boho-decor']));
    expect(WARM_MINIMAL_ENGINE_CONTRACT.requiredForFullExperience).toEqual(['E1','E2','E7','E10','E13']);
  });

  it('is a real catalog increment: 25 implemented / 17 remaining',()=>{
    expect(getStorefrontTemplatePackage('home.warm-minimal',1)).toBeDefined();
    expect(STOREFRONT_TEMPLATE_PORTFOLIO_STATUS.implemented).toBe(25);
    expect(STOREFRONT_TEMPLATE_PORTFOLIO_STATUS.remaining).toBe(17);
  });

  it('ships all 14 Alap-compatible presets through shared runtime authority',()=>{
    const registry=componentRegistry();
    const gate=evaluateStorefrontTemplateCapabilityGate({template:WARM_MINIMAL_TEMPLATE_PACKAGE,componentRegistry:registry,capability});
    expect(gate.violations.filter(x=>x.severity==='error')).toEqual([]);
    expect(gate.ok).toBe(true);
    expect(WARM_MINIMAL_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(new Set(WARM_MINIMAL_TEMPLATE_PACKAGE.pages.map(x=>x.pageType)).size).toBe(14);
    for(const page of WARM_MINIMAL_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('preserves the accepted room-led Home sequence and labels',()=>{
    expect(WARM_MINIMAL_HOME_PAGE.metadata?.sectionOrder).toEqual(WARM_MINIMAL_HOME_SECTION_ORDER);
    expect(WARM_MINIMAL_HOME_SECTION_ORDER).toEqual([
      'Warm Minimal Hero','Shop by Room','Material Palette','Shop the Room','Room Story','Quiet Essentials','Soft Layers','Editorial Journal / Home Notes','Newsletter / Footer CTA',
    ]);
    expect(WARM_MINIMAL_ROOM_LABELS).toEqual(['Living room','Bedroom','Kitchen','Bath','Entry']);
  });

  it('keeps hero marketing layers independently editable instead of baking copy into imagery',()=>{
    const nodes=walk(WARM_MINIMAL_HOME_PAGE.sections);
    for(const id of ['warm-minimal-hero-image','warm-minimal-hero-eyebrow','warm-minimal-hero-heading','warm-minimal-hero-copy','warm-minimal-hero-primary','warm-minimal-hero-secondary']){
      expect(nodes.some(node=>node.id===id)).toBe(true);
    }
    expect(WARM_MINIMAL_MARKETING_LAYER_CONTRACT.businessCopyInImage).toBe(false);
    expect(WARM_MINIMAL_MARKETING_LAYER_CONTRACT.productTruthInImage).toBe(false);
  });

  it('renders room, material, editorial and commerce surfaces together',()=>{
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer page={WARM_MINIMAL_HOME_PAGE} viewport="desktop" bindingContext={{
      brand:{name:'Warm House',homeHref:'/',copyright:'© Warm House'},
      navigation:{primary:[],footer:[]},
      content:{warmMinimalHero:{title:'Soft light, natural rhythm.'},materialPalette:{items:[{specKey:'linen',label:'Linen',displayValue:'merchant supplied'}]},shopTheRoom:{title:'Calm Living'},roomStory:{title:'Morning Light'},warmMinimalQuietEssentials:{title:'Quiet essentials'},homeNotes:{items:[{id:'note',storyType:'journal',title:'Layering neutrals',href:'/blog/layering-neutrals',excerpt:'Home note.'}]},newsletter:{title:'Warm Notes'}},
      collection:{rooms:[{id:'living',label:'Living room',href:'/webaruhaz?room=living'}]},
      catalog:{quietEssentials:[{id:'chair',name:'Linen Lounge Chair',href:'/termek/linen-lounge-chair',price:'159 900 Ft'}]},
      recommendations:{softLayers:[]},
    }} componentRegistry={componentRegistry()} rendererRegistry={rendererRegistry()} capability={capability}/>);
    expect(html).toContain('Soft light, natural rhythm.');
    expect(html).toContain('Living room');
    expect(html).toContain('Linen');
    expect(html).toContain('Calm Living');
    expect(html).toContain('Morning Light');
    expect(html).toContain('Linen Lounge Chair');
    expect(html).toContain('Warm Notes');
  });

  it('locks the accepted PDP geometry and source-authoritative material/dimension data',()=>{
    const context={brand:{name:'Warm House',homeHref:'/'},navigation:{primary:[],footer:[]},product:{name:'Linen Lounge Chair',description:'Chair.',gallery:[{src:'https://example.com/chair.jpg',alt:'Chair'}],badges:[],keySpecs:[{specKey:'material',label:'Anyag',displayValue:'Len + tölgy'}],specGroups:[{groupKey:'dimensions',label:'Méretek & ápolás',rows:[{specKey:'width',label:'Szélesség',displayValue:'72 cm'}]}]},pricing:{displayPrice:'159 900 Ft',compareAtPrice:''},inventory:{stockLabel:'Raktáron'},variant:{optionLabel:'Anyag / kivitel',optionOptions:[{id:'sand',label:'Sand',href:'#sand',available:true}]},commerce:{purchaseLabel:'Kosárba teszem',purchaseHref:'#purchase'},content:{productTrust:{copy:'Aktuális szállítási feltételek.'}},recommendations:{products:[]}};
    const desktop=renderToStaticMarkup(<StorefrontRuntimeRenderer page={WARM_MINIMAL_PRODUCT_PAGE} viewport="desktop" bindingContext={context} componentRegistry={componentRegistry()} rendererRegistry={rendererRegistry()} capability={capability}/>);
    const mobile=renderToStaticMarkup(<StorefrontRuntimeRenderer page={WARM_MINIMAL_PRODUCT_PAGE} viewport="mobile" bindingContext={context} componentRegistry={componentRegistry()} rendererRegistry={rendererRegistry()} capability={capability}/>);
    expect(desktop).toContain('span 7 / span 7');
    expect(desktop).toContain('span 5 / span 5');
    expect(mobile).toContain('span 12 / span 12');
    expect(desktop).toContain('Len + tölgy');
    expect(desktop).toContain('72 cm');
    expect(desktop).toContain('Aktuális szállítási feltételek.');
  });

  it('keeps demo and images non-authoritative',()=>{
    const demo=JSON.stringify(WARM_MINIMAL_TEMPLATE_PACKAGE.demoFixtures??[]);
    expect(demo).not.toMatch(/price|stock|rating|reviewCount|certified|guaranteed|sustainable|handmade in|made in/i);
    expect(JSON.stringify(WARM_MINIMAL_HOME_PAGE)).not.toMatch(/fixed price|only [0-9]+ left|guaranteed delivery/i);
  });

  it('keeps installation draft-only and checkout provider-neutral',()=>{
    const plan=planStorefrontTemplateInstallation({template:WARM_MINIMAL_TEMPLATE_PACKAGE,componentRegistry:componentRegistry(),capability});
    expect(plan.mode).toBe('install');
    expect(plan.pages).toHaveLength(14);
    expect(plan.mutationBoundary).toMatchObject({storefrontPageDrafts:true,products:false,variants:false,customers:false,orders:false,b2b:false});
    expect(plan.demoLifecycle.install.every(x=>x.namespace==='home-warm-minimal')).toBe(true);
    const checkout=WARM_MINIMAL_TEMPLATE_PACKAGE.pages.find(x=>x.pageType==='checkout')!;
    expect(checkout.metadata?.engineBinding).toBe('E13');
    expect(JSON.stringify(checkout)).not.toMatch(/K&H|khpos|vpos|payment_secret|merchantId/i);
  });
});
