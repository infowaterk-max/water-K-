import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { IntegrationJobControl } from '@/components/admin/integration-job-control';
import { requirePlanFeature } from '@/lib/plans/access';
import { requireCurrentStoreContext } from '@/lib/instances/scope';

export const dynamic='force-dynamic';
const statusLabel:Record<string,string>={pending:'Várakozik',processing:'Folyamatban',succeeded:'Sikeres',failed:'Sikertelen',blocked:'Blokkolt'};
const kindLabel:Record<string,string>={payment_create:'Fizetés indítása',payment_callback:'Fizetési visszajelzés',shipment_create:'Szállítás létrehozása',invoice_create:'Számlakészítés',email_send:'E-mail küldés',logistics_email:'Logisztikai partner értesítése'};

export default async function IntegrationJobDetail({params}:{params:Promise<{id:string}>}){
  await requirePlanFeature('advancedIntegrations');
  const scope=await requireCurrentStoreContext('integrations.manage');
  const {id}=await params;
  const admin=createAdminClient();
  const {data:job,error}=await admin.from('integration_jobs').select('id,order_id,kind,provider,status,attempt_count,payload,result,last_error,next_attempt_at,created_at,updated_at').eq('id',id).eq('instance_id',scope.instanceId).maybeSingle();
  if(error||!job)notFound();
  let order:null|{order_number:string;status:string;customer_email:string;total_gross_huf:number}=null;
  if(job.order_id){const {data}=await admin.from('orders').select('order_number,status,customer_email,total_gross_huf').eq('id',job.order_id).eq('instance_id',scope.instanceId).maybeSingle();order=data;}
  const processingAgeMinutes=job.status==='processing'?Math.floor((Date.now()-new Date(job.updated_at).getTime())/60000):0;
  return <section className="adminMain">
    <div className="adminToolbar"><div><span className="eyebrow">Pro · Integráció</span><h1 className="sectionTitle">{job.provider} · {kindLabel[job.kind]??job.kind}</h1></div><Link className="btn" href="/admin/integraciok">Vissza</Link></div>
    {job.status==='processing'&&processingAgeMinutes>=30&&<div className="errorNotice" role="alert"><strong>A feladat több mint {processingAgeMinutes} perce feldolgozás alatt van.</strong> Ellenőrizd a szolgáltatói oldalt és a naplót, mielőtt kézi ismétlést indítasz.</div>}
    <div className="cards"><section className="card"><span className="badge">Állapot</span><h2>{statusLabel[job.status]??job.status}</h2><p className="muted">Próbálkozások: {job.attempt_count}</p></section><section className="card"><span className="badge">Következő próba</span><h2>{job.next_attempt_at?new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short'}).format(new Date(job.next_attempt_at)):'—'}</h2></section><section className="card"><span className="badge">Rendelés</span><h2>{order?.order_number??'—'}</h2><p className="muted">{order?`${order.customer_email} · ${order.total_gross_huf.toLocaleString('hu-HU')} Ft`:''}</p>{job.order_id&&<Link className="textLink" href={`/admin/rendelesek/${job.order_id}`}>Rendelés megnyitása</Link>}</section></div>
    {job.last_error&&<section className="card"><h2>Utolsó hiba</h2><p>{job.last_error}</p></section>}
    <section className="card"><details><summary className="textLink"><strong>Technikai adatok megnyitása</strong></summary><div className="cards" style={{marginTop:16}}><section className="card"><h3>Küldött adatok</h3><pre className="auditJson">{JSON.stringify(job.payload,null,2)}</pre></section><section className="card"><h3>Szolgáltatói eredmény</h3><pre className="auditJson">{JSON.stringify(job.result,null,2)}</pre></section></div></details></section>
    <section className="card"><div className="adminToolbar"><div><h2>Művelet</h2><p className="muted">Sikeres vagy éppen futó feladat nem indítható újra. A kézi újrafuttatás bekerül az admin auditnaplóba.</p></div><IntegrationJobControl id={job.id} disabled={job.status==='processing'||job.status==='succeeded'}/></div></section>
  </section>;
}
