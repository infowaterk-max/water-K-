import Link from 'next/link';
import { requirePlanFeature } from '@/lib/plans/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { addMessageAction, completeTaskAction, createTaskAction, createThreadAction, sendCustomerEmailAction } from './actions';

export const dynamic = 'force-dynamic';

type Thread = { id: string; subject: string; customer_email: string | null; order_id: string | null; status: string; updated_at: string };
type Message = { id: string; thread_id: string; kind: string; body: string; created_at: string; communication_job_id: string | null; sender_email: string | null; recipient_email: string | null; subject: string | null };
type Task = { id: string; thread_id: string | null; title: string; status: string; due_at: string | null };
type Order = { id: string; order_number: string; customer_email: string; status: string; total_gross_huf: number; created_at: string };
type Job = { id: string; status: string; sent_at: string | null; last_error: string | null };

const kindLabel: Record<string, string> = { internal: 'Belső üzenet', note: 'Belső jegyzet', email_in: 'Bejövő e-mail', email_out: 'Kimenő e-mail' };
const jobLabel: Record<string, string> = { pending: 'Küldésre vár', processing: 'Küldés folyamatban', sent: 'Elküldve', failed: 'Küldési hiba', blocked: 'Blokkolva', cancelled: 'Törölve' };

export default async function OfficeWorkspace() {
  await requirePlanFeature('officeCommunication');
  const db = createAdminClient();
  const [{ data: t }, { data: m }, { data: k }, { data: o }, { data: j }] = await Promise.all([
    db.from('office_threads').select('id,subject,customer_email,order_id,status,updated_at').order('updated_at', { ascending: false }).limit(100),
    db.from('office_messages').select('id,thread_id,kind,body,created_at,communication_job_id,sender_email,recipient_email,subject').order('created_at', { ascending: false }).limit(1000),
    db.from('office_tasks').select('id,thread_id,title,status,due_at').eq('status', 'open').order('due_at', { ascending: true, nullsFirst: false }).limit(100),
    db.from('orders').select('id,order_number,customer_email,status,total_gross_huf,created_at').order('created_at', { ascending: false }).limit(300),
    db.from('communication_jobs').select('id,status,sent_at,last_error').order('created_at', { ascending: false }).limit(1000),
  ]);
  const threads = (t ?? []) as Thread[], messages = (m ?? []) as Message[], tasks = (k ?? []) as Task[], orders = (o ?? []) as Order[], jobs = (j ?? []) as Job[];
  const jobMap = new Map(jobs.map(job => [job.id, job]));
  const inboundToday = messages.filter(msg => msg.kind === 'email_in' && Date.now() - new Date(msg.created_at).getTime() < 86400000).length;
  const openThreads = threads.filter(thread => thread.status === 'open').length;

  return <section className="adminMain">
    <div className="sectionIntro"><div><span className="eyebrow">Pro · Digitális iroda</span><h1 className="sectionTitle">Ügyfélkommunikációs munkatér</h1><p className="lead">E-mail, rendelés, belső jegyzet és feladat egyetlen ügyfél-idővonalon.</p></div><Link className="btn btnGhost" href="/admin/kommunikacio">Küldési központ</Link></div>
    <div className="cards adminMetricCards"><article className="card"><span className="badge">Nyitott ügyek</span><div className="price">{openThreads}</div></article><article className="card"><span className="badge">Bejövő e-mail · 24 óra</span><div className="price">{inboundToday}</div></article><article className="card"><span className="badge">Nyitott feladatok</span><div className="price">{tasks.length}</div></article><article className="card"><span className="badge">Kapcsolt rendelések</span><div className="price">{threads.filter(x => x.order_id).length}</div></article></div>

    <div className="splitFeature">
      <section className="featurePanel"><h2>Új beszélgetés</h2><form action={createThreadAction} className="stackForm"><input name="subject" required placeholder="Téma"/><select name="orderId" defaultValue=""><option value="">Nincs konkrét rendelés</option>{orders.slice(0,100).map(order => <option key={order.id} value={order.id}>{order.order_number} · {order.customer_email}</option>)}</select><input name="email" type="email" placeholder="Ügyfél e-mail – rendelés nélkül"/><textarea name="body" required rows={4} placeholder="Belső összefoglaló vagy teendő"/><button className="btn btnPrimary">Beszélgetés létrehozása</button></form></section>
      <section className="featurePanel"><h2>Nyitott feladatok</h2>{tasks.slice(0,20).map(task => <div className="card" key={task.id}><strong>{task.title}</strong><p className="muted">{task.due_at ? `Határidő: ${new Intl.DateTimeFormat('hu-HU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(task.due_at))}` : 'Nincs határidő'}</p><form action={completeTaskAction}><input type="hidden" name="id" value={task.id}/><button className="btn btnGhost">Kész</button></form></div>)}{!tasks.length && <p className="muted">Nincs nyitott feladat.</p>}</section>
    </div>

    <section><span className="eyebrow">Egységes ügyféltörténet</span><h2>Beszélgetések</h2><div className="cards">{threads.map(thread => {
      const threadMessages = messages.filter(x => x.thread_id === thread.id).slice(0,10);
      const linkedOrder = orders.find(order => order.id === thread.order_id) ?? (thread.customer_email ? orders.find(order => order.customer_email.toLowerCase() === thread.customer_email?.toLowerCase()) : undefined);
      return <article className="card" key={thread.id}>
        <div className="adminToolbar"><span className="badge">{thread.status === 'open' ? 'Nyitott' : 'Lezárt'}</span>{linkedOrder && <Link className="textLink" href={`/admin/rendelesek/${linkedOrder.id}`}>{linkedOrder.order_number}</Link>}</div>
        <h3>{thread.subject}</h3>{thread.customer_email && <p className="muted">Ügyfél: <strong>{thread.customer_email}</strong>{linkedOrder ? ` · rendelés: ${linkedOrder.status}` : ''}</p>}
        <div className="integrationList">{threadMessages.map(msg => { const job = msg.communication_job_id ? jobMap.get(msg.communication_job_id) : null; return <div key={msg.id}><span><strong>{kindLabel[msg.kind] ?? msg.kind}</strong>{msg.subject && <><br/><span>{msg.subject}</span></>}<br/><span className="muted" style={{ whiteSpace: 'pre-wrap' }}>{msg.body}</span></span><span className="muted">{job ? jobLabel[job.status] ?? job.status : new Intl.DateTimeFormat('hu-HU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(msg.created_at))}{job?.last_error ? <><br/>{job.last_error}</> : null}</span></div> })}</div>
        <div className="splitFeature">
          <form action={addMessageAction} className="stackForm"><input type="hidden" name="threadId" value={thread.id}/><select name="kind" defaultValue="internal"><option value="internal">Belső üzenet</option><option value="note">Belső jegyzet</option></select><textarea name="body" required rows={3} placeholder="Csak a csapat számára látható"/><button className="btn btnGhost">Belső bejegyzés</button></form>
          {thread.customer_email ? <form action={sendCustomerEmailAction} className="stackForm"><input type="hidden" name="threadId" value={thread.id}/><textarea name="body" required rows={3} placeholder="Ügyfélnek küldött válasz"/><button className="btn btnPrimary">E-mail válasz küldése</button><p className="muted">A válasz a tranzakciós kommunikációs sorba kerül, és az idővonalon követhető.</p></form> : <div className="featurePanel"><p className="muted">E-mail küldéshez kapcsolj ügyfél e-mail címet a beszélgetéshez.</p></div>}
        </div>
        <form action={createTaskAction} className="stackForm"><input type="hidden" name="threadId" value={thread.id}/><input name="title" required placeholder="Kapcsolódó feladat"/><input name="due" type="datetime-local"/><button className="btn btnGhost">Feladat létrehozása</button></form>
      </article>;
    })}</div>{!threads.length && <div className="card"><p className="muted">Még nincs belső beszélgetés. Bejövő e-mailből automatikusan is létrejöhet.</p></div>}</section>
  </section>;
}
