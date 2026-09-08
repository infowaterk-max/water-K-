import Link from 'next/link';
import {OfficeNewEmailComposer} from '@/components/admin/office-new-email-composer';
import {getAdminRequestUser} from '@/lib/auth/admin-api';
import {hasStoreCapability} from '@/lib/auth/store-capabilities';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {requirePlanFeature} from '@/lib/plans/access';
import {createAdminClient} from '@/lib/supabase/admin';

export const dynamic='force-dynamic';

type DraftRow={id:string;to_email:string|null;subject:string;body:string;updated_at:string};
type MailboxRow={mailbox_key:string;label:string;is_active:boolean};
type BindingRow={role_code:string;valid_until:string|null};

const active=(validUntil:string|null)=>!validUntil||Date.parse(validUntil)>Date.now();

export default async function OfficeComposerPage(){
  await requirePlanFeature('officeCommunication');
  const actor=await getAdminRequestUser('support.manage');
  if(!actor)throw new Error('Nincs jogosultság.');
  const scope=await requireCurrentStoreContext('support.manage');
  const db=createAdminClient();
  const now=new Date().toISOString();

  const [
    {data:draftData,error:draftError},
    {data:mailboxData,error:mailboxError},
    {data:bindingData,error:bindingError},
  ]=await Promise.all([
    db.from('office_drafts').select('id,to_email,subject,body,updated_at')
      .eq('instance_id',scope.instanceId).eq('author_user_id',actor.id).eq('draft_type','new_email')
      .order('updated_at',{ascending:false}).limit(50),
    db.from('office_mailboxes').select('mailbox_key,label,is_active')
      .eq('instance_id',scope.instanceId).eq('is_active',true).order('label',{ascending:true}),
    scope.organizationId
      ?db.from('role_bindings').select('role_code,valid_until')
        .eq('organization_id',scope.organizationId).eq('user_id',actor.id).is('revoked_at',null).lte('valid_from',now)
        .or(`instance_id.eq.${scope.instanceId},instance_id.is.null`)
      :Promise.resolve({data:[] as BindingRow[],error:null}),
  ]);

  const bindings=((bindingData??[])as BindingRow[]).filter(row=>active(row.valid_until));
  const isOwner=bindings.some(row=>row.role_code==='owner');
  const hasComposeExtra=isOwner?true:await hasStoreCapability(scope.instanceId,actor.id,'office.email.compose');
  const canCompose=isOwner||hasComposeExtra;
  const drafts=(draftData??[])as DraftRow[];
  const mailboxes=(mailboxData??[])as MailboxRow[];
  const mailboxOptions=mailboxes.map(mailbox=>({mailboxKey:mailbox.mailbox_key,label:mailbox.label}));
  const foundationError=Boolean(draftError||mailboxError||bindingError);

  return <section className="adminMain">
    <div className="sectionIntro">
      <div>
        <span className="eyebrow">Pro · Digitális Iroda</span>
        <h1 className="sectionTitle">Új e-mail és piszkozatok</h1>
        <p className="lead">Egyedi 1:1 operatív levelek előkészítése. A piszkozat a saját fiókodhoz tartozik; más munkatárs nem kap automatikus betekintést.</p>
      </div>
      <Link className="btn btnGhost" href="/admin/kommunikacio/iroda">Vissza a munkatérhez</Link>
    </div>

    <div className="adminAuditNotice">
      <strong>Jelenlegi webshopos e-mail cím nem használható.</strong>
      <p>A küldés kizárólag egy később, külön jóváhagyott Digitális Iroda postafiókkal aktiválható. Addig a felület csak biztonságos piszkozatkezelést enged.</p>
    </div>

    {foundationError&&<div className="errorNotice" role="alert"><strong>A Composer foundation még nem érhető el teljesen ebben a környezetben.</strong><p>Biztonsági okból hiányos foundation mellett sem piszkozatot, sem e-mailt nem tekintünk mentettnek vagy elküldöttnek.</p></div>}
    {!canCompose&&!foundationError&&<div className="adminAuditNotice"><strong>Új e-mail írása nincs engedélyezve.</strong><p>Ehhez a munkatárshoz az „Új ügyfél-e-mail írása” extra jogosultság szükséges. A meglévő szerepkörét emiatt nem kell magasabb rangra módosítani.</p></div>}

    {canCompose&&!foundationError&&<OfficeNewEmailComposer mailboxes={mailboxOptions}/>}

    <section className="featurePanel">
      <div className="adminToolbar"><div><span className="eyebrow">Saját</span><h2>Piszkozatok</h2></div><span className="badge">{draftError?'—':drafts.length}</span></div>
      {!draftError&&drafts.length===0&&<p className="muted">Még nincs új e-mail piszkozatod.</p>}
      <div className="cards">
        {canCompose&&!foundationError&&drafts.map(draft=><article className="card" key={draft.id}>
          <div className="adminToolbar"><strong>{draft.subject||'(Nincs tárgy)'}</strong><span className="muted">{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Budapest'}).format(new Date(draft.updated_at))}</span></div>
          <OfficeNewEmailComposer compact mailboxes={mailboxOptions} initialDraft={{id:draft.id,toEmail:draft.to_email,subject:draft.subject,body:draft.body}}/>
        </article>)}
      </div>
    </section>
  </section>;
}
