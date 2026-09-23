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
    {id:'topic',title:'Téma',copy:'Elsőként válaszd ki, milyen ügyben keresel minket.',fields:[
      {name:'requestType',label:text(config.categoryLabel,'Miben segíthetünk?'),kind:'topic',required:true,options:[
        {value:'general',label:'Általános információ',description:'Termékinformáció, fizetési lehetőségek, a webshop használata vagy más, rendeléshez nem kötődő kérdés.',nextHint:'A következő lépésben pontosítjuk, miről szeretnél érdeklődni.'},
        {value:'order',label:'Rendelésemmel kapcsolatban írok',description:'Meglévő rendelés állapota, módosítása, lemondása vagy a rendelés tartalmával kapcsolatos kérdés.',nextHint:'A következő lépésben elkérjük a rendelés számát és az ügy típusát.'},
        {value:'shipping',label:'Szállítással kapcsolatban írok',description:'Szállítási módok, díjak, csomagkövetés, késés, kézbesítési vagy címprobléma.',nextHint:'Konkrét csomagnál megadhatod a rendelés számát is.'},
        {value:'product-issue',label:'Hibás / sérült terméket kaptam',description:'Sérült, hibás, hiányos vagy eltérő termék, illetve garanciális probléma.',nextHint:'A következő lépésben az érintett rendelést és a probléma típusát kérjük.'},
        {value:'return',label:'Visszaküldés / visszatérítés',description:'Elállás, termékvisszaküldés, csere vagy egy már elindított visszatérítés állapota.',nextHint:'A következő lépésben az érintett rendelést és a kérést pontosítjuk.'},
        {value:'invoice',label:'Számlázási kérdés',description:'Hiányzó számla, hibás számlaadat, számlázási adatok vagy más számlázással kapcsolatos kérdés.',nextHint:'Ha konkrét rendeléshez kapcsolódik, a rendelés számát is megadhatod.'},
        {value:'complaint',label:'Panaszt szeretnék tenni',description:'Rendeléssel, termékkel, szállítással vagy ügyfélszolgálattal kapcsolatos panasz.',nextHint:'A következő lépésben kiválaszthatod a panasz területét.'},
        {value:'other',label:'Egyéb',description:'Ha egyik felsorolt kategória sem írja le jól az ügyedet, itt saját tárgyat adhatsz meg.',nextHint:'A következő lépésben röviden megnevezheted az ügyet.'},
      ]},
    ]},
    {id:'general-detail',title:'Pontosítás',copy:'Milyen általános információra van szükséged?',whenTopic:'general',fields:[
      {name:'category',label:'Kategória',kind:'hidden',defaultValue:'other'},
      {name:'subject',label:'Miről szeretnél érdeklődni?',kind:'choice',required:true,options:[
        {value:'Termékinformáció',label:'Termékinformáció'},
        {value:'Fizetés / fizetési módok',label:'Fizetés / fizetési módok'},
        {value:'Webshop használata',label:'Webshop használata'},
        {value:'Egyéb általános kérdés',label:'Egyéb általános kérdés'},
      ]},
    ]},
    {id:'order-detail',title:'Pontosítás',copy:'Azonosítsd a rendelést, majd válaszd ki, miben segíthetünk.',whenTopic:'order',fields:[
      {name:'category',label:'Kategória',kind:'hidden',defaultValue:'order'},
      {name:'orderNumber',label:text(config.orderNumberLabel,'Rendelésszám'),kind:'text',required:true,maxLength:80,placeholder:'Pl. SHOP-12345'},
      {name:'subject',label:'Mi történt?',kind:'choice',required:true,options:[
        {value:'Rendelés állapota',label:'Rendelés állapota'},
        {value:'Rendelés módosítása',label:'Rendelés módosítása'},
        {value:'Hiányzó / eltérő termék',label:'Hiányzó / eltérő termék'},
        {value:'Rendelés lemondása',label:'Rendelés lemondása'},
        {value:'Egyéb rendelési ügy',label:'Egyéb rendelési ügy'},
      ]},
    ]},
    {id:'shipping-detail',title:'Pontosítás',copy:'Válaszd ki a szállítási ügy típusát. Rendelésszám csak konkrét csomagnál szükséges.',whenTopic:'shipping',fields:[
      {name:'category',label:'Kategória',kind:'hidden',defaultValue:'shipping'},
      {name:'orderNumber',label:text(config.orderNumberLabel,'Rendelésszám'),kind:'text',maxLength:80,placeholder:'Ha konkrét rendelésről van szó'},
      {name:'subject',label:'Miben segíthetünk?',kind:'choice',required:true,options:[
        {value:'Szállítási módok / díjak',label:'Szállítási módok / díjak'},
        {value:'Csomag késik',label:'Csomag késik'},
        {value:'Csomag nem érkezett meg',label:'Csomag nem érkezett meg'},
        {value:'Csomagkövetés',label:'Csomagkövetés'},
        {value:'Szállítási cím módosítása',label:'Szállítási cím módosítása'},
        {value:'Egyéb szállítási ügy',label:'Egyéb szállítási ügy'},
      ]},
    ]},
    {id:'product-issue-detail',title:'Pontosítás',copy:'Add meg az érintett rendelést és válaszd ki a problémát.',whenTopic:'product-issue',fields:[
      {name:'category',label:'Kategória',kind:'hidden',defaultValue:'product'},
      {name:'orderNumber',label:text(config.orderNumberLabel,'Rendelésszám'),kind:'text',required:true,maxLength:80,placeholder:'Pl. SHOP-12345'},
      {name:'subject',label:'Mi a probléma?',kind:'choice',required:true,options:[
        {value:'Sérült termék',label:'Sérült termék'},
        {value:'Hibás termék',label:'Hibás termék'},
        {value:'Hiányos termék',label:'Hiányos termék'},
        {value:'Más termék érkezett',label:'Más termék érkezett'},
        {value:'Garanciális kérdés',label:'Garanciális kérdés'},
      ]},
    ]},
    {id:'return-detail',title:'Pontosítás',copy:'Add meg az érintett rendelést, majd válaszd ki a kérést.',whenTopic:'return',fields:[
      {name:'category',label:'Kategória',kind:'hidden',defaultValue:'return'},
      {name:'orderNumber',label:text(config.orderNumberLabel,'Rendelésszám'),kind:'text',required:true,maxLength:80,placeholder:'Pl. SHOP-12345'},
      {name:'subject',label:'Mit szeretnél intézni?',kind:'choice',required:true,options:[
        {value:'Elállás / visszaküldés',label:'Elállás / visszaküldés'},
        {value:'Visszatérítés állapota',label:'Visszatérítés állapota'},
        {value:'Csere',label:'Csere'},
        {value:'Egyéb visszaküldési ügy',label:'Egyéb visszaküldési ügy'},
      ]},
    ]},
    {id:'invoice-detail',title:'Pontosítás',copy:'Válaszd ki a számlázási ügyet. A rendelés száma csak akkor kell, ha az ügy konkrét rendeléshez tartozik.',whenTopic:'invoice',fields:[
      {name:'category',label:'Kategória',kind:'hidden',defaultValue:'invoice'},
      {name:'orderNumber',label:text(config.orderNumberLabel,'Rendelésszám'),kind:'text',maxLength:80,placeholder:'Ha van érintett rendelés'},
      {name:'subject',label:'Miben segíthetünk?',kind:'choice',required:true,options:[
        {value:'Számlát nem kaptam meg',label:'Számlát nem kaptam meg'},
        {value:'Hibás adatok a számlán',label:'Hibás adatok a számlán'},
        {value:'Számlázási adatok módosítása',label:'Számlázási adatok módosítása'},
        {value:'Egyéb számlázási kérdés',label:'Egyéb számlázási kérdés'},
      ]},
    ]},
    {id:'complaint-detail',title:'Pontosítás',copy:'Melyik területhez kapcsolódik a panasz?',whenTopic:'complaint',fields:[
      {name:'category',label:'Kategória',kind:'hidden',defaultValue:'other'},
      {name:'orderNumber',label:text(config.orderNumberLabel,'Rendelésszám'),kind:'text',maxLength:80,placeholder:'Ha van érintett rendelés'},
      {name:'subject',label:'Panasz területe',kind:'choice',required:true,options:[
        {value:'Rendeléssel kapcsolatos panasz',label:'Rendeléssel kapcsolatos panasz'},
        {value:'Termékkel kapcsolatos panasz',label:'Termékkel kapcsolatos panasz'},
        {value:'Szállítással kapcsolatos panasz',label:'Szállítással kapcsolatos panasz'},
        {value:'Ügyfélszolgálati panasz',label:'Ügyfélszolgálati panasz'},
        {value:'Egyéb panasz',label:'Egyéb panasz'},
      ]},
    ]},
    {id:'other-detail',title:'Pontosítás',copy:'Nevezd meg röviden, milyen ügyben írsz.',whenTopic:'other',fields:[
      {name:'category',label:'Kategória',kind:'hidden',defaultValue:'other'},
      {name:'subject',label:text(config.subjectLabel,'Tárgy'),kind:'text',required:true,minLength:3,maxLength:180},
    ]},
    {id:'contact',title:'Elérhetőség',copy:'Add meg, hogyan tudunk visszajelezni.',fields:[
      {name:'name',label:text(config.nameLabel,'Név'),kind:'text',maxLength:120},
      {name:'email',label:text(config.emailLabel,'E-mail'),kind:'email',required:true,maxLength:200},
    ]},
    {id:'message',title:'Üzenet',copy:'Írd le a szükséges részleteket. Csak azt kérjük, ami az ügy megoldásához kell.',fields:[
      {name:'message',label:text(config.messageLabel,'Üzenet'),kind:'textarea',required:true,minLength:10,maxLength:4000,rows:6},
    ]},
  ];

  return <section data-storefront-support="contact-form" data-form-engine="storefront-form-wizard-v1" style={{gridColumn:`span ${gridSpan} / span ${gridSpan}`,width:'100%',maxWidth:'54rem',margin:'1rem auto 2rem',padding:'var(--shoporation-space-m,1.5rem)',background:surface,color:'var(--shoporation-color-text,#fff)',border:'1px solid var(--shoporation-color-border,#373259)',borderRadius:'var(--shoporation-radius-m,.75rem)',display:'grid',gap:'var(--shoporation-space-s,1rem)',...authoredStyle}}>
    <header style={{display:'grid',gap:'.45rem',maxWidth:'52rem'}}>
      <small style={{letterSpacing:'.14em',textTransform:'uppercase',color:'var(--shoporation-color-accent,#ff6b5e)',fontWeight:900}}>{text(config.eyebrow,'ÍRJ NEKÜNK')}</small>
      <h2 style={{margin:0,fontFamily:'var(--shoporation-heading-font,Arial,sans-serif)',fontSize:'clamp(1.8rem,3vw,2.7rem)',lineHeight:1.05}}>{text(config.title,'Ügyfélszolgálati üzenet')}</h2>
      <p style={{margin:0,color:'var(--shoporation-color-muted-text,#b8b4c7)',lineHeight:1.6}}>{text(config.copy,'Válaszd ki, miben segíthetünk. A wizard csak az adott ügyhöz szükséges adatokat kéri el.')}</p>
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
