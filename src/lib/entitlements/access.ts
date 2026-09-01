import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlatformRole } from '@/lib/auth/platform-operator';

export async function hasFeatureEntitlement(instanceId:string,featureCode:string){
  if(await getPlatformRole()) return true;
  const admin=createAdminClient();
  const {data:instance}=await admin.from('webshop_instances').select('organization_id').eq('id',instanceId).maybeSingle();
  if(!instance?.organization_id) return false;
  const now=new Date().toISOString();
  const {data}=await admin.from('feature_entitlements').select('enabled,valid_from,valid_until,instance_id').eq('organization_id',instance.organization_id).eq('feature_code',featureCode).eq('enabled',true).lte('valid_from',now);
  return (data??[]).some(row=>(!row.instance_id||row.instance_id===instanceId)&&(!row.valid_until||row.valid_until>now));
}
