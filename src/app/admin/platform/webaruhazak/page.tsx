import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformOperator } from '@/lib/auth/platform-operator';
import { ADDONS, type AddonCode } from '@/lib/plans/addons';
import { createWebshopInstanceAction, toggleWebshopAddonAction, updateWebshopInstanceAction } from './actions';

export const dynamic='force-dynamic';
type Instance={id:string;slug:string;name:string;subscription_plan:'alap'|'pro';status:'pilot'|'active'|'suspended'|'archived';created_at:string};
type EnabledAddon={instance_id:string;addon_code:string;enabled:boolean};
const statusLabel:Record<Instance['status'],string>={pilot:'Pilot',active:'Aktív',suspended:'Felfüggesztett',archived:'Archivált'};

export default async function WebshopInstancesPage(){
 await requirePlatformOperator();
 const admin=createAdminClient();
 const[{data:instances},{data:addons}]=await Promise.all([
   admin.from('webshop_instances').select('id,slug,name,subscription_plan,status,created_at').order('created_at',{ascending:false}),
   admin.from('webshop_instance_addons').select('instance_id,addon_code,enabled').eq('enabled',true)
 ]);
 const rows=(instances??[])as Instance[],enabled=(addons??[])as EnabledAddon[];
 const enabledByInstance=new Map<string,Set<string>>();for(const row of enabled){const set=enabledByInstance.get(row.instance_id)??new Set<string>();set.add(row.addon_code);enabledByInstance.set(row.instance_id,set)}
 return <section className="adminMain"><span className="eyebrow">Webshop Motor · Platform</span><h1 className="sectionTitle">Ügyfél-webshopok és jogosultságok</h1><p className="lead">Itt kezelhető a pilot/aktív webshop példány, az Alap–Pro csomag és a külön aktiválható extrák. A kereskedői admin ezt a felületet nem látja.</p>
 <section className="card"><h2>Új webshop példány</h2><form action={createWebshopInstanceAction} className="adminForm"><label>Név<input name="name" required minLength={2} placeholder="Minta Kertészet"/></label><label>Azonosító<input name="slug" placeholder="minta-kerteszet"/></label><label>Csomag<select name="plan" defaultValue="pro"><option value="alap">Alap</option><option value="pro">Pro</option></select></label><button className="btn btnPrimary">Pilot létrehozása</button></form></section>
 <div className="cards">{rows.map(instance=>{const active=enabledByInstance.get(instance.id)??new Set<string>();return <article className="card" key={instance.id}><span className="badge">{statusLabel[instance.status]} · {instance.subscription_plan==='pro'?'Pro':'Alap'}</span><h2>{instance.name}</h2><p className="muted">{instance.slug} · {instance.id}</p><form action={updateWebshopInstanceAction} className="adminForm"><input type="hidden" name="id" value={instance.id}/><label>Csomag<select name="plan" defaultValue={instance.subscription_plan}><option value="alap">Alap</option><option value="pro">Pro</option></select></label><label>Állapot<select name="status" defaultValue={instance.status}><option value="pilot">Pilot</option><option value="active">Aktív</option><option value="suspended">Felfüggesztett</option><option value="archived">Archivált</option></select></label><button className="btn">Mentés</button></form><h3>Extrák</h3>{(Object.keys(ADDONS) as AddonCode[]).map(code=>{const addon=ADDONS[code],on=active.has(code),compatible=addon.compatiblePlans.includes(instance.subscription_plan);return <form key={code} action={toggleWebshopAddonAction} className="integrationList"><input type="hidden" name="instanceId" value={instance.id}/><input type="hidden" name="addon" value={code}/><input type="hidden" name="enabled" value={on?'false':'true'}/><span><strong>{addon.name}</strong><br/><span className="muted">{addon.description}</span></span><button className="btn" disabled={!compatible}>{on?'Kikapcsolás':'Bekapcsolás'}</button></form>})}</article>})}</div>{!rows.length&&<div className="card"><p className="muted">Még nincs létrehozott ügyfél-webshop példány.</p></div>}</section>;
}
