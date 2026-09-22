'use client';

import {useState,type CSSProperties,type FormEvent} from 'react';

const text=(value:unknown,fallback='')=>typeof value==='string'&&value.trim()?value:fallback;
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
type Feedback={kind:'success'|'error';message:string}|null;
type SupportPayload={name:string;email:string;orderNumber:string;category:string;subject:string;message:string;website:string};

const initialValidationIssues=()=>[
  'Add meg az e-mail-címed.',
  'A tárgy legyen legalább 3 karakter.',
  'Az üzenet legyen legalább 10 karakter.',
];

function readPayload(form:HTMLFormElement):SupportPayload{
  const data=new FormData(form);
  return{
    name:String(data.get('name')??'').trim(),
    email:String(data.get('email')??'').trim(),
    orderNumber:String(data.get('orderNumber')??'').trim(),
    category:String(data.get('category')??'other'),
    subject:String(data.get('subject')??'').trim(),
    message:String(data.get('message')??'').trim(),
    website:String(data.get('website')??''),
  };
}

function validatePayload(payload:SupportPayload):string[]{
  const issues:string[]=[];
  if(!payload.email)issues.push('Add meg az e-mail-címed.');
  else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email))issues.push('Adj meg érvényes e-mail-címet.');
  if(payload.subject.length<3)issues.push('A tárgy legyen legalább 3 karakter.');
  if(payload.message.length<10)issues.push('Az üzenet legyen legalább 10 karakter.');
  return issues;
}

export function StorefrontSupportContactFormClient({config,gridSpan}:{config:Record<string,unknown>;gridSpan:number}){
  const[busy,setBusy]=useState(false),[feedback,setFeedback]=useState<Feedback>(null);
  const[validationIssues,setValidationIssues]=useState<string[]>(initialValidationIssues);
  const formReady=validationIssues.length===0;
  const tone=text(config.tone,'surface');
  const authoredStyle=record(config.style) as CSSProperties;
  const surface=tone==='background'?'var(--shoporation-color-background,#0b0a1a)':'var(--shoporation-color-surface,#15142c)';
  const fieldStyle:CSSProperties={width:'100%',minHeight:'2.9rem',padding:'.72rem .82rem',border:'1px solid var(--shoporation-color-border,#373259)',borderRadius:'var(--shoporation-radius-s,.375rem)',background:'var(--shoporation-color-background,#0b0a1a)',color:'var(--shoporation-color-text,#fff)',font:'inherit'};
  const labelStyle:CSSProperties={display:'grid',gap:'.38rem',fontSize:'.82rem',fontWeight:700,color:'var(--shoporation-color-text,#fff)'};

  const refreshValidation=(form:HTMLFormElement)=>{
    const issues=validatePayload(readPayload(form));
    setValidationIssues(issues);
    if(feedback?.kind==='error')setFeedback(null);
  };

  const submit=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(busy)return;
    const form=event.currentTarget,payload=readPayload(form),issues=validatePayload(payload);
    setValidationIssues(issues);
    if(issues.length){
      setFeedback({kind:'error',message:`Az üzenet még nem küldhető el. ${issues.join(' ')}`});
      return;
    }
    setBusy(true);setFeedback(null);
    try{
      const response=await fetch('/api/support',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const result=await response.json().catch(()=>({})) as{error?:string;ticketNumber?:string};
      if(!response.ok)throw new Error(result.error||'Az üzenet nem küldhető el.');
      setFeedback({kind:'success',message:`${text(config.successLead,'Köszönjük! Az ügy száma:')} ${result.ticketNumber??''}`.trim()});
      form.reset();
      setValidationIssues(initialValidationIssues());
    }catch(reason){setFeedback({kind:'error',message:reason instanceof Error?reason.message:'Az üzenet nem küldhető el.'});}
    finally{setBusy(false);}
  };

  return <section data-storefront-support="contact-form" style={{gridColumn:`span ${gridSpan} / span ${gridSpan}`,padding:'var(--shoporation-space-m,1.5rem)',background:surface,color:'var(--shoporation-color-text,#fff)',border:'1px solid var(--shoporation-color-border,#373259)',borderRadius:'var(--shoporation-radius-m,.75rem)',display:'grid',gap:'var(--shoporation-space-s,1rem)',...authoredStyle}}>
    <header style={{display:'grid',gap:'.45rem',maxWidth:'52rem'}}>
      <small style={{letterSpacing:'.14em',textTransform:'uppercase',color:'var(--shoporation-color-accent,#ff6b5e)',fontWeight:900}}>{text(config.eyebrow,'ÍRJ NEKÜNK')}</small>
      <h2 style={{margin:0,fontFamily:'var(--shoporation-heading-font,Arial,sans-serif)',fontSize:'clamp(1.8rem,3vw,2.7rem)',lineHeight:1.05}}>{text(config.title,'Ügyfélszolgálati üzenet')}</h2>
      <p style={{margin:0,color:'var(--shoporation-color-muted-text,#b8b4c7)',lineHeight:1.6}}>{text(config.copy,'Kérdésed van termékről, rendelésről vagy szállításról? Írj nekünk, és a megkeresésed követhető ügyfélszolgálati azonosítót kap.')}</p>
    </header>
    <form noValidate onInput={event=>refreshValidation(event.currentTarget)} onSubmit={submit} style={{display:'grid',gap:'var(--shoporation-space-s,1rem)'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(14rem,1fr))',gap:'var(--shoporation-space-s,1rem)'}}>
        <label style={labelStyle}>{text(config.nameLabel,'Név')}<input name="name" maxLength={120} style={fieldStyle}/></label>
        <label style={labelStyle}>{text(config.emailLabel,'E-mail')}<input name="email" type="email" autoComplete="email" required maxLength={200} style={fieldStyle}/></label>
        <label style={labelStyle}>{text(config.orderNumberLabel,'Rendelésszám')}<input name="orderNumber" maxLength={80} placeholder="Ha van" style={fieldStyle}/></label>
        <label style={labelStyle}>{text(config.categoryLabel,'Téma')}<select name="category" defaultValue="other" style={fieldStyle}><option value="product">Termékkérdés</option><option value="order">Rendelés</option><option value="shipping">Szállítás</option><option value="invoice">Számla</option><option value="reseller">Viszonteladói ügy</option><option value="return">Visszaküldés / visszatérítés</option><option value="other">Egyéb</option></select></label>
      </div>
      <label style={labelStyle}>{text(config.subjectLabel,'Tárgy')}<input name="subject" required minLength={3} maxLength={180} style={fieldStyle}/></label>
      <label style={labelStyle}>{text(config.messageLabel,'Üzenet')}<textarea name="message" required rows={6} minLength={10} maxLength={4000} style={{...fieldStyle,resize:'vertical'}}/></label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{position:'absolute',left:'-9999px',width:1,height:1}}/>
      <button type="submit" disabled={busy||!formReady} aria-describedby={!formReady?'support-form-validation-hint':undefined} style={{justifySelf:'start',minHeight:'2.9rem',padding:'.72rem 1.1rem',border:'1px solid var(--shoporation-color-primary,#5c7cfa)',borderRadius:'var(--shoporation-radius-s,.375rem)',background:'var(--shoporation-color-primary,#5c7cfa)',color:'var(--shoporation-color-primary-contrast,#fff)',fontWeight:900,cursor:busy?'wait':formReady?'pointer':'not-allowed',opacity:formReady&&!busy?1:.48}}>{busy?'Küldés…':text(config.buttonLabel,'Üzenet elküldése')}</button>
      {!formReady&&feedback?.kind!=='success'?<p id="support-form-validation-hint" aria-live="polite" style={{margin:0,color:'var(--shoporation-color-muted-text,#b8b4c7)',lineHeight:1.5,fontSize:'.86rem'}}>A küldéshez még szükséges: {validationIssues.join(' ')}</p>:null}
      {feedback?<p role={feedback.kind==='error'?'alert':'status'} aria-live="polite" style={{margin:0,fontWeight:700,color:feedback.kind==='error'?'var(--shoporation-color-danger,#ff6b6b)':'var(--shoporation-color-text,#fff)'}}>{feedback.message}</p>:null}
    </form>
  </section>;
}
