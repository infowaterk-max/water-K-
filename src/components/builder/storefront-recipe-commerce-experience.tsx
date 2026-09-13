'use client';

import {useMemo,useState} from 'react';
import {useCart} from '@/components/cart/cart-provider';
import {
  buildRecipeCommerceAddIntent,
  buildRecipeCommerceReadModel,
  type RecipeDefinition,
  type RecipeIngredientChoice,
} from '@/lib/commerce/recipe-commerce';
import type {ComposerCatalogItem} from '@/lib/commerce/multi-product-composer';

const humanize=(value:string)=>value.replace(/[._:-]+/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());

export function StorefrontRecipeCommerceExperience({
  recipe,
  catalog,
  initialServings,
  showClaims=true,
  actionLabel='A recept hozzávalói a kosárba',
}:{
  recipe:RecipeDefinition;
  catalog:readonly ComposerCatalogItem[];
  initialServings:number;
  showClaims?:boolean;
  actionLabel?:string;
}){
  const[servings,setServings]=useState(Math.min(recipe.maxServings,Math.max(recipe.minServings,initialServings)));
  const[choices,setChoices]=useState<Record<string,string>>({});
  const[notice,setNotice]=useState<string|null>(null);
  const{addMany}=useCart();
  const choiceRows=useMemo<RecipeIngredientChoice[]>(()=>Object.entries(choices).filter(([,mappingId])=>Boolean(mappingId)).map(([ingredientId,mappingId])=>({ingredientId,mappingId})),[choices]);
  const model=useMemo(()=>buildRecipeCommerceReadModel({recipe,servings,choices:choiceRows,catalog}),[recipe,servings,choiceRows,catalog]);
  const claims=recipe.claims;

  const addRecipe=()=>{
    const compositionId=`recipe-${recipe.recipeKey}-${crypto.randomUUID().slice(0,8)}`;
    const intent=buildRecipeCommerceAddIntent(compositionId,{recipe,servings,choices:choiceRows,catalog});
    if(!intent){setNotice('A recept jelenleg nem tehető biztonságosan a kosárba. Ellenőrizd a választásokat és az elérhetőséget.');return;}
    const cartItems=intent.composerIntent.lines.flatMap(line=>{
      const item=catalog.find(candidate=>candidate.productId===line.productId&&candidate.variantId===line.variantId);
      if(!item)return[];
      const slug=item.href.startsWith('/termek/')?decodeURIComponent(item.href.slice('/termek/'.length)):item.productId;
      return[{productId:item.productId,variantId:item.variantId,slug,name:item.label,unitPrice:item.price.amountMinor,quantity:line.quantity}];
    });
    if(cartItems.length!==intent.composerIntent.lines.length){setNotice('A katalógus közben megváltozott; frissítsd az oldalt és próbáld újra.');return;}
    addMany(cartItems);
    setNotice(`${cartItems.length} recept-hozzávaló került a kosárba. A végleges ár és készlet a kosárnál és a pénztárnál újraellenőrzésre kerül.`);
  };

  return <div data-recipe-commerce-experience-v1 style={{display:'grid',gap:'1rem'}}>
    <div style={{display:'flex',flexWrap:'wrap',gap:'.75rem',alignItems:'end'}}>
      <label style={{display:'grid',gap:'.3rem'}}><span>Adag</span><input aria-label="Adagok száma" type="number" min={recipe.minServings} max={recipe.maxServings} value={servings} onChange={event=>setServings(Math.min(recipe.maxServings,Math.max(recipe.minServings,Number(event.target.value)||recipe.minServings)))}/></label>
      <small>Alaprecept: {recipe.baseServings} adag. A csomagszám skálázása csak az explicit kereskedelmi mappingre vonatkozik; a recept szöveges mennyiségeit a rendszer nem találja ki.</small>
    </div>

    <div style={{display:'grid',gap:'.75rem'}}>
      {recipe.ingredients.map(ingredient=>{
        const resolved=model.ingredients.find(item=>item.ingredientId===ingredient.ingredientId);
        const mappings=ingredient.mappings??[];
        const requiresChoice=ingredient.commerceMode==='required'&&mappings.length>1;
        const optional=ingredient.commerceMode==='optional';
        return <article key={ingredient.ingredientId} style={{display:'grid',gap:'.35rem',padding:'.85rem',border:'1px solid var(--shoporation-color-border,#ddd)',borderRadius:'var(--shoporation-radius-m,1rem)'}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:'1rem',alignItems:'baseline'}}><strong>{ingredient.label}</strong><span>{ingredient.quantityDisplay}</span></div>
          {ingredient.commerceMode==='informational'?<small>Recept-hozzávaló · nincs automatikus webshop-mapping.</small>:null}
          {(requiresChoice||optional)&&mappings.length?<label style={{display:'grid',gap:'.3rem'}}><span>{optional?'Opcionális webshop-termék':'Válassz webshop-terméket'}</span><select value={choices[ingredient.ingredientId]??''} onChange={event=>setChoices(current=>({...current,[ingredient.ingredientId]:event.target.value}))}><option value="">{optional?'Nem kérem':'Válassz…'}</option>{mappings.map(mapping=><option value={mapping.mappingId} key={mapping.mappingId}>{mapping.label??catalog.find(item=>item.productId===mapping.productId&&item.variantId===mapping.variantId)?.label??mapping.mappingId}</option>)}</select></label>:null}
          {resolved?.mapping&&resolved.cartQuantity?<small>Kosárba kerülő mennyiség: {resolved.cartQuantity} db/csomag · {catalog.find(item=>item.productId===resolved.mapping?.productId&&item.variantId===resolved.mapping?.variantId)?.price.display??'aktuális ár'}</small>:null}
        </article>;
      })}
    </div>

    {showClaims?<section aria-label="Allergén és étrendi információ" style={{display:'grid',gap:'.5rem'}}>
      <strong>Strukturált allergén és étrendi információ</strong>
      {claims.length?<div style={{display:'flex',flexWrap:'wrap',gap:'.5rem'}}>{claims.map(claim=><span key={`${claim.claimType}:${claim.claimCode}`} title={claim.source} style={{padding:'.45rem .65rem',border:'1px solid var(--shoporation-color-border,#ddd)',borderRadius:'999px'}}>{humanize(claim.claimCode)} · {humanize(claim.status)}</span>)}</div>:<p style={{margin:0}}>Ehhez a recepthez nincs hitelesített strukturált allergén/étrendi adat. A rendszer nem következtet az összetevőkből.</p>}
    </section>:null}

    {model.violations.length?<div role="status" style={{display:'grid',gap:'.25rem'}}>{model.violations.slice(0,5).map((violation,index)=><small key={`${violation.code}:${index}`}>{violation.message}</small>)}</div>:null}
    <button type="button" onClick={addRecipe} disabled={model.status!=='ready'}>{actionLabel}</button>
    <small>Ár, csatorna és készlet a kosár/pénztár authoritynál ismét ellenőrzésre kerül. Nincs automatikus termékhelyettesítés.</small>
    {notice?<p role="status" style={{margin:0}}>{notice}</p>:null}
  </div>;
}
