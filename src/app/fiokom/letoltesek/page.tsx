import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {getCurrentWebshopInstance} from '@/lib/instances/access';
import {listAccountDigitalDownloads} from '@/lib/commerce/digital-commerce';
import {listAccountOrderDocuments} from '@/lib/commerce/order-documents';

function fileSize(bytes:number){if(bytes<1024)return`${bytes} B`;if(bytes<1024*1024)return`${(bytes/1024).toFixed(1)} KB`;if(bytes<1024*1024*1024)return`${(bytes/(1024*1024)).toFixed(1)} MB`;return`${(bytes/(1024*1024*1024)).toFixed(2)} GB`}
const documentLabels:Record<string,string>={invoice:'Számla / számlamásolat',warranty:'Garancialevél',certificate:'Tanúsítvány',service_record:'Szervizdokumentum',merchant_attachment:'Rendelési dokumentum',other:'Egyéb dokumentum'};

export default async function AccountDownloadsPage(){
  const supabase=await createClient(),{data:auth}=await supabase.auth.getUser();
  if(!auth.user)redirect('/fiokom?next=/fiokom/letoltesek');
  const instance=await getCurrentWebshopInstance();if(!instance)redirect('/fiokom');
  const[digitalResult,documentResult]=await Promise.allSettled([listAccountDigitalDownloads(instance.id,auth.user.id),listAccountOrderDocuments(instance.id,auth.user.id)]);
  const downloads=digitalResult.status==='fulfilled'?digitalResult.value:[];
  const documents=documentResult.status==='fulfilled'?documentResult.value.documents:[];
  const invoices=documentResult.status==='fulfilled'?documentResult.value.invoices:[];
  const empty=!downloads.length&&!documents.length&&!invoices.length;
  return <main className="section accountPage"><div className="shell"><div className="sectionIntro"><div><span className="eyebrow">Saját fiók</span><h1 className="sectionTitle">Dokumentumok és letöltések</h1><p className="lead">Itt találod a megvásárolt digitális tartalmakat, a rendeléseidhez kapott dokumentumokat, valamint az elérhető számlákat. A privát fájlok letöltési linkje csak rövid időre készül el.</p></div><Link className="btn" href="/fiokom">Vissza a fiókhoz</Link></div>

    {downloads.length>0&&<section style={{marginTop:28}}><div className="sectionIntro"><div><span className="eyebrow">Digitális vásárlások</span><h2>Digitális tartalmak</h2><p className="muted">A fizetett digitális termékek hozzáférése a rendelés jogosultsági állapotát követi.</p></div></div><div className="cards">{downloads.map(item=><article className="card" key={item.entitlementId}><span className="badge">Digitális termék</span><h3>{item.fileName}</h3><p className="muted">Rendelés: {item.orderNumber} · {fileSize(item.sizeBytes)}</p><p className="muted">Felhasználható letöltések: {item.remainingDownloads} / {item.maxDownloads}</p>{item.remainingDownloads>0?<a className="btn btnPrimary" href={`/api/digital-downloads/${item.assetId}?orderId=${encodeURIComponent(item.orderId)}`}>Letöltés</a>:<span className="badge">Letöltési keret elfogyott</span>}</article>)}</div></section>}

    {(documents.length>0||invoices.length>0)&&<section style={{marginTop:32}}><div className="sectionIntro"><div><span className="eyebrow">Rendelési iratok</span><h2>Számlák, garanciák és egyéb dokumentumok</h2><p className="muted">A webshop által a rendelésedhez kiadott vagy feltöltött iratok. Ezek nem digitális termékek, ezért külön jogosultsági szabályok szerint kezeljük őket.</p></div></div><div className="cards">
      {invoices.map(invoice=><article className="card" key={`invoice:${invoice.orderId}:${invoice.invoiceNumber}`}><span className="badge">Számla</span><h3>{invoice.invoiceNumber}</h3><p className="muted">Rendelés: {invoice.orderNumber}</p>{invoice.invoiceUrl?<a className="btn btnPrimary" href={invoice.invoiceUrl} target="_blank" rel="noreferrer">Számla megnyitása</a>:<span className="badge">A letöltési link még nem érhető el</span>}</article>)}
      {documents.map(item=><article className="card" key={item.documentId}><span className="badge">{documentLabels[item.kind]??'Dokumentum'}</span><h3>{item.title}</h3>{item.description&&<p>{item.description}</p>}<p className="muted">Rendelés: {item.orderNumber} · {item.fileName} · {fileSize(item.sizeBytes)}</p><a className="btn btnPrimary" href={`/api/order-documents/${item.documentId}`}>Letöltés</a></article>)}
    </div></section>}

    {empty&&<section className="card" style={{marginTop:28}}><h2>Még nincs elérhető dokumentumod vagy letöltésed.</h2><p className="muted">Digitális vásárlás, elkészült számla vagy a webshop által küldött rendelési dokumentum után az elérhető fájlok automatikusan itt jelennek meg.</p><Link className="btn btnPrimary" href="/webaruhaz">Termékek böngészése</Link></section>}
  </div></main>;
}
