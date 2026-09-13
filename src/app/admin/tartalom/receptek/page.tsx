import Link from 'next/link';
import {RecipeCommerceLibrary} from '@/components/admin/recipe-commerce-library';
import {requirePlanFeature} from '@/lib/plans/access';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {getStorefrontRecipeCommerceBundleForInstance,getStorefrontRecipeCatalogOptionsForInstance} from '@/lib/builder/storefront-recipe-commerce-server';

export const dynamic='force-dynamic';

export default async function RecipeCommerceAdminPage(){
  await requirePlanFeature('recipeCommerce');
  const scope=await requireCurrentStoreContext('catalog.manage');
  const[bundle,catalogOptions]=await Promise.all([
    getStorefrontRecipeCommerceBundleForInstance(scope.instanceId),
    getStorefrontRecipeCatalogOptionsForInstance(scope.instanceId),
  ]);
  return <section className="adminMain">
    <span className="eyebrow">Pro · Special Commerce</span>
    <h1 className="sectionTitle">Recipe Commerce receptkönyvtár</h1>
    <p className="lead">Strukturált receptek, explicit termék- és variáns-mapping, adagszám skálázás, valamint ellenőrzött allergén/étrendi állítások. A recept nem veheti át az ár-, készlet-, kosár- vagy checkout-authorityt.</p>
    <div className="actions"><Link className="btn" href="/admin/tartalom">Vissza a tartalomhoz</Link><Link className="btn btnPrimary" href="/admin/tartalom/builder">Visual Builder</Link></div>
    <RecipeCommerceLibrary initialRecipes={bundle.recipes} catalogOptions={catalogOptions}/>
  </section>;
}
