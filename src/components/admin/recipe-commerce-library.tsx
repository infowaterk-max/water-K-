'use client';

import {useMemo,useState,useTransition} from 'react';
import {deleteRecipeCommerceAction,saveRecipeCommerceAction,type RecipeCommerceDraft} from '@/app/admin/tartalom/receptek/actions';
import type {RecipeDefinition,RecipeIngredient,RecipeIngredientMapping,RecipeStructuredClaim} from '@/lib/commerce/recipe-commerce';
import type {StorefrontRecipeCatalogOption} from '@/lib/builder/storefront-recipe-commerce-server';
import styles from './storefront-visual-builder.module.css';

const keyPart=(prefix:string)=>`${prefix}-${crypto.randomUUID().slice(0,8)}`;
const emptyDraft=():RecipeCommerceDraft=>({recipeKey:keyPart('recept'),title:'Új recept',baseServings:4,minServings:1,maxServings:12,ingredients:[],claims:[]});
const toDraft=(recipe:RecipeDefinition):RecipeCommerceDraft=>({recipeKey:recipe.recipeKey,title:recipe.title,baseServings:recipe.baseServings,minServings:recipe.minServings,maxServings:recipe.maxServings,ingredients:structuredClone(recipe.ingredients),claims:structuredClone(recipe.claims)});
const optionValue=(option:StorefrontRecipeCatalogOption)=>`${option.productId}::${option.variantId}`;

function normalizeIngredient(item:RecipeIngredient):RecipeIngredient{
  if(item.commerceMode==='informational')return{ingredientId:item.ingredientId,label:item.label,quantityDisplay:item.quantityDisplay,commerceMode:'informational'};
  return{...item,baseCartQuantity:item.baseCartQuantity??1,scalingPolicy:item.scalingPolicy??'fixed',mappings:item.mappings??[]};
}

export function RecipeCommerceLibrary({initialRecipes,catalogOptions}:{initialRecipes:readonly RecipeDefinition[];catalogOptions:readonly StorefrontRecipeCatalogOption[]}){
  const[recipes,setRecipes]=useState(()=>initialRecipes.map(toDraft));
  const[selectedIndex,setSelectedIndex]=useState(initialRecipes.length?0:-1);
  const[draft,setDraft]=useState<RecipeCommerceDraft>(()=>initialRecipes[0]?toDraft(initialRecipes[0]):emptyDraft());
  const[notice,setNotice]=useState<string|null>(null);
  const[isPending,startTransition]=useTransition();
  const selected=selectedIndex>=0?recipes[selectedIndex]??null:null;
  const catalogByValue=useMemo(()=>new Map(catalogOptions.map(option=>[optionValue(option),option])),[catalogOptions]);

  const selectRecipe=(index:number)=>{setSelectedIndex(index);setDraft(toDraft(initialRecipes.find(recipe=>recipe.recipeKey===recipes[index]?.recipeKey)??({...recipes[index],version:1,tenantId:'local'} as RecipeDefinition)));setNotice(null);};
  const newRecipe=()=>{setSelectedIndex(-1);setDraft(emptyDraft());setNotice(null);};
  const updateIngredient=(index:number,next:RecipeIngredient)=>setDraft(current=>({...current,ingredients:current.ingredients.map((item,itemIndex)=>itemIndex===index?normalizeIngredient(next):item)}));
  const addIngredient=()=>setDraft(current=>({...current,ingredients:[...current.ingredients,{ingredientId:keyPart('hozzavalo'),label:'Új hozzávaló',quantityDisplay:'1 db',commerceMode:'informational'}]}));
  const removeIngredient=(index:number)=>setDraft(current=>({...current,ingredients:current.ingredients.filter((_,itemIndex)=>itemIndex!==index)}));
  const setMode=(index:number,mode:RecipeIngredient['commerceMode'])=>{const item=draft.ingredients[index];if(!item)return;updateIngredient(index,mode==='informational'?{ingredientId:item.ingredientId,label:item.label,quantityDisplay:item.quantityDisplay,commerceMode:mode}:{ingredientId:item.ingredientId,label:item.label,quantityDisplay:item.quantityDisplay,commerceMode:mode,baseCartQuantity:item.baseCartQuantity??1,scalingPolicy:item.scalingPolicy??'fixed',mappings:item.mappings?.length?item.mappings:[{mappingId:keyPart('mapping'),productId:'',variantId:''}]});};
  const addMapping=(ingredientIndex:number)=>{const item=draft.ingredients[ingredientIndex];if(!item||item.commerceMode==='informational')return;updateIngredient(ingredientIndex,{...item,mappings:[...(item.mappings??[]),{mappingId:keyPart('mapping'),productId:'',variantId:''}]});};
  const updateMapping=(ingredientIndex:number,mappingIndex:number,value:string)=>{const item=draft.ingredients[ingredientIndex];if(!item||item.commerceMode==='informational')return;const chosen=catalogByValue.get(value);const mappings=(item.mappings??[]).map((mapping,index)=>index===mappingIndex?{...mapping,productId:chosen?.productId??'',variantId:chosen?.variantId??'',label:chosen?.label}:mapping);updateIngredient(ingredientIndex,{...item,mappings});};
  const removeMapping=(ingredientIndex:number,mappingIndex:number)=>{const item=draft.ingredients[ingredientIndex];if(!item||item.commerceMode==='informational')return;updateIngredient(ingredientIndex,{...item,mappings:(item.mappings??[]).filter((_,index)=>index!==mappingIndex)});};
  const addClaim=()=>setDraft(current=>({...current,claims:[...current.claims,{claimType:'allergen',claimCode:'gluten',status:'contains',source:'merchant-structured-data'}]}));
  const updateClaim=(index:number,patch:Partial<RecipeStructuredClaim>)=>setDraft(current=>({...current,claims:current.claims.map((claim,itemIndex)=>itemIndex===index?({...claim,...patch} as RecipeStructuredClaim):claim)}));
  const removeClaim=(index:number)=>setDraft(current=>({...current,claims:current.claims.filter((_,itemIndex)=>itemIndex!==index)}));

  const save=()=>startTransition(async()=>{
    setNotice(null);
    try{
      const result=await saveRecipeCommerceAction(draft);
      setRecipes(current=>{
        const next=[...current];const existing=next.findIndex(item=>item.recipeKey===result.recipeKey);
        if(existing>=0)next[existing]=structuredClone(draft);else next.unshift(structuredClone(draft));
        return next;
      });
      setSelectedIndex(recipes.findIndex(item=>item.recipeKey===result.recipeKey)>=0?recipes.findIndex(item=>item.recipeKey===result.recipeKey):0);
      setNotice('A recept mentése sikerült. A Builder és a storefront authoritative read modelből fogja használni.');
    }catch(error){setNotice(error instanceof Error?error.message:'A recept mentése nem sikerült.');}
  });
  const remove=()=>startTransition(async()=>{
    if(!selected)return;
    setNotice(null);
    try{await deleteRecipeCommerceAction(selected.recipeKey);const next=recipes.filter(item=>item.recipeKey!==selected.recipeKey);setRecipes(next);setSelectedIndex(next.length?0:-1);setDraft(next[0]??emptyDraft());setNotice('A recept törölve.');}catch(error){setNotice(error instanceof Error?error.message:'A recept törlése nem sikerült.');}
  });

  return <div className={styles.builderShell} data-recipe-commerce-library-v1>
    <aside className={styles.editorFields}>
      <div className={styles.fieldGroup}><strong>Receptkönyvtár</strong><p className={styles.emptyHint}>A receptek tenant-szintű, strukturált commerce adatok. Nem a sablonban tároljuk őket.</p><button type="button" className={styles.addSectionButton} onClick={newRecipe}>＋ Új recept</button></div>
      <div className={styles.fieldGroup}>{recipes.map((recipe,index)=><button type="button" className={styles.secondaryButton} key={recipe.recipeKey} onClick={()=>selectRecipe(index)}>{recipe.title}<small>{recipe.recipeKey}</small></button>)}{!recipes.length?<p className={styles.emptyHint}>Még nincs recept.</p>:null}</div>
    </aside>

    <main className={styles.editorFields}>
      <div className={styles.fieldGroup}>
        <strong>Recept alapadatai</strong>
        <label className={styles.field}><span>Recept azonosító</span><input value={draft.recipeKey} onChange={event=>setDraft(current=>({...current,recipeKey:event.target.value.toLowerCase().replace(/[^a-z0-9._-]+/g,'-')}))}/><small>Stabil technikai kulcs; mentés után lehetőleg ne változtasd.</small></label>
        <label className={styles.field}><span>Cím</span><input value={draft.title} onChange={event=>setDraft(current=>({...current,title:event.target.value}))}/></label>
        <div className={styles.metaGrid}>
          <label className={styles.field}><span>Minimum adag</span><input type="number" min="1" max="100" value={draft.minServings} onChange={event=>setDraft(current=>({...current,minServings:Number(event.target.value)}))}/></label>
          <label className={styles.field}><span>Alapadag</span><input type="number" min="1" max="100" value={draft.baseServings} onChange={event=>setDraft(current=>({...current,baseServings:Number(event.target.value)}))}/></label>
          <label className={styles.field}><span>Maximum adag</span><input type="number" min="1" max="100" value={draft.maxServings} onChange={event=>setDraft(current=>({...current,maxServings:Number(event.target.value)}))}/></label>
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <strong>Hozzávalók és termék-mapping</strong>
        <p className={styles.emptyHint}>A recept szöveges mennyisége és a kosárba kerülő csomagszám külön mező. A Shoperation nem talál ki átváltást. Több mapping esetén a vásárló választhat alternatív webshop-terméket.</p>
        {draft.ingredients.map((ingredient,index)=><div className={styles.complexField} key={ingredient.ingredientId}>
          <label className={styles.field}><span>Hozzávaló neve</span><input value={ingredient.label} onChange={event=>updateIngredient(index,{...ingredient,label:event.target.value})}/></label>
          <label className={styles.field}><span>Recept szerinti mennyiség</span><input value={ingredient.quantityDisplay} onChange={event=>updateIngredient(index,{...ingredient,quantityDisplay:event.target.value})}/></label>
          <label className={styles.field}><span>Típus</span><select value={ingredient.commerceMode} onChange={event=>setMode(index,event.target.value as RecipeIngredient['commerceMode'])}><option value="required">Kötelező webshop-termék</option><option value="optional">Opcionális webshop-termék</option><option value="informational">Csak recept-hozzávaló</option></select></label>
          {ingredient.commerceMode!=='informational'?<>
            <label className={styles.field}><span>Alap csomagszám</span><input type="number" min="1" max="100" value={ingredient.baseCartQuantity??1} onChange={event=>updateIngredient(index,{...ingredient,baseCartQuantity:Number(event.target.value)||1})}/></label>
            <label className={styles.field}><span>Adagszám skálázás</span><select value={ingredient.scalingPolicy??'fixed'} onChange={event=>updateIngredient(index,{...ingredient,scalingPolicy:event.target.value as 'fixed'|'proportional-ceil'})}><option value="fixed">Fix csomagszám</option><option value="proportional-ceil">Arányos, felfelé kerekítve</option></select></label>
            {(ingredient.mappings??[]).map((mapping,mappingIndex)=><div className={styles.field} key={mapping.mappingId}><span>{mappingIndex===0?'Termék / variáns':'Alternatíva'}</span><select value={`${mapping.productId}::${mapping.variantId}`} onChange={event=>updateMapping(index,mappingIndex,event.target.value)}><option value="::">Válassz katalógusterméket…</option>{catalogOptions.map(option=><option value={optionValue(option)} key={optionValue(option)}>{option.label}</option>)}</select><button type="button" className={styles.secondaryButton} onClick={()=>removeMapping(index,mappingIndex)}>Mapping törlése</button></div>)}
            <button type="button" className={styles.secondaryButton} onClick={()=>addMapping(index)}>＋ Alternatív termék</button>
          </>:null}
          <button type="button" className={styles.secondaryButton} onClick={()=>removeIngredient(index)}>Hozzávaló eltávolítása</button>
        </div>)}
        <button type="button" className={styles.addSectionButton} onClick={addIngredient}>＋ Hozzávaló hozzáadása</button>
      </div>

      <div className={styles.fieldGroup}>
        <strong>Allergén és étrendi állítások</strong>
        <p className={styles.emptyHint}>Csak explicit, strukturált adat menthető. A Shoperation nem következtet az összetevőlistából. A „free-from” és étrendi megfelelőség ezért mindig merchant/certified source állítás.</p>
        {draft.claims.map((claim,index)=><div className={styles.complexField} key={`${claim.claimType}:${claim.claimCode}:${index}`}>
          <label className={styles.field}><span>Állítás típusa</span><select value={claim.claimType} onChange={event=>{const claimType=event.target.value as 'allergen'|'dietary';updateClaim(index,{claimType,status:claimType==='allergen'?'contains':'meets'});}}><option value="allergen">Allergén</option><option value="dietary">Étrendi</option></select></label>
          <label className={styles.field}><span>Kód</span><input value={claim.claimCode} onChange={event=>updateClaim(index,{claimCode:event.target.value.toLowerCase().replace(/[^a-z0-9._:-]+/g,'-')})}/></label>
          <label className={styles.field}><span>Státusz</span><select value={claim.status} onChange={event=>updateClaim(index,{status:event.target.value as RecipeStructuredClaim['status']})}>{claim.claimType==='allergen'?<><option value="contains">Tartalmaz</option><option value="may-contain">Nyomokban tartalmazhat</option><option value="free-from">Mentes</option></>:<><option value="meets">Megfelel</option><option value="does-not-meet">Nem felel meg</option></>}</select></label>
          <label className={styles.field}><span>Forrás</span><select value={claim.source} onChange={event=>updateClaim(index,{source:event.target.value as RecipeStructuredClaim['source']})}><option value="merchant-structured-data">Kereskedő által megadott strukturált adat</option><option value="certified-source">Tanúsított forrás</option></select></label>
          <label className={styles.field}><span>Bizonyíték / hivatkozás (opcionális)</span><input value={claim.evidenceRef??''} onChange={event=>updateClaim(index,{evidenceRef:event.target.value||null})}/></label>
          <button type="button" className={styles.secondaryButton} onClick={()=>removeClaim(index)}>Állítás eltávolítása</button>
        </div>)}
        <button type="button" className={styles.addSectionButton} onClick={addClaim}>＋ Strukturált állítás</button>
      </div>

      <div className={styles.fieldGroup}>
        <div className={styles.rowMoves}><button type="button" className={styles.addSectionButton} disabled={isPending} onClick={save}>{isPending?'Mentés…':'Recept mentése'}</button>{selected?<button type="button" className={styles.secondaryButton} disabled={isPending} onClick={remove}>Recept törlése</button>:null}</div>
        {notice?<p role="status" className={styles.emptyHint}>{notice}</p>:null}
      </div>
    </main>
  </div>;
}
