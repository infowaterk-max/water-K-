import {buildStorefrontTemplateFactoryCandidate} from '@/lib/builder/template-factory';
import type {StorefrontTemplateFactoryRecipe} from '@/lib/builder/template-factory/scaffold';
import {LOOT_VAULT_V2_FACTORY_RECIPE} from '@/lib/builder/template-factory/recipes/loot-vault-v2';

export const STOREFRONT_TEMPLATE_FACTORY_RECIPES:readonly StorefrontTemplateFactoryRecipe[]=Object.freeze([
  LOOT_VAULT_V2_FACTORY_RECIPE,
]);

export function getStorefrontTemplateFactoryRecipe(templateKey:string){
  return STOREFRONT_TEMPLATE_FACTORY_RECIPES.find(recipe=>recipe.templateKey===templateKey)??null;
}

export function buildRegisteredStorefrontTemplateFactoryCandidate(templateKey:string){
  const recipe=getStorefrontTemplateFactoryRecipe(templateKey);
  if(!recipe)throw new Error(`TEMPLATE_FACTORY_RECIPE_MISSING:${templateKey}`);
  return buildStorefrontTemplateFactoryCandidate(recipe);
}
