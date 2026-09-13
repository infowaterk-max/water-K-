import {
  buildComposerAddIntent,
  buildComposerReadModel,
  type ComposerCartIntent,
  type ComposerCatalogItem,
  type ComposerSelection,
  type MultiProductComposerConfig,
} from '@/lib/commerce/multi-product-composer';

export const RECIPE_COMMERCE_ENGINE_VERSION='shoporation.recipe-commerce.v1' as const;

export type RecipeCommerceMode='required'|'optional'|'informational';
export type RecipeScalingPolicy='fixed'|'proportional-ceil';
export type RecipeClaimType='allergen'|'dietary';
export type RecipeAllergenStatus='contains'|'may-contain'|'free-from';
export type RecipeDietaryStatus='meets'|'does-not-meet';
export type RecipeClaimSource='merchant-structured-data'|'certified-source';

export type RecipeIngredientMapping={
  mappingId:string;
  productId:string;
  variantId:string;
  label?:string;
};

export type RecipeIngredient={
  ingredientId:string;
  label:string;
  quantityDisplay:string;
  commerceMode:RecipeCommerceMode;
  baseCartQuantity?:number;
  scalingPolicy?:RecipeScalingPolicy;
  mappings?:readonly RecipeIngredientMapping[];
};

export type RecipeStructuredClaim={
  claimType:RecipeClaimType;
  claimCode:string;
  status:RecipeAllergenStatus|RecipeDietaryStatus;
  source:RecipeClaimSource;
  evidenceRef?:string|null;
};

export type RecipeDefinition={
  version:1;
  tenantId:string;
  recipeKey:string;
  title:string;
  baseServings:number;
  minServings:number;
  maxServings:number;
  ingredients:readonly RecipeIngredient[];
  claims:readonly RecipeStructuredClaim[];
};

export type RecipeIngredientChoice={
  ingredientId:string;
  mappingId:string;
};

export type RecipeCommerceViolation={code:string;path:string;message:string};

export type RecipeResolvedIngredient={
  ingredientId:string;
  label:string;
  quantityDisplay:string;
  commerceMode:RecipeCommerceMode;
  mapping:RecipeIngredientMapping|null;
  cartQuantity:number|null;
};

export type RecipeCommerceReadModel={
  engineVersion:typeof RECIPE_COMMERCE_ENGINE_VERSION;
  status:'ready'|'incomplete'|'invalid';
  servings:number;
  ingredients:readonly RecipeResolvedIngredient[];
  claims:readonly RecipeStructuredClaim[];
  claimCompleteness:'explicit'|'unknown';
  composer:ReturnType<typeof buildComposerReadModel>|null;
  violations:readonly RecipeCommerceViolation[];
  requiresCartRevalidation:true;
  claimsInferred:false;
};

export type RecipeCommerceCartIntent={
  engineVersion:typeof RECIPE_COMMERCE_ENGINE_VERSION;
  recipeKey:string;
  servings:number;
  composerIntent:ComposerCartIntent;
  claimsInferred:false;
};

export const RECIPE_COMMERCE_AUTHORITY=Object.freeze({
  product:false,
  variant:false,
  pricing:false,
  inventory:false,
  cart:false,
  checkout:false,
  order:false,
  payment:false,
  allergenInference:false,
  dietaryInference:false,
} as const);

const KEY=/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const SAFE_ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_CLAIM=/^[a-z0-9]+(?:[._:-][a-z0-9]+)*$/;
const issue=(out:RecipeCommerceViolation[],code:string,path:string,message:string)=>out.push({code,path,message});
const positiveInt=(value:number)=>Number.isInteger(value)&&value>0;

function validClaimStatus(claim:RecipeStructuredClaim){
  if(claim.claimType==='allergen')return claim.status==='contains'||claim.status==='may-contain'||claim.status==='free-from';
  return claim.status==='meets'||claim.status==='does-not-meet';
}

export function validateRecipeDefinition(recipe:RecipeDefinition):RecipeCommerceViolation[]{
  const out:RecipeCommerceViolation[]=[];
  if(recipe.version!==1)issue(out,'RECIPE_VERSION_UNSUPPORTED','version','Only Recipe Commerce definition v1 is supported.');
  if(!KEY.test(recipe.tenantId)||!KEY.test(recipe.recipeKey))issue(out,'RECIPE_IDENTITY_INVALID','identity','Tenant and recipe keys must be lowercase and key-safe.');
  if(!recipe.title.trim())issue(out,'RECIPE_TITLE_REQUIRED','title','Recipe title is required.');
  if(!positiveInt(recipe.baseServings)||!positiveInt(recipe.minServings)||!positiveInt(recipe.maxServings)||recipe.minServings>recipe.maxServings||recipe.baseServings<recipe.minServings||recipe.baseServings>recipe.maxServings||recipe.maxServings>100)issue(out,'RECIPE_SERVINGS_INVALID','servings','Recipe serving bounds are invalid.');
  if(!recipe.ingredients.length||recipe.ingredients.length>100)issue(out,'RECIPE_INGREDIENTS_INVALID','ingredients','Recipe must contain 1–100 ingredients.');
  const ingredientIds=new Set<string>();
  recipe.ingredients.forEach((ingredient,index)=>{
    const path=`ingredients.${index}`;
    if(!KEY.test(ingredient.ingredientId)||ingredientIds.has(ingredient.ingredientId))issue(out,'RECIPE_INGREDIENT_ID_INVALID',`${path}.ingredientId`,'Ingredient id must be unique and key-safe.');
    ingredientIds.add(ingredient.ingredientId);
    if(!ingredient.label.trim()||!ingredient.quantityDisplay.trim())issue(out,'RECIPE_INGREDIENT_PRESENTATION_REQUIRED',path,'Ingredient label and display quantity are required.');
    const mappings=ingredient.mappings??[];
    if(ingredient.commerceMode==='informational'){
      if(mappings.length||ingredient.baseCartQuantity!==undefined)issue(out,'RECIPE_INFORMATIONAL_COMMERCE_FORBIDDEN',path,'Informational ingredients cannot own cart mappings.');
      return;
    }
    if(!mappings.length)issue(out,'RECIPE_MAPPING_REQUIRED',`${path}.mappings`,'Commerce ingredients require at least one explicit catalog mapping.');
    if(!positiveInt(ingredient.baseCartQuantity??0)||!ingredient.scalingPolicy)issue(out,'RECIPE_CART_QUANTITY_REQUIRED',path,'Commerce ingredients require explicit base cart quantity and scaling policy.');
    const mappingIds=new Set<string>();
    mappings.forEach((mapping,mappingIndex)=>{
      if(!KEY.test(mapping.mappingId)||mappingIds.has(mapping.mappingId))issue(out,'RECIPE_MAPPING_ID_INVALID',`${path}.mappings.${mappingIndex}.mappingId`,'Mapping id must be unique and key-safe.');
      mappingIds.add(mapping.mappingId);
      if(!SAFE_ID.test(mapping.productId)||!SAFE_ID.test(mapping.variantId))issue(out,'RECIPE_MAPPING_CATALOG_ID_INVALID',`${path}.mappings.${mappingIndex}`,'Mapping must use stable product and variant ids.');
    });
  });
  const claims=new Set<string>();
  recipe.claims.forEach((claim,index)=>{
    const path=`claims.${index}`;
    const identity=`${claim.claimType}:${claim.claimCode}`;
    if(!SAFE_CLAIM.test(claim.claimCode)||claims.has(identity))issue(out,'RECIPE_CLAIM_INVALID',path,'Claim code must be unique within its type and key-safe.');
    claims.add(identity);
    if(!validClaimStatus(claim))issue(out,'RECIPE_CLAIM_STATUS_INVALID',`${path}.status`,'Claim status is incompatible with its claim type.');
    if(claim.evidenceRef!==undefined&&claim.evidenceRef!==null&&(claim.evidenceRef.length>512||!claim.evidenceRef.trim()))issue(out,'RECIPE_CLAIM_EVIDENCE_INVALID',`${path}.evidenceRef`,'Claim evidence reference is invalid.');
  });
  return out;
}

function quantityFor(ingredient:RecipeIngredient,servings:number,baseServings:number){
  const base=ingredient.baseCartQuantity??0;
  if(ingredient.scalingPolicy==='fixed')return base;
  return Math.max(1,Math.ceil(base*servings/baseServings));
}

function resolveMapping(ingredient:RecipeIngredient,choices:readonly RecipeIngredientChoice[],violations:RecipeCommerceViolation[],index:number){
  const mappings=ingredient.mappings??[];
  if(ingredient.commerceMode==='informational')return null;
  const choice=choices.find(candidate=>candidate.ingredientId===ingredient.ingredientId);
  if(choice){
    const mapping=mappings.find(candidate=>candidate.mappingId===choice.mappingId);
    if(!mapping)issue(violations,'RECIPE_MAPPING_CHOICE_INVALID',`ingredients.${index}`,'Selected ingredient mapping is not allowed.');
    return mapping??null;
  }
  if(ingredient.commerceMode==='optional')return null;
  if(mappings.length===1)return mappings[0];
  issue(violations,'RECIPE_MAPPING_CHOICE_REQUIRED',`ingredients.${index}`,'Required ingredient has multiple mappings and needs an explicit customer choice.');
  return null;
}

function composerConfig(recipe:RecipeDefinition,selections:readonly ComposerSelection[]):MultiProductComposerConfig{
  const total=Math.max(1,selections.reduce((sum,item)=>sum+item.quantity,0));
  return{
    version:1,
    tenantId:recipe.tenantId,
    composerKey:`recipe-${recipe.recipeKey}`,
    label:recipe.title,
    mode:'pool',
    minItems:total,
    maxItems:Math.min(100,total),
    duplicateLimit:Math.min(100,total),
  };
}

export function buildRecipeCommerceReadModel(input:{
  recipe:RecipeDefinition;
  servings:number;
  choices?:readonly RecipeIngredientChoice[];
  catalog:readonly ComposerCatalogItem[];
}):RecipeCommerceReadModel{
  const violations=validateRecipeDefinition(input.recipe);
  if(!positiveInt(input.servings)||input.servings<input.recipe.minServings||input.servings>input.recipe.maxServings)issue(violations,'RECIPE_SERVINGS_OUT_OF_RANGE','servings','Requested servings are outside the recipe bounds.');
  const choices=input.choices??[];
  const duplicateChoiceIds=new Set<string>();
  for(const choice of choices){
    if(duplicateChoiceIds.has(choice.ingredientId))issue(violations,'RECIPE_CHOICE_DUPLICATE','choices','Only one explicit mapping choice is allowed per ingredient.');
    duplicateChoiceIds.add(choice.ingredientId);
  }
  const ingredients:RecipeResolvedIngredient[]=[];
  const selections:ComposerSelection[]=[];
  input.recipe.ingredients.forEach((ingredient,index)=>{
    const mapping=resolveMapping(ingredient,choices,violations,index);
    const cartQuantity=mapping?quantityFor(ingredient,input.servings,input.recipe.baseServings):null;
    ingredients.push({ingredientId:ingredient.ingredientId,label:ingredient.label,quantityDisplay:ingredient.quantityDisplay,commerceMode:ingredient.commerceMode,mapping,cartQuantity});
    if(mapping&&cartQuantity)selections.push({productId:mapping.productId,variantId:mapping.variantId,quantity:cartQuantity});
  });
  const requiredCommerceCount=input.recipe.ingredients.filter(item=>item.commerceMode==='required').length;
  const resolvedRequiredCount=ingredients.filter(item=>item.commerceMode==='required'&&item.mapping).length;
  if(requiredCommerceCount>0&&resolvedRequiredCount<requiredCommerceCount)issue(violations,'RECIPE_REQUIRED_MAPPING_UNRESOLVED','ingredients','At least one required commerce ingredient is unresolved.');
  if(!selections.length)issue(violations,'RECIPE_CART_EMPTY','ingredients','Recipe has no explicit catalog selections for Recipe-to-Cart.');
  const composer=selections.length?buildComposerReadModel({config:composerConfig(input.recipe,selections),selections,catalog:input.catalog}):null;
  for(const violation of composer?.violations??[])issue(violations,`RECIPE_${violation.code}`,`composer.${violation.path}`,violation.message);
  const onlyIncomplete=violations.length>0&&violations.every(item=>item.code==='RECIPE_MAPPING_CHOICE_REQUIRED'||item.code==='RECIPE_REQUIRED_MAPPING_UNRESOLVED');
  return Object.freeze({
    engineVersion:RECIPE_COMMERCE_ENGINE_VERSION,
    status:violations.length?(onlyIncomplete?'incomplete':'invalid'):'ready',
    servings:input.servings,
    ingredients:Object.freeze(ingredients),
    claims:Object.freeze(input.recipe.claims.map(claim=>Object.freeze({...claim}))),
    claimCompleteness:input.recipe.claims.length?'explicit':'unknown',
    composer,
    violations:Object.freeze(violations),
    requiresCartRevalidation:true,
    claimsInferred:false,
  });
}

export function buildRecipeCommerceAddIntent(compositionId:string,input:{
  recipe:RecipeDefinition;
  servings:number;
  choices?:readonly RecipeIngredientChoice[];
  catalog:readonly ComposerCatalogItem[];
}):RecipeCommerceCartIntent|null{
  const model=buildRecipeCommerceReadModel(input);
  if(model.status!=='ready'||!model.composer)return null;
  const selections=model.ingredients.flatMap(ingredient=>ingredient.mapping&&ingredient.cartQuantity?[{productId:ingredient.mapping.productId,variantId:ingredient.mapping.variantId,quantity:ingredient.cartQuantity} satisfies ComposerSelection]:[]);
  const composerIntent=buildComposerAddIntent(compositionId,{config:composerConfig(input.recipe,selections),selections,catalog:input.catalog});
  if(!composerIntent)return null;
  return Object.freeze({engineVersion:RECIPE_COMMERCE_ENGINE_VERSION,recipeKey:input.recipe.recipeKey,servings:input.servings,composerIntent,claimsInferred:false});
}
