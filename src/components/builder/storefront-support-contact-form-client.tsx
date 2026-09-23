'use client';

import type{CSSProperties}from'react';
import{StorefrontFormWizard,type StorefrontFormWizardStep}from'@/components/forms/storefront-form-wizard';

const text=(value:unknown,fallback='')=>typeof value==='string'&&value.trim()?value:fallback;
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};

export function StorefrontSupportContactFormClient({config,gridSpan}:{config:Record<string,unknown>;gridSpan:number}){
  const tone=text(config.tone,'surface');
  const authoredStyle=record(config.style) as CSSProperties;
  const surface=tone==='background'?'var(--shoporation-color-background,#0b0a1a)':'var(--shoporation-color-surface,#15142c)';
  const fieldStyle:CSSProperties={background:'var(--shoporation-color-background,#0b0a1a)',color:'var(--shoporation-color-text,#fff)'};
  const steps:readonly StorefrontFormWizardStep[]=[
    {id:'contact',title:'Kapcsolat',copy:'Add meg, hogyan tudunk visszajelezni.',fields:[
      {name:'name',label:text(config.nameLabel,'Név'),kind:'text',maxLength:120},
      {name:'email',label:text(config.emailLabel,'E-mail'),kind:'email',required:true,maxLength:200},
      {name:'orderNumber',label:text(config.orderNumberLabel,'Rendelésszám'),kind:'text',maxLength:80,placeholder:'Ha van'},
    ]},
    {id:'topic',title:'Téma',copy:'Válaszd ki, miben segíthetünk.',fields:[
      {name:'category',label:text(config.categoryLabel,'Téma'),kind:'select',required:true,defaultValue:'other',options:[
        {value:'product',label:'Termékkérdés'},{value:'order',label:'Rendelés'},{value:'shipping',label:'Szállítás'},{value:'invoice',label:'Számla'},{value:'reseller',label:'Viszonteladói ügy'},{value:'return',label:'Visszaküldés / visszatérítés'},{value:'other',label:'Egyéb'},
      ]},
    ]},
    {id:'message',title:'Üzenet',copy:'Írd le röviden a kérésedet.',fields:[
      {name:'subject',label:text(config.subjectLabel,'Tárgy'),kind:'text',required:true,minLength:3,maxLength:180},
      {name:'message',label:text(config.messageLabel,'Üzenet'),kind:'textarea',required:true,minLength:10,maxLength:4000,rows:6},
    ]},
  ];

  return <section data-storefront-support="contact-form" data-form-engine="storefront-form-wizard-v1" style={{gridColumn:`span ${gridSpan} / span ${gridSpan}`,width:'100%',maxWidth:'54rem',marginInline:'auto',padding:'var(--shoporation-space-m,1.5rem)',background:surface,color:'var(--shoporation-color-text,#fff)',border:'1px solid var(--shoporation-color-border,#373259)',borderRadius:'var(--shoporation-radius-m,.75rem)',display:'grid',gap:'var(--shoporation-space-s,1rem)',...authoredStyle}}>
    <header style={{display:'grid',gap:'.45rem',maxWidth:'52rem'}}>
      <small style={{letterSpacing:'.14em',textTransform:'uppercase',color:'var(--shoporation-color-accent,#ff6b5e)',fontWeight:900}}>{text(config.eyebrow,'ÍRJ NEKÜNK')}</small>
      <h2 style={{margin:0,fontFamily:'var(--shoporation-heading-font,Arial,sans-serif)',fontSize:'clamp(1.8rem,3vw,2.7rem)',lineHeight:1.05}}>{text(config.title,'Ügyfélszolgálati üzenet')}</h2>
      <p style={{margin:0,color:'var(--shoporation-color-muted-text,#b8b4c7)',lineHeight:1.6}}>{text(config.copy,'Kérdésed van termékről, rendelésről vagy szállításról? Írj nekünk, és a megkeresésed követhető ügyfélszolgálati azonosítót kap.')}</p>
    </header>
    <StorefrontFormWizard
      steps={steps}
      endpoint="/api/support"
      submitLabel={text(config.buttonLabel,'Üzenet elküldése')}
      busyLabel="Küldés…"
      successMessage={result=>`${text(config.successLead,'Köszönjük! Az ügy száma:')} ${typeof result.ticketNumber==='string'?result.ticketNumber:''}`.trim()}
      styles={{field:fieldStyle}}
    />
  </section>;
}
