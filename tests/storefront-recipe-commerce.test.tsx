import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {CartProvider} from '@/components/cart/cart-provider';
import {
  RECIPE_COMMERCE_AUTHORITY,
  buildRecipeCommerceAddIntent,
  buildRecipeCommerceReadModel,
  validateRecipeDefinition,
  type RecipeDefinition,
} from '@/lib/commerce/recipe-commerce';
import type {ComposerCatalogItem} from '@/lib/commerce/multi-product-composer';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {hasStorefrontRuntimeCapability,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {isStorefrontManagedConfigKey} from '@/lib/builder/storefront-managed-config';
import {bindStorefrontRecipeCommerceData,setStorefrontRecipeCommerceConfig} from '@/lib/builder/storefront-recipe-commerce-operations';
import {PLANS} from '@/lib/plans/catalog';

const recipe:RecipeDefinition={
  version:1,tenantId:'tenant-1',recipeKey:'garden-salad',title:'Kerti saláta',baseServings:4,minServings:1,maxServings:12,
  ingredients:[
    {ingredientId:'salad',label:'Salátakeverék',quantityDisplay:'200 g',commerceMode:'required',baseCartQuantity:1,scalingPolicy:'proportional-ceil',mappings:[{mappingId:'standard',productId:'p1',variantId:'v1',label:'Salátakeverék 200 g'}]},
    {ingredientId:'oil',label:'Olívaolaj',quantityDisplay:'2 ek',commerceMode:'optional',baseCartQuantity:1,scalingPolicy:'fixed',mappings:[{mappingId:'bottle',productId:'p2',variantId:'v2'}]},
    {ingredientId:'salt',label:'Só',quantityDisplay:'ízlés szerint',commerceMode:'informational'},
  ],
  claims:[
    {claimType:'allergen',claimCode:'gluten',status:'free-from',source:'merchant-structured-data',evidenceRef:'merchant-spec-2026-09'},
    {claimType:'dietary',claimCode:'vegan',status:'meets',source:'certified-source',evidenceRef:'cert-42'},
  ],
};
const catalog:ComposerCatalogItem[]=[
  {productId:'p1',variantId:'v1',label:'Salátakeverék 200 g',href:'/termek/salata',eligible:true,channelVisible:true,price:{amountMinor:1290,currency:'HUF',display:'1 290 Ft',source:'shared-pricing-authority'},stock:{available:true,statusLabel:'Készleten'}},
  {productId:'p2',variantId:'v2',label:'Olívaolaj',href:'/termek/oliva',eligible:true,channelVisible:true,price:{amountMinor:2490,currency:'HUF',display:'2 490 Ft',source:'shared-pricing-authority'},stock:{available:true,statusLabel:'Készleten'}},
];
const proCapability={plan:'pro' as const,features:PLANS.pro.features};

function recipePage():StorefrontPageDocument{
  return{
    schemaVersion:1,pageKey:'home',pageType:'home',templateKey:'test.recipe',templateVersion:1,
    sections:[{id:'recipe',componentKey:'commerce.recipe',componentVersion:1,config:{recipeKey:recipe.recipeKey,defaultServings:8,title:'Vacsora 20 perc alatt',showClaims:true},bindings:{recipes:{path:'catalog.recipeDefinitions'},catalog:{path:'catalog.recipeProducts'}}}],
  };
}

describe('Special Commerce Wave 2 — Recipe Commerce',()=>{
  it('validates explicit recipe structure and scales only declared cart quantities',()=>{
    expect(validateRecipeDefinition(recipe)).toEqual([]);
    const model=buildRecipeCommerceReadModel({recipe,servings:8,catalog});
    expect(model.status).toBe('ready');
    expect(model.ingredients.find(item=>item.ingredientId==='salad')?.cartQuantity).toBe(2);
    expect(model.ingredients.find(item=>item.ingredientId==='salt')?.cartQuantity).toBeNull();
    expect(model.claimCompleteness).toBe('explicit');
    expect(model.claimsInferred).toBe(false);
  });

  it('fails closed when authoritative catalog stock or channel eligibility is unavailable',()=>{
    const unavailable=catalog.map(item=>item.productId==='p1'?{...item,stock:{available:false,statusLabel:'Elfogyott'}}:item);
    const model=buildRecipeCommerceReadModel({recipe,servings:4,catalog:unavailable});
    expect(model.status).toBe('invalid');
    expect(model.violations.some(item=>item.code==='RECIPE_COMPOSER_ITEM_OUT_OF_STOCK')).toBe(true);
    expect(buildRecipeCommerceAddIntent('recipe-order-1',{recipe,servings:4,catalog:unavailable})).toBeNull();
  });

  it('never invents allergen/dietary truth or a second commerce authority',()=>{
    const withoutClaims={...recipe,claims:[]} satisfies RecipeDefinition;
    const model=buildRecipeCommerceReadModel({recipe:withoutClaims,servings:4,catalog});
    expect(model.claimCompleteness).toBe('unknown');
    expect(model.claims).toEqual([]);
    expect(model.claimsInferred).toBe(false);
    expect(Object.values(RECIPE_COMMERCE_AUTHORITY).every(value=>value===false)).toBe(true);
  });

  it('is a first-class Pro component and is unavailable to Alap',()=>{
    const definition=createStorefrontVisualBuilderComponentRegistry().get('commerce.recipe',1)!;
    expect(definition.manifest.capability).toEqual({minPlan:'pro',features:['catalog','inventory','recipeCommerce']});
    expect(definition.bindingSlots).toEqual(['recipes','catalog']);
    expect(hasStorefrontRuntimeCapability(definition.manifest.capability,{plan:'alap',features:PLANS.alap.features})).toBe(false);
    expect(hasStorefrontRuntimeCapability(definition.manifest.capability,proCapability)).toBe(true);
    expect(createStorefrontVisualBuilderRendererRegistry().get('commerce.recipe',1)).toBeTruthy();
  });

  it('renders only from authoritative binding slots on the shared Page Schema runtime',()=>{
    const html=renderToStaticMarkup(<CartProvider><StorefrontRuntimeRenderer page={recipePage()} viewport="desktop" bindingContext={{catalog:{recipeDefinitions:[recipe],recipeProducts:catalog}}} componentRegistry={createStorefrontVisualBuilderComponentRegistry()} rendererRegistry={createStorefrontVisualBuilderRendererRegistry()} capability={proCapability}/></CartProvider>);
    expect(html).toContain('data-storefront-recipe-commerce-v1');
    expect(html).toContain('Vacsora 20 perc alatt');
    expect(html).toContain('Salátakeverék');
    expect(html).toContain('Strukturált allergén és étrendi információ');
    expect(html).toContain('A recept hozzávalói a kosárba');
  });

  it('keeps managed recipe identity out of the generic editor and binds canonical catalog paths',()=>{
    const definition=createStorefrontVisualBuilderComponentRegistry().get('commerce.recipe',1)!;
    expect(definition.manifest.configurable).not.toContain('recipeKey');
    expect(definition.manifest.configurable).not.toContain('defaultServings');
    expect(isStorefrontManagedConfigKey('commerce.recipe','recipeKey')).toBe(true);
    let page=recipePage();
    page={...page,sections:[{...page.sections[0],bindings:undefined,config:{title:'Recept'}}]};
    page=bindStorefrontRecipeCommerceData(page,'recipe');
    page=setStorefrontRecipeCommerceConfig(page,'recipe','recipeKey','garden-salad');
    expect(page.sections[0]?.bindings).toEqual({recipes:{path:'catalog.recipeDefinitions'},catalog:{path:'catalog.recipeProducts'}});
    expect(page.sections[0]?.config.recipeKey).toBe('garden-salad');
  });

  it('keeps Recipe Commerce server-authoritative and merchant-manageable without raw JSON',()=>{
    const runtime=readFileSync('src/lib/builder/storefront-runtime-source.ts','utf8');
    const controls=readFileSync('src/components/admin/storefront-recipe-commerce-controls.tsx','utf8');
    const library=readFileSync('src/components/admin/recipe-commerce-library.tsx','utf8');
    const actions=readFileSync('src/app/admin/tartalom/receptek/actions.ts','utf8');
    expect(runtime).toContain("enabledFeatures.has('recipeCommerce')");
    expect(runtime).toContain('recipeDefinitions:recipeBundle.recipes');
    expect(runtime).toContain('recipeProducts:recipeBundle.catalog');
    expect(controls).toContain('Megjelenített recept');
    expect(controls).toContain('Receptkönyvtár kezelése');
    expect(library).toContain('Hozzávalók és termék-mapping');
    expect(library).toContain('Allergén és étrendi állítások');
    expect(library).not.toContain('JSON.stringify');
    expect(actions).toContain("getAdminRequestUser('catalog.manage')");
    expect(actions).toContain("getFeatureEntitlementDecision(scope.instanceId,'recipeCommerce')");
    expect(actions).toContain("admin.rpc('save_recipe_commerce_v1'");
  });

  it('mirrors server-only recipe authority and Pro entitlement in production and customer-baseline migrations',()=>{
    for(const path of['supabase/migrations/20260912221500_special_commerce_recipe_authority.sql','supabase/customer-baseline/migrations/0020_special_commerce_recipe_authority.sql']){
      const sql=readFileSync(path,'utf8');
      expect(sql).toContain('create table if not exists public.recipe_definitions');
      expect(sql).toContain('create table if not exists public.recipe_ingredient_mappings');
      expect(sql).toContain('create table if not exists public.recipe_food_claims');
      expect(sql).toContain("grant execute on function public.save_recipe_commerce_v1(uuid,uuid,jsonb) to service_role");
      expect(sql).toContain("revoke all on public.recipe_definitions from public,anon,authenticated");
      expect(sql).toContain("('recipeCommerce','released','feature'");
      expect(sql).toContain("('pro','recipeCommerce')");
      expect(sql).toContain('RECIPE_COMMERCE_MAPPING_TENANT_MISMATCH');
    }
  });
});
