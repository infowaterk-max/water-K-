'use client';

import{FormEvent,useEffect,useState}from'react';
import{createClient}from'@/lib/supabase/browser';

type Kind='invoice'|'warranty'|'certificate'|'service_record'|'merchant_attachment'|'other';
type DocumentRow={id:string;kind:Kind;title:string;description:string|null;original_name:string;media_type:string;size_bytes:number;status:'pending'|'active'|'revoked';customer_visible:boolean;download_count:number;last_download_at:string|null;created_at:string};
type ListResponse={documents?:DocumentRow[];error?:string};
type PrepareResponse={documentId?:string;bucket?:string;path?:string;token?:string;error?:string};
const ORDER_DOCUMENT_BUCKET='order-documents-private';
const kindLabels:Record<Kind,string>={invoice:'Számla / számlamásolat',warranty:'Garancialevél',certificate:'Tanúsítvány',service_record:'Szervizdokumentum',merchant_attachment:'Kereskedői dokumentum',other:'Egyéb dokumentum'};
const accept='.pdf,.jpg,.jpeg,.png,.txt,.doc,.docx';
const allowedTypes=new Set(['application/pdf','image/jpeg','image/png','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
const fmtSize=(bytes:number)=>bytes<1024?`${bytes} B`:bytes<1024*1024?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/(1024*1024)).toFixed(1)} MB`;

export function OrderDocumentManager({orderId}:{orderId:string}){
  const[documents,setDocuments]=useState<DocumentRow[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false);
  const[kind,setKind]=useState<Kind>('warranty'),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[file,setFile]=useState<File|null>(null);

  async function reload(){setLoading(true);try{const response=await fetch(`/api/admin/orders/${orderId}/documents`,{cache:'no-store'}),payload=await response.json().catch(()=>({}))as ListResponse;if(!response.ok)throw new Error(payload.error??'A dokumentumok nem tölthetők be.');setDocuments(payload.documents??[])}catch(e){setMessage(e instanceof Error?e.message:'A dokumentumok nem tölthetők be.');setError(true)}finally{setLoading(false)}}
  useEffect(()=>{void reload()},[orderId]);

  async function revoke(documentId:string){if(busy)return;setBusy(true);setMessage('');setError(false);try{const response=await fetch(`/api/admin/orders/${orderId}/documents?documentId=${encodeURIComponent(documentId)}`,{method:'DELETE'}),payload=await response.json().catch(()=>({}))as{error?:string};if(!response.ok)throw new Error(payload.error??'A dokumentum nem vonható vissza.');setMessage('A dokumentum vásárlói hozzáférése visszavonva.');await reload()}catch(e){setMessage(e instanceof Error?e.message:'A dokumentum nem vonható vissza.');setError(true)}finally{setBusy(false)}}

  async function submit(event:FormEvent){event.preventDefault();if(busy||!file)return;setMessage('');setError(false);if(!allowedTypes.has(file.type)){setMessage('Nem támogatott fájltípus. PDF, JPG, PNG, TXT, DOC vagy DOCX tölthető fel.');setError(true);return}if(file.size<1||file.size>25*1024*1024){setMessage('A dokumentum legfeljebb 25 MB lehet.');setError(true);return}setBusy(true);let preparedId:string|undefined;try{
    const preparedResponse=await fetch(`/api/admin/orders/${orderId}/documents`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind,title:title.trim()||file.name,description:description.trim()||undefined,fileName:file.name,mediaType:file.type,sizeBytes:file.size})}),prepared=await preparedResponse.json().catch(()=>({}))as PrepareResponse;
    if(!preparedResponse.ok||!prepared.documentId||prepared.bucket!==ORDER_DOCUMENT_BUCKET||!prepared.path||!prepared.token)throw new Error(prepared.error??'A dokumentum feltöltése nem készíthető elő.');preparedId=prepared.documentId;
    const supabase=createClient(),upload=await supabase.storage.from(ORDER_DOCUMENT_BUCKET).uploadToSignedUrl(prepared.path,prepared.token,file,{contentType:file.type});if(upload.error)throw new Error('A dokumentum feltöltése nem sikerült.');
    const activateResponse=await fetch(`/api/admin/orders/${orderId}/documents`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({documentId:prepared.documentId})}),activated=await activateResponse.json().catch(()=>({}))as{error?:string};if(!activateResponse.ok)throw new Error(activated.error??'A dokumentum feltöltődött, de nem aktiválható.');
    setKind('warranty');setTitle('');setDescription('');setFile(null);setMessage('A dokumentum megjelent a vásárló Dokumentumok és letöltések felületén.');await reload();
  }catch(e){if(preparedId)await fetch(`/api/admin/orders/${orderId}/documents?documentId=${encodeURIComponent(preparedId)}`,{method:'DELETE'}).catch(()=>undefined);setMessage(e instanceof Error?e.message:'A dokumentum feltöltése nem sikerült.');setError(true)}finally{setBusy(false)}}

  return <section className="card" style={{marginTop:28}}><span className="eyebrow">Vásárlói dokumentumtár</span><h2>Dokumentum küldése a vásárlónak</h2><p className="muted">Garancialevél, tanúsítvány, szervizlap vagy más rendelési dokumentum privát feltöltése. A vásárló csak bejelentkezve, rövid élettartamú letöltési linken éri el.</p>
    <form onSubmit={submit} className="stack" style={{gap:12}}><label>Dokumentum típusa<select value={kind} onChange={e=>setKind(e.target.value as Kind)}>{(Object.keys(kindLabels)as Kind[]).map(value=><option key={value} value={value}>{kindLabels[value]}</option>)}</select></label><label>Megjelenő cím<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={200} placeholder="pl. Garancialevél – 2 év"/></label><label>Leírás<textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={2000} rows={3} placeholder="Opcionális megjegyzés a vásárlónak"/></label><label>Fájl<input type="file" accept={accept} onChange={e=>setFile(e.target.files?.[0]??null)} required/></label><button className="btn btnPrimary" type="submit" disabled={busy||!file}>{busy?'Feldolgozás…':'Dokumentum feltöltése'}</button></form>
    {message&&<p className={error?'errorNotice':'adminAuditNotice'} role={error?'alert':'status'}>{message}</p>}
    <div className="timeline" style={{marginTop:20}}>{loading?<p className="muted">Dokumentumok betöltése…</p>:documents.filter(item=>item.status!=='revoked').map(item=><div className="timelineItem" key={item.id}><strong>{kindLabels[item.kind]??item.kind} · {item.title}</strong><span className="muted">{item.original_name} · {fmtSize(Number(item.size_bytes))} · {item.status==='active'?'Vásárlónak elérhető':'Feldolgozás alatt'} · letöltések: {item.download_count??0}</span>{item.status==='active'&&<button className="btn btnGhost" type="button" disabled={busy} onClick={()=>void revoke(item.id)}>Hozzáférés visszavonása</button>}</div>)}</div>
    {!loading&&!documents.some(item=>item.status!=='revoked')&&<p className="muted">Ehhez a rendeléshez még nincs külön vásárlói dokumentum.</p>}
  </section>;
}
