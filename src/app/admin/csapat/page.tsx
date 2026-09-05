import { createAdminClient } from '@/lib/supabase/admin';
import { requireCurrentStorePageContext } from '@/lib/instances/scope';
import { AddTeamMemberForm,TeamMemberControl,type TeamRole } from '@/components/admin/team-member-controls';

const roleLabels:Record<TeamRole,string>={owner:'Tulajdonos',admin:'Adminisztrátor',catalog_manager:'Katalóguskezelő',order_manager:'Rendeléskezelő',marketing_manager:'Marketingkezelő',support:'Ügyfélszolgálat',analyst:'Elemző',viewer:'Megtekintő'};

type Binding={user_id:string;role_code:string;instance_id:string|null;valid_until:string|null};
type Profile={id:string;email:string|null;full_name:string|null};

export default async function TeamPage(){
  const scope=await requireCurrentStorePageContext('store.manage');
  const admin=createAdminClient();
  if(!scope.organizationId)return <section className="adminMain"><span className="eyebrow">Rendszer · Csapat</span><h1 className="sectionTitle">Csapat és jogosultságok</h1><div className="errorNotice" role="alert">Ehhez a webshophoz nincs kezelhető szervezeti kapcsolat.</div></section>;

  const now=new Date().toISOString();
  const{data:bindingData,error:bindingError}=await admin.from('role_bindings')
    .select('user_id,role_code,instance_id,valid_until')
    .eq('organization_id',scope.organizationId)
    .is('revoked_at',null)
    .lte('valid_from',now)
    .or(`instance_id.eq.${scope.instanceId},instance_id.is.null`);

  const active=((bindingData??[])as Binding[]).filter(row=>!row.valid_until||row.valid_until>now);
  const selected=new Map<string,Binding>();
  for(const row of active){
    if(!(row.role_code in roleLabels))continue;
    const current=selected.get(row.user_id);
    if(!current||row.instance_id===scope.instanceId)selected.set(row.user_id,row);
  }
  const bindings=[...selected.values()];
  const userIds=bindings.map(row=>row.user_id);
  const profileResult=userIds.length?await admin.from('profiles').select('id,email,full_name').in('id',userIds):{data:[] as Profile[],error:null};
  const profiles=(profileResult.data??[])as Profile[],profileById=new Map(profiles.map(profile=>[profile.id,profile]));
  const loadError=Boolean(bindingError||profileResult.error);
  const counts=bindings.reduce((acc,row)=>{const role=row.role_code as TeamRole;acc[role]=(acc[role]??0)+1;return acc},{} as Partial<Record<TeamRole,number>>);

  return <section className="adminMain">
    <span className="eyebrow">Rendszer · Csapat</span><h1 className="sectionTitle">Csapat és jogosultságok</h1>
    <p className="lead">Adj a munkatársaknak csak annyi hozzáférést, amennyire a feladatukhoz szükségük van. A módosítások webshop-szinten történnek és bekerülnek az audit naplóba.</p>
    {loadError&&<div className="errorNotice" role="alert"><strong>A csapatadatok egy része most nem tölthető be.</strong><p>Hiányos állapotban ne módosíts jogosultságot.</p></div>}

    <div className="cards adminMetricCards teamMetrics"><article className="card"><span className="badge">Csapattagok</span><div className="price">{loadError?'—':bindings.length}</div></article><article className="card"><span className="badge">Tulajdonos + admin</span><div className="price">{loadError?'—':(counts.owner??0)+(counts.admin??0)}</div></article><article className="card"><span className="badge">Operatív szerepkörök</span><div className="price">{loadError?'—':bindings.filter(row=>!['owner','admin','viewer','analyst'].includes(row.role_code)).length}</div></article><article className="card"><span className="badge">Csak olvasó</span><div className="price">{loadError?'—':(counts.viewer??0)+(counts.analyst??0)}</div></article></div>

    <section className="card teamInviteCard"><div><span className="eyebrow">Új hozzáférés</span><h2>Regisztrált felhasználó hozzáadása</h2><p className="muted">Biztonsági okból csak már létező Shoperation-fiók kaphat jogosultságot. Az e-mail-cím alapján a rendszer a felhasználói profilt keresi meg.</p></div>{!loadError&&<AddTeamMemberForm/>}</section>

    <section className="card teamRolesGuide"><span className="eyebrow">Szerepkörök</span><h2>Mit engednek a szerepkörök?</h2><div className="teamRoleGuideGrid">{(Object.keys(roleLabels) as TeamRole[]).map(role=><div key={role}><strong>{roleLabels[role]}</strong><span>{role==='owner'?'Teljes hozzáférés, beleértve a jogosultságkezelést.':role==='admin'?'Teljes napi adminisztráció és beállításkezelés.':role==='catalog_manager'?'Termékek, készlet, beszerzés és kapcsolódó elemzés.':role==='order_manager'?'Rendelések, visszáru és kapcsolódó ügyfélszolgálat.':role==='marketing_manager'?'Értékesítés, marketing, kampányok és elemzés.':role==='support'?'Ügyfélszolgálati ügyek kezelése.':role==='analyst'?'Elemzések megtekintése módosítási jog nélkül.':'Alap webshop-adatok megtekintése módosítási jog nélkül.'}</span></div>)}</div></section>

    <section className="teamMemberSection"><div className="adminToolbar"><div><span className="eyebrow">Aktív hozzáférések</span><h2>Csapattagok</h2></div><span className="badge">{bindings.length} fő</span></div>{!loadError&&bindings.length===0&&<div className="adminAuditNotice"><strong>Nincs külön csapattag.</strong><p>A webshophoz jelenleg nem tartozik további aktív szerepkör.</p></div>}<div className="teamMemberGrid">{!loadError&&bindings.map(binding=>{const profile=profileById.get(binding.user_id);return <TeamMemberControl key={binding.user_id} userId={binding.user_id} name={profile?.full_name||profile?.email||`${binding.user_id.slice(0,8)}…`} email={profile?.email??'E-mail nem elérhető'} role={binding.role_code as TeamRole} scopeLabel={binding.instance_id===scope.instanceId?'Webshop-szintű':'Szervezeti'} editable={binding.instance_id===scope.instanceId}/>})}</div></section>
  </section>;
}
