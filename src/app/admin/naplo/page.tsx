import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformOperator } from '@/lib/auth/platform-operator';

const actionLabels:Record<string,string>={
  'order.status_changed':'Rendelés státusza módosítva',
  'order.updated':'Rendelés frissítve',
  'catalog.variant_updated':'Termékváltozat módosítva',
  'catalog.recommendation_created':'Termékajánlás létrehozva',
  'catalog.recommendation_updated':'Termékajánlás módosítva',
  'catalog.recommendation_deleted':'Termékajánlás törölve',
  'integration.retry_succeeded':'Integráció újrafuttatva',
  'integration.retry_failed':'Integráció újrafuttatása sikertelen',
  'customer.access_updated':'Ügyfél- vagy viszonteladói jogosultság módosítva',
  'coupon.created':'Kupon létrehozva',
  'coupon.updated':'Kupon módosítva',
};

const entityLabels:Record<string,string>={
  order:'Rendelés',
  product:'Termék',
  product_variant:'Termékváltozat',
  product_recommendation_rule:'Termékajánlási szabály',
  integration_job:'Integrációs feladat',
  customer:'Ügyfél',
  coupon:'Kupon',
  return_case:'Visszáru ügy',
  support_ticket:'Ügyfélszolgálati ügy',
};

const readable=(value:string,map:Record<string,string>)=>map[value]??value.replace(/[._-]+/g,' ').replace(/^./,c=>c.toUpperCase());

type AuditRow={
  id:string;
  actor_user_id:string;
  organization_id:string|null;
  instance_id:string|null;
  action:string;
  entity_type:string;
  entity_id:string|null;
  summary:string;
  before_state:unknown;
  after_state:unknown;
  metadata:Record<string,unknown>|null;
  created_at:string;
};
type Profile={id:string;email:string|null;full_name:string|null};
type Instance={id:string;name:string;slug:string};
type FilterRow={action:string;entity_type:string};
type Props={searchParams:Promise<{action?:string;entity?:string}>};

export default async function AuditPage({searchParams}:Props){
  await requirePlatformOperator();
  const params=await searchParams;
  const action=(params.action??'').trim().slice(0,120);
  const entity=(params.entity??'').trim().slice(0,120);
  const admin=createAdminClient();

  let rows:AuditRow[]=[];
  let optionRows:FilterRow[]=[];
  let loadError=false;

  try{
    let query=admin.from('admin_audit_log')
      .select('id,actor_user_id,organization_id,instance_id,action,entity_type,entity_id,summary,before_state,after_state,metadata,created_at')
      .order('created_at',{ascending:false})
      .limit(250);
    if(action)query=query.eq('action',action);
    if(entity)query=query.eq('entity_type',entity);

    const[filtered,options]=await Promise.all([
      query,
      admin.from('admin_audit_log').select('action,entity_type').order('created_at',{ascending:false}).limit(1000),
    ]);

    if(filtered.error||options.error)loadError=true;
    rows=(filtered.data??[]) as AuditRow[];
    optionRows=(options.data??[]) as FilterRow[];
  }catch{
    loadError=true;
  }

  const actorIds=[...new Set(rows.map(row=>row.actor_user_id).filter(Boolean))];
  const instanceIds=[...new Set(rows.map(row=>row.instance_id).filter((value):value is string=>Boolean(value)))];

  const[profileResult,instanceResult]=await Promise.all([
    actorIds.length?admin.from('profiles').select('id,email,full_name').in('id',actorIds):Promise.resolve({data:[] as Profile[],error:null}),
    instanceIds.length?admin.from('webshop_instances').select('id,name,slug').in('id',instanceIds):Promise.resolve({data:[] as Instance[],error:null}),
  ]);
  if(profileResult.error||instanceResult.error)loadError=true;

  const profileById=new Map(((profileResult.data??[]) as Profile[]).map(profile=>[profile.id,profile]));
  const instanceById=new Map(((instanceResult.data??[]) as Instance[]).map(instance=>[instance.id,instance]));
  const actions=[...new Set(optionRows.map(row=>row.action))].sort();
  const entities=[...new Set(optionRows.map(row=>row.entity_type))].sort();
  const visibleStores=new Set(rows.map(row=>row.instance_id).filter(Boolean)).size;

  return <section className="adminMain">
    <span className="eyebrow">Shoperation · Platform</span>
    <h1 className="sectionTitle">Platform műveleti napló</h1>
    <p className="lead">A kritikus adminisztrációs módosítások visszakövethető előtte/utána állapottal, végrehajtóval és — ahol értelmezhető — webshop kontextussal.</p>

    {loadError&&<div className="errorNotice" role="alert"><strong>A napló egy része most nem tölthető be.</strong><p>Ez nem jelenti azt, hogy nincs naplóbejegyzés. Hiányos adatok mellett ne vonj le auditkövetkeztetést.</p></div>}

    <section className="auditGuide">
      <div><span className="eyebrow">Mire való?</span><h2>Ki, mikor, hol és mit módosított?</h2></div>
      <div className="auditGuideGrid">
        <div><strong>Végrehajtó</strong><span>A platformkezelő vagy webshop-admin azonosítható névvel/e-maillel.</span></div>
        <div><strong>Webshop</strong><span>A tenant-azonosító helyett elsődlegesen az ügyfél-webshop neve jelenik meg.</span></div>
        <div><strong>Változás</strong><span>Az előtte/utána állapot csak részletezéskor nyílik meg, így a lista áttekinthető marad.</span></div>
      </div>
    </section>

    <div className="cards adminMetricCards">
      <div className="card"><span className="badge">Megjelenített esemény</span><div className="price">{rows.length}</div><p className="muted">Legfeljebb a legutóbbi 250, a szűrés szerint.</p></div>
      <div className="card"><span className="badge">Érintett webshop</span><div className="price">{visibleStores}</div><p className="muted">A jelenlegi találati halmazban.</p></div>
      <div className="card"><span className="badge">Művelettípus</span><div className="price">{new Set(rows.map(row=>row.action)).size}</div><p className="muted">Különböző naplózott művelet.</p></div>
    </div>

    <form className="card adminToolbar" method="get">
      <label>Művelet<select name="action" defaultValue={action}><option value="">Minden művelet</option>{actions.map(value=><option key={value} value={value}>{readable(value,actionLabels)}</option>)}</select></label>
      <label>Objektum<select name="entity" defaultValue={entity}><option value="">Minden objektum</option>{entities.map(value=><option key={value} value={value}>{readable(value,entityLabels)}</option>)}</select></label>
      <button className="btn btnPrimary" type="submit">Szűrés</button>
      {(action||entity)&&<Link className="btn btnGhost" href="/admin/naplo">Szűrés törlése</Link>}
    </form>

    <div className="tableCard">
      <div className="adminTableScroll"><table className="adminTable">
        <caption className="srOnly">Platform műveleti napló</caption>
        <thead><tr><th scope="col">Időpont</th><th scope="col">Művelet</th><th scope="col">Webshop</th><th scope="col">Objektum</th><th scope="col">Végrehajtó</th><th scope="col">Részlet</th></tr></thead>
        <tbody>{rows.map(row=>{
          const profile=profileById.get(row.actor_user_id);
          const instance=row.instance_id?instanceById.get(row.instance_id):null;
          const actorName=profile?.full_name||profile?.email||`${row.actor_user_id.slice(0,8)}…`;
          return <tr key={row.id}>
            <td>{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'medium'}).format(new Date(row.created_at))}</td>
            <td><strong>{readable(row.action,actionLabels)}</strong><br/><span className="muted">{row.summary}</span></td>
            <td>{instance?<><strong>{instance.name}</strong><br/><span className="muted">{instance.slug}</span></>:<span className="adminStatePill neutral">Platformszintű</span>}</td>
            <td>{readable(row.entity_type,entityLabels)}{row.entity_id&&<><br/><code>{row.entity_id}</code></>}</td>
            <td><strong>{actorName}</strong>{profile?.full_name&&profile.email&&<><br/><span className="muted">{profile.email}</span></>}</td>
            <td><details><summary>Változás megnyitása</summary><pre className="auditJson">{JSON.stringify({before:row.before_state,after:row.after_state,metadata:row.metadata},null,2)}</pre></details></td>
          </tr>;
        })}</tbody>
      </table></div>
      {!loadError&&rows.length===0&&<p className="muted" style={{padding:20}}>Nincs a szűrésnek megfelelő naplóbejegyzés.</p>}
    </div>
  </section>;
}
