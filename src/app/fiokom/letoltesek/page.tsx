import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {getCurrentWebshopInstance} from '@/lib/instances/access';
import {listAccountDigitalDownloads} from '@/lib/commerce/digital-commerce';
import {listAccountOrderDocuments} from '@/lib/commerce/order-documents';
import {listAccountProductDocuments,type ProductDocumentKind} from '@/lib/commerce/product-documents';

function fileSize(bytes:number){if(bytes<1024)return`${bytes} B`;if(bytes<1024*1024)return`${(bytes/1024).toFixed(1)} KB`;if(bytes<1024*1024*1024)return`${(bytes/(1024*1024)).toFixed(1)} MB`;return`${(bytes/(1024*1024*1024)).toFixed(2)} GB`}
const documentLabels:Record<string,string>={invoice:'Számla / számlamásolat',warranty:'Garancialevél',certificate:'Tanúsítvány',service_record:'Szervizdokumentum',merchant_attachment:'Rendelési dokumentum',other:'Egyéb dokumentum'};
const productDocumentLabels:Record<ProductDocumentKind,string>={manual:'Használati útmutató',datasheet:'Adatlap',size_guide:'Mérettáblázat',warranty_info:'Garanciális információ',compatibility:'Kompatibilitási lap',installation_guide:'Telepítési útmutató',other:'Termékdokumentum'};

export default async function AccountDownloadsPage(){
  const supabase=await createClient(),{data:auth}=await supabase.auth.getUser();
  if(!auth.user)redirect('/fiokom?next=/fiokom/letoltesek');
  const instance=await getCurrentWebshopInstance();if(!instance)redirect('/fiokom');
  const[digitalResult,documentResult,productDocumentResult]=await Promise.allSettled([
    listAccountDigitalDownloads(instance.id,auth.user.id),
    listAccountOrderDocuments(instance.id,auth.user.id),
    listAccountProductDocuments(instance.id,auth.user.id),
  ]);
  const downloads=digitalResult.status==='fulfilled'?digitalResult.value:[];
  const documents=documentResult.status==='fulfilled'?documentResult.value.documents:[];
  const invoices=documentResult.status==='fulfilled'?documentResult.value.invoices:[];
  const productDocuments=productDocumentResult.status==='fulfilled'?productDocumentResult.value:[];
  const empty=!downloads.length&&!documents.length&&!invoices.length&&!productDocuments.length;
  return <main className="section accountPage"><div className="shell"><div className="sectionIntro"><div><span className="eyebrow">Saját fiók</span><h1 className="sectionTitle">Dokumentumok és letöltések</h1><p className="lead">Itt találod a megvásárolt digitális tartalmakat, a rendeléseidhez kapott dokumentumokat, valamint a megvásárolt termékekhez elérhető segédanyagokat. A három tartalomtípus külön jogosultsági szabályok szerint működik.</p></div><Link className="btn" href="/fiokom">Vissza a fiókhoz</Link></div>

    {downloads.length>0&&<section style={{marginTop:28}}><div className="sectionIntro"><div><span className="eyebrow">Digitális vásárlások</span><h2>Digitális tartalmak</h2><p className="muted">A fizetett digitális termékek hozzáférése a rendelés jogosultsági állapotát követi.</p></div></div><div className="cards">{downloads.map(item=><article className="card" key={item.entitlementId}><span className="badge">Digitális termék</span><h3>{item.fileName}</h3><p className="muted">Rendelés: {item.orderNumber} · {fileSize(item.sizeBytes)}</p><p className="muted">Felhasználható letöltések: {item.remainingDownloads} / {item.maxDownloads}</p>{item.remainingDownloads>0?<a className="btn btnPrimary" href={`/api/digital-downloads/${item.assetId}?orderId=${encodeURIComponent(item.orderId)}`}>Letöltés</a>:<span className="badge">Letöltési keret elfogyott</span>}</article>)}</div></section>}

    {(documents.length>0||invoices.length>0)&&<section style={{marginTop:32}}><div className="sectionIntro"><div><span className="eyebrow">Rendelési iratok</span><h2>Számlák, garanciák és egyéb rendelési dokumentumok</h2><p className="muted">A webshop által a rendelésedhez kiadott vagy feltöltött iratok. Ezek nem digitális termékek és nem termékdokumentumok, ezért külön authority kezeli őket.</p></div></div><div className="cards">
      {invoices.map(invoice=><article className="card" key={`invoice:${invoice.orderId}:${invoice.invoiceNumber}`}><span className="badge">Számla</span><h3>{invoice.invoiceNumber}</h3><p className="muted">Rendelés: {invoice.orderNumber}</p>{invoice.invoiceUrl?<a className="btn btnPrimary" href={invoice.invoiceUrl} target="_blank" rel="noreferrer">Számla megnyitása</a>:<span className="badge">A letöltési link még nem érhető el</span>}</article>)}
      {documents.map(item=><article className="card" key={item.documentId}><span className="badge">{documentLabels[item.kind]??'Dokumentum'}</span><h3>{item.title}</h3>{item.description&&<p>{item.description}</p>}<p className="muted">Rendelés: {item.orderNumber} · {item.fileName} · {fileSize(item.sizeBytes)}</p><a className="btn btnPrimary" href={`/api/order-documents/${item.documentId}`}>Letöltés</a></article>)}
    </div></section>}

    {productDocuments.length>0&&<section style={{marginTop:32}}><div className="sectionIntro"><div><span className="eyebrow">Termékhez kapcsolódó segédanyagok</span><h2>Termékdokumentumok</h2><p className="muted">Útmutatók, adatlapok és egyéb termékfájlok a korábban megvásárolt termékekhez. Ezek nem digitális vásárlási entitlementek és nem rendelési iratok.</p></div></div><div className="cards">{productDocuments.map(item=><article className="card" key={item.documentId}><span className="badge">{productDocumentLabels[item.kind]}</span><h3>{item.title}</h3>{item.description&&<p>{item.description}</p>}<p className="muted">{item.productName}{item.variantLabel?` · ${item.variantLabel}`:''} · {item.fileName} · {fileSize(item.sizeBytes)}</p><a className="btn btnPrimary" href={item.downloadHref}>Dokumentum letöltése</a></article>)}</div></section>}

    {empty&&<section className="card" style={{marginTop:28}}><h2>Még nincs elérhető dokumentumod vagy letöltésed.</h2><p className="muted">Digitális vásárlás, elkészült számla, webshop által küldött rendelési dokumentum vagy a megvásárolt termékhez elérhető segédanyag után a releváns fájlok automatikusan itt jelennek meg.</p><Link className="btn btnPrimary" href="/webaruhaz">Termékek böngészése</Link></section>}
  </div></main>;
}
