import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { DelegationControls,PermissionOverrideControls,type CapabilityOption,type DelegationItem,type PermissionOverrideItem,type TeamMemberOption } from '@/components/admin/team-permission-controls';
import { getActiveStoreRoles } from '@/lib/auth/store-rbac';
import { STORE_CAPABILITY_AREA_LABELS,STORE_SCOPE_LABELS,type StorePermissionScope } from '@/lib/auth/store-capabilities';
import { requireCurrentStorePageContext } from '@/lib/instances/scope';
import { createAdminClient } from '@/lib/supabase/admin';

const uuidSchema=z.string().uuid();
const roleLabels:Record<string,string>={owner:'Tulajdonos',admin:'Adminisztrátor',catalog_manager:'Katalóguskezelő',order_manager:'Rendeléskezelő',marketing_manager:'Marketingkezelő',support:'Ügyfélszolgálat',analyst:'Elemző',viewer:'Megtekintő'};

type Binding={id:string;user_id:string;role_code:string;instance_id:string|null;valid_until:string|null};
type Profile={id:string;email:string|null;full_name:string|null};
type CatalogRow={permission_code:string;area_code:string;label:string;sensitivity:string;delegable:boolean};
type PresetRow={permission_code:string;default_scope:string};
type OverrideRow={id:string;permission_code:string;effect:'allow'|'deny';scope_type:string;scope_value:string|null;valid_until:string|null};
type DelegationRow={id:string;source_user_id:string;delegate_user_id:string;scope_type:'all'|'topic'|'mailbox';scope_value:string|null;valid_from:string;valid_until:string;reason:string|null};
type DelegationPermissionRow={delegation_id:string;permission_code:string};

const active=(validUntil:string|null)=>!validUntil||Date.parse(validUntil)>Date.now();

export default async function TeamMemberAccessPage({params}:{params:Promise<{userId:string}>}){
  const{userId:rawUserId}=await params;
  const parsed=uuidSchema.safeParse(rawUserId);
  if(!parsed.success)notFound();
  const userId=parsed.data;
  const scope=await requireCurrentStorePageContext('store.manage');
  if(!scope.organizationId)return <section className="adminMain"><span className="eyebrow">Rendszer · Csapat</span><h1 className="sectionTitle">Részletes hozzáférés</h1><div className="errorNotice" role="alert">Ehhez a webshophoz nincs kezelhető szervezeti kapcsolat.</div><Link className="btn btnGhost" href="/admin/csapat">← Vissza a csapathoz</Link></section>;
  const admin=createAdminClient();
  const actorRoles=await getActiveStoreRoles(scope.instanceId);
  const ownerAuthority=scope.isPlatform||actorRoles.includes('owner');
  const now=new Date().toISOString();

  const[{data:profileData,error:profileError},{data:bindingData,error:bindingError}]=await Promise.all([
    admin.from('profiles').select('id,email,full_name').eq('id',userId).maybeSingle(),
    admin.from('role_bindings').select('id,user_id,role_code,instance_id,valid_until')
      .eq('organization_id',scope.organizationId).eq('user_id',userId).is('revoked_at',null).lte('valid_from',now)
      .or(`instance_id.eq.${scope.instanceId},instance_id.is.null`),
  ]);
  const profile=(profileData??null) as Profile|null;
  const bindings=((bindingData??[]) as Binding[]).filter(row=>active(row.valid_until));
  const binding=bindings.find(row=>row.instance_id===scope.instanceId)??bindings.find(row=>row.instance_id===null)??null;
  if(profileError||bindingError||!profile||!binding)notFound();

  const instanceSpecific=binding.instance_id===scope.instanceId;
  const canManage=ownerAuthority&&instanceSpecific&&binding.role_code!=='owner';

  const[catalogResult,presetResult,overrideResult,delegationResult,teamBindingResult]=await Promise.all([
    admin.from('store_permission_catalog').select('permission_code,area_code,label,sensitivity,delegable').order('area_code').order('label'),
    admin.from('store_role_permission_presets').select('permission_code,default_scope').eq('role_code',binding.role_code),
    instanceSpecific?admin.from('store_permission_overrides').select('id,permission_code,effect,scope_type,scope_value,valid_until').eq('instance_id',scope.instanceId).eq('user_id',userId).is('revoked_at',null).lte('valid_from',now):Promise.resolve({data:[],error:null}),
    admin.from('store_delegations').select('id,source_user_id,delegate_user_id,scope_type,scope_value,valid_from,valid_until,reason').eq('instance_id',scope.instanceId).is('revoked_at',null).lte('valid_from',now).gt('valid_until',now).or(`source_user_id.eq.${userId},delegate_user_id.eq.${userId}`),
    admin.from('role_bindings').select('id,user_id,role_code,instance_id,valid_until').eq('organization_id',scope.organizationId).eq('instance_id',scope.instanceId).is('revoked_at',null).lte('valid_from',now),
  ]);

  const foundationUnavailable=Boolean(catalogResult.error||presetResult.error||overrideResult.error||delegationResult.error||teamBindingResult.error);
  const catalog=((catalogResult.data??[]) as CatalogRow[]);
  const catalogByCode=new Map(catalog.map(row=>[row.permission_code,row]));
  const capabilities:CapabilityOption[]=catalog.map(row=>({
    code:row.permission_code,label:row.label,areaCode:row.area_code,areaLabel:STORE_CAPABILITY_AREA_LABELS[row.area_code]??row.area_code,
    sensitivity:row.sensitivity,delegable:row.delegable,
  }));
  const presets=((presetResult.data??[]) as PresetRow[]);
  const overrides=((overrideResult.data??[]) as OverrideRow[]).filter(row=>active(row.valid_until));
  const overrideItems:PermissionOverrideItem[]=overrides.map(row=>({
    id:row.id,permissionCode:row.permission_code,label:catalogByCode.get(row.permission_code)?.label??row.permission_code,effect:row.effect,
    scopeType:row.scope_type,scopeLabel:STORE_SCOPE_LABELS[row.scope_type as StorePermissionScope]??row.scope_type,scopeValue:row.scope_value,validUntil:row.valid_until,
  }));

  const teamBindings=((teamBindingResult.data??[]) as Binding[]).filter(row=>active(row.valid_until));
  const teamUserIds=[...new Set(teamBindings.map(row=>row.user_id))];
  const{data:teamProfiles}=teamUserIds.length?await admin.from('profiles').select('id,email,full_name').in('id',teamUserIds):{data:[] as Profile[]};
  const profileById=new Map(((teamProfiles??[]) as Profile[]).map(row=>[row.id,row]));
  const members:TeamMemberOption[]=teamBindings.map(row=>{const p=profileById.get(row.user_id);return{userId:row.user_id,label:p?.full_name||p?.email||`${row.user_id.slice(0,8)}…`}});

  const delegations=((delegationResult.data??[]) as DelegationRow[]);
  const delegationIds=delegations.map(row=>row.id);
  const{data:delegationPermissions}=delegationIds.length?await admin.from('store_delegation_permissions').select('delegation_id,permission_code').in('delegation_id',delegationIds):{data:[] as DelegationPermissionRow[]};
  const permissionsByDelegation=new Map<string,string[]>();
  for(const row of (delegationPermissions??[]) as DelegationPermissionRow[]){const list=permissionsByDelegation.get(row.delegation_id)??[];list.push(catalogByCode.get(row.permission_code)?.label??row.permission_code);permissionsByDelegation.set(row.delegation_id,list)}
  const delegationItems:DelegationItem[]=delegations.map(row=>({
    id:row.id,sourceUserId:row.source_user_id,sourceLabel:profileById.get(row.source_user_id)?.full_name||profileById.get(row.source_user_id)?.email||`${row.source_user_id.slice(0,8)}…`,
    delegateUserId:row.delegate_user_id,delegateLabel:profileById.get(row.delegate_user_id)?.full_name||profileById.get(row.delegate_user_id)?.email||`${row.delegate_user_id.slice(0,8)}…`,
    scopeType:row.scope_type,scopeValue:row.scope_value,
    validFrom:row.valid_from,validUntil:row.valid_until,reason:row.reason,permissionLabels:permissionsByDelegation.get(row.id)??[],
  }));

  const presetByArea=new Map<string,Array<PresetRow>>();
  for(const preset of presets){const area=catalogByCode.get(preset.permission_code)?.area_code??'other';const list=presetByArea.get(area)??[];list.push(preset);presetByArea.set(area,list)}

  return <section className="adminMain">
    <div className="adminToolbar"><div><span className="eyebrow">Rendszer · Csapat · Részletes hozzáférés</span><h1 className="sectionTitle">{profile.full_name||profile.email||'Csapattag'}</h1><p className="muted">{profile.email??'E-mail nem elérhető'} · {roleLabels[binding.role_code]??binding.role_code}</p></div><Link className="btn btnGhost" href="/admin/csapat">← Vissza a csapathoz</Link></div>

    <div className="cards adminMetricCards teamMetrics"><article className="card"><span className="badge">Alapszerepkör</span><div className="price">{roleLabels[binding.role_code]??binding.role_code}</div></article><article className="card"><span className="badge">Alap capability</span><div className="price">{foundationUnavailable?'—':presets.length}</div></article><article className="card"><span className="badge">Egyedi eltérés</span><div className="price">{foundationUnavailable?'—':overrides.length}</div></article><article className="card"><span className="badge">Aktív helyettesítés</span><div className="price">{foundationUnavailable?'—':delegations.length}</div></article></div>

    <section className="card"><span className="eyebrow">Privacy-first authority</span><h2>Szerepkör = kiindulási sablon, nem korlátlan betekintés</h2><p className="muted">A szerepkör preset stabil marad; személyes extra engedély vagy haladó eltérés külön rétegben kapcsolódik az adott csapattaghoz. A helyettesítés csak kijelölt capability-kre, az eredeti munkatárs saját vagy hozzá rendelt erőforrásaira, opcionálisan témakörre vagy postafiókra, és kötelező lejárattal érvényes. A Digitális Iroda privát belső chatjének tartalmát ettől független résztvevői szabály védi.</p></section>

    {!instanceSpecific&&<div className="adminAuditNotice"><strong>Szervezeti szintű jogosultság.</strong><p>Ezt a szerepkört ezen a webshop-oldalon nem írjuk felül személyes capability-kkel. A hozzáférés itt csak megtekinthető.</p></div>}
    {binding.role_code==='owner'&&<div className="adminAuditNotice"><strong>Tulajdonosi fiók.</strong><p>A tulajdonosi authority-hoz nem hozunk létre személyes override-ot. A privát kommunikáció tartalma ettől függetlenül résztvevő-alapú.</p></div>}
    {!ownerAuthority&&<div className="adminAuditNotice"><strong>Csak megtekintés.</strong><p>Az egyedi capability-ket és helyettesítéseket kizárólag a webshop tulajdonosa módosíthatja.</p></div>}
    {foundationUnavailable&&<div className="errorNotice" role="alert"><strong>A fejlett jogosultsági adatmodell még nem érhető el ebben a környezetben.</strong><p>Az alapszerepkör változatlanul működik. A részletes capability-kezelés fail-closed módon nem enged módosítást, amíg az adatbázis-migráció nincs telepítve.</p></div>}

    {!foundationUnavailable&&<>
      <section className="card"><span className="eyebrow">Alapszerepkör</span><h2>Örökölt capability-k</h2><p className="muted">Ezeket a szerepkör adja automatikusan. A szerepkör definícióját itt nem módosítjuk. Plusz feladat külön személyes engedéllyel adható; kivételes szűkítés a haladó eltérések között kezelhető.</p>{presets.length===0?<div className="adminAuditNotice"><strong>Nincs finomhangolt alap capability.</strong><p>A még nem migrált adminterületeken továbbra is a meglévő RBAC szabályok érvényesek.</p></div>:<div className="teamRoleGuideGrid">{[...presetByArea.entries()].map(([area,items])=><article key={area} className="adminAuditNotice"><strong>{STORE_CAPABILITY_AREA_LABELS[area]??area}</strong>{items.map(item=><p key={item.permission_code}>{catalogByCode.get(item.permission_code)?.label??item.permission_code} · {STORE_SCOPE_LABELS[item.default_scope as StorePermissionScope]??item.default_scope}</p>)}</article>)}</div>}</section>
      <PermissionOverrideControls userId={userId} canManage={canManage} capabilities={capabilities} presetCodes={presets.map(item=>item.permission_code)} overrides={overrideItems}/>
      <DelegationControls userId={userId} canManage={canManage} capabilities={capabilities} members={members} delegations={delegationItems}/>
    </>}
  </section>;
}
