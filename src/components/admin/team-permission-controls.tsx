'use client';

import { useActionState,type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import {
  addPermissionOverrideAction,createDelegationAction,removePermissionOverrideAction,revokeDelegationAction,
  advancedPermissionInitialState,type AdvancedPermissionActionState,
} from '@/app/admin/csapat/[userId]/actions';

export type CapabilityOption={code:string;label:string;areaCode:string;areaLabel:string;sensitivity:string;delegable:boolean};
export type PermissionOverrideItem={id:string;permissionCode:string;label:string;effect:'allow'|'deny';scopeType:string;scopeLabel:string;scopeValue:string|null;validUntil:string|null};
export type TeamMemberOption={userId:string;label:string};
export type DelegationItem={id:string;sourceUserId:string;sourceLabel:string;delegateUserId:string;delegateLabel:string;scopeType:'all'|'topic'|'mailbox';scopeValue:string|null;validFrom:string;validUntil:string;reason:string|null;permissionLabels:string[]};

function SubmitButton({children,pendingLabel='Mentés…',className='btn btnPrimary'}:{children:ReactNode;pendingLabel?:string;className?:string}){
  const{pending}=useFormStatus();
  return <button className={className} type="submit" disabled={pending}>{pending?pendingLabel:children}</button>;
}

function Result({state}:{state:AdvancedPermissionActionState}){
  if(state.status==='idle'||!state.message)return null;
  return <p className={state.status==='success'?'helperText':'errorNotice'} role={state.status==='error'?'alert':'status'}>{state.message}</p>;
}

export function PermissionOverrideControls({userId,canManage,capabilities,overrides}:{userId:string;canManage:boolean;capabilities:CapabilityOption[];overrides:PermissionOverrideItem[]}){
  const[state,action]=useActionState(addPermissionOverrideAction,advancedPermissionInitialState);
  return <section className="card">
    <span className="eyebrow">Személyes eltérések</span><h2>Egyedi engedélyek és tiltások</h2>
    <p className="muted">Az alapszerepkör marad a kiindulópont. Itt csak az attól eltérő jogokat adjuk hozzá vagy tiltjuk le. Biztonsági konfliktusnál az explicit tiltás az erősebb.</p>
    {overrides.length===0?<div className="adminAuditNotice"><strong>Nincs egyedi eltérés.</strong><p>A csapattag jelenleg az alapszerepkörének szabályait használja.</p></div>:<div className="teamRoleGuideGrid">{overrides.map(item=><PermissionOverrideRow key={item.id} userId={userId} item={item} canManage={canManage}/>)}</div>}
    {canManage&&<form action={action} className="teamAddForm">
      <input type="hidden" name="userId" value={userId}/>
      <label><span>Jogosultság</span><select name="permissionCode" required defaultValue=""><option value="" disabled>Válassz jogosultságot…</option>{capabilities.map(cap=><option key={cap.code} value={cap.code}>{cap.areaLabel} · {cap.label}{cap.sensitivity==='critical'?' · kritikus':''}</option>)}</select></label>
      <label><span>Beállítás</span><select name="effect" defaultValue="allow"><option value="allow">Egyedi engedély</option><option value="deny">Egyedi tiltás</option></select></label>
      <label><span>Adatkör</span><select name="scopeType" defaultValue="all"><option value="all">Minden engedélyezett adat</option><option value="own">Csak saját</option><option value="assigned">Csak hozzárendelt</option><option value="own_or_assigned">Saját vagy hozzárendelt</option><option value="topic">Kijelölt témakör</option><option value="mailbox">Kijelölt postafiók</option></select></label>
      <label><span>Témakör / postafiók kulcsa</span><input name="scopeValue" type="text" maxLength={120} placeholder="Csak témakör vagy postafiók scope esetén"/></label>
      <label><span>Érvényesség</span><select name="validity" defaultValue="indefinite"><option value="indefinite">Határozatlan</option><option value="24h">24 óra</option><option value="7d">7 nap</option><option value="14d">14 nap</option><option value="30d">30 nap</option><option value="90d">90 nap</option></select></label>
      <SubmitButton>Eltérés hozzáadása</SubmitButton><Result state={state}/>
    </form>}
  </section>;
}

function PermissionOverrideRow({userId,item,canManage}:{userId:string;item:PermissionOverrideItem;canManage:boolean}){
  const[state,action]=useActionState(removePermissionOverrideAction,advancedPermissionInitialState);
  return <article className="adminAuditNotice"><strong>{item.effect==='allow'?'Engedélyezve':'Tiltva'} · {item.label}</strong><p>{item.scopeLabel}{item.scopeValue?` · ${item.scopeValue}`:''}{item.validUntil?` · lejár: ${new Date(item.validUntil).toLocaleString('hu-HU')}`:' · nincs lejárat'}</p>{canManage&&<form action={action}><input type="hidden" name="userId" value={userId}/><input type="hidden" name="overrideId" value={item.id}/><SubmitButton className="btn btnGhost" pendingLabel="Eltávolítás…">Eltérés eltávolítása</SubmitButton><Result state={state}/></form>}</article>;
}

export function DelegationControls({userId,canManage,capabilities,members,delegations}:{userId:string;canManage:boolean;capabilities:CapabilityOption[];members:TeamMemberOption[];delegations:DelegationItem[]}){
  const[state,action]=useActionState(createDelegationAction,advancedPermissionInitialState);
  const delegable=capabilities.filter(cap=>cap.delegable);
  return <section className="card">
    <span className="eyebrow">Helyettesítés</span><h2>Időszakos, szűrt delegáció</h2>
    <p className="muted">A helyettesítés nem másolja le a másik munkatárs teljes szerepkörét. Csak olyan capability adható át, amely az eredeti munkatársnak közvetlenül is megvan. A hozzáférés az eredeti munkatárs saját vagy hozzá rendelt erőforrásaira, opcionálisan egy témakörre vagy postafiókra, és mindig lejárattal érvényes.</p>
    {delegations.length===0?<div className="adminAuditNotice"><strong>Nincs aktív helyettesítés.</strong><p>Ehhez a munkatárshoz jelenleg nem tartozik bejövő vagy kimenő delegáció.</p></div>:<div className="teamRoleGuideGrid">{delegations.map(item=><DelegationRow key={item.id} userId={userId} item={item} canManage={canManage}/>)}</div>}
    {canManage&&<form action={action} className="teamAddForm">
      <input type="hidden" name="userId" value={userId}/>
      <label><span>Kit helyettesít?</span><select name="sourceUserId" required defaultValue=""><option value="" disabled>Válassz munkatársat…</option>{members.filter(member=>member.userId!==userId).map(member=><option key={member.userId} value={member.userId}>{member.label}</option>)}</select></label>
      <label><span>Átadott jogosultságok</span><select name="permissionCode" multiple size={Math.min(10,Math.max(5,delegable.length))} required>{delegable.map(cap=><option key={cap.code} value={cap.code}>{cap.areaLabel} · {cap.label}</option>)}</select></label>
      <p className="muted">Több jogosultság kijelöléséhez desktopon Ctrl/Cmd, mobilon a rendszer natív többválasztós kezelője használható.</p>
      <label><span>Helyettesítés adatkör</span><select name="delegationScopeType" defaultValue="all"><option value="all">A kijelölt capability-k teljes forrás-személyes köre</option><option value="topic">Csak egy témakör</option><option value="mailbox">Csak egy postafiók</option></select></label>
      <label><span>Témakör / postafiók kulcsa</span><input name="delegationScopeValue" type="text" maxLength={120} placeholder="Pl. quotes vagy ajanlat@cegem.hu"/></label>
      <p className="muted">Példa: Árajánlat helyettesítéshez a témakör lehet <code>quotes</code>. A későbbi Digitális Iroda ugyanilyen topic-kóddal fogja védeni az árajánlathoz kapcsolt e-mail threadeket.</p>
      <label><span>Időtartam</span><select name="validity" defaultValue="7d"><option value="24h">24 óra</option><option value="7d">7 nap</option><option value="14d">14 nap</option><option value="30d">30 nap</option><option value="90d">90 nap</option></select></label>
      <label><span>Indok / megjegyzés</span><input name="reason" type="text" maxLength={500} placeholder="Pl. szabadság alatti árajánlat-helyettesítés"/></label>
      <SubmitButton>Helyettesítés létrehozása</SubmitButton><Result state={state}/>
    </form>}
  </section>;
}

function DelegationRow({userId,item,canManage}:{userId:string;item:DelegationItem;canManage:boolean}){
  const[state,action]=useActionState(revokeDelegationAction,advancedPermissionInitialState);
  const incoming=item.delegateUserId===userId;
  const scopeLabel=item.scopeType==='topic'?`Témakör: ${item.scopeValue}`:item.scopeType==='mailbox'?`Postafiók: ${item.scopeValue}`:'Forrás-személy teljes kijelölt köre';
  return <article className="adminAuditNotice"><strong>{incoming?'Bejövő helyettesítés':'Kimenő helyettesítés'} · {item.sourceLabel} → {item.delegateLabel}</strong><p>{item.permissionLabels.join(', ')||'Nincs capability'}.</p><p>{scopeLabel}</p><p>{new Date(item.validFrom).toLocaleString('hu-HU')} – {new Date(item.validUntil).toLocaleString('hu-HU')}{item.reason?` · ${item.reason}`:''}</p>{canManage&&<form action={action}><input type="hidden" name="userId" value={userId}/><input type="hidden" name="delegationId" value={item.id}/><SubmitButton className="btn btnGhost" pendingLabel="Visszavonás…">Helyettesítés visszavonása</SubmitButton><Result state={state}/></form>}</article>;
}
