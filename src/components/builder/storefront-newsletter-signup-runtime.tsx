'use client';

import {useState,type CSSProperties,type FormEvent} from 'react';

const text=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
type Feedback={kind:'success'|'error';message:string}|null;
type NewsletterPayload={email:string;consent:boolean};

function readPayload(form:HTMLFormElement):NewsletterPayload{
  const data=new FormData(form);
  return{email:String(data.get('email')??'').trim(),consent:data.get('consent')==='on'};
}
function validatePayload(payload:NewsletterPayload):string[]{
  const issues:string[]=[];
  if(!payload.email)issues.push('add meg az e-mail-címed');
  else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email))issues.push('adj meg érvényes e-mail-címet');
  if(!payload.consent)issues.push('fogadd el a marketing-hozzájárulást');
  return issues;
}

export function StorefrontNewsletterSignupRuntime({config,nodeId,gridSpan}:{config:Record<string,unknown>;nodeId:string;gridSpan:number}){
  const[busy,setBusy]=useState(false),[feedback,setFeedback]=useState<Feedback>(null),[issues,setIssues]=useState<string[]>(['add meg az e-mail-címed','fogadd el a marketing-hozzájárulást']);
  const formReady=issues.length===0;
  const primary=text(config.tone)==='primary';
  const rootStyle:CSSProperties={gridColumn:`span ${gridSpan} / span ${gridSpan}`,display:'grid',gap:'var(--shoporation-space-s,1rem)',justifyItems:'center',textAlign:'center',minWidth:0,width:'100%',maxWidth:'100%',boxSizing:'border-box',padding:'var(--shoporation-space-xl,4rem) var(--shoporation-space-m,1.5rem)',background:primary?'var(--shoporation-color-primary,#171717)':'var(--shoporation-color-surface,#eee8e1)',color:primary?'var(--shoporation-color-primary-contrast,#fff)':'var(--shoporation-color-text,#171717)',border:'1px solid var(--shoporation-color-border,#ddd)',borderRadius:'var(--shoporation-radius-m,.75rem)'};
  const inputId=`newsletter-email-${nodeId}`,consentId=`newsletter-consent-${nodeId}`;
  const inputStyle:CSSProperties={minWidth:0,width:'100%',boxSizing:'border-box',padding:'.9rem 1rem',border:'1px solid var(--shoporation-color-border,currentColor)',borderRadius:'var(--shoporation-radius-s,.375rem) 0 0 var(--shoporation-radius-s,.375rem)',background:'var(--shoporation-color-background,transparent)',color:'var(--shoporation-color-text,inherit)',font:'inherit'};
  const buttonStyle:CSSProperties={minWidth:'max-content',boxSizing:'border-box',whiteSpace:'nowrap',padding:'.9rem 1.15rem',border:'1px solid var(--shoporation-color-primary,currentColor)',borderRadius:'0 var(--shoporation-radius-s,.375rem) var(--shoporation-radius-s,.375rem) 0',background:'var(--shoporation-color-primary,transparent)',color:'var(--shoporation-color-primary-contrast,inherit)',fontWeight:800,cursor:busy?'wait':formReady?'pointer':'not-allowed',opacity:busy||!formReady?.48:1};

  const refresh=(form:HTMLFormElement)=>{
    setIssues(validatePayload(readPayload(form)));
    if(feedback?.kind==='error')setFeedback(null);
  };
  const submit=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();if(busy)return;
    const form=event.currentTarget,payload=readPayload(form),nextIssues=validatePayload(payload);
    setIssues(nextIssues);
    if(nextIssues.length){setFeedback({kind:'error',message:`A feliratkozás még nem küldhető el: ${nextIssues.join(', ')}.`});return;}
    setBusy(true);setFeedback(null);
    try{
      const response=await fetch('/api/marketing/newsletter',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:payload.email,consent:true,source:'storefront_newsletter'})});
      const result=await response.json().catch(()=>({})) as{message?:string;error?:string};
      if(!response.ok)throw new Error(result.error||'A feliratkozás most nem sikerült.');
      setFeedback({kind:'success',message:result.message||'Sikeres feliratkozás.'});
      form.reset();
      setIssues(['add meg az e-mail-címed','fogadd el a marketing-hozzájárulást']);
    }catch(reason){setFeedback({kind:'error',message:reason instanceof Error?reason.message:'A feliratkozás most nem sikerült.'});}
    finally{setBusy(false);}
  };

  return <section data-storefront-marketing="newsletter-signup" data-consent-authority="marketing_consents" style={rootStyle}>
    {text(config.eyebrow)?<small style={{letterSpacing:'.14em',textTransform:'uppercase',color:'var(--shoporation-color-accent,currentColor)',fontWeight:900}}>{text(config.eyebrow)}</small>:null}
    <h2 style={{margin:0,maxWidth:'48rem',minWidth:0,overflowWrap:'anywhere',fontFamily:'var(--shoporation-heading-font,Georgia,serif)',fontSize:'clamp(2rem,5vw,4rem)',fontWeight:700,lineHeight:1.05}}>{text(config.title,'Maradj közel')}</h2>
    {text(config.copy)?<p style={{margin:0,maxWidth:'42rem',minWidth:0,overflowWrap:'anywhere',lineHeight:1.7,color:'var(--shoporation-color-muted-text,inherit)'}}>{text(config.copy)}</p>:null}
    <form noValidate onInput={event=>refresh(event.currentTarget)} onSubmit={submit} style={{display:'grid',gap:'var(--shoporation-space-xs,.5rem)',width:'100%',maxWidth:'36rem',minWidth:0,boxSizing:'border-box',marginTop:'.5rem'}}>
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto',width:'100%',minWidth:0}}><label style={{position:'absolute',width:1,height:1,overflow:'hidden',clip:'rect(0 0 0 0)'}} htmlFor={inputId}>{text(config.inputLabel,'E-mail-cím')}</label><input id={inputId} name="email" type="email" autoComplete="email" required maxLength={320} placeholder={text(config.inputLabel,'E-mail-cím')} style={inputStyle}/><button type="submit" disabled={busy||!formReady} aria-describedby={!formReady?`${nodeId}-newsletter-hint`:undefined} style={buttonStyle}>{busy?'Küldés…':text(config.buttonLabel,'Feliratkozom')}</button></div>
      <label htmlFor={consentId} style={{display:'grid',gridTemplateColumns:'auto minmax(0,1fr)',gap:'.55rem',alignItems:'start',textAlign:'left',minWidth:0,fontSize:'.82rem',color:'var(--shoporation-color-muted-text,inherit)'}}><input id={consentId} name="consent" type="checkbox" required style={{marginTop:'.15rem'}}/><span style={{minWidth:0,overflowWrap:'anywhere'}}>{text(config.consentLabel,'Hozzájárulok, hogy e-mailben marketingüzeneteket kapjak. A hozzájárulás bármikor visszavonható.')}</span></label>
      {!formReady&&feedback?.kind!=='success'?<small id={`${nodeId}-newsletter-hint`} aria-live="polite" style={{textAlign:'left',width:'100%',color:'var(--shoporation-color-muted-text,inherit)'}}>A feliratkozáshoz még szükséges: {issues.join(', ')}.</small>:null}
      {feedback?<p role={feedback.kind==='error'?'alert':'status'} aria-live="polite" style={{margin:0,fontWeight:700}}>{feedback.message}</p>:null}
    </form>
  </section>;
}
