import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {
  INTERACTIVE_SCENE_COMMERCE_AUTHORITY,
  resolveInteractiveScene,
  validateInteractiveSceneConfig,
} from '@/lib/commerce/interactive-scene';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {hasStorefrontRuntimeCapability,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {validateStorefrontBuilderWorkingCopy} from '@/lib/builder/storefront-visual-builder';
import {isStorefrontManagedConfigKey} from '@/lib/builder/storefront-managed-config';
import {PLANS} from '@/lib/plans/catalog';

const config={
  sceneKey:'look-1',kind:'look' as const,
  hotspots:[
    {id:'jacket',productId:'p1',position:{desktop:{x:25,y:35},mobile:{x:55,y:62}}},
    {id:'shoe',productId:'p2',position:{desktop:{x:72,y:78}}},
  ],
};
const products=[
  {productId:'p1',label:'Kabát',href:'/products/jacket',eligible:true,priceDisplay:'39 990 Ft',stockLabel:'Készleten'},
  {productId:'p2',label:'Cipő',href:'/products/shoe',eligible:false,priceDisplay:'29 990 Ft',stockLabel:'Elfogyott'},
] as const;
const proCapability={plan:'pro' as const,features:PLANS.pro.features};

function scenePage(sceneKind='look',hotspots:unknown[]=config.hotspots):StorefrontPageDocument{
  return{
    schemaVersion:1,pageKey:'home',pageType:'home',templateKey:'test.scene',templateVersion:1,
    sections:[{id:'scene',componentKey:'commerce.interactive-scene',componentVersion:1,config:{sceneKey:'look-1',sceneKind,title:'Shop the Look',hotspots,backgroundImage:'/look.jpg',backgroundAlt:'Őszi összeállítás',showSetSummary:true},bindings:{products:{path:'catalog.interactiveSceneProducts'}}}],
  };
}

describe('Special Commerce Wave 1 — Interactive Scene Commerce',()=>{
  it('resolves responsive hotspots from authoritative product projections and fails closed for ineligible products',()=>{
    expect(validateInteractiveSceneConfig(config)).toEqual([]);
    const scene=resolveInteractiveScene({config,products,viewport:'mobile'});
    expect(scene.hotspots).toHaveLength(1);
    expect(scene.hotspots[0]).toMatchObject({productId:'p1',label:'Kabát',priceDisplay:'39 990 Ft',stockLabel:'Készleten',position:{x:55,y:62}});
    expect(scene.excludedProductIds).toEqual(['p2']);
    expect(scene.fallbackRequired).toBe(false);
  });

  it('does not create a second commerce authority',()=>{
    expect(Object.values(INTERACTIVE_SCENE_COMMERCE_AUTHORITY).every(value=>value===false)).toBe(true);
  });

  it('is a first-class Pro Builder component and fails closed for Alap',()=>{
    const definition=createStorefrontVisualBuilderComponentRegistry().get('commerce.interactive-scene',1)!;
    expect(definition).toBeTruthy();
    expect(definition.manifest.capability).toEqual({minPlan:'pro',features:['catalog','interactiveSceneCommerce']});
    expect(hasStorefrontRuntimeCapability(definition.manifest.capability,{plan:'alap',features:PLANS.alap.features})).toBe(false);
    expect(hasStorefrontRuntimeCapability(definition.manifest.capability,proCapability)).toBe(true);
    expect(definition.bindingSlots).toContain('products');
  });

  it('renders accessible hotspot links from runtime binding data on the same Page Schema',()=>{
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer page={scenePage()} viewport="mobile" bindingContext={{catalog:{interactiveSceneProducts:products}}} componentRegistry={createStorefrontVisualBuilderComponentRegistry()} rendererRegistry={createStorefrontVisualBuilderRendererRegistry()} capability={proCapability}/>);
    expect(html).toContain('data-storefront-interactive-scene-v1');
    expect(html).toContain('Shop the Look');
    expect(html).toContain('Kabát');
    expect(html).toContain('39 990 Ft');
    expect(html).toContain('left:55%');
    expect(html).not.toContain('Cipő');
  });

  it('keeps scene internals out of the generic editor while allowing dedicated merchant controls to persist them',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    const definition=registry.get('commerce.interactive-scene',1)!;
    expect(definition.manifest.configurable).not.toContain('hotspots');
    expect(definition.manifest.configurable).not.toContain('sceneKind');
    expect(isStorefrontManagedConfigKey('commerce.interactive-scene','hotspots')).toBe(true);
    expect(isStorefrontManagedConfigKey('commerce.interactive-scene','sceneKind')).toBe(true);
    const previous=scenePage('look',[]);
    const next=scenePage('room',[{id:'chair',productId:'p1',position:{desktop:{x:40,y:60}}}]);
    expect(validateStorefrontBuilderWorkingCopy({previous,next,registry,capability:proCapability})).toBe(true);
  });

  it('keeps merchant controls product-picker based and mirrors the released Pro entitlement into both migration streams',()=>{
    const controls=readFileSync('src/components/admin/storefront-interactive-scene-controls.tsx','utf8');
    expect(controls).toContain('Hotspot hozzáadása');
    expect(controls).toContain('Válassz terméket');
    expect(controls).toContain('Az ár és a készlet mindig a termékkatalógusból érkezik.');
    expect(controls).not.toContain('raw coordinate');
    for(const path of['supabase/migrations/20260912220500_special_commerce_interactive_scene_entitlement.sql','supabase/customer-baseline/migrations/0019_special_commerce_interactive_scene_entitlement.sql']){
      const sql=readFileSync(path,'utf8');
      expect(sql).toContain("('interactiveSceneCommerce','released','feature'");
      expect(sql).toContain("('pro','interactiveSceneCommerce')");
    }
  });

  it('uses the published Page Schema homepage first and keeps the legacy storefront only as compatibility fallback',()=>{
    const home=readFileSync('src/app/page.tsx','utf8');
    expect(home).toContain("resolveCurrentStorefrontPublishedRuntimePage('home')");
    expect(home).toContain('data-storefront-published-runtime="page-schema"');
    expect(home).toContain('bindingContext={published.bindingContext}');
    expect(home).toContain('capability={published.capability}');
    expect(home).toContain('data-storefront-legacy-fallback="home"');
  });
});
