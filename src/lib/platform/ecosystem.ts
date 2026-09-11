import 'server-only';
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {createAdminClient} from '@/lib/supabase/admin';
import {hasFeatureEntitlement} from '@/lib/entitlements/access';
import {boundedExtensionEvidence,EXTENSION_API_SCOPES,normalizeExtensionScopes,normalizeWebhookEndpoint,parseExtensionApiToken,PLATFORM_ECOSYSTEM_VERSION,webhookRetryDelayMinutes,type ExtensionApiScope} from './ecosystem-contract';

const MAX_WEBHOOK_ATTEMPTS=5,STALE_PROCESSING_MS=15*60_000;
type CredentialRow={id:string;instance_id:string;installation_id:string;key_prefix:string;secret_hash:string;scopes:string[]|null;expires_at:string|null;revoked_at:string|null};
type DeliveryRow={id:string;instance_id:string;subscription_id:string;event_type:string;event_key:string;payload:Record<string,unknown>|null;status:string;attempt_count:number;next_attempt_at:string|null;updated_at:string};

const nowIso=()=>new Date().toISOString();
const sha256=(value:string)=>createHash('sha256').update(value).digest('hex');
const cleanError=(error:unknown)=>(error instanceof Error?error.message:String(error)).slice(0,500);
function safeEqualHex(left:string,right:string){if(!/^[0-9a-f]{64}$/.test(left)||!/^[0-9a-f]{64}$/.test(right))return false;return timingSafeEqual(Buffer.from(left,'hex'),Buffer.from(right,'hex'));}
function cleanAppKey(value:string){const key=value.trim().toLowerCase();if(!/^[a-z0-9][a-z0-9._-]{2,79}$/.test(key))throw new Error('EXTENSION_APP_KEY_INVALID');return key;}

export async function registerExtensionApp(input:{appKey:string;displayName:string;version:string;releaseState:'draft'|'released'|'suspended';allowedScopes:unknown;actorId:string;metadata?:Record<string,unknown>}){
  const appKey=cleanAppKey(input.appKey),displayName=input.displayName.trim(),version=input.version.trim();
  if(!displayName||displayName.length>120||!version||version.length>40)throw new Error('EXTENSION_APP_METADATA_INVALID');
  const allowedScopes=normalizeExtensionScopes(input.allowedScopes);if(!allowedScopes.length)throw new Error('EXTENSION_SCOPE_REQUIRED');
  const admin=createAdminClient(),{data,error}=await admin.from('extension_app_catalog').upsert({app_key:appKey,display_name:displayName,version,release_state:input.releaseState,allowed_scopes:allowedScopes,metadata:boundedExtensionEvidence(input.metadata),created_by:input.actorId,updated_at:nowIso()},{onConflict:'app_key'}).select('app_key,display_name,version,release_state,allowed_scopes,metadata').single();
  if(error)throw error;return data;
}

export async function installExtension(input:{instanceId:string;appKey:string;actorId:string;configuration?:Record<string,unknown>}){
  const admin=createAdminClient(),appKey=cleanAppKey(input.appKey),{data:app,error:appError}=await admin.from('extension_app_catalog').select('app_key,release_state').eq('app_key',appKey).maybeSingle();
  if(appError)throw appError;if(!app||app.release_state!=='released')throw new Error('EXTENSION_APP_NOT_RELEASED');
  const{data,error}=await admin.from('extension_installations').upsert({instance_id:input.instanceId,app_key:appKey,status:'enabled',configuration:boundedExtensionEvidence(input.configuration),installed_by:input.actorId,updated_at:nowIso()},{onConflict:'instance_id,app_key'}).select('id,instance_id,app_key,status,installed_at,updated_at').single();
  if(error)throw error;return data;
}

export async function setExtensionInstallationStatus(input:{instanceId:string;installationId:string;status:'enabled'|'disabled'|'revoked'}){
  const admin=createAdminClient(),{data,error}=await admin.from('extension_installations').update({status:input.status,updated_at:nowIso()}).eq('id',input.installationId).eq('instance_id',input.instanceId).select('id,instance_id,app_key,status,updated_at').maybeSingle();
  if(error)throw error;if(!data)throw new Error('EXTENSION_INSTALLATION_NOT_FOUND');
  if(input.status==='revoked')await Promise.all([
    admin.from('extension_api_credentials').update({revoked_at:nowIso()}).eq('instance_id',input.instanceId).eq('installation_id',input.installationId).is('revoked_at',null),
    admin.from('extension_webhook_subscriptions').update({enabled:false,updated_at:nowIso()}).eq('instance_id',input.instanceId).eq('installation_id',input.installationId),
  ]);
  return data;
}

export async function issueExtensionApiCredential(input:{instanceId:string;installationId:string;actorId:string;scopes:unknown;expiresAt?:string|null}){
  const admin=createAdminClient(),{data:installation,error:installationError}=await admin.from('extension_installations').select('id,instance_id,app_key,status').eq('id',input.installationId).eq('instance_id',input.instanceId).maybeSingle();
  if(installationError)throw installationError;if(!installation||installation.status!=='enabled')throw new Error('EXTENSION_INSTALLATION_NOT_ENABLED');
  const{data:app,error:appError}=await admin.from('extension_app_catalog').select('app_key,release_state,allowed_scopes').eq('app_key',installation.app_key).maybeSingle();
  if(appError)throw appError;if(!app||app.release_state!=='released')throw new Error('EXTENSION_APP_NOT_RELEASED');
  const scopes=normalizeExtensionScopes(input.scopes,Array.isArray(app.allowed_scopes)?app.allowed_scopes:[]);if(!scopes.length)throw new Error('EXTENSION_SCOPE_REQUIRED');
  let expiresAt:string|null=null;if(input.expiresAt){const time=Date.parse(input.expiresAt);if(!Number.isFinite(time)||time<=Date.now()||time>Date.now()+366*24*60*60_000)throw new Error('EXTENSION_CREDENTIAL_EXPIRY_INVALID');expiresAt=new Date(time).toISOString();}
  const prefix=randomBytes(9).toString('base64url'),secret=randomBytes(32).toString('base64url'),token=`shop_ext_${prefix}_${secret}`;
  const{data,error}=await admin.from('extension_api_credentials').insert({instance_id:input.instanceId,installation_id:input.installationId,key_prefix:prefix,secret_hash:sha256(token),scopes,expires_at:expiresAt,created_by:input.actorId}).select('id,key_prefix,scopes,expires_at,created_at').single();
  if(error)throw error;return{credential:data,token};
}

export async function revokeExtensionApiCredential(instanceId:string,credentialId:string){
  const admin=createAdminClient(),{data,error}=await admin.from('extension_api_credentials').update({revoked_at:nowIso()}).eq('id',credentialId).eq('instance_id',instanceId).is('revoked_at',null).select('id,key_prefix,revoked_at').maybeSingle();
  if(error)throw error;if(!data)throw new Error('EXTENSION_CREDENTIAL_NOT_FOUND_OR_REVOKED');return data;
}

export async function authenticateExtensionRequest(request:Request,requiredScope:ExtensionApiScope){
  const parsed=parseExtensionApiToken(request.headers.get('authorization'));if(!parsed)return null;
  const admin=createAdminClient(),{data:credential,error}=await admin.from('extension_api_credentials').select('id,instance_id,installation_id,key_prefix,secret_hash,scopes,expires_at,revoked_at').eq('key_prefix',parsed.prefix).maybeSingle();
  if(error||!credential)return null;const row=credential as CredentialRow;
  if(row.revoked_at||(row.expires_at&&Date.parse(row.expires_at)<=Date.now())||!safeEqualHex(row.secret_hash,sha256(parsed.token)))return null;
  const scopes=normalizeExtensionScopes(row.scopes);if(!scopes.includes(requiredScope))return null;
  const[installationResult,apiEntitlement]=await Promise.all([
    admin.from('extension_installations').select('id,instance_id,app_key,status').eq('id',row.installation_id).eq('instance_id',row.instance_id).maybeSingle(),
    hasFeatureEntitlement(row.instance_id,'apiAccess'),
  ]);
  const installation=installationResult.data;if(!apiEntitlement||installationResult.error||!installation||installation.status!=='enabled')return null;
  const{data:app}=await admin.from('extension_app_catalog').select('app_key,release_state,allowed_scopes').eq('app_key',installation.app_key).maybeSingle();
  if(!app||app.release_state!=='released'||!normalizeExtensionScopes(app.allowed_scopes).includes(requiredScope))return null;
  if(process.env.SECURITY_RATE_LIMIT_ENABLED==='true'){
    const{data:allowed,error:rateError}=await admin.rpc('consume_security_rate_limit',{p_rate_key:`extension:${row.id}`,p_window_seconds:60,p_max_count:120});if(rateError||allowed!==true)return null;
  }
  void admin.from('extension_api_credentials').update({last_used_at:nowIso()}).eq('id',row.id).eq('instance_id',row.instance_id);
  return{instanceId:row.instance_id,installationId:row.installation_id,credentialId:row.id,appKey:String(installation.app_key),scopes};
}

function webhookMasterSecret(){const secret=process.env.PLATFORM_EXTENSION_WEBHOOK_SECRET?.trim();if(!secret||secret.length<32)throw new Error('EXTENSION_WEBHOOK_SECRET_NOT_CONFIGURED');return secret;}
export function deriveExtensionWebhookSigningSecret(subscriptionId:string){return createHmac('sha256',webhookMasterSecret()).update(`block20:${subscriptionId}`).digest('base64url');}

export async function createExtensionWebhookSubscription(input:{instanceId:string;installationId:string;eventType:string;endpointUrl:unknown;actorId:string}){
  const endpointUrl=normalizeWebhookEndpoint(input.endpointUrl);if(!endpointUrl)throw new Error('EXTENSION_WEBHOOK_ENDPOINT_INVALID');
  const admin=createAdminClient(),{data:installation,error:installationError}=await admin.from('extension_installations').select('id,status').eq('id',input.installationId).eq('instance_id',input.instanceId).maybeSingle();
  if(installationError)throw installationError;if(!installation||installation.status!=='enabled')throw new Error('EXTENSION_INSTALLATION_NOT_ENABLED');webhookMasterSecret();
  const{data,error}=await admin.from('extension_webhook_subscriptions').upsert({instance_id:input.instanceId,installation_id:input.installationId,event_type:input.eventType,endpoint_url:endpointUrl,enabled:true,created_by:input.actorId,updated_at:nowIso()},{onConflict:'installation_id,event_type,endpoint_url'}).select('id,instance_id,installation_id,event_type,endpoint_url,enabled,created_at').single();
  if(error)throw error;return{subscription:data,signingSecret:deriveExtensionWebhookSigningSecret(String(data.id))};
}

export async function disableExtensionWebhookSubscription(instanceId:string,subscriptionId:string){
  const admin=createAdminClient(),{data,error}=await admin.from('extension_webhook_subscriptions').update({enabled:false,updated_at:nowIso()}).eq('id',subscriptionId).eq('instance_id',instanceId).select('id,enabled').maybeSingle();if(error)throw error;if(!data)throw new Error('EXTENSION_WEBHOOK_SUBSCRIPTION_NOT_FOUND');return data;
}

function isDue(row:DeliveryRow,now:number){if(row.status==='pending')return true;if(row.status==='retry')return !row.next_attempt_at||Date.parse(row.next_attempt_at)<=now;if(row.status==='processing')return Date.parse(row.updated_at)<=now-STALE_PROCESSING_MS;return false;}
async function automationAllowsDelivery(instanceId:string){const admin=createAdminClient(),{data}=await admin.from('automation_control').select('global_paused,circuit_open_until').eq('instance_id',instanceId).maybeSingle();if(!data)return true;if(data.global_paused)return false;return !(data.circuit_open_until&&Date.parse(data.circuit_open_until)>Date.now());}

export async function processDueExtensionWebhookDeliveries(limit=20){
  const admin=createAdminClient(),now=Date.now(),{data,error}=await admin.from('extension_webhook_deliveries').select('id,instance_id,subscription_id,event_type,event_key,payload,status,attempt_count,next_attempt_at,updated_at').in('status',['pending','retry','processing']).order('created_at',{ascending:true}).limit(Math.max(1,Math.min(100,limit*4)));
  if(error)throw error;const due=((data??[]) as DeliveryRow[]).filter(row=>isDue(row,now)).slice(0,Math.max(1,Math.min(100,limit))),results:Array<{id:string;instanceId:string;status:string;error?:string}>=[],control=new Map<string,boolean>();
  for(const row of due){
    let allowed=control.get(row.instance_id);if(allowed===undefined){allowed=await automationAllowsDelivery(row.instance_id);control.set(row.instance_id,allowed);}if(!allowed){results.push({id:row.id,instanceId:row.instance_id,status:'paused'});continue;}
    const attempt=Math.min(20,Number(row.attempt_count??0)+1),{data:claimed,error:claimError}=await admin.from('extension_webhook_deliveries').update({status:'processing',attempt_count:attempt,updated_at:nowIso()}).eq('id',row.id).eq('instance_id',row.instance_id).eq('status',row.status).select('id').maybeSingle();
    if(claimError){results.push({id:row.id,instanceId:row.instance_id,status:'claim_failed',error:claimError.message});continue;}if(!claimed)continue;
    try{
      const{data:subscription,error:subscriptionError}=await admin.from('extension_webhook_subscriptions').select('id,installation_id,endpoint_url,enabled').eq('id',row.subscription_id).eq('instance_id',row.instance_id).maybeSingle();if(subscriptionError)throw subscriptionError;if(!subscription?.enabled)throw new Error('EXTENSION_WEBHOOK_SUBSCRIPTION_DISABLED');
      const{data:installation,error:installationError}=await admin.from('extension_installations').select('status').eq('id',subscription.installation_id).eq('instance_id',row.instance_id).maybeSingle();if(installationError)throw installationError;if(!installation||installation.status!=='enabled')throw new Error('EXTENSION_INSTALLATION_NOT_ENABLED');
      const timestamp=Math.floor(Date.now()/1000).toString(),body=JSON.stringify({version:PLATFORM_ECOSYSTEM_VERSION,deliveryId:row.id,eventType:row.event_type,eventKey:row.event_key,payload:row.payload??{}}),signature=createHmac('sha256',deriveExtensionWebhookSigningSecret(row.subscription_id)).update(`${timestamp}.${body}`).digest('hex');
      const response=await fetch(subscription.endpoint_url,{method:'POST',headers:{'content-type':'application/json','user-agent':'Shoperation-Platform-Ecosystem/1.0','x-shoperation-delivery':row.id,'x-shoperation-event':row.event_type,'x-shoperation-timestamp':timestamp,'x-shoperation-signature':`v1=${signature}`},body,redirect:'error',signal:AbortSignal.timeout(10_000)});if(!response.ok)throw new Error(`EXTENSION_WEBHOOK_HTTP_${response.status}`);
      await admin.from('extension_webhook_deliveries').update({status:'delivered',response_status:response.status,last_error:null,next_attempt_at:null,delivered_at:nowIso(),updated_at:nowIso()}).eq('id',row.id).eq('instance_id',row.instance_id);results.push({id:row.id,instanceId:row.instance_id,status:'delivered'});
    }catch(deliveryError){
      const terminal=attempt>=MAX_WEBHOOK_ATTEMPTS,errorText=cleanError(deliveryError),nextAttemptAt=terminal?null:new Date(Date.now()+webhookRetryDelayMinutes(attempt)*60_000).toISOString();
      await admin.from('extension_webhook_deliveries').update({status:terminal?'dead_letter':'retry',last_error:errorText,next_attempt_at:nextAttemptAt,updated_at:nowIso()}).eq('id',row.id).eq('instance_id',row.instance_id);results.push({id:row.id,instanceId:row.instance_id,status:terminal?'dead_letter':'retry',error:errorText});
    }
  }
  return results;
}

export async function loadExtensionDashboard(instanceId:string){
  const admin=createAdminClient(),[apps,installations,credentials,subscriptions,deliveries]=await Promise.all([
    admin.from('extension_app_catalog').select('app_key,display_name,version,release_state,allowed_scopes,metadata').order('display_name'),
    admin.from('extension_installations').select('id,app_key,status,installed_at,updated_at').eq('instance_id',instanceId).order('installed_at',{ascending:false}),
    admin.from('extension_api_credentials').select('id,installation_id,key_prefix,scopes,expires_at,revoked_at,last_used_at,created_at').eq('instance_id',instanceId).order('created_at',{ascending:false}),
    admin.from('extension_webhook_subscriptions').select('id,installation_id,event_type,endpoint_url,enabled,created_at,updated_at').eq('instance_id',instanceId).order('created_at',{ascending:false}),
    admin.from('extension_webhook_deliveries').select('id,subscription_id,event_type,event_key,status,attempt_count,next_attempt_at,response_status,last_error,created_at,delivered_at').eq('instance_id',instanceId).order('created_at',{ascending:false}).limit(50),
  ]);for(const result of[apps,installations,credentials,subscriptions,deliveries])if(result.error)throw result.error;
  return{version:PLATFORM_ECOSYSTEM_VERSION,supportedScopes:EXTENSION_API_SCOPES,apps:apps.data??[],installations:installations.data??[],credentials:credentials.data??[],subscriptions:subscriptions.data??[],deliveries:deliveries.data??[]};
}
