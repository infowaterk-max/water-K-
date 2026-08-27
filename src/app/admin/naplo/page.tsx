import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

const actionLabels:Record<string,string>={
  'order.status_changed':'Rendelés státusz módosítva',
  'order.updated':'Rendelés frissítve',
  'catalog.variant_updated':'Termékváltozat módosítva',
  'integration.retry_succeeded':'Integráció újrafuttatva',
  'integration.retry_failed':'Integráció újrafuttatása sikertelen',
};

type AuditRow={id:string;actor_user_id:string;action:string;entity_type:string;entity_id:string|null;summary:string;before_state:unknown;after_state:unknown;metadata:Record<string,unknown>|null;created_at:string};
type Props={searchParams:Promise<{action?:string;entity?:string}>};

export default async function AuditPage({searchParams}:Props){
  const params=await searchParams; const action=(params.action??'').trim(); const entity=(params.entity??'').trim();
  let rows:AuditRow[]=[]; let loadError=false;
  try{
    const admin=createAdminClient();
    let query=admin.from('admin_audit_log').select('id,actor_user_id,action,entity_type,entity_id,summary,before_state,after_state,metadata,created_at').order('created_at',{ascending:false}).limit(250);
    if(action)query=query.eq('action',action);
    if(entity)query=query.eq('entity_type',entity);
    const result=await query; if(result.error)loadError=true; else rows=(result.data??[]) as AuditRow[];
  }catch{loadError=true;}
  const actions=[...new Set(rows.map(row=>row.action))]; const entities=[...new Set(rows.map(row=>row.entity_type))];
  return <section className="adminMain"><span className="eyebrow">Admin · Napló</span><h1 className="sectionTitle">Admin műveleti napló</h1><p className="lead">A kritikus módosítások visszakövethető előtte/utána állapottal és admin azonosítóval.</p>
    {loadError&&<div className="errorNotice" role="alert">A napló most nem tölthető be. Ez nem jelenti azt, hogy nincs naplóbejegyzés.</div>}
    <form className="card adminToolbar" method="get"><select name="action" defaultValue={action}><option value="">Minden művelet</option>{actions.map(value=><option key={value} value={value}>{actionLabels[value]??value}</option>)}</select><select name="entity" defaultValue={entity}><option value="">Minden objektum</option>{entities.map(value=><option key={value} value={value}>{value}</option>)}</select><button className="btn btnPrimary" type="submit">Szűrés</button>{(action||entity)&&<Link className="btn" href="/admin/naplo">Szűrés törlése</Link>}</form>
    <div className="tableCard"><div className="adminTableScroll"><table className="adminTable"><caption className="srOnly">Admin műveleti napló</caption><thead><tr><th scope="col">Időpont</th><th scope="col">Művelet</th><th scope="col">Objektum</th><th scope="col">Admin</th><th scope="col">Részlet</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'medium'}).format(new Date(row.created_at))}</td><td><strong>{actionLabels[row.action]??row.action}</strong><br/><span className="muted">{row.summary}</span></td><td>{row.entity_type}{row.entity_id&&<><br/><code>{row.entity_id}</code></>}</td><td><code>{row.actor_user_id.slice(0,8)}…</code></td><td><details><summary>Változás</summary><pre style={{whiteSpace:'pre-wrap',maxWidth:520}}>{JSON.stringify({before:row.before_state,after:row.after_state,metadata:row.metadata},null,2)}</pre></details></td></tr>)}</tbody></table></div>{!loadError&&rows.length===0&&<p className="muted" style={{padding:20}}>Nincs a szűrésnek megfelelő naplóbejegyzés.</p>}</div>
  </section>;
}
