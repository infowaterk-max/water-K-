import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {getCurrentWebshopInstance} from '@/lib/instances/access';
import {listAccountDigitalDownloads} from '@/lib/commerce/digital-commerce';

function fileSize(bytes:number){if(bytes<1024)return`${bytes} B`;if(bytes<1024*1024)return`${(bytes/1024).toFixed(1)} KB`;if(bytes<1024*1024*1024)return`${(bytes/(1024*1024)).toFixed(1)} MB`;return`${(bytes/(1024*1024*1024)).toFixed(2)} GB`}

export default async function AccountDownloadsPage(){
  const supabase=await createClient(),{data:auth}=await supabase.auth.getUser();
  if(!auth.user)redirect('/fiokom?next=/fiokom/letoltesek');
  const instance=await getCurrentWebshopInstance();if(!instance)redirect('/fiokom');
  let downloads;try{downloads=await listAccountDigitalDownloads(instance.id,auth.user.id)}catch{downloads=[]}
  return <main className="section accountPage"><div className="shell"><div className="sectionIntro"><div><span className="eyebrow">Saját fiók</span><h1 className="sectionTitle">Letöltések</h1><p className="lead">A kifizetett digitális vásárlásaid biztonságos letöltései. A fájllink minden kattintáskor rövid időre készül el.</p></div><Link className="btn" href="/fiokom">Vissza a fiókhoz</Link></div><div className="cards">{downloads.map(item=><article className="card" key={item.entitlementId}><span className="badge">Digitális termék</span><h2>{item.fileName}</h2><p className="muted">Rendelés: {item.orderNumber} · {fileSize(item.sizeBytes)}</p><p className="muted">Felhasználható letöltések: {item.remainingDownloads} / {item.maxDownloads}</p>{item.remainingDownloads>0?<a className="btn btnPrimary" href={`/api/digital-downloads/${item.assetId}?orderId=${encodeURIComponent(item.orderId)}`}>Letöltés</a>:<span className="badge">Letöltési keret elfogyott</span>}</article>)}</div>{!downloads.length&&<section className="card"><h2>Nincs elérhető digitális letöltésed.</h2><p className="muted">Kifizetett digitális termék vásárlása után a jogosult fájlok automatikusan itt jelennek meg.</p><Link className="btn btnPrimary" href="/webaruhaz">Termékek böngészése</Link></section>}</div></main>;
}