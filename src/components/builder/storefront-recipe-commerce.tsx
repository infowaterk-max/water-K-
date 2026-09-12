import type {CSSProperties} from 'react';
import type {StorefrontComponentRenderProps} from '@/components/builder/storefront-runtime-renderer';
import {StorefrontRecipeCommerceExperience} from '@/components/builder/storefront-recipe-commerce-experience';
import {validateRecipeDefinition,type RecipeDefinition} from '@/lib/commerce/recipe-commerce';
import type {ComposerCatalogItem} from '@/lib/commerce/multi-product-composer';

export const STOREFRONT_RECIPE_COMMERCE_RENDERERS_VERSION='shoporation.storefront-recipe-commerce-renderers.v1' as const;
const text=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
const bool=(value:unknown,fallback=true)=>typeof value==='boolean'?value:fallback;
const rows=(value:unknown):Record<string,unknown>[]=>Array.isArray(value)?value.filter((item):item is Record<string,unknown>=>Boolean(item)&&typeof item==='object'&&!Array.isArray(item)):[];

function parseRecipes(value:unknown):RecipeDefinition[]{
  return rows(value).flatMap(row=>{
    const candidate=row as unknown as RecipeDefinition;
    try{return validateRecipeDefinition(candidate).length?[]:[candidate];}catch{return[];}
  });
}
function parseCatalog(value:unknown):ComposerCatalogItem[]{
  return rows(value).flatMap(row=>{
    const price=row.price&&typeof row.price==='object'&&!Array.isArray(row.price)?row.price as Record<string,unknown>:{};
    const stock=row.stock&&typeof row.stock==='object'&&!Array.isArray(row.stock)?row.stock as Record<string,unknown>:{};
    if(typeof row.productId!=='string'||typeof row.variantId!=='string'||typeof row.label!=='string'||typeof row.href!=='string'||typeof row.eligible!=='boolean'||typeof row.channelVisible!=='boolean'||typeof price.amountMinor!=='number'||typeof price.currency!=='string'||typeof price.display!=='string'||price.source!=='shared-pricing-authority'||typeof stock.available!=='boolean'||typeof stock.statusLabel!=='string')return[];
    return[{productId:row.productId,variantId:row.variantId,label:row.label,href:row.href,eligible:row.eligible,channelVisible:row.channelVisible,price:{amountMinor:price.amountMinor,currency:price.currency,display:price.display,source:'shared-pricing-authority' as const},stock:{available:stock.available,statusLabel:stock.statusLabel}}];
  });
}

export function StorefrontRecipeCommerce({config,node}:StorefrontComponentRenderProps){
  const recipes=parseRecipes(config.recipes),catalog=parseCatalog(config.catalog);
  const recipeKey=text(config.recipeKey);
  const recipe=recipes.find(item=>item.recipeKey===recipeKey)??null;
  const span:CSSProperties={gridColumn:`span ${node.resolved.gridSpan} / span ${node.resolved.gridSpan}`};
  if(!recipe)return <section data-storefront-recipe-commerce-v1 data-recipe-state="missing" style={{...span,display:'grid',gap:'.75rem',padding:'1.25rem',border:'1px solid var(--shoporation-color-border,#ddd)',borderRadius:'var(--shoporation-radius-l,1.4rem)'}}><strong>{text(config.title,'Recept')}</strong><p style={{margin:0}}>A kiválasztott recept jelenleg nem érhető el.</p></section>;
  const configured=Number(config.defaultServings),initialServings=Number.isInteger(configured)&&configured>=recipe.minServings&&configured<=recipe.maxServings?configured:recipe.baseServings;
  return <section data-storefront-recipe-commerce-v1 data-recipe-key={recipe.recipeKey} style={{...span,display:'grid',gap:'1rem'}}>
    <header style={{display:'grid',gap:'.45rem'}}>
      {text(config.eyebrow)?<small style={{textTransform:'uppercase',letterSpacing:'.12em'}}>{text(config.eyebrow)}</small>:null}
      <h2 style={{margin:0,fontSize:'clamp(2rem,4vw,3.6rem)'}}>{text(config.title,recipe.title)}</h2>
      {text(config.copy)?<p style={{margin:0,maxWidth:'55rem',lineHeight:1.65}}>{text(config.copy)}</p>:null}
    </header>
    <StorefrontRecipeCommerceExperience recipe={recipe} catalog={catalog} initialServings={initialServings} showClaims={bool(config.showClaims,true)} actionLabel={text(config.actionLabel,'A recept hozzávalói a kosárba')}/>
  </section>;
}
