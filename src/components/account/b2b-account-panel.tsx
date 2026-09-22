'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Role='owner'|'admin'|'buyer';
type Member={userId:string;name:string;email:string;role:Role};
type Invitation={id:string;email:string;role:'admin'|'buyer';expiresAt:string};
type Props={
  accountId:string;
  currentUserId:string;
  currentRole:Role;
  members:Member[];
  invitations:Invitation[];
};

async function post(body:unknown){
  const response=await fetch('/api/account/b2b',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload.error??'A művelet nem sikerült.');
  return payload as {joinUrl?:string};
}

export function B2BInviteAccept({token}:{token:string}){
  const[busy,setBusy]=useState(false),[message,setMessage]=useState(''),router=useRouter();
  async function accept(){
    setBusy(true);setMessage('');
    try{await post({action:'accept',token});setMessage('A meghívót elfogadtad.');router.replace('/fiokom/b2b');router.refresh()}
    catch(error){setMessage(error instanceof Error?error.message:'A meghívó nem fogadható el.')}
    finally{setBusy(false)}
  }
  return <div className="card"><h2>B2B meghívó</h2><p className="muted">A meghívó csak a meghívott e-mail-címmel belépett felhasználóval használható.</p><button className="btn btnPrimary" disabled={busy} onClick={accept}>{busy?'Csatlakozás…':'Csatlakozás a szervezethez'}</button>{message&&<p role="status" className="muted">{message}</p>}</div>;
}

export function B2BAccountPanel({accountId,currentUserId,currentRole,members,invitations}:Props){
  const[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[inviteLink,setInviteLink]=useState(''),router=useRouter();
  const[inviteEmail,setInviteEmail]=useState(''),[inviteRole,setInviteRole]=useState<'admin'|'buyer'>('buyer');
  const canInvite=currentRole==='owner'||currentRole==='admin';

  async function action(body:unknown){
    setBusy(true);setMessage('');setInviteLink('');
    try{
      const result=await post(body);
      if(result.joinUrl)setInviteLink(`${window.location.origin}${result.joinUrl}`);
      setMessage('A módosítás sikeresen mentve.');
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:'A művelet nem sikerült.')}
    finally{setBusy(false)}
  }

  return <div className="splitFeature">
    <section className="featurePanel">
      <span className="eyebrow">Tagok</span><h2>Szervezeti hozzáférések</h2>
      <div className="integrationList">{members.map(member=><div key={member.userId}>
        <span><strong>{member.name}</strong><br/><span className="muted">{member.email} · {member.role==='owner'?'Tulajdonos':member.role==='admin'?'Admin':'Vásárló'}</span></span>
        <span className="actions">
          {currentRole==='owner'&&member.userId!==currentUserId&&member.role!=='owner'?<>
            <button className="btn btnGhost" disabled={busy} onClick={()=>action({action:'set_role',accountId,userId:member.userId,role:member.role==='admin'?'buyer':'admin'})}>{member.role==='admin'?'Vásárlóvá':'Adminná'}</button>
            <button className="btn btnGhost" disabled={busy} onClick={()=>action({action:'transfer',accountId,userId:member.userId})}>Tulajdon átadása</button>
          </>:null}
          {member.userId!==currentUserId&&member.role!=='owner'&&(currentRole==='owner'||(currentRole==='admin'&&member.role==='buyer'))?
            <button className="btn btnGhost" disabled={busy} onClick={()=>action({action:'remove',accountId,userId:member.userId})}>Eltávolítás</button>:null}
          {member.userId===currentUserId&&member.role!=='owner'?
            <button className="btn btnGhost" disabled={busy} onClick={()=>action({action:'remove',accountId,userId:member.userId})}>Kilépés</button>:null}
        </span>
      </div>)}</div>
      {currentRole==='owner'&&<p className="muted">Az utolsó tulajdonos nem távolítható el; előbb át kell adnia a tulajdonjogot.</p>}
    </section>
    <section className="featurePanel">
      <span className="eyebrow">Meghívások</span><h2>Új munkatárs hozzáadása</h2>
      {canInvite?<form onSubmit={event=>{event.preventDefault();void action({action:'invite',accountId,email:inviteEmail,role:inviteRole})}}>
        <label>E-mail<input type="email" required value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}/></label>
        <label>Szerepkör<select value={inviteRole} onChange={e=>setInviteRole(e.target.value as 'admin'|'buyer')}><option value="buyer">Vásárló</option><option value="admin">Admin</option></select></label>
        <button className="btn btnPrimary" disabled={busy}>{busy?'Mentés…':'Meghívó létrehozása'}</button>
      </form>:<p className="muted">Vásárlói szerepkörrel a tagság olvasható, de nem módosítható.</p>}
      {inviteLink&&<div className="successNotice"><strong>Meghívó link</strong><p className="muted">{inviteLink}</p><button className="btn btnGhost" onClick={()=>navigator.clipboard?.writeText(inviteLink)}>Link másolása</button></div>}
      {canInvite&&invitations.length>0&&<div className="integrationList">{invitations.map(inv=><div key={inv.id}><span>{inv.email}<br/><span className="muted">{inv.role} · lejár: {new Intl.DateTimeFormat('hu-HU',{dateStyle:'short'}).format(new Date(inv.expiresAt))}</span></span><button className="btn btnGhost" disabled={busy} onClick={()=>action({action:'revoke_invite',accountId,invitationId:inv.id})}>Visszavonás</button></div>)}</div>}
      {message&&<p role="status" className="muted">{message}</p>}
    </section>
  </div>;
}
