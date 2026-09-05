'use client';

import { useActionState,useEffect,useState,type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { addTeamMemberAction,removeTeamMemberAction,updateTeamMemberRoleAction,type TeamActionState } from '@/app/admin/csapat/actions';

export type TeamRole='owner'|'admin'|'catalog_manager'|'order_manager'|'marketing_manager'|'support'|'analyst'|'viewer';
export const TEAM_ROLE_OPTIONS:Array<{value:TeamRole;label:string;description:string}>=[
  {value:'owner',label:'Tulajdonos',description:'Teljes webshop-hozzáférés és jogosultságkezelés.'},
  {value:'admin',label:'Adminisztrátor',description:'Teljes napi adminisztráció és beállításkezelés.'},
  {value:'catalog_manager',label:'Katalóguskezelő',description:'Termékek, készlet és beszerzés kezelése.'},
  {value:'order_manager',label:'Rendeléskezelő',description:'Rendelések, visszáru és kapcsolódó ügyfélszolgálat.'},
  {value:'marketing_manager',label:'Marketingkezelő',description:'Értékesítési és marketing műveletek, kampányok.'},
  {value:'support',label:'Ügyfélszolgálat',description:'Ügyfélszolgálati ügyek kezelése.'},
  {value:'analyst',label:'Elemző',description:'Elemzési adatok megtekintése módosítás nélkül.'},
  {value:'viewer',label:'Megtekintő',description:'Alap webshop-adatok megtekintése módosítás nélkül.'},
];

const initial:TeamActionState={status:'idle',message:''};

function SubmitButton({children,className='btn btnPrimary',pendingLabel='Mentés…',disabled=false}:{children:ReactNode;className?:string;pendingLabel?:string;disabled?:boolean}){
  const{pending}=useFormStatus();
  return <button className={className} type="submit" disabled={disabled||pending}>{pending?pendingLabel:children}</button>;
}

function ActionMessage({state}:{state:TeamActionState}){
  if(state.status==='idle'||!state.message)return null;
  return <p className={state.status==='success'?'helperText':'errorNotice'} role={state.status==='error'?'alert':'status'}>{state.message}</p>;
}

export function AddTeamMemberForm(){
  const[state,action]=useActionState(addTeamMemberAction,initial);
  return <form action={action} className="teamAddForm">
    <label><span>E-mail-cím</span><input name="email" type="email" required autoComplete="email" placeholder="munkatars@pelda.hu"/></label>
    <label><span>Szerepkör</span><select name="role" defaultValue="viewer">{TEAM_ROLE_OPTIONS.map(role=><option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
    <SubmitButton pendingLabel="Hozzáadás…">Csapattag hozzáadása</SubmitButton>
    <ActionMessage state={state}/>
  </form>;
}

type MemberProps={userId:string;name:string;email:string;role:TeamRole;scopeLabel:string;editable:boolean};
export function TeamMemberControl({userId,name,email,role,scopeLabel,editable}:MemberProps){
  const[updateState,updateAction]=useActionState(updateTeamMemberRoleAction,initial);
  const[removeState,removeAction]=useActionState(removeTeamMemberAction,initial);
  const[confirmOpen,setConfirmOpen]=useState(false);
  useEffect(()=>{if(removeState.status==='success')setConfirmOpen(false)},[removeState.status]);
  const roleMeta=TEAM_ROLE_OPTIONS.find(item=>item.value===role);
  return <article className="teamMemberCard">
    <div className="teamMemberIdentity"><div><strong>{name}</strong><span>{email}</span></div><span className="adminStatePill neutral">{scopeLabel}</span></div>
    <p className="muted">{roleMeta?.description}</p>
    {editable?<>
      <form action={updateAction} className="teamRoleForm"><input type="hidden" name="userId" value={userId}/><label><span>Szerepkör</span><select key={role} name="role" defaultValue={role}>{TEAM_ROLE_OPTIONS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label><SubmitButton pendingLabel="Mentés…">Szerepkör mentése</SubmitButton></form>
      <ActionMessage state={updateState}/>
      <button className="btn btnGhost teamRemoveTrigger" type="button" onClick={()=>setConfirmOpen(true)}>Hozzáférés eltávolítása</button>
      <ActionMessage state={removeState}/>
      {confirmOpen&&<div className="adminModalBackdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setConfirmOpen(false)}}><div className="adminModal" role="dialog" aria-modal="true" aria-labelledby={`team-remove-${userId}`}><span className="eyebrow">Megerősítés</span><h3 id={`team-remove-${userId}`}>Webshop-hozzáférés eltávolítása</h3><p><strong>{name}</strong> elveszíti ennek a webshopnak a hozzáférését. A művelet az audit naplóban rögzül.</p><div className="actions"><button className="btn btnGhost" type="button" onClick={()=>setConfirmOpen(false)}>Mégsem</button><form action={removeAction}><input type="hidden" name="userId" value={userId}/><SubmitButton className="btn btnPrimary" pendingLabel="Eltávolítás…">Eltávolítás megerősítése</SubmitButton></form></div></div></div>}
    </>:<div className="adminAuditNotice"><strong>{roleMeta?.label??role}</strong><p>Ez szervezeti szintű jogosultság, ezért ezen a webshop-oldalon csak olvasható.</p></div>}
  </article>;
}
