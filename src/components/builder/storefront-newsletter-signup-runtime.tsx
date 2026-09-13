'use client';

import {useState,type CSSProperties,type FormEvent} from 'react';

const text=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;

type Feedback={kind:'success'|'error';message:string}|null;

export function StorefrontNewsletterSignupRuntime({config,nodeId,gridSpan}:{config:Record<string,unknown>;nodeId:string;gridSpan:number}){
  const[busy,setBusy]=useState(false),[feedback,setFeedback]=useState<Feedback>(null);
  const primary=text(config.tone)==='primary';
  const rootStyle:CSSProperties={gridColumn:`span ${gridSpan} / span ${gridSpan}`,display:'grid',gap:'1rem',justifyItems:'center',textAlign:'center',padding:'clamp(3rem,8vw,7rem) 1.5rem',background:primary?'var(--shoporation-color-primary,#171717)':'var(--shoporation-color-surface,#eee8e1)',color:primary?'var(--shoporation-color-primary-contrast,#fff)':'inherit'};
  const submit=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(busy)return;
    const form=event.currentTarget,data=new FormData(form),email=String(data.get('email')??'').trim(),consent=data.get('consent')==='on';
    if(!consent){setFeedback({kind:'error',message:'A feliratkozáshoz szükséges a hozzájárulás.'});return;}
    setBusy(true);setFeedback(null);
    try{
      const response=await fetch('/api/marketing/newsletter',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,consent:true,source:'storefront_newsletter'})});
      const result=await response.json().catch(()=>({})) as{message?:string;error?:string};
      if(!response.ok)throw new Error(result.error||'A feliratkozás most nem sikerült.');
      setFeedback({kind:'success',message:result.message||'Sikeres feliratkozás.'});
      form.reset();
    }catch(reason){setFeedback({kind:'error',message:reason instanceof Error?reason.message:'A feliratkozás most nem sikerült.'});}
    finally{setBusy(false);}
  };
  const inputId=`newsletter-email-${nodeId}`,consentId=`newsletter-consent-${nodeId}`;
  return <section data-storefront-marketing="newsletter-signup" data-consent-authority="marketing_consents" style={rootStyle}>
    {text(config.eyebrow)?<small style={{letterSpacing:'.14em',textTransform:'uppercase'}}>{text(config.eyebrow)}</small>:null}
    <h2 style={{margin:0,maxWidth:'48rem',fontFamily:'var(--shoporation-heading-font,Georgia,serif)',fontSize:'clamp(2.25rem,5vw,4.5rem)',fontWeight:500}}>{text(config.title,'Maradj közel')}</h2>
    {text(config.copy)?<p style={{margin:0,maxWidth:'42rem',lineHeight:1.7}}>{text(config.copy)}</p>:null}
    <form onSubmit={submit} style={{display:'grid',gap:'.75rem',width:'min(100%,36rem)',marginTop:'.5rem'}}>
      <div style={{display:'flex',width:'100%'}}>
        <label style={{position:'absolute',width:1,height:1,overflow:'hidden',clip:'rect(0 0 0 0)'}} htmlFor={inputId}>{text(config.inputLabel,'E-mail-cím')}</label>
        <input id={inputId} name="email" type="email" autoComplete="email" required maxLength={320} placeholder={text(config.inputLabel,'E-mail-cím')} style={{minWidth:0,flex:1,padding:'.9rem 1rem',border:'1px solid currentColor',background:'transparent',color:'inherit'}}/>
        <button type="submit" disabled={busy} style={{padding:'.9rem 1.15rem',border:'1px solid currentColor',background:'transparent',color:'inherit',fontWeight:600,cursor:busy?'wait':'pointer'}}>{busy?'Küldés…':text(config.buttonLabel,'Feliratkozom')}</button>
      </div>
      <label htmlFor={consentId} style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:'.55rem',alignItems:'start',textAlign:'left',fontSize:'.82rem',opacity:.9}}>
        <input id={consentId} name="consent" type="checkbox" required style={{marginTop:'.15rem'}}/>
        <span>{text(config.consentLabel,'Hozzájárulok, hogy e-mailben marketingüzeneteket kapjak. A hozzájárulás bármikor visszavonható.')}</span>
      </label>
      {feedback?<p role={feedback.kind==='error'?'alert':'status'} aria-live="polite" style={{margin:0,fontWeight:600}}>{feedback.message}</p>:null}
    </form>
  </section>;
}
