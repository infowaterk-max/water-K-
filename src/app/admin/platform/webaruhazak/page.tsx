import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformOperator } from '@/lib/auth/platform-operator';
import { ADDONS, type AddonCode } from '@/lib/plans/addons';
import { assignWebshopMemberAction, createWebshopInstanceAction, removeWebshopMemberAction, toggleWebshopAddonAction, updateWebshopInstanceAction } from './actions';

export const dynamic='force-dynamic';
type Instance={id:string;slug:string;name:string;subscription_plan:'alap'|'pro';status:'pilot'|'active'|'suspended'|'archived';created_at:string};
type EnabledAddon={instance_id:string;addon_code:string;enabled:boolean};
type Member={instance_id:string;user_id:string;role:'owner'|'admin'|'staff'};
type Profile={id:string;email:string|null;full_name:string|null;company_name:string|null};
const statusLabel:Record<Instance['status'],string>={pilot:'Pilot',active:'Aktív',suspended:'Felfüggesztett',archived:'Archivált'};
const roleLabel:Record<Member['role'],string>={owner:'Tulajdonos',admin:'Adminisztrátor',staff:'Munkatárs'};

export default async function WebshopInstancesPage(){
 await requirePlatformOperator();
 const admin=createAdminClient();
 const[{data:instances},{data:addons},{data:members}]=await Promise.all([
   admin.from('webshop_instances').select('id,slug,name,subscription_plan,status,created_at').order('created_at',{ascending:false}),
   admin.from('webshop_instance_addons').select('instance_id,addon_code,enabled').eq('enabled',true),
   admin.from('webshop_instance_members').select('instance_id,user_id,role').order('created_at',{ascending:true})
 ]);
 const rows=(instances??[])as Instance[],enabled=(addons??[])as EnabledAddon[],membership=(members??[])as Member[];
 const userIds=[...new Set(membership.map(row=>row.user_id))];
 const{data:profiles}=userIds.length?await admin.from('profiles').select('id,email,full_name,company_name').in('id',userIds):{data:[] as Profile[]};
 const profileById=new Map(((profiles??[])as Profile[]).map(profile=>[profile.id,profile]));
 const enabledByInstance=new Map<string,Set<string>>();for(const row of enabled){const set=enabledByInstance.get(row.instance_id)??new Set<string>();set.add(row.addon_code);enabledByInstance.set(row.instance_id,set)}
 const membersByInstance=new Map<string,Member[]>();for(const row of membership){const list=membersByInstance.get(row.instance_id)??[];list.push(row);membersByInstance.set(row.instance_id,list)}
 return <section className="adminMain"><span className="eyebrow">Webshop Motor · Platform</span><h1 className="sectionTitle">Ügyfél-webshopok és jogosultságok</h1><p className="lead">Pilotok, aktív webshopok, Alap–Pro csomagok, extrák és kereskedői hozzáférések egy helyen. Ezt a felületet kizárólag platform-üzemeltető érheti el.</p>
 <section className="card"><h2>Új webshop példány</h2><form action={createWebshopInstanceAction} className="adminForm"><label>Név<input name="name" required minLength={2} placeholder="Minta Kertészet"/></label><label>Azonosító<input name="slug" placeholder="minta-kerteszet"/></label><label>Csomag<select name="plan" defaultValue="pro"><option value="alap">Alap</option><option value="pro">Pro</option></select></label><button className="btn btnPrimary">Pilot létrehozása</button></form></section>
 <div className="cards">{rows.map(instance=>{const active=enabledByInstance.get(instance.id)??new Set<string>(),instanceMembers=membersByInstance.get(instance.id)??[];return <article className="card" key={instance.id}><span className="badge">{statusLabel[instance.status]} · {instance.subscription_plan==='pro'?'Pro':'Alap'}</span><h2>{instance.name}</h2><p className="muted">Telepítési azonosító: <strong>{instance.slug}</strong></p>
 <form action={updateWebshopInstanceAction} className="adminForm"><input type="hidden" name="id" value={instance.id}/><label>Csomag<select name="plan" defaultValue={instance.subscription_plan}><option value="alap">Alap</option><option value="pro">Pro</option></select></label><label>Állapot<select name="status" defaultValue={instance.status}><option value="pilot">Pilot</option><option value="active">Aktív</option><option value="suspended">Felfüggesztett</option><option value="archived">Archivált</option></select></label><button className="btn">Csomag és állapot mentése</button></form>
 <h3>Hozzáférések</h3><p className="muted">Meglévő felhasználói profilt adhatsz a webshophoz. Új ügyfél meghívása külön onboarding folyamat lesz.</p>{instanceMembers.length?<div className="integrationList">{instanceMembers.map(member=>{const profile=profileById.get(member.user_id);return <div key={member.user_id}><span><strong>{profile?.company_name||profile?.full_name||profile?.email||member.user_id}</strong><br/><span className="muted">{roleLabel[member.role]}{profile?.email?` · ${profile.email}`:''}</span></span><form action={removeWebshopMemberAction}><input type="hidden" name="instanceId" value={instance.id}/><input type="hidden" name="userId" value={member.user_id}/><button className="btn">Eltávolítás</button></form></div>})}</div>:<p className="muted">Még nincs kereskedői felhasználó hozzárendelve.</p>}
 <form action={assignWebshopMemberAction} className="adminForm"><input type="hidden" name="instanceId" value={instance.id}/><label>Meglévő profil e-mail címe<input name="email" type="email" required placeholder="tulajdonos@pelda.hu"/></label><label>Szerepkör<select name="role" defaultValue="owner"><option value="owner">Tulajdonos</option><option value="admin">Adminisztrátor</option><option value="staff">Munkatárs</option></select></label><button className="btn">Hozzáférés hozzáadása</button></form>
 <h3>Extrák</h3>{(Object.keys(ADDONS) as AddonCode[]).map(code=>{const addon=ADDONS[code],on=active.has(code),compatible=addon.compatiblePlans.includes(instance.subscription_plan);return <form key={code} action={toggleWebshopAddonAction} className="integrationList"><input type="hidden" name="instanceId" value={instance.id}/><input type="hidden" name="addon" value={code}/><input type="hidden" name="enabled" value={on?'false':'true'}/><span><strong>{addon.name}</strong><br/><span className="muted">{addon.description}{!compatible?' · A jelenlegi csomaggal nem aktiválható.':''}</span></span><button className="btn" disabled={!compatible}>{on?'Kikapcsolás':'Bekapcsolás'}</button></form>})}</article>})}</div>{!rows.length&&<div className="card"><p className="muted">Még nincs létrehozott ügyfél-webshop példány.</p></div>}</section>;
}
