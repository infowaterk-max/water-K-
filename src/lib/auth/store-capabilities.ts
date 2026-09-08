import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export const STORE_CAPABILITY_CODES=[
  'team.members.view','team.members.manage','team.permissions.manage',
  'customers.view','customers.contact.view',
  'orders.view','orders.edit','orders.status.edit','orders.internal_note',
  'returns.view','returns.manage',
  'refunds.view','refunds.initiate','refunds.approve',
  'quotes.view','quotes.create','quotes.edit','quotes.send','quotes.approve',
  'office.thread.read','office.thread.reply','office.email.compose','office.internal_chat','office.shared_inbox','office.takeover','office.mailbox.manage',
  'catalog.view','catalog.manage','marketing.view','marketing.manage','analytics.view','settings.manage',
] as const;

export type StoreCapability=typeof STORE_CAPABILITY_CODES[number];
export type StoreCapabilitySource='platform'|'explicit_deny'|'override'|'delegation'|'role'|'none'|'no_active_role'|'instance_not_found'|'invalid_request'|'error';
export type StorePermissionEffect='allow'|'deny';
export type StorePermissionScope='all'|'own'|'assigned'|'own_or_assigned'|'topic'|'mailbox';

export type StoreCapabilityContext={
  resourceOwnerUserId?:string|null;
  resourceAssignedUserId?:string|null;
  topicCode?:string|null;
  mailboxKey?:string|null;
};

export type StoreCapabilityDecision={
  allowed:boolean;
  source:StoreCapabilitySource;
  roleCodes:string[];
};

export const STORE_CAPABILITY_AREA_LABELS:Record<string,string>={
  team:'Csapat és jogosultságok',
  customers:'Ügyfelek',
  orders:'Rendelések',
  returns:'Visszaküldések',
  refunds:'Visszatérítések',
  quotes:'Árajánlatok',
  office:'Digitális Iroda',
  catalog:'Katalógus',
  marketing:'Marketing',
  analytics:'Elemzések',
  settings:'Beállítások',
};

export const STORE_SCOPE_LABELS:Record<StorePermissionScope,string>={
  all:'Minden engedélyezett adat',
  own:'Csak saját',
  assigned:'Csak hozzárendelt',
  own_or_assigned:'Saját vagy hozzárendelt',
  topic:'Kijelölt témakör',
  mailbox:'Kijelölt postafiók',
};

function normalizeDecision(value:unknown):StoreCapabilityDecision{
  const row=(value??{}) as {allowed?:unknown;source?:unknown;roleCodes?:unknown};
  const source=typeof row.source==='string'?row.source:'error';
  return{
    allowed:row.allowed===true,
    source:(['platform','explicit_deny','override','delegation','role','none','no_active_role','instance_not_found','invalid_request'].includes(source)?source:'error') as StoreCapabilitySource,
    roleCodes:Array.isArray(row.roleCodes)?row.roleCodes.filter((role):role is string=>typeof role==='string'):[],
  };
}

export async function evaluateStoreCapability(
  instanceId:string,
  userId:string,
  capability:StoreCapability,
  context:StoreCapabilityContext={}
):Promise<StoreCapabilityDecision>{
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('evaluate_store_capability_v1',{
    p_instance_id:instanceId,
    p_user_id:userId,
    p_permission_code:capability,
    p_resource_owner_user_id:context.resourceOwnerUserId??null,
    p_resource_assigned_user_id:context.resourceAssignedUserId??null,
    p_topic_code:context.topicCode??null,
    p_mailbox_key:context.mailboxKey??null,
  });
  if(error)return{allowed:false,source:'error',roleCodes:[]};
  return normalizeDecision(data);
}

export async function hasStoreCapability(
  instanceId:string,
  userId:string,
  capability:StoreCapability,
  context:StoreCapabilityContext={}
){
  return (await evaluateStoreCapability(instanceId,userId,capability,context)).allowed;
}
