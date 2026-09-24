import{NextResponse}from'next/server';
import{merchantIncidentInputSchema,isSameOrigin}from'@/lib/incidents/contracts';
import{createMerchantIncident,IncidentServiceError}from'@/lib/incidents/service';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{getActiveStoreRoles}from'@/lib/auth/store-rbac';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{correlationId,logEvent}from'@/lib/observability/logger';

export async function POST(request:Request){
  const corr=correlationId(request.headers.get('x-correlation-id'));
  const headers={'Cache-Control':'no-store','X-Correlation-Id':corr};
  if(!isSameOrigin(request))return NextResponse.json({error:'Érvénytelen kérés.'},{status:403,headers});
  const actor=await getAdminRequestUser('store.read');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403,headers});
  let scope;try{scope=await requireCurrentStoreContext('store.read')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403,headers})}
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400,headers})}
  const parsed=merchantIncidentInputSchema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Ellenőrizd a hibabejelentés adatait.'},{status:400,headers});
  const roles=await getActiveStoreRoles(scope.instanceId);
  const reporterRole=roles.includes('owner')?'merchant_owner' as const:roles.includes('admin')?'merchant_admin' as const:'merchant_staff' as const;
  try{
    const result=await createMerchantIncident(parsed.data,{instanceId:scope.instanceId,actorId:actor.id,reporterRole,correlationId:corr});
    return NextResponse.json({ok:true,incidentNumber:result.incidentNumber,triagePending:result.triagePending,routing:{ownership:result.triage.ownership,reasonCode:result.triage.reasonCode,confidence:result.triage.confidence,status:result.triage.status}},{status:201,headers});
  }catch(error){
    if(error instanceof IncidentServiceError)return NextResponse.json({error:error.publicMessage},{status:error.status,headers});
    logEvent('error','incident.merchant.api_failed',{correlationId:corr,instanceId:scope.instanceId});
    return NextResponse.json({error:'A hibabejelentés rögzítése nem sikerült.'},{status:500,headers});
  }
}
