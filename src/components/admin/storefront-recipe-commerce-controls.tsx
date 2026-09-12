'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {bindStorefrontRecipeCommerceData,setStorefrontRecipeCommerceConfig} from '@/lib/builder/storefront-recipe-commerce-operations';
import {listRecipeCommerceOptionsAction} from '@/app/admin/tartalom/builder/recipe-commerce-actions';
import styles from './storefront-visual-builder.module.css';

type RecipeOption={recipeKey:string;title:string;baseServings:number;minServings:number;maxServings:number};
const text=(value:unknown)=>typeof value==='string'?value:'';
const int=(value:unknown,fallback:number)=>typeof value==='number'&&Number.isInteger(value)?value:fallback;

export function StorefrontRecipeCommerceControls({document,node,onApply}:{
  document:StorefrontPageDocument;
  node:StorefrontComponentNode;
  onApply:(next:StorefrontPageDocument,notice:string)=>void;
}){
  const[recipes,setRecipes]=useState<readonly RecipeOption[]>([]);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState<string|null>(null);
  useEffect(()=>{let active=true;setLoading(true);listRecipeCommerceOptionsAction().then(items=>{if(active){setRecipes(items);setError(null);}}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'A receptlista nem tölthető be.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false};},[]);

  const currentKey=text(node.config.recipeKey);
  const selected=recipes.find(recipe=>recipe.recipeKey===currentKey)??null;
  const selectedDefault=selected?.baseServings??1;
  const defaultServings=int(node.config.defaultServings,selectedDefault);
  const bindingsReady=node.bindings?.recipes?.path==='catalog.recipeDefinitions'&&node.bindings?.catalog?.path==='catalog.recipeProducts';

  const choose=(recipeKey:string)=>{
    const recipe=recipes.find(item=>item.recipeKey===recipeKey);
    let next=bindStorefrontRecipeCommerceData(document,node.id);
    next=setStorefrontRecipeCommerceConfig(next,node.id,'recipeKey',recipeKey);
    if(recipe)next=setStorefrontRecipeCommerceConfig(next,node.id,'defaultServings',recipe.baseServings);
    onApply(next,recipe?'Recept kiválasztva.':'Recept kiválasztása törölve.');
  };
  const setDefaultServings=(value:number)=>{
    if(!selected)return;
    const bounded=Math.min(selected.maxServings,Math.max(selected.minServings,Math.round(value)));
    let next=bindingsReady?document:bindStorefrontRecipeCommerceData(document,node.id);
    next=setStorefrontRecipeCommerceConfig(next,node.id,'defaultServings',bounded);
    onApply(next,'Alapértelmezett adagszám frissítve.');
  };

  return <div className={styles.editorFields} data-recipe-commerce-controls-v1>
    <div className={styles.fieldGroup}>
      <strong>Recipe Commerce</strong>
      <p className={styles.emptyHint}>A Builder csak azt választja ki, melyik strukturált recept jelenjen meg. A hozzávaló-termék mapping, allergén/étrendi adatok, ár és készlet nem a Page Schema saját adata: a közös Recipe Commerce és katalógus authority szolgáltatja.</p>
      {loading?<p className={styles.emptyHint}>Receptek betöltése…</p>:null}
      {error?<p className={styles.emptyHint}>{error}</p>:null}
      <label className={styles.field}><span>Megjelenített recept</span><select disabled={loading} value={currentKey} onChange={event=>choose(event.target.value)}><option value="">Válassz receptet…</option>{recipes.map(recipe=><option key={recipe.recipeKey} value={recipe.recipeKey}>{recipe.title}</option>)}</select></label>
      {selected?<label className={styles.field}><span>Alapértelmezett adag</span><input type="number" min={selected.minServings} max={selected.maxServings} value={defaultServings} onChange={event=>setDefaultServings(Number(event.target.value)||selected.baseServings)}/><small>Engedélyezett tartomány: {selected.minServings}–{selected.maxServings} adag.</small></label>:null}
      {!loading&&!recipes.length?<p className={styles.emptyHint}>Még nincs aktív recept. Előbb hozz létre egyet a receptkönyvtárban.</p>:null}
      <Link className={styles.addSectionButton} href="/admin/tartalom/receptek">Receptkönyvtár kezelése</Link>
      {!bindingsReady&&currentKey?<button type="button" className={styles.secondaryButton} onClick={()=>onApply(bindStorefrontRecipeCommerceData(document,node.id),'Recipe Commerce adatkapcsolat helyreállítva.')}>Adatkapcsolat helyreállítása</button>:null}
    </div>
  </div>;
}
