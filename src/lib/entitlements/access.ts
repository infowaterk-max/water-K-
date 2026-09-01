import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlatformRole } from '@/lib/auth/platform-operator';

export type FeatureEntitlementDecision={enabled:boolean;source:string;instanceId:string|null;validUntil:string|null}|null;

export async function getFeatureEntitlementDecision(instanceId:string,featureCode:string):Promise<FeatureEntitlementDecision>{
  if(await getPlatformRole())return{enabled:true,source:'platform',instanceId,validUntil:null};
  const admin=createAdminClient();
  const {data:instance}=await admin.from('webshop_instances').select('organization_id').eq('id',instanceId).maybeSingle();
  if(!instance?.organization_id)return null;
  const now=new Date().toISOString();
  const {data}=await admin.from('feature_entitlements')
    .select('enabled,source,instance_id,valid_from,valid_until,updated_at')
    .eq('organization_id',instance.organization_id)
    .eq('feature_code',featureCode)
    .lte('valid_from',now);
  const candidates=(data??[])
    .filter(item=>(item.instance_id===null||item.instance_id===instanceId)&&(!item.valid_until||item.valid_until>now))
    .sort((a,b)=>{
      const specificity=(b.instance_id===instanceId?1:0)-(a.instance_id===instanceId?1:0);
      if(specificity!==0)return specificity;
      return new Date(b.updated_at).getTime()-new Date(a.updated_at).getTime();
    });
  const row=candidates[0];
  return row?{enabled:Boolean(row.enabled),source:String(row.source),instanceId:row.instance_id??null,validUntil:row.valid_until??null}:null;
}

export async function hasFeatureEntitlement(instanceId:string,featureCode:string){
  return(await getFeatureEntitlementDecision(instanceId,featureCode))?.enabled===true;
}
