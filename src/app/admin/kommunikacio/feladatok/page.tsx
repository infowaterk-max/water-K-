import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getDigitalOfficeAccess} from '@/lib/digital-office/access';
import {createAdminClient} from '@/lib/supabase/admin';
import {createClient as createOfficeUserClient} from '@/lib/supabase/server';
import {completeTaskAction,createTaskAction} from '../iroda/actions';

export const dynamic='force-dynamic';

type Task={
  id:string;thread_id:string|null;title:string;status:'open'|'done'|'cancelled';
  created_by:string|null;assigned_to:string|null;due_at:string|null;
  created_at:string;completed_at:string|null;
};
type Binding={user_id:string;role_code:string;valid_from:string;valid_until:string|null};
type Profile={id:string;email:string|null;full_name:string|null};
type View='open'|'done'|'all';
const dateLabel=(value:string|null)=>value
  ?new Intl.DateTimeFormat('hu-HU',{dateStyle:'medium',timeZone:'Europe/Budapest'}).format(new Date(value))
  :'Nincs határidő';

export default async function DigitalOfficeTasks({
  searchParams,
}:{searchParams:Promise<{status?:string}>}){
  const access=await getDigitalOfficeAccess();
  if(!access||!access.advancedEmail||!access.canSupport)redirect('/admin/hozzaferes-megtagadva');
  const {actor,scope}=access;
  const raw=(await searchParams).status;
  const view:View=raw==='done'||raw==='all'?raw:'open';
  const db=await createOfficeUserClient();
  const server=createAdminClient();
  const now=new Date().toISOString();

  const [taskResult,bindingResult]=await Promise.all([
    db.from('office_tasks')
      .select('id,thread_id,title,status,created_by,assigned_to,due_at,created_at,completed_at')
      .eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(300),
    server.from('role_bindings')
      .select('user_id,role_code,valid_from,valid_until')
      .eq('organization_id',scope.organizationId)
      .is('revoked_at',null).lte('valid_from',now)
      .or(`instance_id.eq.${scope.instanceId},instance_id.is.null`),
  ]);
  const bindings=(bindingResult.data??[]) as Binding[];
  const liveBindings=bindings.filter(b=>!b.valid_until||Date.parse(b.valid_until)>Date.now());
  const assigneeIds=[...new Set(liveBindings.map(b=>b.user_id))];
  const profileResult=assigneeIds.length&&!bindingResult.error
    ?await server.from('profiles').select('id,email,full_name').in('id',assigneeIds)
    :{data:[] as Profile[],error:null};
  const loadError=Boolean(taskResult.error||bindingResult.error||profileResult.error);
  const tasks=loadError?[]:(taskResult.data??[]) as Task[];
  const profiles=new Map(((profileResult.data??[]) as Profile[]).map(p=>[p.id,p]));
  const labelFor=(id:string|null)=>{
    if(!id)return 'Nincs felelős';
    if(id===actor.id)return 'Te';
    const profile=profiles.get(id);
    return profile?.full_name?.trim()||profile?.email||'Munkatárs';
  };
  const canAssignOthers=liveBindings.some(b=>b.user_id===actor.id&&['owner','admin'].includes(b.role_code));
  const assignees=assigneeIds.filter(id=>liveBindings.some(b=>b.user_id===id&&['owner','admin','support','order_manager'].includes(b.role_code)));
  const counts={open:tasks.filter(t=>t.status==='open').length,done:tasks.filter(t=>t.status==='done').length};
  const shown=tasks.filter(t=>view==='all'||t.status===view);

  return <main className="adminMain">
    <div className="sectionIntro">
      <div><span className="eyebrow">Digitális Iroda · Pro</span>
        <h1 className="sectionTitle">Feladatok</h1>
        <p className="lead">Feladatok létrehozása, kiosztása, határideje és lezárása az aktuális webshopban.</p>
      </div>
      <Link className="btn btnGhost" href="/admin/kommunikacio">← Munkatér</Link>
    </div>

    {loadError&&<div className="errorNotice" role="alert">
      <strong>A feladatok vagy a jogosultságok most nem olvashatók.</strong>
      <p>Hiányos adatok mellett feladatot nem hozunk létre és nem zárunk le. Próbáld újra később.</p>
    </div>}

    <div className="cards adminMetricCards">
      <div className="card"><span className="badge">Nyitott feladatok</span><div className="price">{loadError?'—':counts.open}</div></div>
      <div className="card"><span className="badge">Lezárt feladatok</span><div className="price">{loadError?'—':counts.done}</div></div>
    </div>

    {!loadError&&<section className="card">
      <h2>Új feladat</h2>
      <form action={createTaskAction} className="stackForm">
        <label><span>Feladat megnevezése</span>
          <input name="title" required minLength={1} maxLength={240} placeholder="Például: Ügyféligény ellenőrzése"/>
        </label>
        <label><span>Felelős</span>
          <select name="assigneeUserId" defaultValue={actor.id} required>
            {assignees.filter(id=>canAssignOthers||id===actor.id).map(id=>
              <option key={id} value={id}>{labelFor(id)}</option>)}
          </select>
        </label>
        <label><span>Határidő napja (nem kötelező)</span><input type="date" name="due"/></label>
        <button className="btn btnPrimary" type="submit" disabled={!assignees.includes(actor.id)}>Feladat létrehozása</button>
      </form>
    </section>}

    <section className="card">
      <div className="adminToolbar">
        <h2>Feladatlista</h2>
        <nav aria-label="Feladatok szűrése" className="adminToolbar">
          <Link href="/admin/kommunikacio/feladatok?status=open" aria-current={view==='open'?'page':undefined}>Nyitott ({loadError?'—':counts.open})</Link>
          <Link href="/admin/kommunikacio/feladatok?status=done" aria-current={view==='done'?'page':undefined}>Lezárt ({loadError?'—':counts.done})</Link>
          <Link href="/admin/kommunikacio/feladatok?status=all" aria-current={view==='all'?'page':undefined}>Összes</Link>
        </nav>
      </div>
      {!loadError&&!shown.length&&<p className="muted">Ebben a nézetben még nincs feladat.</p>}
      {!loadError&&shown.map(task=><div key={task.id} className="adminToolbar" style={{padding:'14px 0',borderBottom:'1px solid var(--line, #dce5e3)',alignItems:'center'}}>
        <div style={{flex:1,minWidth:220}}>
          <strong>{task.title}</strong>
          <p className="muted">Felelős: {labelFor(task.assigned_to)} · Határidő: {dateLabel(task.due_at)} · {task.status==='done'?'Lezárt':task.status==='cancelled'?'Törölt':'Nyitott'}</p>
          {task.thread_id&&<Link href={`/admin/kommunikacio/iroda?thread=${task.thread_id}`}>Kapcsolt ügy megnyitása</Link>}
        </div>
        {task.status==='open'&&(task.assigned_to===actor.id||canAssignOthers)&&
          <form action={completeTaskAction}>
            <input type="hidden" name="id" value={task.id}/>
            <button type="submit" className="btn btnPrimary">Lezárás</button>
          </form>}
      </div>)}
    </section>
  </main>;
}
