import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { IntegrationJobControl } from '@/components/admin/integration-job-control';

export const dynamic='force-dynamic';

export default async function IntegrationJobDetail({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:job}=await supabase.from('integration_jobs').select('id,order_id,kind,provider,status,attempt_count,payload,result,last_error,next_attempt_at,created_at,updated_at').eq('id',id).maybeSingle();
  if(!job) notFound();
  let order:null|{order_number:string;status:string;customer_email:string;total_gross_huf:number}=null;
  if(job.order_id){const {data}=await supabase.from('orders').select('order_number,status,customer_email,total_gross_huf').eq('id',job.order_id).maybeSingle();order=data;}
  return <section className="adminMain">
    <div className="adminToolbar"><div><span className="eyebrow">Admin · Integráció</span><h1 className="sectionTitle">{job.provider} · {job.kind}</h1></div><Link className="button" href="/admin/beallitasok">Vissza</Link></div>
    <div className="cards"><section className="card"><span className="badge">Állapot</span><h2>{job.status}</h2><p className="muted">Próbálkozások: {job.attempt_count}</p></section><section className="card"><span className="badge">Következő próba</span><h2>{job.next_attempt_at?new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short'}).format(new Date(job.next_attempt_at)):'—'}</h2></section><section className="card"><span className="badge">Rendelés</span><h2>{order?.order_number??'—'}</h2><p className="muted">{order?`${order.customer_email} · ${order.total_gross_huf.toLocaleString('hu-HU')} Ft`:''}</p></section></div>
    {job.last_error&&<section className="card"><h2>Utolsó hiba</h2><p>{job.last_error}</p></section>}
    <div className="cards"><section className="card"><h2>Payload</h2><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(job.payload,null,2)}</pre></section><section className="card"><h2>Eredmény</h2><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(job.result,null,2)}</pre></section></div>
    <section className="card"><div className="adminToolbar"><div><h2>Művelet</h2><p className="muted">Sikeres vagy éppen futó feladat nem indítható újra.</p></div><IntegrationJobControl id={job.id} disabled={job.status==='processing'||job.status==='succeeded'}/></div></section>
  </section>;
}
