import Link from 'next/link';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { createAdminClient } from '@/lib/supabase/admin';
import { EmailTemplateManager } from '@/components/admin/email-template-manager';

export const dynamic='force-dynamic';

type TemplateRow={id:string;template_key:string;name:string;family:string;purpose:string;status:string;active_version_id:string|null;updated_at:string};

const families=[
  {key:'essential',name:'Essential',character:'Precíz és bizalomépítő',description:'Rendelés, fizetés, szállítás, visszatérítés és egyéb tranzakciós értesítések.'},
  {key:'commerce',name:'Commerce',character:'Termék- és konverzióközpontú',description:'Kosárelhagyás, upsell, cross-sell és személyre szabott termékajánlók.'},
  {key:'campaign',name:'Campaign',character:'Erős promóciós fókusz',description:'Kuponok, szezonális kampányok, launch és időszakos ajánlatok.'},
  {key:'editorial',name:'Editorial',character:'Elegáns és magazinszerű',description:'Hírlevelek, edukáció, márkatörténet és tartalmi kommunikáció.'},
  {key:'minimal',name:'Minimal',character:'Ultra letisztult',description:'Jelszó, fiók, biztonsági és egyszerű rendszerértesítések.'},
] as const;

const statusLabel=(status:string)=>status==='active'?'Aktív':status==='archived'?'Archivált':'Piszkozat';

export default async function EmailTemplatesAdmin(){
  const scope=await requireCurrentStoreContext('marketing.manage');
  const admin=createAdminClient();
  const{data,error}=await admin.from('email_templates').select('id,template_key,name,family,purpose,status,active_version_id,updated_at').eq('instance_id',scope.instanceId).order('updated_at',{ascending:false});
  const templates=(data??[]) as TemplateRow[];
  const essential=templates.find(item=>item.template_key==='essential.order_confirmation')??null;
  return <section className="adminMain">
    <span className="eyebrow">E-mail Builder · D1</span>
    <h1 className="sectionTitle">E-mail sablonok</h1>
    <p className="lead">Az öt Shoperation e-mail család egy közös, verziózott motorra épül. Ebben a fázisban az Essential rendelés-visszaigazolás már létrehozható és valódi rendererrel előnézhető, de aktiválás és kiküldés nincs ezen a felületen.</p>
    {error&&<div className="errorNotice" role="alert"><strong>A sablonok most nem tölthetők be.</strong> Hiányos állapotból nem engedünk új sablont létrehozni.</div>}
    <div className="cards">
      {families.map(family=>{
        const ready=family.key==='essential';
        return <article className="card" key={family.key}>
          <span className="badge">{ready?'D1 · működő alap':'Előkészítve'}</span>
          <h3>{family.name}</h3>
          <strong>{family.character}</strong>
          <p className="muted">{family.description}</p>
          {ready&&!error&&<div className="actions">
            {essential?<Link className="btn btnPrimary" href={`/admin/email-sablonok/${essential.id}/elonezet`}>Piszkozat előnézete</Link>:<EmailTemplateManager/>}
          </div>}
        </article>;
      })}
    </div>
    <section className="featurePanel" style={{marginTop:28}}>
      <span className="eyebrow">Tenant sablontár</span>
      <h2>Mentett sablonok</h2>
      <p className="muted">A piszkozat és az aktív verzió külön életciklus. Ezen a D1 képernyőn csak létrehozás és előnézet érhető el.</p>
      {!error&&templates.length===0&&<div className="card"><strong>Még nincs tenant e-mail sablon.</strong><p className="muted">Az Essential kártyán hozhatod létre az első biztonságos piszkozatot.</p></div>}
      {!error&&templates.length>0&&<div className="tableCard"><table className="adminTable"><thead><tr><th>Sablon</th><th>Család</th><th>Állapot</th><th>Aktív verzió</th><th>Művelet</th></tr></thead><tbody>{templates.map(item=><tr key={item.id}><td><strong>{item.name}</strong><div className="muted">{item.template_key}</div></td><td>{item.family}</td><td><span className="badge">{statusLabel(item.status)}</span></td><td>{item.active_version_id?'Van':'Nincs'}</td><td><Link className="btn btnGhost" href={`/admin/email-sablonok/${item.id}/elonezet`}>Előnézet</Link></td></tr>)}</tbody></table></div>}
    </section>
  </section>;
}
