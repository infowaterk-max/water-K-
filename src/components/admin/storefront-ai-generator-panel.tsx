'use client';

import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {generateVisualBuilderStorefrontAction} from '@/app/admin/tartalom/builder/actions';

const fieldStyle={display:'grid',gap:6} as const;
const inputStyle={width:'100%',minHeight:40,padding:'9px 11px',border:'1px solid var(--admin-border, #d7dbe0)',borderRadius:10,background:'var(--admin-surface, #fff)',color:'inherit'} as const;

export function StorefrontAiGeneratorPanel(){
  const router=useRouter();
  const[pending,startTransition]=useTransition();
  const[message,setMessage]=useState<string|null>(null);
  const[error,setError]=useState<string|null>(null);

  return <section aria-labelledby="storefront-ai-generator-title" style={{marginBottom:16,padding:18,border:'1px solid var(--admin-border, #d7dbe0)',borderRadius:14,background:'var(--admin-surface, #fff)'}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'flex-start',flexWrap:'wrap'}}>
      <div>
        <p style={{margin:'0 0 4px',fontSize:12,fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',opacity:.65}}>Block 23 · AI webshop generátor</p>
        <h2 id="storefront-ai-generator-title" style={{margin:'0 0 6px'}}>Első webshop-váz generálása</h2>
        <p style={{margin:0,maxWidth:760,opacity:.72}}>A generátor csak a Shoporation engedélyezett sablonjaiból és komponenseiből dolgozik. Az eredmény kizárólag draft, utána ugyanebben a Visual Builderben szerkeszthető és csak külön művelettel publikálható.</p>
      </div>
    </div>
    <form style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginTop:16}} onSubmit={event=>{
      event.preventDefault();setError(null);setMessage(null);
      const data=new FormData(event.currentTarget);
      const input={
        businessCategory:String(data.get('businessCategory')??''),
        description:String(data.get('description')??''),
        style:String(data.get('style')??''),
        targetAudience:String(data.get('targetAudience')??''),
        language:String(data.get('language')??'hu'),
        operationKey:`ai-${crypto.randomUUID()}`,
      };
      startTransition(async()=>{
        try{
          const result=await generateVisualBuilderStorefrontAction(input);
          setMessage(`${result.pageCount} oldal draftja elkészült (${result.templateKey}). Ellenőrizd a Builderben, mielőtt publikálod.`);
          if(result.openPageKey)router.push(`/admin/tartalom/builder?page=${encodeURIComponent(result.openPageKey)}`);
          router.refresh();
        }catch{
          setError('A generálás nem fejeződött be. Nem mentettünk részleges vagy nem validált draftot. Ellenőrizd a briefet vagy próbáld újra.');
        }
      });
    }}>
      <label style={fieldStyle}>Üzlet / kategória
        <input name="businessCategory" required maxLength={120} placeholder="pl. prémium ékszer, outdoor, beauty" style={inputStyle}/>
      </label>
      <label style={fieldStyle}>Stílus
        <input name="style" required maxLength={200} placeholder="pl. elegáns, levegős, szerkesztőségi" style={inputStyle}/>
      </label>
      <label style={fieldStyle}>Célközönség
        <input name="targetAudience" required maxLength={400} placeholder="Kinek szól a webshop?" style={inputStyle}/>
      </label>
      <label style={fieldStyle}>Nyelv
        <select name="language" defaultValue="hu" style={inputStyle}><option value="hu">Magyar</option><option value="en">English</option></select>
      </label>
      <label style={{...fieldStyle,gridColumn:'1 / -1'}}>Rövid üzleti brief
        <textarea name="description" required maxLength={1200} rows={4} placeholder="Mit árulsz, milyen hangulatot és első benyomást szeretnél? Ne adj meg érzékeny adatot." style={{...inputStyle,resize:'vertical'}}/>
      </label>
      <div style={{gridColumn:'1 / -1',display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
        <button type="submit" disabled={pending} className="buttonPrimary">{pending?'Generálás…':'AI webshop-váz generálása'}</button>
        <span style={{fontSize:13,opacity:.68}}>A jelenlegi webshop brandadatait a szerver adja a generátornak; a tenant és jogosultság nem kliensből érkezik.</span>
      </div>
      {message?<p role="status" style={{gridColumn:'1 / -1',margin:0}}>{message}</p>:null}
      {error?<p role="alert" style={{gridColumn:'1 / -1',margin:0}}>{error}</p>:null}
    </form>
  </section>;
}
