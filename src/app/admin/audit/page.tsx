import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCurrentStorePageContext } from '@/lib/instances/scope';

const actionLabels:Record<string,string>={
  'campaign.approve':'Kampány jóváhagyva',
  'campaign.created':'Kampány létrehozva',
  'campaign.queue':'Kampány sorba állítva',
  'catalog.bulk_update_applied':'Katalógus tömeges módosítása alkalmazva',
  'catalog.channel_updated':'Értékesítési csatorna módosítva',
  'catalog.product_channel_visibility_updated':'B2B termékláthatóság módosítva',
  'catalog.product_promotion_updated':'Termékakció módosítva',
  'catalog.promotion_updated':'Akció módosítva',
  'catalog.recommendation_created':'Termékajánlás létrehozva',
  'catalog.recommendation_deleted':'Termékajánlás törölve',
  'catalog.recommendation_updated':'Termékajánlás módosítva',
  'catalog.sales_channel_updated':'B2B értékesítési mód módosítva',
  'catalog.variant_updated':'Termékváltozat módosítva',
  'commerce.provider_updated':'Kereskedelmi szolgáltató módosítva',
  'coupon.created':'Kupon létrehozva',
  'coupon.updated':'Kupon módosítva',
  'customer.access_updated':'Ügyfél- vagy viszonteladói jogosultság módosítva',
  'customer.store_role_updated':'Ügyfél webshop-szerepköre módosítva',
  'integration.retry_failed':'Integráció újrafuttatása sikertelen',
  'integration.retry_succeeded':'Integráció újrafuttatva',
  'office.customer_email_queued':'Ügyfél e-mail sorba állítva',
  'office.message_added':'Irodai üzenet hozzáadva',
  'office.task_created':'Irodai feladat létrehozva',
  'office.thread_created':'Irodai beszélgetés létrehozva',
  'office.thread_updated':'Irodai beszélgetés módosítva',
  'order.status_changed':'Rendelés állapota módosítva',
  'order.updated':'Rendelés frissítve',
  'orders.manual_refund_recorded':'Kézi visszatérítés rögzítve',
  'platform.member_set':'Webshop-hozzáférés beállítva',
  'platform.tenant_provisioned':'Webshop létrehozva',
  'returns.case_updated':'Visszáru ügy módosítva',
  'store.role_binding_removed':'Csapattag hozzáférése eltávolítva',
  'store.role_binding_updated':'Csapattag jogosultsága módosítva',
  'support.reply_added':'Ügyfélszolgálati válasz hozzáadva',
  'support.ticket_updated':'Ügyfélszolgálati ügy módosítva',
};

const entityLabels:Record<string,string>={
  order:'Rendelés',product:'Termék',product_variant:'Termékváltozat',product_recommendation_rule:'Termékajánlási szabály',
  integration_job:'Integrációs feladat',customer:'Ügyfél',customer_instance_role:'Ügyfél webshop-szerepkör',coupon:'Kupon',return_case:'Visszáru ügy',support_ticket:'Ügyfélszolgálati ügy',
  role_binding:'Csapattag jogosultság',sales_channel:'Értékesítési csatorna',product_channel:'Termékcsatorna',marketing_campaign:'Marketingkampány',
  commerce_provider_connection:'Kereskedelmi szolgáltatói kapcsolat',office_thread:'Irodai beszélgetés',office_task:'Irodai feladat',webshop_instance_member:'Webshop-hozzáférés',webshop_instance:'Webshop',
};
const keyLabels:Record<string,string>={
  roleCode:'Szerepkör',legacyRole:'Kompatibilitási szerepkör',enabled:'Bekapcsolva',visible:'Látható',channel:'Csatorna',productId:'Termékazonosító',discountPercent:'Kedvezmény',stock:'Készlet',grossPrice:'Bruttó ár',netPrice:'Nettó ár',resellerGrossPrice:'Partner bruttó ár',resellerNetPrice:'Partner nettó ár',minimumOrderQuantity:'B2B minimum rendelés',orderMultiple:'B2B rendelési egység',status:'Állapot',trackingNumber:'Csomagkövetési azonosító',reseller_approved:'Viszonteladó jóváhagyva',approved_at:'Jóváhagyás időpontja',approved_by:'Jóváhagyó',queue_status:'Sorállapot',campaign_id:'Kampányazonosító',provider:'Szolgáltató',kind:'Típus',
};
const roleLabels:Record<string,string>={owner:'Tulajdonos',admin:'Adminisztrátor',catalog_manager:'Katalóguskezelő',order_manager:'Rendeléskezelő',marketing_manager:'Marketingkezelő',support:'Ügyfélszolgálat',analyst:'Elemző',viewer:'Megtekintő',staff:'Munkatárs',customer:'Vásárló',reseller:'Viszonteladó'};
const statusLabels:Record<string,string>={pending:'Függőben',pending_payment:'Fizetésre vár',pending_transfer:'Átutalásra vár',paid:'Fizetve',processing:'Feldolgozás alatt',shipped:'Szállítás alatt',completed:'Teljesítve',cancelled:'Lemondva',refunded:'Visszatérítve',approved:'Jóváhagyva',rejected:'Elutasítva',open:'Nyitott',closed:'Lezárt',resolved:'Megoldva',waiting_customer:'Ügyfélre vár',draft:'Piszkozat',queued:'Sorba állítva',sent:'Elküldve',failed:'Sikertelen',blocked:'Blokkolt'};
const actionLabel=(value:string)=>actionLabels[value]??'Egyéb rendszer-művelet';
const entityLabel=(value:string)=>entityLabels[value]??'Egyéb rendszerobjektum';
const readable=(value:string)=>value.replace(/[._-]+/g,' ').replace(/^./,c=>c.toUpperCase());
const fmtDate=(value:string)=>new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'medium',timeZone:'Europe/Budapest'}).format(new Date(value));
const localizeSummary=(summary:string)=>Object.entries(statusLabels).reduce((text,[raw,label])=>text.replace(new RegExp(`\\b${raw}\\b`,'g'),label),summary);

function formatValue(key:string,value:unknown){
  if(value===null||value===undefined||value==='')return '—';
  if(typeof value==='boolean')return value?'Igen':'Nem';
  if((key==='roleCode'||key==='legacyRole'||key==='role'||key==='role_code')&&typeof value==='string')return roleLabels[value]??value;
  if(key==='status'&&typeof value==='string')return statusLabels[value]??readable(value);
  if(key==='channel'&&value==='b2b')return 'B2B';
  if(key==='channel'&&value==='b2c')return 'B2C';
  if(key==='discountPercent'&&typeof value==='number')return `${value}%`;
  if(Array.isArray(value))return value.map(item=>String(item)).join(', ');
  if(typeof value==='object')return JSON.stringify(value);
  return String(value);
}

function AuditState({title,value}:{title:string;value:unknown}){
  if(!value||typeof value!=='object'||Array.isArray(value))return <div className="auditStateBox"><strong>{title}</strong><span className="muted">{value==null?'Nincs adat':String(value)}</span></div>;
  const entries=Object.entries(value as Record<string,unknown>);
  return <div className="auditStateBox"><strong>{title}</strong>{entries.length?<dl>{entries.map(([key,item])=><div key={key}><dt>{keyLabels[key]??readable(key)}</dt><dd>{formatValue(key,item)}</dd></div>)}</dl>:<span className="muted">Nincs adat</span>}</div>;
}

type AuditRow={id:string;actor_user_id:string;action:string;entity_type:string;entity_id:string|null;summary:string;before_state:unknown;after_state:unknown;metadata:Record<string,unknown>|null;created_at:string};
type Profile={id:string;email:string|null;full_name:string|null};
type FilterRow={action:string;entity_type:string};
type Props={searchParams:Promise<{action?:string;entity?:string}>};

export default async function MerchantAuditPage({searchParams}:Props){
  const scope=await requireCurrentStorePageContext('store.manage');
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
    <span className="eyebrow">Rendszer · Audit</span><h1 className="sectionTitle">Audit és műveleti napló</h1>
    <p className="lead">A saját webshop kritikus adminisztrációs módosításai budapesti idő szerint, végrehajtóval és emberileg olvasható előtte/utána állapottal. Más webshop eseményei nem jelenhetnek meg ebben a nézetben.</p>
    {loadError&&<div className="errorNotice" role="alert"><strong>A napló egy része most nem tölthető be.</strong><p>Hiányos adat mellett nem tekintjük üresnek az auditot.</p></div>}
    <form className="card adminToolbar" method="get"><label>Művelet<select name="action" defaultValue={action}><option value="">Minden művelet</option>{actions.map(value=><option key={value} value={value}>{actionLabel(value)}</option>)}</select></label><label>Objektum<select name="entity" defaultValue={entity}><option value="">Minden objektum</option>{entities.map(value=><option key={value} value={value}>{entityLabel(value)}</option>)}</select></label><button className="btn btnPrimary" type="submit">Szűrés</button>{(action||entity)&&<Link className="btn btnGhost" href="/admin/audit">Szűrés törlése</Link>}</form>
    <div className="tableCard"><div className="adminTableScroll"><table className="adminTable auditTable"><caption className="srOnly">Audit és műveleti napló</caption><thead><tr><th>Időpont</th><th>Művelet</th><th>Objektum</th><th>Végrehajtó</th><th>Részlet</th></tr></thead><tbody>{rows.map(row=>{const profile=profileById.get(row.actor_user_id),actorName=profile?.full_name||profile?.email||`${row.actor_user_id.slice(0,8)}…`;return <tr key={row.id}><td>{fmtDate(row.created_at)}</td><td><strong>{actionLabel(row.action)}</strong><br/><span className="muted">{localizeSummary(row.summary)}</span></td><td>{entityLabel(row.entity_type)}{row.entity_id&&<><br/><code>{row.entity_id}</code></>}</td><td><strong>{actorName}</strong>{profile?.full_name&&profile.email&&<><br/><span className="muted">{profile.email}</span></>}</td><td><details name="audit-change"><summary>Változás megnyitása</summary><div className="auditChangeGrid"><AuditState title="Előtte" value={row.before_state}/><AuditState title="Utána" value={row.after_state}/></div>{row.metadata&&<details className="auditMetadata"><summary>Technikai metaadatok</summary><pre className="auditJson">{JSON.stringify(row.metadata,null,2)}</pre></details>}</details></td></tr>})}</tbody></table></div>{!loadError&&rows.length===0&&<p className="muted" style={{padding:20}}>Még nincs naplózott művelet ebben a webshopban.</p>}</div>
  </section>;
}
