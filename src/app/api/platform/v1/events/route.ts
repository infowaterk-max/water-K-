import {NextRequest,NextResponse} from 'next/server';
import {authenticateExtensionRequest} from '@/lib/platform/ecosystem';
import {dispatchEventDrivenWorkflow,isEventDrivenWorkflowType} from '@/lib/automation/event-driven-workflows';
import {hasFeatureEntitlement} from '@/lib/entitlements/access';
import {boundedExtensionEvidence} from '@/lib/platform/ecosystem-contract';

export const dynamic='force-dynamic';

export async function POST(request:NextRequest){
  const auth=await authenticateExtensionRequest(request,'automation.events.write');if(!auth)return NextResponse.json({error:'Érvénytelen vagy nem jogosult extension credential.'},{status:401});
  if(!(await hasFeatureEntitlement(auth.instanceId,'automation')))return NextResponse.json({error:'Az automation capability nincs engedélyezve ezen a tenanton.'},{status:403});
  let body:{type?:unknown;sourceId?:unknown;occurredAt?:unknown;title?:unknown;description?:unknown;evidence?:unknown};try{body=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  if(typeof body.type!=='string'||!isEventDrivenWorkflowType(body.type)||typeof body.sourceId!=='string'||!body.sourceId.trim()||body.sourceId.length>180)return NextResponse.json({error:'Érvénytelen canonical esemény vagy sourceId.'},{status:400});
  try{
    const result=await dispatchEventDrivenWorkflow({instanceId:auth.instanceId,type:body.type,sourceId:body.sourceId,occurredAt:typeof body.occurredAt==='string'?body.occurredAt:undefined,title:typeof body.title==='string'?body.title:undefined,description:typeof body.description==='string'?body.description:undefined,evidence:boundedExtensionEvidence(body.evidence)});
    const status=result.status==='dead_letter'?409:result.status==='retry'||result.status==='awaiting_approval'?202:200;
    return NextResponse.json({ok:result.ok,version:'block20.v1',data:result},{status});
  }catch(error){console.error('block20 external event ingress failed',error);return NextResponse.json({error:error instanceof Error?error.message:'Az esemény nem dolgozható fel.'},{status:409});}
}
