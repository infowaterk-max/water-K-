import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { capabilityReleaseState, isCapabilityReleased } from './catalog';
import { resolveEntitlementCandidate, type EntitlementCandidate } from './policy';

export type FeatureEntitlementDecision={
  enabled:boolean;
  source:string;
  instanceId:string|null;
  validUntil:string|null;
  reason:'granted'|'revoked'|'not-released'|'unknown-capability';
}|null;

type EntitlementRow=EntitlementCandidate&{id:string};

function unavailableDecision(instanceId:string,capabilityCode:string):FeatureEntitlementDecision{
  const releaseState=capabilityReleaseState(capabilityCode);
  return {
    enabled:false,
    source:releaseState==='reserved'?'reserved':'unknown',
    instanceId,
    validUntil:null,
    reason:releaseState==='reserved'?'not-released':'unknown-capability',
  };
}

export async function getFeatureEntitlementDecisions(
  instanceId:string,
  capabilityCodes:readonly string[],
):Promise<Map<string,FeatureEntitlementDecision>>{
  const uniqueCodes=[...new Set(capabilityCodes)];
  const decisions=new Map<string,FeatureEntitlementDecision>();
  for(const capabilityCode of uniqueCodes){
    if(!isCapabilityReleased(capabilityCode))decisions.set(capabilityCode,unavailableDecision(instanceId,capabilityCode));
  }

  const releasedCodes=uniqueCodes.filter(isCapabilityReleased);
  if(releasedCodes.length===0)return decisions;

  const admin=createAdminClient();
  const {data:instance}=await admin.from('webshop_instances').select('organization_id').eq('id',instanceId).maybeSingle();
  if(!instance?.organization_id){
    for(const capabilityCode of releasedCodes)decisions.set(capabilityCode,null);
    return decisions;
  }

  const {data,error}=await admin.from('feature_entitlements')
    .select('id,enabled,source,instance_id,valid_from,valid_until,updated_at')
    .eq('organization_id',instance.organization_id)
    .in('feature_code',releasedCodes);
  if(error){
    for(const capabilityCode of releasedCodes)decisions.set(capabilityCode,null);
    return decisions;
  }

  const rows=(data??[]) as EntitlementRow[];
  const now=new Date();
  for(const capabilityCode of releasedCodes){
    const candidates=rows.filter((row:any)=>row.feature_code===capabilityCode) as EntitlementRow[];
    // Supabase omits feature_code from the inferred row shape above in untyped clients;
    // the runtime payload still contains it only when selected, so resolve via a scoped query below.
    if(candidates.length===0){
      const {data:scopedRows,error:scopedError}=await admin.from('feature_entitlements')
        .select('id,feature_code,enabled,source,instance_id,valid_from,valid_until,updated_at')
        .eq('organization_id',instance.organization_id)
        .eq('feature_code',capabilityCode);
      if(scopedError){decisions.set(capabilityCode,null);continue;}
      const winner=resolveEntitlementCandidate((scopedRows??[]) as EntitlementRow[],instanceId,now);
      decisions.set(capabilityCode,winner?{
        enabled:Boolean(winner.enabled),source:String(winner.source),instanceId:winner.instance_id,
        validUntil:winner.valid_until,reason:winner.enabled?'granted':'revoked',
      }:null);
      continue;
    }
    const winner=resolveEntitlementCandidate(candidates,instanceId,now);
    decisions.set(capabilityCode,winner?{
      enabled:Boolean(winner.enabled),source:String(winner.source),instanceId:winner.instance_id,
      validUntil:winner.valid_until,reason:winner.enabled?'granted':'revoked',
    }:null);
  }
  return decisions;
}

export async function getFeatureEntitlementDecision(instanceId:string,featureCode:string):Promise<FeatureEntitlementDecision>{
  return (await getFeatureEntitlementDecisions(instanceId,[featureCode])).get(featureCode)??null;
}

export async function hasFeatureEntitlement(instanceId:string,featureCode:string){
  return(await getFeatureEntitlementDecision(instanceId,featureCode))?.enabled===true;
}
