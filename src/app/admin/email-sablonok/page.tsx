import './email-template-library.css';
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
const actions=(id:string)=><><Link className="btn btnPrimary" href={`/admin/email-sablonok/${id}/szerkesztes`}>Szerkesztés</Link><Link className="btn btnGhost" href={`/admin/email-sablonok/${id}/elonezet`}>Előnézet</Link><Link className="btn btnGhost" href={`/admin/email-sablonok/${id}/verziok`}>Verziók és aktiválás</Link></>;

export default async function EmailTemplatesAdmin(){
  const scope=await requireCurrentStoreContext('marketing.manage');
  const admin=createAdminClient();
  const{data,error}=await admin.from('email_templates').select('id,template_key,name,family,purpose,status,active_version_id,updated_at').eq('instance_id',scope.instanceId).order('updated_at',{ascending:false});
  const templates=(data??[]) as TemplateRow[];
  const essential=templates.find(item=>item.template_key==='essential.order_confirmation')??null;
  return <section className="adminMain emailTemplatesPage">
    <div className="adminToolbar"><div><span className="eyebrow">E-mail Builder</span><h1 className="sectionTitle">E-mail sablonok</h1><p className="lead">A sablon piszkozatként szerkeszthető és előnézhető. Az éles használathoz külön, megerősített aktiválás szükséges; minden aktiválás új, megváltoztathatatlan verziót hoz létre.</p></div><Link className="btn btnGhost" href="/admin/email-sablonok/brand-kit">Brand Kit</Link></div>
    {error&&<div className="errorNotice" role="alert"><strong>A sablonok most nem tölthetők be.</strong> Hiányos állapotból nem engedünk új sablont létrehozni.</div>}
    <div className="cards">
      {families.map(family=>{
        const ready=family.key==='essential';
        return <article className="card" key={family.key}>
          <span className="badge">{ready?'Szerkeszthető':'Előkészítve'}</span>
          <h3>{family.name}</h3>
          <strong>{family.character}</strong>
          <p className="muted">{family.description}</p>
          {ready&&!error&&<div className="actions">{essential?actions(essential.id):<EmailTemplateManager/>}</div>}
        </article>;
      })}
    </div>
    <section className="featurePanel savedTemplatesPanel" style={{marginTop:28}}>
      <span className="eyebrow">Tenant sablontár</span>
      <h2>Mentett sablonok</h2>
      <p className="muted">A piszkozat és az aktív verzió külön életciklusú. Korábbi aktív verzió bármikor visszatölthető piszkozatként anélkül, hogy az éles levelet azonnal megváltoztatná.</p>
      {!error&&templates.length===0&&<div className="card"><strong>Még nincs tenant e-mail sablon.</strong><p className="muted">Az Essential kártyán hozhatod létre az első biztonságos piszkozatot.</p></div>}
      {!error&&templates.length>0&&<>
        <div className="tableCard savedTemplateTable"><table className="adminTable"><thead><tr><th>Sablon</th><th>Család</th><th>Állapot</th><th>Aktív verzió</th><th>Művelet</th></tr></thead><tbody>{templates.map(item=><tr key={item.id}><td><strong>{item.name}</strong><div className="muted">{item.template_key}</div></td><td>{item.family}</td><td><span className="badge">{statusLabel(item.status)}</span></td><td>{item.active_version_id?'Van':'Nincs'}</td><td><div className="actions">{actions(item.id)}</div></td></tr>)}</tbody></table></div>
        <div className="savedTemplateCards" aria-label="Mentett e-mail sablonok">
          {templates.map(item=><article className="savedTemplateCard" key={item.id}>
            <div className="savedTemplateCardHead">
              <div><strong>{item.name}</strong><code>{item.template_key}</code></div>
              <span className="badge">{statusLabel(item.status)}</span>
            </div>
            <dl className="savedTemplateMeta">
              <div><dt>Család</dt><dd>{item.family}</dd></div>
              <div><dt>Aktív verzió</dt><dd>{item.active_version_id?'Van':'Nincs'}</dd></div>
            </dl>
            <div className="actions savedTemplateActions">{actions(item.id)}</div>
          </article>)}
        </div>
      </>}
    </section>
  </section>;
}
