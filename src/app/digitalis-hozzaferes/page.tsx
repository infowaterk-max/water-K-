import Link from 'next/link';
import {getCurrentWebshopInstance} from '@/lib/instances/access';
import {listGuestDigitalDownloads} from '@/lib/commerce/digital-commerce';

function fileSize(bytes:number){if(bytes<1024)return`${bytes} B`;if(bytes<1024*1024)return`${(bytes/1024).toFixed(1)} KB`;if(bytes<1024*1024*1024)return`${(bytes/(1024*1024)).toFixed(1)} MB`;return`${(bytes/(1024*1024*1024)).toFixed(2)} GB`}

export default async function GuestDigitalAccessPage({searchParams}:{searchParams:Promise<{orderId?:string;token?:string}>}){
  const params=await searchParams,orderId=(params.orderId??'').trim(),token=(params.token??'').trim();
  const instance=await getCurrentWebshopInstance();
  let downloads=[] as Awaited<ReturnType<typeof listGuestDigitalDownloads>>,valid=false;
  if(instance&&/^[0-9a-f-]{36}$/i.test(orderId)&&/^[a-f0-9]{64}$/.test(token)){
    try{downloads=await listGuestDigitalDownloads(instance.id,orderId,token);valid=true}catch{valid=false}
  }
  return <main className="section accountPage"><div className="shell"><div className="sectionIntro"><div><span className="eyebrow">Biztonságos hozzáférés</span><h1 className="sectionTitle">Digitális letöltések</h1><p className="lead">A vásárláshoz tartozó fájlok csak érvényes, kifizetett rendelésből és időkorlátos vásárlói hozzáféréssel érhetők el.</p></div><Link className="btn" href="/">Vissza a webáruházhoz</Link></div>{valid?<><div className="cards">{downloads.map(item=><article className="card" key={item.entitlementId}><span className="badge">Digitális termék</span><h2>{item.fileName}</h2><p className="muted">Rendelés: {item.orderNumber} · {fileSize(item.sizeBytes)}</p><p className="muted">Felhasználható letöltések: {item.remainingDownloads} / {item.maxDownloads}</p>{item.remainingDownloads>0?<a className="btn btnPrimary" href={`/api/digital-downloads/${item.assetId}?orderId=${encodeURIComponent(item.orderId)}&token=${encodeURIComponent(token)}`}>Letöltés</a>:<span className="badge">Letöltési keret elfogyott</span>}</article>)}</div>{!downloads.length&&<section className="card"><h2>Nincs elérhető letöltés.</h2><p className="muted">A rendeléshez jelenleg nincs aktív digitális jogosultság.</p></section>}</>:<section className="card"><h2>A hozzáférés nem érvényes.</h2><p className="muted">A link lejárt, visszavonták, vagy nem ehhez a webshophoz tartozik. A fájlokhoz nem adunk nyilvános közvetlen URL-t.</p><Link className="btn btnPrimary" href="/kapcsolat#ugyfelszolgalat">Kapcsolat az ügyfélszolgálattal</Link></section>}</div></main>;
}