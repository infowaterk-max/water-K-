import type {CSSProperties,ReactNode} from 'react';
import {StorefrontRendererRegistry,type StorefrontComponentRenderProps} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontSharedContentRendererRegistry} from '@/components/builder/storefront-shared-content';
import {sanitizeStorefrontStyleSlots} from '@/lib/builder/storefront-fidelity-engine';
import {resolveStorefrontVisualStyle} from '@/lib/builder/storefront-visual-style';

export const STOREFRONT_DIGITAL_COMMERCE_RENDERERS_VERSION='shoporation.storefront-digital-commerce-renderers.v5' as const;

const text=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
const record=(value:unknown):Record<string,unknown>|null=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
const rows=(value:unknown):Record<string,unknown>[]=>Array.isArray(value)?value.flatMap(item=>{const row=record(item);return row?[row]:[]}):[];
const bool=(value:unknown,fallback=false)=>typeof value==='boolean'?value:fallback;
const safeInternalHref=(value:unknown,fallback='')=>typeof value==='string'&&value.startsWith('/')&&!value.startsWith('//')?value:fallback;
const span=(node:StorefrontComponentRenderProps['node']):CSSProperties=>({gridColumn:`span ${node.resolved.gridSpan} / span ${node.resolved.gridSpan}`});
const styles=(config:Record<string,unknown>,viewport:StorefrontComponentRenderProps['viewport'])=>{
  const slots=sanitizeStorefrontStyleSlots(config.styleSlots);
  return(slot:string)=>resolveStorefrontVisualStyle(slots[slot],viewport) as CSSProperties;
};
const surface=(slot:(key:string)=>CSSProperties):CSSProperties=>({
  border:'1px solid var(--shoporation-color-border,#d8dce7)',
  borderRadius:'var(--shoporation-radius-m,.75rem)',
  background:'var(--shoporation-color-surface,#fff)',
  color:'var(--shoporation-color-text,#111827)',
  ...slot('surface'),
});
const stateOf=(model:Record<string,unknown>|null)=>text(model?.state,model?'ready':'empty');
const statePanel=(state:string,config:Record<string,unknown>,slot:(key:string)=>CSSProperties):ReactNode=>{
  if(state==='loading')return <p role="status" style={{margin:0,color:'var(--shoporation-color-muted-text,#667085)',...slot('state')}}>Betöltés…</p>;
  if(state==='error')return <p role="alert" style={{margin:0,color:'var(--shoporation-color-danger,#b42318)',...slot('state')}}>Az adatok most nem tölthetők be. Próbáld meg később.</p>;
  if(state==='locked')return <div style={{display:'grid',gap:'.55rem',...slot('state')}}><p style={{margin:0}}>A tartalom megtekintéséhez bejelentkezés szükséges.</p><a href="/fiokom" style={{color:'inherit',fontWeight:750}}>{text(config.loginLabel,'Belépés a fiókba')}</a></div>;
  if(state==='revoked')return <p role="status" style={{margin:0,color:'var(--shoporation-color-muted-text,#667085)',...slot('state')}}>A hozzáférés ehhez a tartalomhoz már nem aktív.</p>;
  return null;
};

function DownloadsTileRenderer({config,node,viewport}:StorefrontComponentRenderProps){
  const model=record(config.model),state=stateOf(model),slot=styles(config,viewport);
  const presentation=text(config.presentation,'priority-tile');
  const compact=presentation.includes('facts-tile');
  if(state!=='ready')return state==='empty'?null:<section data-storefront-digital-commerce="downloads-tile" data-state={state} data-presentation={presentation} style={{...span(node),padding:compact?'.72rem .8rem':'1rem',...surface(slot),...slot('root')}}>{statePanel(state,config,slot)}</section>;
  const documents=rows(model?.documents),mode=text(model?.mode,'physical');
  const hasDigital=mode==='digital'||mode==='mixed';
  if(!documents.length&&!hasDigital)return null;
  const firstDocument=documents[0],firstHref=safeInternalHref(firstDocument?.downloadHref);

  if(compact)return <section data-storefront-digital-commerce="downloads-tile" data-fulfillment-mode={mode} data-presentation={presentation} style={{...span(node),display:'grid',alignContent:'start',gap:'.34rem',minHeight:'100%',padding:'.72rem .8rem',...surface(slot),...slot('root')}}>
    <small style={{fontWeight:850,fontSize:'.68rem',letterSpacing:'.08em',textTransform:'uppercase',color:'var(--shoporation-color-accent,#2f7f6f)',...slot('eyebrow')}}>{text(config.eyebrow,'LETÖLTÉSEK')}</small>
    <strong style={{fontSize:'clamp(.92rem,1.4vw,1.02rem)',lineHeight:1.15,...slot('title')}}>{text(config.title,'Letöltések')}</strong>
    {documents.length?<div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:'.5rem',fontSize:'.78rem',...slot('row')}}><span>{text(firstDocument?.kindLabel,text(config.documentsLabel,'Dokumentum'))}{documents.length>1?` · ${documents.length} db`:''}</span>{firstHref?<a href={firstHref} style={{color:'inherit',fontWeight:750,...slot('open')}}>{text(config.openLabel,'Megnyitás')}</a>:null}</div>:null}
    {hasDigital?<small data-digital-download-location="account" style={{color:'var(--shoporation-color-muted-text,#667085)',lineHeight:1.35,fontWeight:650,...slot('copy')}}>{text(config.digitalCompactCopy,'Digitális tartalom: Fiókom → Letöltéseim')}</small>:null}
  </section>;

  const documentsHref=documents.length===1?firstHref:'';
  return <section data-storefront-digital-commerce="downloads-tile" data-fulfillment-mode={mode} data-presentation={presentation} style={{...span(node),display:'grid',gap:'.75rem',padding:'clamp(.9rem,2vw,1.15rem)',...surface(slot),...slot('root')}}>
    <header style={{display:'grid',gap:'.25rem',...slot('header')}}>{text(config.eyebrow)?<small style={{fontWeight:800,letterSpacing:'.09em',textTransform:'uppercase',color:'var(--shoporation-color-accent,#2f7f6f)',...slot('eyebrow')}}>{text(config.eyebrow)}</small>:null}<h2 style={{margin:0,fontFamily:'var(--shoporation-heading-font,Georgia,serif)',fontSize:'clamp(1.1rem,2vw,1.35rem)',...slot('title')}}>{text(config.title,'Letöltések')}</h2></header>
    <div style={{display:'grid',gap:'.5rem',...slot('list')}}>
      {documents.length?<div style={{display:'grid',gap:'.4rem',padding:'.75rem .85rem',border:'1px solid var(--shoporation-color-border,#d8dce7)',borderRadius:'calc(var(--shoporation-radius-m,.75rem) * .8)',...slot('row')}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'.75rem'}}><strong>{text(config.documentsLabel,'Dokumentumok')}</strong><small style={{color:'var(--shoporation-color-muted-text,#667085)'}}>{documents.length} db</small></div>
        <div style={{display:'grid',gap:'.32rem'}}>{documents.map((document,index)=>{const href=safeInternalHref(document.downloadHref);return href?<a key={text(document.id,`document-${index}`)} href={href} style={{color:'inherit',fontWeight:700,textDecoration:'none',...slot('download')}}>{text(document.title,text(document.fileName,'Dokumentum'))}</a>:<span key={text(document.id,`document-${index}`)}>{text(document.title,text(document.fileName,'Dokumentum'))}</span>})}</div>
        {documentsHref?<a href={documentsHref} style={{justifySelf:'start',color:'inherit',fontWeight:750,...slot('open')}}>{text(config.openLabel,'Megnyitás')}</a>:null}
      </div>:null}
      {hasDigital?<div data-digital-download-location="account" style={{display:'grid',gap:'.2rem',padding:'.8rem .85rem',border:'1px solid var(--shoporation-color-border,#d8dce7)',borderRadius:'calc(var(--shoporation-radius-m,.75rem) * .8)',...slot('row')}}><strong>{text(config.digitalLabel,'Digitális termék')}</strong><small style={{color:'var(--shoporation-color-muted-text,#667085)',lineHeight:1.45,fontWeight:650}}>{text(config.digitalAccountCopy,'Vásárlás után a letöltés a Fiókom → Letöltéseim menüpontban érhető el.')}</small></div>:null}
    </div>
  </section>;
}

function FulfillmentSummaryRenderer({config,node,viewport}:StorefrontComponentRenderProps){
  const model=record(config.model),state=stateOf(model),slot=styles(config,viewport);
  if(state!=='ready')return state==='empty'?null:<section data-storefront-digital-commerce="fulfillment-summary" data-state={state} style={{...span(node),padding:'1rem',...surface(slot),...slot('root')}}>{statePanel(state,config,slot)}</section>;
  const mode=text(model?.mode,'physical');
  if(!['physical','digital','mixed'].includes(mode))return null;
  const label=mode==='digital'?text(config.digitalLabel,'Digitális kézbesítés'):mode==='mixed'?text(config.mixedLabel,'Fizikai + digitális teljesítés'):text(config.physicalLabel,'Fizikai kézbesítés');
  const lines=rows(model?.lines);
  const defaultCopy=mode==='digital'?'Nincs fizikai szállítás. A hozzáférés az igazolt fizetés után válik elérhetővé.':mode==='mixed'?'A fizikai tételeket kiszállítjuk, a digitális tartalmak az igazolt fizetés után külön hozzáférést kapnak.':'A rendelés fizikai kézbesítést igényel.';
  const documentsHref=safeInternalHref(model?.documentCenterHref,'/fiokom/letoltesek');
  return <section data-storefront-digital-commerce="fulfillment-summary" data-fulfillment-mode={mode} data-presentation={text(config.presentation)||undefined} style={{...span(node),display:'grid',gap:'.85rem',padding:'clamp(.9rem,2vw,1.25rem)',...surface(slot),...slot('root')}}>
    <div style={{display:'grid',gap:'.28rem',...slot('header')}}><small style={{fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--shoporation-color-accent,#2f7f6f)',...slot('eyebrow')}}>{label}</small>{text(config.title)?<h2 style={{margin:0,fontFamily:'var(--shoporation-heading-font,Georgia,serif)',fontSize:'1.15rem',...slot('title')}}>{text(config.title)}</h2>:null}<p style={{margin:0,color:'var(--shoporation-color-muted-text,#667085)',lineHeight:1.5,...slot('copy')}}>{text(model?.copy,text(config.copy,defaultCopy))}</p></div>
    {lines.length?<ul style={{display:'grid',gap:'.45rem',listStyle:'none',margin:0,padding:0,...slot('lines')}}>{lines.map((line,index)=>{const type=text(line.fulfillmentType,'physical')==='digital'?'digital':'physical';return <li key={text(line.id,`line-${index}`)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'.75rem',paddingTop:'.45rem',borderTop:'1px solid var(--shoporation-color-border,#d8dce7)',...slot('line')}}><span>{text(line.name,'Termék')}{typeof line.quantity==='number'?` × ${Math.max(1,Math.round(line.quantity))}`:''}</span><small style={{fontWeight:750,...slot('badge')}}>{type==='digital'?'Digitális':'Fizikai'}</small></li>})}</ul>:null}
    {(mode==='digital'||mode==='mixed')&&bool(model?.showDocumentCenter,true)?<a href={documentsHref} style={{justifySelf:'start',color:'inherit',fontWeight:750,...slot('link')}}>{text(config.documentCenterLabel,'Fiókom → Letöltéseim')}</a>:null}
  </section>;
}

function ProductDocumentsRenderer({config,node,viewport}:StorefrontComponentRenderProps){
  const model=record(config.model),state=stateOf(model),slot=styles(config,viewport);
  if(state!=='ready')return state==='empty'?null:<section data-storefront-digital-commerce="product-documents" data-state={state} style={{...span(node),padding:'1rem',...surface(slot),...slot('root')}}>{statePanel(state,config,slot)}</section>;
  const documents=rows(model?.documents);
  if(!documents.length)return null;
  return <section data-storefront-digital-commerce="product-documents" data-presentation={text(config.presentation)||undefined} style={{...span(node),display:'grid',gap:'1rem',...slot('root')}}>
    <header style={{display:'grid',gap:'.35rem',...slot('header')}}>{text(config.eyebrow)?<small style={{fontWeight:800,letterSpacing:'.09em',textTransform:'uppercase',color:'var(--shoporation-color-accent,#2f7f6f)',...slot('eyebrow')}}>{text(config.eyebrow)}</small>:null}<h2 style={{margin:0,fontFamily:'var(--shoporation-heading-font,Georgia,serif)',...slot('title')}}>{text(config.title,'Termékdokumentumok')}</h2>{text(config.copy)?<p style={{margin:0,color:'var(--shoporation-color-muted-text,#667085)',...slot('copy')}}>{text(config.copy)}</p>:null}</header>
    <div style={{display:'grid',gridTemplateColumns:viewport==='mobile'?'1fr':'repeat(auto-fit,minmax(15rem,1fr))',gap:'.75rem',...slot('grid')}}>{documents.map((document,index)=>{const href=safeInternalHref(document.downloadHref);return <article key={text(document.id,`document-${index}`)} style={{display:'grid',gap:'.45rem',padding:'1rem',...surface(slot),...slot('card')}}><small style={{fontWeight:750,color:'var(--shoporation-color-muted-text,#667085)',...slot('kind')}}>{text(document.kindLabel,'Dokumentum')}{bool(document.variantSpecific)?' · változathoz':''}</small><strong style={slot('documentTitle')}>{text(document.title,'Dokumentum')}</strong>{text(document.description)?<p style={{margin:0,color:'var(--shoporation-color-muted-text,#667085)',lineHeight:1.45,...slot('description')}}>{text(document.description)}</p>:null}<small style={{color:'var(--shoporation-color-muted-text,#667085)',...slot('meta')}}>{[text(document.fileName),text(document.sizeLabel)].filter(Boolean).join(' · ')}</small>{href?<a href={href} style={{justifySelf:'start',color:'inherit',fontWeight:750,...slot('download')}}>{text(config.downloadLabel,'Dokumentum letöltése')}</a>:null}</article>})}</div>
  </section>;
}

function B2BQuoteCtaRenderer({config,node,viewport}:StorefrontComponentRenderProps){
  const model=record(config.model),slot=styles(config,viewport);
  if(stateOf(model)!=='ready'||!bool(model?.eligible,false))return null;
  const href=safeInternalHref(model?.href);
  if(!href)return null;
  return <section data-storefront-b2b="quote-request" style={{...span(node),display:'grid',gap:'.65rem',padding:'clamp(.9rem,2vw,1.15rem)',...surface(slot),...slot('root')}}>
    <small style={{fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--shoporation-color-accent,#2f7f6f)',...slot('eyebrow')}}>{text(config.eyebrow,'B2B AJÁNLATKÉRÉS')}</small>
    <h2 style={{margin:0,fontFamily:'var(--shoporation-heading-font,Georgia,serif)',fontSize:'clamp(1.05rem,2vw,1.3rem)',...slot('title')}}>{text(config.title,'Egyedi ajánlatot kérsz?')}</h2>
    <p style={{margin:0,color:'var(--shoporation-color-muted-text,#667085)',lineHeight:1.5,...slot('copy')}}>{text(config.copy,'Jóváhagyott B2B partnerként kérj egyedi ajánlatot erre a termékre.')}</p>
    <a href={href} style={{justifySelf:'start',padding:'.72rem 1rem',borderRadius:'var(--shoporation-radius-m,.75rem)',background:'var(--shoporation-color-primary,#111827)',color:'var(--shoporation-color-primary-contrast,#fff)',fontWeight:800,textDecoration:'none',...slot('button')}}>{text(config.buttonLabel,'Ajánlatot kérek')}</a>
  </section>;
}

function AccountCapabilityNavigationRenderer({config,node,viewport}:StorefrontComponentRenderProps){
  const model=record(config.model),state=stateOf(model),slot=styles(config,viewport),items=rows(model?.items);
  if(state!=='ready'||!items.length)return null;
  const layout=text(config.layout,'tabs'),columns=viewport==='mobile'?'1fr':layout==='sidebar'?'minmax(13rem,18rem)':'repeat(auto-fit,minmax(9rem,1fr))';
  return <nav data-storefront-account="capability-navigation" data-layout={layout} aria-label={text(config.title,'Fiókom')} style={{...span(node),display:'grid',gridTemplateColumns:columns,gap:'.55rem',...slot('root')}}>{items.map((item,index)=><a key={text(item.key,`account-${index}`)} href={safeInternalHref(item.href,'/fiokom')} style={{padding:'.72rem .9rem',border:'1px solid var(--shoporation-color-border,#d8dce7)',borderRadius:'var(--shoporation-radius-m,.75rem)',background:'var(--shoporation-color-surface,#fff)',color:'inherit',fontWeight:750,textDecoration:'none',...slot('item')}}>{text(item.label,'Fiók')}</a>)}</nav>;
}
function AccountDownloadsRenderer({config,node,viewport}:StorefrontComponentRenderProps){
  const model=record(config.model),state=stateOf(model),slot=styles(config,viewport),items=rows(model?.digital);
  if(state!=='ready')return <section data-storefront-account="downloads" data-state={state} style={{...span(node),padding:'1rem',...surface(slot)}}>{state==='empty'?<p>{text(config.emptyLabel,'Még nincs digitális tartalom.')}</p>:statePanel(state,config,slot)}</section>;
  return <section data-storefront-account="downloads" style={{...span(node),display:'grid',gap:'.9rem',...slot('root')}}><header><small>{text(config.eyebrow,'LETÖLTÉSEIM')}</small><h2 style={{margin:'.2rem 0'}}>{text(config.title,'Digitális tartalmak')}</h2><p style={{margin:0,color:'var(--shoporation-color-muted-text,#667085)'}}>{text(config.copy,'A megvásárolt digitális tartalmak és hozzáférések.')}</p></header>{items.length?<div style={{display:'grid',gap:'.55rem'}}>{items.map((item,index)=>{const status=text(item.status,'available'),href=status==='available'?safeInternalHref(item.href):'';return <article key={text(item.id,`download-${index}`)} style={{padding:'.8rem 0',borderTop:'1px solid var(--shoporation-color-border,#d8dce7)'}}><strong>{text(item.title,'Digitális tartalom')}</strong>{text(item.description)?<small style={{display:'block',color:'var(--shoporation-color-muted-text,#667085)'}}>{text(item.description)}</small>:null}{status==='revoked'?<small>Hozzáférés visszavonva</small>:status==='exhausted'?<small>Letöltési keret elfogyott</small>:href?<a href={href} style={{display:'block',marginTop:'.3rem',fontWeight:750,color:'inherit'}}>{text(config.openLabel,'Letöltés')}</a>:null}</article>})}</div>:<p>{text(config.emptyLabel,'Még nincs digitális tartalom.')}</p>}</section>;
}
function AccountDocumentsRenderer({config,node,viewport}:StorefrontComponentRenderProps){
  const model=record(config.model),state=stateOf(model),slot=styles(config,viewport),orders=rows(model?.orderDocuments),products=rows(model?.productDocuments);
  if(state!=='ready')return <section data-storefront-account="documents" data-state={state} style={{...span(node),padding:'1rem',...surface(slot)}}>{state==='empty'?<p>{text(config.emptyLabel,'Még nincs dokumentum.')}</p>:statePanel(state,config,slot)}</section>;
  const group=(title:string,items:Record<string,unknown>[])=><section style={{padding:'1rem',...surface(slot)}}><h3 style={{margin:'0 0 .5rem'}}>{title}</h3>{items.length?items.map((item,index)=>{const href=safeInternalHref(item.href);return <article key={text(item.id,`document-${index}`)} style={{padding:'.7rem 0',borderTop:'1px solid var(--shoporation-color-border,#d8dce7)'}}><strong>{text(item.title,'Dokumentum')}</strong>{text(item.description)?<small style={{display:'block',color:'var(--shoporation-color-muted-text,#667085)'}}>{text(item.description)}</small>:null}{href?<a href={href} style={{display:'block',marginTop:'.3rem',fontWeight:750,color:'inherit'}}>{text(config.openLabel,'Megnyitás / letöltés')}</a>:null}</article>}):<p style={{margin:0,color:'var(--shoporation-color-muted-text,#667085)'}}>Nincs elérhető dokumentum.</p>}</section>;
  return <section data-storefront-account="documents" style={{...span(node),display:'grid',gap:'1rem',...slot('root')}}><header><small>{text(config.eyebrow,'DOKUMENTUMAIM')}</small><h2 style={{margin:'.2rem 0'}}>{text(config.title,'Számlák, garanciák és termékdokumentumok')}</h2><p style={{margin:0,color:'var(--shoporation-color-muted-text,#667085)'}}>{text(config.copy,'A vásárlásokhoz és termékekhez tartozó dokumentumok.')}</p></header><div style={{display:'grid',gridTemplateColumns:viewport==='mobile'?'1fr':'repeat(2,minmax(0,1fr))',gap:'1rem'}}>{group(text(config.orderTitle,'Rendelési dokumentumok'),orders)}{group(text(config.productTitle,'Termékdokumentumok'),products)}</div></section>;
}

function DocumentsCenterRenderer({config,node,viewport}:StorefrontComponentRenderProps){
  const model=record(config.model),state=stateOf(model),slot=styles(config,viewport);
  if(state!=='ready')return <section data-storefront-digital-commerce="documents-center" data-state={state} style={{...span(node),display:'grid',gap:'.75rem',padding:'1rem',...surface(slot),...slot('root')}}>{state==='empty'?<p style={{margin:0,color:'var(--shoporation-color-muted-text,#667085)'}}>{text(config.emptyLabel,'Még nincs megjeleníthető dokumentum vagy letölthető tartalom.')}</p>:statePanel(state,config,slot)}</section>;
  const digital=rows(model?.digital),orders=rows(model?.orderDocuments),productDocuments=rows(model?.productDocuments);
  const renderEntries=(items:Record<string,unknown>[],kind:'digital'|'order'|'product')=>items.map((item,index)=>{
    const status=text(item.status,'available'),href=status==='available'?safeInternalHref(item.href):'';
    const fallback=kind==='digital'?'Digitális tartalom':kind==='order'?'Rendelési dokumentum':'Termékdokumentum';
    return <article key={text(item.id,`${kind}-${index}`)} data-document-status={status} data-document-authority={kind} style={{display:'grid',gap:'.3rem',padding:'.85rem 0',borderTop:'1px solid var(--shoporation-color-border,#d8dce7)',...slot('entry')}}><strong>{text(item.title,fallback)}</strong>{text(item.description)?<small style={{color:'var(--shoporation-color-muted-text,#667085)',...slot('description')}}>{text(item.description)}</small>:null}{text(item.meta)?<small style={{color:'var(--shoporation-color-muted-text,#667085)',...slot('meta')}}>{text(item.meta)}</small>:null}{status==='revoked'?<small style={{fontWeight:750}}>Hozzáférés visszavonva</small>:status==='exhausted'?<small style={{fontWeight:750}}>Letöltési keret elfogyott</small>:status==='pending'?<small style={{fontWeight:750}}>Fizetés / feldolgozás után válik elérhetővé</small>:href?<a href={href} style={{justifySelf:'start',color:'inherit',fontWeight:750,...slot('download')}}>Megnyitás / letöltés</a>:null}</article>;
  });
  const hasEntries=Boolean(digital.length||orders.length||productDocuments.length);
  return <section data-storefront-digital-commerce="documents-center" data-presentation={text(config.presentation)||undefined} style={{...span(node),display:'grid',gap:'1rem',...slot('root')}}><header style={{display:'grid',gap:'.35rem'}}>{text(config.eyebrow)?<small style={{fontWeight:800,letterSpacing:'.09em',textTransform:'uppercase',color:'var(--shoporation-color-accent,#2f7f6f)'}}>{text(config.eyebrow)}</small>:null}<h2 style={{margin:0,fontFamily:'var(--shoporation-heading-font,Georgia,serif)'}}>{text(config.title,'Letöltéseim')}</h2>{text(config.copy)?<p style={{margin:0,color:'var(--shoporation-color-muted-text,#667085)'}}>{text(config.copy)}</p>:null}</header>{hasEntries?<div style={{display:'grid',gridTemplateColumns:viewport==='mobile'?'1fr':'repeat(auto-fit,minmax(14rem,1fr))',gap:'1rem'}}><section style={{padding:'1rem',...surface(slot)}}><h3 style={{margin:'0 0 .5rem'}}>{text(config.digitalTitle,'Digitális vásárlások')}</h3>{digital.length?renderEntries(digital,'digital'):<p style={{margin:0,color:'var(--shoporation-color-muted-text,#667085)'}}>Nincs digitális tartalom.</p>}</section><section style={{padding:'1rem',...surface(slot)}}><h3 style={{margin:'0 0 .5rem'}}>{text(config.orderTitle,'Rendelési dokumentumok')}</h3>{orders.length?renderEntries(orders,'order'):<p style={{margin:0,color:'var(--shoporation-color-muted-text,#667085)'}}>Nincs rendelési dokumentum.</p>}</section><section style={{padding:'1rem',...surface(slot)}}><h3 style={{margin:'0 0 .5rem'}}>{text(config.productTitle,'Termékdokumentumok')}</h3>{productDocuments.length?renderEntries(productDocuments,'product'):<p style={{margin:0,color:'var(--shoporation-color-muted-text,#667085)'}}>Nincs termékdokumentum.</p>}</section></div>:<p style={{margin:0,color:'var(--shoporation-color-muted-text,#667085)'}}>{text(config.emptyLabel,'Még nincs megjeleníthető dokumentum vagy letölthető tartalom.')}</p>}</section>;
}

function PostPurchaseGuidanceRenderer({config,node,viewport}:StorefrontComponentRenderProps){
  const model=record(config.model),state=stateOf(model),slot=styles(config,viewport);
  if(state!=='ready')return state==='empty'?null:<section data-storefront-digital-commerce="post-purchase-guidance" data-state={state} style={{...span(node),padding:'1rem',...surface(slot),...slot('root')}}>{statePanel(state,config,slot)}</section>;
  const mode=text(model?.mode,'physical'),paymentStatus=text(model?.paymentStatus,'pending'),href=safeInternalHref(model?.documentCenterHref,'/fiokom/letoltesek');
  if(mode==='physical'&&!bool(model?.hasDocuments,false))return null;
  const defaultCopy=paymentStatus==='paid'?(mode==='mixed'?'A digitális tartalmak elérhetők; a fizikai tételek kézbesítése külön folytatódik.':'A digitális tartalmak és rendelési dokumentumok a dokumentumközpontban érhetők el.'):'A digitális hozzáférés csak az igazolt fizetés után aktiválódik.';
  return <section data-storefront-digital-commerce="post-purchase-guidance" data-fulfillment-mode={mode} data-payment-status={paymentStatus} style={{...span(node),display:'grid',gap:'.65rem',padding:'1rem',...surface(slot),...slot('root')}}>{text(config.eyebrow)?<small style={{fontWeight:800,letterSpacing:'.09em',textTransform:'uppercase',color:'var(--shoporation-color-accent,#2f7f6f)'}}>{text(config.eyebrow)}</small>:null}<h2 style={{margin:0,fontFamily:'var(--shoporation-heading-font,Georgia,serif)',fontSize:'1.2rem'}}>{text(config.title,paymentStatus==='paid'?'Hozzáférés és dokumentumok':text(config.pendingLabel,'Fizetés után elérhető'))}</h2><p style={{margin:0,color:'var(--shoporation-color-muted-text,#667085)',lineHeight:1.5}}>{text(model?.copy,text(config.copy,defaultCopy))}</p><a href={href} style={{justifySelf:'start',color:'inherit',fontWeight:750,...slot('link')}}>{text(config.documentCenterLabel,'Fiókom → Letöltéseim')}</a></section>;
}

const RENDERERS:readonly [string,number,(props:StorefrontComponentRenderProps)=>ReactNode][]=[
  ['commerce.downloads-tile',1,DownloadsTileRenderer],
  ['commerce.fulfillment-summary',1,FulfillmentSummaryRenderer],
  ['commerce.product-documents',1,ProductDocumentsRenderer],
  ['commerce.b2b-quote-cta',1,B2BQuoteCtaRenderer],
  ['account.capability-navigation',1,AccountCapabilityNavigationRenderer],
  ['commerce.account-downloads',1,AccountDownloadsRenderer],
  ['commerce.account-documents',1,AccountDocumentsRenderer],
  ['commerce.documents-center',1,DocumentsCenterRenderer],
  ['commerce.post-purchase-guidance',1,PostPurchaseGuidanceRenderer],
] as const;

export function createStorefrontDigitalCommerceRendererRegistry(){
  const registry:StorefrontRendererRegistry=createStorefrontSharedContentRendererRegistry();
  for(const[key,version,renderer]of RENDERERS)registry.register(key,version,renderer);
  return registry;
}
