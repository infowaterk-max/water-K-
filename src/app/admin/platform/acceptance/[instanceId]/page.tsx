import { redirect } from 'next/navigation';
import { requirePlatformOperator } from '@/lib/auth/platform-operator';
import { createAdminClient } from '@/lib/supabase/admin';
import { startPlatformPilotAcceptanceAction } from './actions';

export const dynamic='force-dynamic';

type Props={
  params:Promise<{instanceId:string}>;
  searchParams:Promise<{reason?:string}>;
};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reasonText:Record<string,string>={
  forbidden:'Ehhez a pilot webshophoz nincs aktív owner/admin tenant-bindingod.',
  session:'Az acceptance munkamenet most nem indítható.',
  'b2b-channel':'A B2B acceptance-hez nincs aktív B2B értékesítési csatorna.',
  'b2b-product':'A B2B acceptance-hez nincs aktív, B2B-visible termék.',
};

export default async function PlatformPilotAcceptanceEntry({params,searchParams}:Props){
  if(process.env.VERCEL_ENV!=='preview')redirect('/admin/platform');
  const actor=await requirePlatformOperator();
  const[{instanceId},query]=await Promise.all([params,searchParams]);
  if(!UUID.test(instanceId))redirect('/admin/platform');

  const admin=createAdminClient();
  const{data:instance,error:instanceError}=await admin
    .from('webshop_instances')
    .select('id,organization_id,slug,name,subscription_plan,status')
    .eq('id',instanceId)
    .eq('status','pilot')
    .maybeSingle();
  if(instanceError||!instance?.organization_id)redirect('/admin/platform');

  const now=new Date().toISOString();
  const{data:bindings,error:bindingError}=await admin
    .from('role_bindings')
    .select('role_code,valid_from,valid_until,revoked_at,organization_id,instance_id')
    .eq('user_id',actor.id)
    .eq('organization_id',instance.organization_id)
    .or(`instance_id.eq.${instanceId},instance_id.is.null`)
    .is('revoked_at',null)
    .lte('valid_from',now);
  const allowed=!bindingError&&(bindings??[]).some(binding=>
    (binding.instance_id===instanceId||binding.instance_id===null)
    &&(binding.role_code==='owner'||binding.role_code==='admin')
    &&(!binding.valid_until||binding.valid_until>now)
  );

  return <section className="adminMain">
    <span className="eyebrow">Phase 4 · Human acceptance</span>
    <h1 className="sectionTitle">Playroom v20 Visual Builder acceptance</h1>
    <p className="lead">Ez a preview-only belépő egy konkrét pilot tenantet választ ki. Nem módosít jogosultságot, tenant-adatot vagy production állapotot.</p>

    <section className="card">
      <span className="badge">Pilot · Shoperation {instance.subscription_plan==='pro'?'Pro':'Alap'}</span>
      <h2>{instance.name}</h2>
      <p className="muted">Tenant: <strong>{instance.slug}</strong></p>
      {query.reason&&reasonText[query.reason]?<div className="errorNotice" role="alert">{reasonText[query.reason]}</div>:null}
      {!allowed
        ?<div className="errorNotice" role="alert">A belépés fail-closed: ehhez a tenanthez aktív owner/admin binding szükséges.</div>
        :<div className="actions">
          <form action={startPlatformPilotAcceptanceAction}>
            <input type="hidden" name="instanceId" value={instance.id}/>
            <input type="hidden" name="flow" value="builder"/>
            <button className="btn btnPrimary" type="submit">Playroom Builder megnyitása</button>
          </form>
          <form action={startPlatformPilotAcceptanceAction}>
            <input type="hidden" name="instanceId" value={instance.id}/>
            <input type="hidden" name="flow" value="checkout"/>
            <button className="btn btnGhost" type="submit">Interaktív pénztár teszt</button>
          </form>
          <form action={startPlatformPilotAcceptanceAction}>
            <input type="hidden" name="instanceId" value={instance.id}/>
            <input type="hidden" name="flow" value="b2b-rfq"/>
            <button className="btn btnGhost" type="submit">B2B ajánlatkérés teszt</button>
          </form>
        </div>}
    </section>

    <p className="muted">Az acceptance session legfeljebb 2 óráig él, HttpOnly/SameSite cookie-val, és kizárólag Vercel Preview környezetben indítható.</p>
  </section>;
}
