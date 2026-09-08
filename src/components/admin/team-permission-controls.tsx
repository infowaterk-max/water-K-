'use client';

import { useActionState,type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import {
  addPermissionOverrideAction,createDelegationAction,removePermissionOverrideAction,replacePermissionExtrasAction,revokeDelegationAction,
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

function isSimpleExtra(item:PermissionOverrideItem){
  return item.effect==='allow'&&item.scopeType==='all'&&item.scopeValue===null&&item.validUntil===null;
}

export function PermissionOverrideControls({userId,canManage,capabilities,presetCodes,overrides}:{userId:string;canManage:boolean;capabilities:CapabilityOption[];presetCodes:string[];overrides:PermissionOverrideItem[]}){
  const[extrasState,extrasAction]=useActionState(replacePermissionExtrasAction,advancedPermissionInitialState);
  const[advancedState,advancedAction]=useActionState(addPermissionOverrideAction,advancedPermissionInitialState);
  const presetSet=new Set(presetCodes);
  const simpleExtraSet=new Set(overrides.filter(item=>isSimpleExtra(item)&&!presetSet.has(item.permissionCode)).map(item=>item.permissionCode));
  const explicitDenySet=new Set(overrides.filter(item=>item.effect==='deny').map(item=>item.permissionCode));
  const advancedOverrides=overrides.filter(item=>!isSimpleExtra(item)||presetSet.has(item.permissionCode));
  const areas=new Map<string,{label:string;items:CapabilityOption[]}>();
  for(const capability of capabilities){
    const current=areas.get(capability.areaCode)??{label:capability.areaLabel,items:[]};
    current.items.push(capability);
    areas.set(capability.areaCode,current);
  }

  return <section className="card">
    <span className="eyebrow">Szerepkör + extra</span><h2>Egyszerű jogosultságok</h2>
    <p className="muted">A szerepkör definíciója változatlan marad. A szürke, bekapcsolt jogokat a szerepkör adja; a tulajdonos az ezen felüli feladatokat pipával adhatja hozzá az adott munkatárshoz.</p>
    <div className="adminAuditNotice"><strong>Teljes egyéni mód</strong><p>A „csak a bepipált jogok érvényesek” módot csak akkor kapcsoljuk be, amikor minden érintett admin-route a finom capability evaluatort használja. Addig nem mutatunk olyan korlátozást, amelyet egy régi szerepkör-ellenőrzés megkerülhetne.</p></div>

    <form action={extrasAction} className="stackForm">
      <input type="hidden" name="userId" value={userId}/>
      <div className="teamRoleGuideGrid">
        {[...areas.entries()].map(([areaCode,area])=><fieldset className="adminAuditNotice" key={areaCode} disabled={!canManage}>
          <legend><strong>{area.label}</strong></legend>
          {area.items.map(capability=>{
            const inherited=presetSet.has(capability.code);
            const denied=explicitDenySet.has(capability.code);
            return <label key={capability.code} style={{display:'flex',gap:10,alignItems:'flex-start',marginTop:8}}>
              <input
                type="checkbox"
                name={inherited?undefined:'extraPermissionCode'}
                value={capability.code}
                defaultChecked={inherited||simpleExtraSet.has(capability.code)}
                disabled={inherited||!canManage}
              />
              <span><strong>{capability.label}</strong>{inherited?' · szerepkörből':''}{denied?' · haladó tiltás érvényben':''}{capability.sensitivity==='critical'?' · kritikus':''}</span>
            </label>;
          })}
        </fieldset>)}
      </div>
      {canManage&&<SubmitButton>Extra jogosultságok mentése</SubmitButton>}
      <Result state={extrasState}/>
    </form>

    <details style={{marginTop:18}}>
      <summary><strong>Haladó eltérések</strong> · tiltás, adatkör, lejárat</summary>
      <p className="muted">Ezt csak kivételes esetekhez használd. Itt lehet egy szerepkörből örökölt jogot explicit letiltani, vagy saját/hozzárendelt/témakör/postafiók scope-ra és időtartamra szűkíteni. Biztonsági konfliktusnál az explicit tiltás az erősebb.</p>
      {advancedOverrides.length===0?<div className="adminAuditNotice"><strong>Nincs haladó eltérés.</strong><p>A csapattag a szerepkörét és a fenti egyszerű extra pipákat használja.</p></div>:<div className="teamRoleGuideGrid">{advancedOverrides.map(item=><PermissionOverrideRow key={item.id} userId={userId} item={item} canManage={canManage}/>)}</div>}
      {canManage&&<form action={advancedAction} className="teamAddForm">
        <input type="hidden" name="userId" value={userId}/>
        <label><span>Jogosultság</span><select name="permissionCode" required defaultValue=""><option value="" disabled>Válassz jogosultságot…</option>{capabilities.map(cap=><option key={cap.code} value={cap.code}>{cap.areaLabel} · {cap.label}{cap.sensitivity==='critical'?' · kritikus':''}</option>)}</select></label>
        <label><span>Beállítás</span><select name="effect" defaultValue="deny"><option value="allow">Egyedi engedély</option><option value="deny">Egyedi tiltás</option></select></label>
        <label><span>Adatkör</span><select name="scopeType" defaultValue="all"><option value="all">Minden engedélyezett adat</option><option value="own">Csak saját</option><option value="assigned">Csak hozzárendelt</option><option value="own_or_assigned">Saját vagy hozzárendelt</option><option value="topic">Kijelölt témakör</option><option value="mailbox">Kijelölt postafiók</option></select></label>
        <label><span>Témakör / postafiók kulcsa</span><input name="scopeValue" type="text" maxLength={120} placeholder="Csak témakör vagy postafiók scope esetén"/></label>
        <label><span>Érvényesség</span><select name="validity" defaultValue="indefinite"><option value="indefinite">Határozatlan</option><option value="24h">24 óra</option><option value="7d">7 nap</option><option value="14d">14 nap</option><option value="30d">30 nap</option><option value="90d">90 nap</option></select></label>
        <SubmitButton>Haladó eltérés hozzáadása</SubmitButton><Result state={advancedState}/>
      </form>}
    </details>
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
      <p className="muted">Példa: Árajánlat helyettesítéshez a témakör lehet <code>quotes</code>. A Digitális Iroda ugyanilyen topic-kóddal védi az árajánlathoz kapcsolt e-mail threadeket.</p>
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
