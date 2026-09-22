'use client';

import { useMemo,useState } from 'react';

type BrandKit={id:string;name:string;logo_url:string|null;tokens:unknown;company_details:unknown;social_links:unknown;updated_at?:string|null};
type SaveState='idle'|'saving'|'saved'|'error';
const fonts=['Arial, Helvetica, sans-serif','Georgia, Times, serif','Verdana, Geneva, sans-serif','Trebuchet MS, Arial, sans-serif'] as const;
const defaults={primary:'#2a665b',background:'#f3f0e9',surface:'#fffdf9',text:'#1f2925',fontFamily:'Arial, Helvetica, sans-serif',headingFontFamily:'Georgia, Times, serif',cardRadius:20,buttonRadius:12};
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const stringValue=(value:unknown,fallback:string)=>typeof value==='string'?value:fallback;
const numberValue=(value:unknown,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;

export function EmailBrandKitEditor({initialBrandKit,fallbackName}:{initialBrandKit:BrandKit|null;fallbackName:string}){
  const initialTokens=useMemo(()=>record(initialBrandKit?.tokens),[initialBrandKit]);
  const initialColors=useMemo(()=>record(initialTokens.colors),[initialTokens]);
  const initialTypography=useMemo(()=>record(initialTokens.typography),[initialTokens]);
  const initialRadius=useMemo(()=>record(initialTokens.radius),[initialTokens]);
  const[name,setName]=useState(initialBrandKit?.name||fallbackName||'Webshop');
  const[logoUrl,setLogoUrl]=useState(initialBrandKit?.logo_url||'');
  const[primary,setPrimary]=useState(stringValue(initialColors.primary,defaults.primary));
  const[background,setBackground]=useState(stringValue(initialColors.background,defaults.background));
  const[surface,setSurface]=useState(stringValue(initialColors.surface,defaults.surface));
  const[text,setText]=useState(stringValue(initialColors.text,defaults.text));
  const[fontFamily,setFontFamily]=useState(stringValue(initialTypography.fontFamily,defaults.fontFamily));
  const[headingFontFamily,setHeadingFontFamily]=useState(stringValue(initialTypography.headingFontFamily,defaults.headingFontFamily));
  const[cardRadius,setCardRadius]=useState(numberValue(initialRadius.card,defaults.cardRadius));
  const[buttonRadius,setButtonRadius]=useState(numberValue(initialRadius.button,defaults.buttonRadius));
  const[state,setState]=useState<SaveState>('idle');
  const[message,setMessage]=useState(initialBrandKit?'Mentett Brand Kit betöltve.':'Még nincs mentett Brand Kit. A sablon a prémium alapstílust használja.');

  async function save(){
    setState('saving');setMessage('Brand Kit mentése…');
    const tokens={...initialTokens,colors:{...initialColors,primary,background,surface,text},typography:{...initialTypography,fontFamily,headingFontFamily},radius:{...initialRadius,card:cardRadius,button:buttonRadius}};
    try{
      const response=await fetch('/api/admin/email-builder/brand-kit',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({name:name.trim(),logoUrl:logoUrl.trim()||null,tokens,companyDetails:record(initialBrandKit?.company_details),socialLinks:record(initialBrandKit?.social_links)})});
      const data=await response.json().catch(()=>null) as {error?:string;brandKit?:BrandKit}|null;
      if(!response.ok||!data?.brandKit)throw new Error(data?.error||'A Brand Kit nem menthető.');
      setState('saved');setMessage('Brand Kit mentve. Az öröklő preview-k a friss márkaalapot használják.');
    }catch(error){setState('error');setMessage(error instanceof Error?error.message:'A Brand Kit nem menthető.');}
  }

  const colorField=(label:string,value:string,setter:(value:string)=>void)=><label style={{display:'grid',gap:8}}><span style={{fontWeight:800}}>{label}</span><div style={{display:'grid',gridTemplateColumns:'48px minmax(0,1fr)',gap:10}}><input aria-label={`${label} színválasztó`} type="color" value={value} onChange={event=>setter(event.target.value)} style={{width:48,height:42,padding:3}}/><input value={value} onChange={event=>setter(event.target.value)} /></div></label>;
  return <div style={{display:'grid',gap:22}}>
    <section className="featurePanel">
      <span className="eyebrow">Márkaalap</span>
      <h2>Brand Kit</h2>
      <p className="muted">A Brand Kit a logót, a márkaszíneket és a tipográfiai alapot adja az öröklő e-mail sablonoknak. A mentés nem aktivál és nem küld e-mailt.</p>
      <div className={state==='error'?'errorNotice':'notice'} style={{marginTop:14}}><strong>{state==='saving'?'Mentés folyamatban':state==='saved'?'Mentve':state==='error'?'Hiba':'Állapot'}</strong><p>{message}</p></div>
    </section>

    <div className="cards" style={{gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',alignItems:'start'}}>
      <section className="card" style={{display:'grid',gap:16}}>
        <div><span className="eyebrow">Azonosítás</span><h3>Márka</h3></div>
        <label style={{display:'grid',gap:8}}><span style={{fontWeight:800}}>Márkanév</span><input value={name} onChange={event=>setName(event.target.value)} maxLength={120}/></label>
        <label style={{display:'grid',gap:8}}><span style={{fontWeight:800}}>Logó URL</span><input value={logoUrl} onChange={event=>setLogoUrl(event.target.value)} placeholder="https://…" inputMode="url"/><small className="muted">HTTPS logó URL. Üresen hagyva a webshop neve jelenik meg szövegesen.</small></label>
        {colorField('Elsődleges szín',primary,setPrimary)}
        {colorField('E-mail háttér',background,setBackground)}
        {colorField('Kártya háttér',surface,setSurface)}
        {colorField('Szövegszín',text,setText)}
      </section>

      <section className="card" style={{display:'grid',gap:16}}>
        <div><span className="eyebrow">Tipográfia és forma</span><h3>Design alapok</h3></div>
        <label style={{display:'grid',gap:8}}><span style={{fontWeight:800}}>Törzsszöveg betűtípusa</span><select value={fontFamily} onChange={event=>setFontFamily(event.target.value)}>{fonts.map(font=><option key={font} value={font}>{font.split(',')[0]}</option>)}</select></label>
        <label style={{display:'grid',gap:8}}><span style={{fontWeight:800}}>Címsor betűtípusa</span><select value={headingFontFamily} onChange={event=>setHeadingFontFamily(event.target.value)}>{fonts.map(font=><option key={font} value={font}>{font.split(',')[0]}</option>)}</select></label>
        <label style={{display:'grid',gap:8}}><span style={{fontWeight:800}}>Kártya lekerekítés: {cardRadius}px</span><input type="range" min="0" max="32" value={cardRadius} onChange={event=>setCardRadius(Number(event.target.value))}/></label>
        <label style={{display:'grid',gap:8}}><span style={{fontWeight:800}}>Gomb lekerekítés: {buttonRadius}px</span><input type="range" min="0" max="32" value={buttonRadius} onChange={event=>setButtonRadius(Number(event.target.value))}/></label>
        <div className="notice"><strong>Öröklési szabály</strong><p>A Brand Kit az alap. A sablon csak azokat a tokeneket írja felül, amelyeket kifejezetten a Design fülön módosítasz.</p></div>
        <button type="button" className="btn btnPrimary" onClick={save} disabled={state==='saving'||!name.trim()}>{state==='saving'?'Mentés…':'Brand Kit mentése'}</button>
      </section>
    </div>
  </div>;
}
