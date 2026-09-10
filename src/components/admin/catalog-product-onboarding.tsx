'use client';
import{useMemo,useState}from'react';
import{useRouter}from'next/navigation';
import type{CatalogOnboardingMapping}from'@/lib/catalog-import';

type HeaderResponse={error?:string;headers?:string[];suggestedMapping?:Partial<CatalogOnboardingMapping>};
type OnboardingPreview={line:number;status:'ready'|'error';name?:string;sku?:string;slug?:string;category?:string|null;message?:string};
type PreviewResponse={error?:string;batchId?:string;preview?:OnboardingPreview[];validCount?:number;errorCount?:number;applied?:boolean;result?:CreatedDraft[]};
type CreatedDraft={line?:number;productId:string;variantId:string;draft:true};
type CreateResponse={error?:string;productId?:string;variantId?:string;draft?:boolean};
type ApplyResponse={error?:string;count?:number;result?:CreatedDraft[]};
type MediaResponse={error?:string;mediaId?:string;publicUrl?:string;replayed?:boolean};
type MappingKey=keyof CatalogOnboardingMapping;

const mappingFields:{key:MappingKey;label:string;required?:boolean}[]=[
  {key:'name',label:'Terméknév',required:true},{key:'sku',label:'SKU',required:true},{key:'netPrice',label:'Nettó ár',required:true},{key:'grossPrice',label:'Bruttó ár',required:true},
  {key:'slug',label:'Slug'},{key:'stock',label:'Készlet'},{key:'category',label:'Kategória'},{key:'attributes',label:'Attribútumok'},
  {key:'shortDescription',label:'Rövid leírás'},{key:'description',label:'Leírás'},{key:'variantLabel',label:'Variáns megnevezés'}
];
const freshKey=()=>globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random().toString(36).slice(2)}-onboarding`;
function parseAttributeText(text:string){
  const result:Record<string,string>={};for(const part of text.split('|').map(v=>v.trim()).filter(Boolean)){const at=part.indexOf('=');if(at<1)continue;const key=part.slice(0,at).trim(),value=part.slice(at+1).trim();if(key&&value)result[key]=value}return result;
}

export function CatalogProductOnboarding(){
  const router=useRouter();
  const[manual,setManual]=useState({name:'',sku:'',netPrice:'',grossPrice:'',stock:'0',category:'',attributes:'',shortDescription:'',description:''});
  const[manualKey,setManualKey]=useState(freshKey),[manualBusy,setManualBusy]=useState(false),[manualMessage,setManualMessage]=useState(''),[manualError,setManualError]=useState(false);
  const[mediaProductId,setMediaProductId]=useState(''),[mediaFile,setMediaFile]=useState<File|null>(null),[mediaAlt,setMediaAlt]=useState(''),[mediaKey,setMediaKey]=useState(freshKey),[mediaBusy,setMediaBusy]=useState(false),[mediaMessage,setMediaMessage]=useState('');
  const[csv,setCsv]=useState(''),[headers,setHeaders]=useState<string[]>([]),[mapping,setMapping]=useState<Partial<CatalogOnboardingMapping>>({}),[csvKey,setCsvKey]=useState(freshKey);
  const[previewRows,setPreviewRows]=useState<OnboardingPreview[]>([]),[batchId,setBatchId]=useState(''),[validCount,setValidCount]=useState(0),[csvBusy,setCsvBusy]=useState(false),[csvMessage,setCsvMessage]=useState(''),[csvError,setCsvError]=useState(false),[created,setCreated]=useState<CreatedDraft[]>([]);
  const requiredMapped=useMemo(()=>['name','sku','netPrice','grossPrice'].every(key=>Boolean(mapping[key as MappingKey])),[mapping]);

  async function createManual(){
    if(manualBusy)return;setManualBusy(true);setManualMessage('');setManualError(false);
    try{
      const response=await fetch('/api/admin/catalog/onboarding',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
        idempotencyKey:manualKey,name:manual.name,sku:manual.sku,netPrice:Number(manual.netPrice),grossPrice:Number(manual.grossPrice),stock:Number(manual.stock||0),
        category:manual.category||undefined,attributes:parseAttributeText(manual.attributes),shortDescription:manual.shortDescription||undefined,description:manual.description||undefined
      })});
      const payload=await response.json().catch(()=>({}))as CreateResponse;if(!response.ok||!payload.productId){setManualError(true);setManualMessage(payload.error??'A termékpiszkozat létrehozása nem sikerült.');return}
      setManualMessage('A termék piszkozatként létrejött. A publikálás külön lépés marad.');setMediaProductId(payload.productId);setManualKey(freshKey());router.refresh();
    }catch{setManualError(true);setManualMessage('Hálózati hiba. Ugyanazzal az idempotenciakulccsal biztonságosan újrapróbálható.')}finally{setManualBusy(false)}
  }

  function changeCsv(value:string){setCsv(value);setHeaders([]);setMapping({});setPreviewRows([]);setBatchId('');setValidCount(0);setCreated([]);setCsvMessage('');setCsvError(false);setCsvKey(freshKey())}
  async function loadCsvFile(file?:File){if(!file||csvBusy)return;try{changeCsv(await file.text())}catch{setCsvError(true);setCsvMessage('A CSV fájl nem olvasható.')}}
  async function detectHeaders(){
    if(csvBusy||!csv.trim())return;setCsvBusy(true);setCsvMessage('');setCsvError(false);
    try{const response=await fetch('/api/admin/catalog/import',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'headers',csv})});const payload=await response.json().catch(()=>({}))as HeaderResponse;if(!response.ok){setCsvError(true);setCsvMessage(payload.error??'A fejléc nem olvasható.');return}setHeaders(payload.headers??[]);setMapping(payload.suggestedMapping??{});setCsvMessage('Oszlopok felismerve. Ellenőrizd a hozzárendelést.');}catch{setCsvError(true);setCsvMessage('Hálózati hiba az oszlopfelismerés közben.')}finally{setCsvBusy(false)}
  }
  async function previewOnboarding(){
    if(csvBusy||!requiredMapped)return;setCsvBusy(true);setCsvMessage('');setCsvError(false);
    try{const response=await fetch('/api/admin/catalog/import',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'onboardingPreview',csv,mapping,idempotencyKey:csvKey})});const payload=await response.json().catch(()=>({}))as PreviewResponse;if(!response.ok){setCsvError(true);setCsvMessage(payload.error??'Az onboarding előnézet nem sikerült.');return}setPreviewRows(payload.preview??[]);setBatchId(payload.batchId??'');setValidCount(payload.validCount??0);if(payload.applied&&payload.result){setCreated(payload.result);setCsvMessage('Ez az import már korábban biztonságosan alkalmazva lett; a tartós eredményt mutatjuk.')}else setCsvMessage(`${payload.validCount??0} érvényes sor, ${payload.errorCount??0} hibás sor. Csak az érvényes sorok kerülnek a szerveroldali apply-planbe.`);}catch{setCsvError(true);setCsvMessage('Hálózati hiba. Az előnézet nem tekinthető elkészültnek.')}finally{setCsvBusy(false)}
  }
  async function applyOnboarding(){
    if(csvBusy||!batchId||!validCount)return;if(!window.confirm(`${validCount} érvényes terméksort hozunk létre piszkozatként. Folytatod?`))return;setCsvBusy(true);setCsvMessage('');setCsvError(false);
    try{const response=await fetch('/api/admin/catalog/import',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'onboardingApply',batchId})});const payload=await response.json().catch(()=>({}))as ApplyResponse;if(!response.ok){setCsvError(true);setCsvMessage(payload.error??'Az onboarding import nem sikerült.');return}setCreated(payload.result??[]);setCsvMessage(`${payload.count??0} termékpiszkozat létrejött. Hibás sorhoz nem történt adatírás.`);router.refresh();}catch{setCsvError(true);setCsvMessage('Hálózati hiba. Az apply ugyanazzal a batch azonosítóval idempotensen újrapróbálható.')}finally{setCsvBusy(false)}
  }
  async function uploadMedia(){
    if(mediaBusy||!mediaProductId||!mediaFile)return;setMediaBusy(true);setMediaMessage('');
    try{const form=new FormData();form.set('productId',mediaProductId);form.set('idempotencyKey',mediaKey);form.set('altText',mediaAlt);form.set('file',mediaFile);const response=await fetch('/api/admin/catalog/media',{method:'POST',body:form});const payload=await response.json().catch(()=>({}))as MediaResponse;if(!response.ok){setMediaMessage(payload.error??'A kép feltöltése nem sikerült.');return}setMediaMessage(payload.replayed?'A korábbi sikeres feltöltés eredményét kaptuk vissza.':'A kép a termékhez került.');setMediaKey(freshKey());setMediaFile(null);router.refresh();}catch{setMediaMessage('Hálózati hiba. Ugyanazzal a feltöltési kulccsal biztonságosan újrapróbálható.')}finally{setMediaBusy(false)}
  }

  return <div className="stack">
    <section className="featurePanel">
      <span className="eyebrow">Block 14 · Kézi onboarding</span><h2>Új termék mindig piszkozatként indul</h2>
      <p className="muted">A termék és az első variáns inaktívan jön létre. Kategória és attribútum már onboardingkor hozzárendelhető; publikálás nem része ennek a lépésnek.</p>
      <div className="catalogImportLayout">
        <label><strong>Terméknév</strong><input value={manual.name} onChange={e=>setManual(v=>({...v,name:e.target.value}))}/></label>
        <label><strong>SKU</strong><input value={manual.sku} onChange={e=>setManual(v=>({...v,sku:e.target.value}))}/></label>
        <label><strong>Nettó ár (Ft)</strong><input type="number" min="0" value={manual.netPrice} onChange={e=>setManual(v=>({...v,netPrice:e.target.value}))}/></label>
        <label><strong>Bruttó ár (Ft)</strong><input type="number" min="0" value={manual.grossPrice} onChange={e=>setManual(v=>({...v,grossPrice:e.target.value}))}/></label>
        <label><strong>Készlet</strong><input type="number" min="0" value={manual.stock} onChange={e=>setManual(v=>({...v,stock:e.target.value}))}/></label>
        <label><strong>Kategória</strong><input value={manual.category} onChange={e=>setManual(v=>({...v,category:e.target.value}))}/></label>
      </div>
      <label><strong>Attribútumok</strong><input value={manual.attributes} onChange={e=>setManual(v=>({...v,attributes:e.target.value}))} placeholder="Szín=Zöld|Méret=750 g"/></label>
      <label><strong>Rövid leírás</strong><textarea rows={2} value={manual.shortDescription} onChange={e=>setManual(v=>({...v,shortDescription:e.target.value}))}/></label>
      <label><strong>Leírás</strong><textarea rows={4} value={manual.description} onChange={e=>setManual(v=>({...v,description:e.target.value}))}/></label>
      <div className="actions"><button className="btn btnPrimary" type="button" disabled={manualBusy||!manual.name.trim()||!manual.sku.trim()||manual.netPrice===''||manual.grossPrice===''} onClick={createManual}>{manualBusy?'Mentés…':'Termékpiszkozat létrehozása'}</button></div>
      {manualMessage&&<p className={manualError?'errorNotice':'helperText'} role={manualError?'alert':'status'}>{manualMessage}</p>}
    </section>

    <section className="featurePanel">
      <span className="eyebrow">Block 14 · CSV onboarding</span><h2>Felismerés → mező-hozzárendelés → validáció → előnézet → apply</h2>
      <p className="muted">A régi készlet/ár CSV frissítő megmarad lentebb. Ez a folyamat új termékeket hoz létre, kizárólag piszkozatként. A hibás sorokat kihagyja, az érvényes apply-plan szerveroldalon rögzül.</p>
      <div className="catalogFilePicker"><strong>CSV fájl</strong><input type="file" accept=".csv,text/csv" disabled={csvBusy} onChange={e=>void loadCsvFile(e.target.files?.[0])}/></div>
      <textarea className="catalogCsvEditor" rows={8} value={csv} disabled={csvBusy} onChange={e=>changeCsv(e.target.value)} placeholder={'Terméknév;SKU;Nettó ár;Bruttó ár;Készlet;Kategória;Attribútumok\n...'}/>
      <div className="actions"><button className="btn" type="button" disabled={csvBusy||!csv.trim()} onClick={detectHeaders}>1. Oszlopok felismerése</button></div>
      {headers.length>0&&<div className="catalogImportLayout">{mappingFields.map(field=><label key={field.key}><strong>{field.label}{field.required?' *':''}</strong><select value={mapping[field.key]??''} onChange={e=>setMapping(value=>({...value,[field.key]:e.target.value||undefined}))}><option value="">— nincs hozzárendelve —</option>{headers.map(header=><option key={header} value={header}>{header}</option>)}</select></label>)}</div>}
      {headers.length>0&&<div className="actions"><button className="btn btnPrimary" type="button" disabled={csvBusy||!requiredMapped} onClick={previewOnboarding}>2. Validáció és előnézet</button><button className="btn" type="button" disabled={csvBusy||!batchId||!validCount||created.length>0} onClick={applyOnboarding}>3. {validCount} piszkozat létrehozása</button></div>}
      {csvMessage&&<p className={csvError?'errorNotice':'helperText'} role={csvError?'alert':'status'}>{csvMessage}</p>}
      {previewRows.length>0&&<div className="tableCard adminTableScroll"><table className="adminTable"><thead><tr><th>Sor</th><th>Termék</th><th>SKU</th><th>Kategória</th><th>Állapot</th></tr></thead><tbody>{previewRows.map(row=><tr key={`${row.line}-${row.sku??'error'}`}><td>{row.line}</td><td>{row.name??'—'}</td><td>{row.sku??'—'}</td><td>{row.category??'—'}</td><td><span className="badge">{row.status==='ready'?'Kész':'Hiba'}</span>{row.message&&<div className="muted">{row.message}</div>}</td></tr>)}</tbody></table></div>}
      {created.length>0&&<div className="card"><strong>Létrehozott piszkozatok</strong><div className="integrationList">{created.map((item,index)=><div key={item.productId}><span>{item.line?`CSV ${item.line}. sor`:`Termék ${index+1}`}</span><button className="btn" type="button" onClick={()=>setMediaProductId(item.productId)}>Kép hozzáadása</button></div>)}</div></div>}
    </section>

    <section className="featurePanel">
      <span className="eyebrow">Termékmédia</span><h2>Kép feltöltése egy piszkozathoz</h2>
      <p className="muted">JPEG, PNG, WebP vagy AVIF, legfeljebb 8 MB. A szerver a fájl szignatúráját is ellenőrzi; DB-hiba esetén a tárhelyobjektum vissza lesz vonva.</p>
      <label><strong>Termék azonosító</strong><input value={mediaProductId} onChange={e=>setMediaProductId(e.target.value)} placeholder="UUID"/></label>
      <div className="catalogImportLayout"><label><strong>Kép</strong><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={mediaBusy} onChange={e=>setMediaFile(e.target.files?.[0]??null)}/></label><label><strong>Alternatív szöveg</strong><input value={mediaAlt} onChange={e=>setMediaAlt(e.target.value)}/></label></div>
      <div className="actions"><button className="btn btnPrimary" type="button" disabled={mediaBusy||!mediaProductId||!mediaFile} onClick={uploadMedia}>{mediaBusy?'Feltöltés…':'Kép feltöltése'}</button></div>
      {mediaMessage&&<p className="helperText" role="status">{mediaMessage}</p>}
    </section>
  </div>;
}
