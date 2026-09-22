import {NextRequest,NextResponse} from 'next/server';
import {getAdminRequestUser} from '@/lib/auth/admin-api';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {hasCurrentPlanFeature} from '@/lib/plans/access';
import {recordAdminAudit} from '@/lib/admin/audit';
import {isEventDrivenWorkflowType} from '@/lib/automation/event-driven-workflows';
import {createExtensionWebhookSubscription,disableExtensionWebhookSubscription,installExtension,issueExtensionApiCredential,loadExtensionDashboard,revokeExtensionApiCredential,setExtensionInstallationStatus} from '@/lib/platform/ecosystem';
import {normalizeExtensionScopes} from '@/lib/platform/ecosystem-contract';

export const dynamic='force-dynamic';

async function access(requireApi=false){
  const user=await getAdminRequestUser('integrations.manage');if(!user)return null;
  const store=await requireCurrentStoreContext('integrations.manage');
  if(!(await hasCurrentPlanFeature('advancedIntegrations')))return null;
  if(requireApi&&!(await hasCurrentPlanFeature('apiAccess')))return null;
  return{user,store};
}

export async function GET(){
  const context=await access();if(!context)return NextResponse.json({error:'Nincs jogosultság vagy csomag-hozzáférés.'},{status:403});
  try{return NextResponse.json({ok:true,...await loadExtensionDashboard(context.store.instanceId)});}catch(error){console.error('block20 dashboard load failed',error);return NextResponse.json({error:'A Platform Ecosystem állapot nem tölthető be.'},{status:503});}
}

export async function POST(request:NextRequest){
  let body:{operation?:unknown;appKey?:unknown;installationId?:unknown;credentialId?:unknown;subscriptionId?:unknown;status?:unknown;scopes?:unknown;expiresAt?:unknown;eventType?:unknown;endpointUrl?:unknown;configuration?:unknown};
  try{body=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const operation=typeof body.operation==='string'?body.operation:'';
  const apiOperation=['create-api-key','revoke-api-key','subscribe-webhook','unsubscribe-webhook'].includes(operation);
  const context=await access(apiOperation);if(!context)return NextResponse.json({error:'Nincs jogosultság vagy csomag-hozzáférés.'},{status:403});
  const instanceId=context.store.instanceId;
  try{
    if(operation==='install'){
      if(typeof body.appKey!=='string')return NextResponse.json({error:'Hiányzó app azonosító.'},{status:400});
      const result=await installExtension({instanceId,appKey:body.appKey,actorId:context.user.id,configuration:body.configuration&&typeof body.configuration==='object'&&!Array.isArray(body.configuration)?body.configuration as Record<string,unknown>:undefined});
      await recordAdminAudit({actorUserId:context.user.id,action:'platform.extension_installed',entityType:'extension_installation',entityId:String(result.id),instanceId,summary:`Extension aktiválva: ${String(result.app_key)}`,afterState:result,metadata:{version:'block20.v1'}});
      return NextResponse.json({ok:true,data:result});
    }
    if(operation==='set-installation-status'){
      if(typeof body.installationId!=='string'||!['enabled','disabled','revoked'].includes(String(body.status)))return NextResponse.json({error:'Érvénytelen lifecycle kérés.'},{status:400});
      const result=await setExtensionInstallationStatus({instanceId,installationId:body.installationId,status:body.status as 'enabled'|'disabled'|'revoked'});
      await recordAdminAudit({actorUserId:context.user.id,action:'platform.extension_status_changed',entityType:'extension_installation',entityId:body.installationId,instanceId,summary:`Extension lifecycle: ${String(body.status)}`,afterState:result,metadata:{version:'block20.v1'}});
      return NextResponse.json({ok:true,data:result});
    }
    if(operation==='create-api-key'){
      if(typeof body.installationId!=='string')return NextResponse.json({error:'Hiányzó installáció.'},{status:400});
      const scopes=normalizeExtensionScopes(body.scopes);if(scopes.length===0)return NextResponse.json({error:'Legalább egy API scope szükséges.'},{status:400});
      const result=await issueExtensionApiCredential({instanceId,installationId:body.installationId,actorId:context.user.id,scopes,expiresAt:typeof body.expiresAt==='string'?body.expiresAt:null});
      await recordAdminAudit({actorUserId:context.user.id,action:'platform.extension_api_key_created',entityType:'extension_api_credential',entityId:String(result.credential.id),instanceId,summary:'Extension API credential létrehozva.',afterState:{id:result.credential.id,keyPrefix:result.credential.key_prefix,scopes:result.credential.scopes,expiresAt:result.credential.expires_at},metadata:{version:'block20.v1'}});
      return NextResponse.json({ok:true,credential:result.credential,token:result.token},{status:201});
    }
    if(operation==='revoke-api-key'){
      if(typeof body.credentialId!=='string')return NextResponse.json({error:'Hiányzó credential.'},{status:400});
      const result=await revokeExtensionApiCredential(instanceId,body.credentialId);
      await recordAdminAudit({actorUserId:context.user.id,action:'platform.extension_api_key_revoked',entityType:'extension_api_credential',entityId:body.credentialId,instanceId,summary:'Extension API credential visszavonva.',afterState:result,metadata:{version:'block20.v1'}});
      return NextResponse.json({ok:true,data:result});
    }
    if(operation==='subscribe-webhook'){
      if(typeof body.installationId!=='string'||typeof body.eventType!=='string'||!isEventDrivenWorkflowType(body.eventType))return NextResponse.json({error:'Csak canonical Block 17 eseményre lehet feliratkozni.'},{status:400});
      const result=await createExtensionWebhookSubscription({instanceId,installationId:body.installationId,eventType:body.eventType,endpointUrl:body.endpointUrl,actorId:context.user.id});
      await recordAdminAudit({actorUserId:context.user.id,action:'platform.extension_webhook_subscribed',entityType:'extension_webhook_subscription',entityId:String(result.subscription.id),instanceId,summary:`Webhook feliratkozás: ${body.eventType}`,afterState:{id:result.subscription.id,eventType:body.eventType,endpointUrl:result.subscription.endpoint_url},metadata:{version:'block20.v1'}});
      return NextResponse.json({ok:true,subscription:result.subscription,signingSecret:result.signingSecret},{status:201});
    }
    if(operation==='unsubscribe-webhook'){
      if(typeof body.subscriptionId!=='string')return NextResponse.json({error:'Hiányzó feliratkozás.'},{status:400});
      const result=await disableExtensionWebhookSubscription(instanceId,body.subscriptionId);
      await recordAdminAudit({actorUserId:context.user.id,action:'platform.extension_webhook_disabled',entityType:'extension_webhook_subscription',entityId:body.subscriptionId,instanceId,summary:'Extension webhook feliratkozás kikapcsolva.',afterState:result,metadata:{version:'block20.v1'}});
      return NextResponse.json({ok:true,data:result});
    }
    return NextResponse.json({error:'Ismeretlen Platform Ecosystem művelet.'},{status:400});
  }catch(error){console.error('block20 tenant lifecycle failed',error);return NextResponse.json({error:error instanceof Error?error.message:'A Platform Ecosystem művelet nem hajtható végre.'},{status:409});}
}
