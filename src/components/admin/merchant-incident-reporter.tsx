'use client';

import{useState}from'react';
import{usePathname}from'next/navigation';
import{ShoperationDialog}from'@/components/admin/shoperation-dialog';
import{captureIncidentViewportEvidence}from'@/lib/incidents/browser-evidence';
import styles from'./merchant-incident-reporter.module.css';

const CATEGORIES=[
 ['ui','Admin / webshop felület'],
 ['content','Tartalom'],
 ['catalog','Katalógus'],
 ['commerce','Kosár / rendelés'],
 ['payment','Fizetés'],
 ['shipping','Szállítás'],
 ['account','Fiók / jogosultság'],
 ['integration','Integráció'],
 ['performance','Lassúság / működés'],
 ['data','Adatprobléma'],
 ['security','Biztonság'],
 ['other','Egyéb'],
] as const;
const IMPACTS=[
 ['single','Egy oldal vagy funkció'],
 ['multiple','Több funkció'],
 ['all','A teljes webshop'],
 ['checkout_blocked','A vásárlás nem fejezhető be'],
 ['security','Biztonsági kockázat'],
] as const;
type Category=typeof CATEGORIES[number][0];
type Impact=typeof IMPACTS[number][0];
type Routing={ownership:'merchant'|'platform'|'shared'|'undetermined';reasonCode:string;confidence:string;status:string};
type Result={incidentNumber:string;triagePending:boolean;routing:Routing};
const ownerLabel:Record<Routing['ownership'],string>={merchant:'Webshop oldali teendő',platform:'Shoperation oldali javítás',shared:'Közös vizsgálat szükséges',undetermined:'Mérnöki vizsgálat szükséges'};

export function MerchantIncidentReporter(){
 const pathname=usePathname()||'/admin';
 const[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<Result|null>(null);
 const[title,setTitle]=useState(''),[description,setDescription]=useState(''),[category,setCategory]=useState<Category>('ui'),[impact,setImpact]=useState<Impact>('single');
 const close=()=>{if(!busy){setOpen(false);setError('');setResult(null)}};
 const begin=()=>{setError('');setResult(null);setOpen(true)};
 async function submit(){
  if(result){close();return}
  if(busy||title.trim().length<3||description.trim().length<10)return;
  setBusy(true);setError('');
  try{
   const viewport=captureIncidentViewportEvidence();
   const response=await fetch('/api/incidents/merchant',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    title:title.trim(),
    description:description.trim(),
    category,
    impact,
    context:{routePath:pathname,surfaceKey:'admin.merchant-incident-reporter',componentKey:'merchant-incident-reporter',actionKey:'merchant.incident.submit',viewport},
   })});
   const body=await response.json().catch(()=>({})) as {error?:string;incidentNumber?:string;triagePending?:boolean;routing?:Routing};
   if(!response.ok)throw new Error(body.error||'A hibabejelentés rögzítése nem sikerült.');
   if(!body.incidentNumber||!body.routing)throw new Error('Az incidens besorolási bizonyítéka hiányos.');
   setResult({incidentNumber:body.incidentNumber,triagePending:Boolean(body.triagePending),routing:body.routing});
   setTitle('');setDescription('');
  }catch(cause){setError(cause instanceof Error?cause.message:'A hibabejelentés rögzítése nem sikerült.')}
  finally{setBusy(false)}
 }
 const invalid=title.trim().length<3||description.trim().length<10;
 return <div className={styles.root} data-merchant-incident-reporter="true">
  <button type="button" className={'btn btnPrimary '+styles.trigger} onClick={begin}>Hibát jelentek</button>
  <ShoperationDialog open={open} eyebrow="Shoperation · Technikai hibabejelentés" title={result?'Hibabejelentés rögzítve':'Mi nem működik jól?'} description={result?'A rendszer létrehozta az auditált technikai incidenst.':'A jelenlegi admin útvonalat és a képernyőméretet automatikusan csatoljuk, hogy gyorsabban megtaláljuk a felelős rendszerrészt.'} confirmLabel={result?'Rendben':'Beküldés'} cancelLabel={result?'Bezárás':'Mégse'} busy={busy} confirmDisabled={!result&&invalid} onConfirm={submit} onClose={close}>
   {result?<div className={styles.result} role="status"><strong>{result.incidentNumber}</strong><span>Elsődleges besorolás: <b>{ownerLabel[result.routing.ownership]}</b></span><small>Ok: {result.routing.reasonCode} · Bizonyosság: {result.routing.confidence}</small>{result.triagePending?<small>Az automatikus technikai besorolás még kiegészítésre vár.</small>:null}</div>:<div className={styles.fields}>
    <label className="adminModalField"><span>Rövid cím</span><input value={title} minLength={3} maxLength={180} disabled={busy} onChange={event=>setTitle(event.target.value)} placeholder="Mi nem működik?"/></label>
    <div className={styles.two}>
     <label className="adminModalField"><span>Terület</span><select value={category} disabled={busy} onChange={event=>setCategory(event.target.value as Category)}>{CATEGORIES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
     <label className="adminModalField"><span>Hatás</span><select value={impact} disabled={busy} onChange={event=>setImpact(event.target.value as Impact)}>{IMPACTS.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <label className="adminModalField"><span>Leírás</span><textarea value={description} minLength={10} maxLength={8000} rows={6} disabled={busy} onChange={event=>setDescription(event.target.value)} placeholder="Mit csináltál, mit vártál, és mi történt helyette?"/></label>
    {error?<p className={styles.error} role="alert">{error}</p>:null}
    <p className={styles.note}>A beküldés nem kerül közvetlenül javításra vagy productionbe. Először auditált triage és felelősségi besorolás történik.</p>
   </div>}
  </ShoperationDialog>
 </div>;
}
