'use server';

import {revalidatePath} from 'next/cache';
import {getAdminRequestUser} from '@/lib/auth/admin-api';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {createAdminClient} from '@/lib/supabase/admin';
import {getFeatureEntitlementDecision} from '@/lib/entitlements/access';
import {validateRecipeDefinition,type RecipeDefinition} from '@/lib/commerce/recipe-commerce';

export type RecipeCommerceDraft=Omit<RecipeDefinition,'tenantId'|'version'>;

async function recipeAdminAccess(){
  const actor=await getAdminRequestUser('catalog.manage');
  if(!actor)throw new Error('Nincs jogosultság a receptkönyvtár kezeléséhez.');
  const scope=await requireCurrentStoreContext('catalog.manage');
  const entitlement=await getFeatureEntitlementDecision(scope.instanceId,'recipeCommerce');
  if(entitlement?.enabled!==true)throw new Error('A Recipe Commerce funkció nincs engedélyezve ennél a webshopnál.');
  return{actor,scope,admin:createAdminClient()};
}

function refreshRecipeSurfaces(){
  revalidatePath('/admin/tartalom/receptek');
  revalidatePath('/admin/tartalom/builder');
  revalidatePath('/');
}

export async function saveRecipeCommerceAction(input:RecipeCommerceDraft){
  const{actor,scope,admin}=await recipeAdminAccess();
  const candidate={...structuredClone(input),version:1 as const,tenantId:scope.instanceId} satisfies RecipeDefinition;
  let violations;
  try{violations=validateRecipeDefinition(candidate);}catch{throw new Error('A recept adatszerkezete érvénytelen.');}
  if(violations.length)throw new Error(violations[0]?.message??'A recept nem menthető.');
  const{data,error}=await admin.rpc('save_recipe_commerce_v1',{
    p_instance_id:scope.instanceId,
    p_actor:actor.id,
    p_recipe:candidate,
  });
  if(error)throw new Error(`A recept mentése nem sikerült: ${error.message}`);
  const result=(data??{}) as{recipeKey?:string;recipeId?:string};
  if(result.recipeKey!==candidate.recipeKey||typeof result.recipeId!=='string')throw new Error('A recept mentése nem igazolható.');
  refreshRecipeSurfaces();
  return{recipeKey:result.recipeKey,recipeId:result.recipeId};
}

export async function deleteRecipeCommerceAction(recipeKey:string){
  if(!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(recipeKey))throw new Error('Érvénytelen receptazonosító.');
  const{actor,scope,admin}=await recipeAdminAccess();
  const{data:recipe,error:lookupError}=await admin.from('recipe_definitions').select('id').eq('instance_id',scope.instanceId).eq('recipe_key',recipeKey).maybeSingle();
  if(lookupError||!recipe)throw new Error('A recept nem található.');
  const{data,error}=await admin.rpc('delete_recipe_commerce_v1',{
    p_instance_id:scope.instanceId,
    p_actor:actor.id,
    p_recipe_id:recipe.id,
  });
  if(error||data!==true)throw new Error('A recept törlése nem sikerült.');
  refreshRecipeSurfaces();
  return{deleted:true as const,recipeKey};
}
