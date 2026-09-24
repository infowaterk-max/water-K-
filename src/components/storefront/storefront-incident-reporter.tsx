'use client';

import{useEffect,useId,useRef,useState,type FormEvent}from'react';
import{usePathname}from'next/navigation';
import{useStorefrontSystemSurfaceTheme}from'@/components/storefront/storefront-system-surface-theme';
import{captureIncidentViewportEvidence}from'@/lib/incidents/browser-evidence';
import styles from'./storefront-incident-reporter.module.css';

const BLOCKED_PREFIXES=['/admin','/storefront-preview','/storefront-template-preview','/visual-fidelity-qa','/login','/auth'] as const;
const CATEGORIES=[
 ['ui','Megjelenés vagy kezelés'],
 ['commerce','Kosár vagy rendelés'],
 ['payment','Fizetés'],
 ['shipping','Szállítás'],
 ['account','Fiók'],
 ['performance','Lassúság vagy működési hiba'],
 ['other','Egyéb'],
] as const;
type Category=typeof CATEGORIES[number][0];
type Result={incidentNumber:string;supportTicketNumber?:string;triagePending?:boolean};

export function isStorefrontIncidentReporterRoute(pathname:string){
 return !BLOCKED_PREFIXES.some(prefix=>pathname===prefix||pathname.startsWith(prefix+'/'));
}

export function StorefrontIncidentReporter(){
 const pathname=usePathname()||'/';
 const theme=useStorefrontSystemSurfaceTheme();
 const dialogRef=useRef<HTMLDialogElement|null>(null),titleId=useId(),descriptionId=useId();
 const[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<Result|null>(null);
 const[email,setEmail]=useState(''),[orderNumber,setOrderNumber]=useState(''),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[category,setCategory]=useState<Category>('ui'),[website,setWebsite]=useState('');

 useEffect(()=>{const dialog=dialogRef.current;if(!dialog)return;if(open&&!dialog.open)dialog.showModal();if(!open&&dialog.open)dialog.close()},[open]);
 if(!isStorefrontIncidentReporterRoute(pathname))return null;

 const close=()=>{if(!busy)setOpen(false)};
 const begin=()=>{setError('');setResult(null);setOpen(true)};
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy||result)return;
  setBusy(true);setError('');
  try{
   const viewport=captureIncidentViewportEvidence();
   const response=await fetch('/api/incidents/customer',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    email:email.trim(),
    orderNumber:orderNumber.trim(),
    title:title.trim(),
    description:description.trim(),
    category,
    website,
    context:{
     routePath:pathname,
     surfaceKey:'storefront.customer-incident-reporter',
     componentKey:'system.incident-reporter',
     templateKey:theme?.templateKey||undefined,
     templateVersion:theme?.templateVersion??undefined,
     actionKey:'customer.incident.submit',
     viewport,
    },
   })});
   const body=await response.json().catch(()=>({})) as {error?:string;incidentNumber?:string;supportTicketNumber?:string;triagePending?:boolean};
   if(!response.ok)throw new Error(body.error||'A hibabejelentés rögzítése nem sikerült.');
   if(!body.incidentNumber)throw new Error('A hibabejelentés azonosítója nem érkezett vissza.');
   setResult({incidentNumber:body.incidentNumber,supportTicketNumber:body.supportTicketNumber,triagePending:body.triagePending});
   setTitle('');setDescription('');
  }catch(cause){setError(cause instanceof Error?cause.message:'A hibabejelentés rögzítése nem sikerült.')}
  finally{setBusy(false)}
 }
 const invalid=!email.trim()||title.trim().length<3||description.trim().length<10;
 return <div className={styles.root} style={theme?.style} data-template-aware-incident="true" data-incident-template-key={theme?.templateKey??'generic'}>
  <button type="button" className={styles.trigger} aria-haspopup="dialog" onClick={begin}>Hibát találtam</button>
  <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event=>{event.preventDefault();close()}} onClose={()=>setOpen(false)}>
   <form className={styles.panel} onSubmit={submit}>
    <header className={styles.header}><div><span className={styles.kicker}>Hibabejelentés</span><h2 id={titleId}>Valami nem működik jól?</h2></div><button type="button" className={styles.close} aria-label="Ablak bezárása" disabled={busy} onClick={close}>×</button></header>
    <p id={descriptionId} className={styles.lead}>Írd meg, mit tapasztaltál. Az oldal útvonalát, a képernyőméretet és az aktív sablon technikai azonosítóját automatikusan csatoljuk.</p>
    {result?<div className={styles.success} role="status"><strong>Köszönjük, rögzítettük.</strong><span>Incidens: {result.incidentNumber}</span>{result.supportTicketNumber?<span>Ügyfélszolgálati ügy: {result.supportTicketNumber}</span>:null}{result.triagePending?<small>A technikai besorolás még folyamatban van.</small>:null}</div>:<>
     <div className={styles.grid}>
      <label><span>E-mail cím</span><input type="email" required autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="nev@pelda.hu"/></label>
      <label><span>Rendelésszám <small>(ha érintett)</small></span><input value={orderNumber} onChange={event=>setOrderNumber(event.target.value)} maxLength={80} placeholder="pl. WK-12345"/></label>
      <label><span>Téma</span><select value={category} onChange={event=>setCategory(event.target.value as Category)}>{CATEGORIES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label className={styles.wide}><span>Rövid cím</span><input required minLength={3} maxLength={180} value={title} onChange={event=>setTitle(event.target.value)} placeholder="Mi nem működik?"/></label>
      <label className={styles.wide}><span>Mi történt?</span><textarea required minLength={10} maxLength={8000} rows={5} value={description} onChange={event=>setDescription(event.target.value)} placeholder="Írd le, mit csináltál, mit vártál és mi történt helyette."/></label>
     </div>
     <label className={styles.honeypot} aria-hidden="true">Weboldal<input tabIndex={-1} autoComplete="off" value={website} onChange={event=>setWebsite(event.target.value)}/></label>
     {error?<p className={styles.error} role="alert">{error}</p>:null}
     <p className={styles.privacy}>A bejelentés a webshop ügyfélszolgálati rendszerébe kerül, és szükség esetén ugyanahhoz az ügyhöz Shoperation technikai incidens kapcsolódik.</p>
    </>}
    <footer className={styles.actions}><button type="button" className={styles.secondary} disabled={busy} onClick={close}>{result?'Bezárás':'Mégse'}</button>{!result?<button type="submit" className={styles.primary} disabled={busy||invalid}>{busy?'Küldés…':'Hiba elküldése'}</button>:null}</footer>
   </form>
  </dialog>
 </div>;
}
