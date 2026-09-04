import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCurrentStoreContext } from '@/lib/instances/scope';

const actionLabels:Record<string,string>={
  'order.status_changed':'Rendelés státusza módosítva',
  'order.updated':'Rendelés frissítve',
  'catalog.variant_updated':'Termékváltozat módosítva',
  'catalog.recommendation_created':'Termékajánlás létrehozva',
  'catalog.recommendation_updated':'Termékajánlás módosítva',
  'catalog.recommendation_deleted':'Termékajánlás törölve',
  'catalog.channel_updated':'Értékesítési csatorna módosítva',
  'catalog.promotion_updated':'Akció módosítva',
  'integration.retry_succeeded':'Integráció újrafuttatva',
  'integration.retry_failed':'Integráció újrafuttatása sikertelen',
  'customer.access_updated':'Ügyfél- vagy viszonteladói jogosultság módosítva',
  'coupon.created':'Kupon létrehozva',
  'coupon.updated':'Kupon módosítva',
  'returns.case_updated':'Visszáru ügy módosítva',
};

const entityLabels:Record<string,string>={
  order:'Rendelés',product:'Termék',product_variant:'Termékváltozat',product_recommendation_rule:'Termékajánlási szabály',
  integration_job:'Integrációs feladat',customer:'Ügyfél',coupon:'Kupon',return_case:'Visszáru ügy',support_ticket:'Ügyfélszolgálati ügy',
};
const readable=(value:string,map:Record<string,string>)=>map[value]??value.replace(/[._-]+/g,' ').replace(/^./,c=>c.toUpperCase());

type AuditRow={id:string;actor_user_id:string;action:string;entity_type:string;entity_id:string|null;summary:string;before_state:unknown;after_state:unknown;metadata:Record<string,unknown>|null;created_at:string};
type Profile={id:string;email:string|null;full_name:string|null};
type FilterRow={action:string;entity_type:string};
type Props={searchParams:Promise<{action?:string;entity?:string}>};

export default async function MerchantAuditPage({searchParams}:Props){
  const scope=await requireCurrentStoreContext('store.manage');
  const params=await searchParams,action=(params.action??'').trim().slice(0,120),entity=(params.entity??'').trim().slice(0,120),admin=createAdminClient();
  let rows:AuditRow[]=[],optionRows:FilterRow[]=[],loadError=false;
  try{
    let query=admin.from('admin_audit_log').select('id,actor_user_id,action,entity_type,entity_id,summary,before_state,after_state,metadata,created_at').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(250);
    if(action)query=query.eq('action',action);if(entity)query=query.eq('entity_type',entity);
    const[filtered,options]=await Promise.all([
      query,
      admin.from('admin_audit_log').select('action,entity_type').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(1000),
    ]);
    if(filtered.error||options.error)loadError=true;
    rows=(filtered.data??[])as AuditRow[];optionRows=(options.data??[])as FilterRow[];
  }catch{loadError=true}
  const actorIds=[...new Set(rows.map(row=>row.actor_user_id).filter(Boolean))];
  const profiles=actorIds.length?await admin.from('profiles').select('id,email,full_name').in('id',actorIds):{data:[] as Profile[],error:null};
  if(profiles.error)loadError=true;
  const profileById=new Map(((profiles.data??[])as Profile[]).map(profile=>[profile.id,profile]));
  const actions=[...new Set(optionRows.map(row=>row.action))].sort(),entities=[...new Set(optionRows.map(row=>row.entity_type))].sort();
  return <section className="adminMain">
    <span className="eyebrow">Admin · Audit</span><h1 className="sectionTitle">Webshop műveleti napló</h1>
    <p className="lead">A saját webshop kritikus adminisztrációs módosításai időponttal, végrehajtóval és előtte/utána állapottal. Más webshop eseményei nem jelenhetnek meg ebben a nézetben.</p>
    {loadError&&<div className="errorNotice" role="alert"><strong>A napló egy része most nem tölthető be.</strong><p>Hiányos adat mellett nem tekintjük üresnek az auditot.</p></div>}
    <form className="card adminToolbar" method="get"><label>Művelet<select name="action" defaultValue={action}><option value="">Minden művelet</option>{actions.map(value=><option key={value} value={value}>{readable(value,actionLabels)}</option>)}</select></label><label>Objektum<select name="entity" defaultValue={entity}><option value="">Minden objektum</option>{entities.map(value=><option key={value} value={value}>{readable(value,entityLabels)}</option>)}</select></label><button className="btn btnPrimary" type="submit">Szűrés</button>{(action||entity)&&<Link className="btn btnGhost" href="/admin/audit">Szűrés törlése</Link>}</form>
    <div className="tableCard"><div className="adminTableScroll"><table className="adminTable"><caption className="srOnly">Webshop műveleti napló</caption><thead><tr><th>Időpont</th><th>Művelet</th><th>Objektum</th><th>Végrehajtó</th><th>Részlet</th></tr></thead><tbody>{rows.map(row=>{const profile=profileById.get(row.actor_user_id),actorName=profile?.full_name||profile?.email||`${row.actor_user_id.slice(0,8)}…`;return <tr key={row.id}><td>{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'medium'}).format(new Date(row.created_at))}</td><td><strong>{readable(row.action,actionLabels)}</strong><br/><span className="muted">{row.summary}</span></td><td>{readable(row.entity_type,entityLabels)}{row.entity_id&&<><br/><code>{row.entity_id}</code></>}</td><td><strong>{actorName}</strong>{profile?.full_name&&profile.email&&<><br/><span className="muted">{profile.email}</span></>}</td><td><details><summary>Változás megnyitása</summary><pre className="auditJson">{JSON.stringify({before:row.before_state,after:row.after_state,metadata:row.metadata},null,2)}</pre></details></td></tr>})}</tbody></table></div>{!loadError&&rows.length===0&&<p className="muted" style={{padding:20}}>Még nincs naplózott művelet ebben a webshopban.</p>}</div>
  </section>;
}
