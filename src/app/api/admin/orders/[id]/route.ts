import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';
import { getConfiguredInvoiceProviderCodeForInstance } from '@/lib/integrations/invoicing';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { getExternalLogisticsConfig } from '@/lib/integrations/external-logistics';

const statuses=['draft','pending','pending_payment','pending_transfer','paid','processing','shipped','completed','cancelled'] as const;
type Status=typeof statuses[number];
type PlannedJob={
  kind:'email_send'|'invoice_create'|'shipment_create'|'logistics_email';
  provider:string;
  payload:Record<string,unknown>;
};
type PlannedEvent={eventType:'invoice_manual_required';metadata:Record<string,unknown>};

const bodySchema=z.object({status:z.enum(statuses),trackingNumber:z.string().trim().max(120).optional()});
const allowed:Record<Status,Status[]>={
  draft:['pending','pending_payment','pending_transfer','cancelled'],
  pending:['paid','processing','cancelled'],
  pending_payment:['paid','cancelled'],
  pending_transfer:['paid','cancelled'],
  paid:['processing'],
  processing:['shipped'],
  shipped:['completed'],
  completed:[],
  cancelled:[]
};

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser('orders.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});

  let scope;
  try{scope=await requireCurrentStoreContext('orders.manage')}
  catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}

  const{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen rendelésazonosító.'},{status:400});

  let raw:unknown;
  try{raw=await request.json()}
  catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=bodySchema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen rendelési állapot. Visszatérítést csak a fizetési/visszáru folyamaton keresztül lehet rögzíteni.'},{status:400});

  const admin=createAdminClient();
  const{data:current,error:currentError}=await admin.from('orders')
    .select('status,tracking_number,shipping_method,order_number,payment_method,instance_id')
    .eq('id',id).eq('instance_id',scope.instanceId).maybeSingle();
  if(currentError||!current)return NextResponse.json({error:'A rendelés nem található ebben a webshopban.'},{status:404});
  if(current.status==='refunded')return NextResponse.json({error:'A visszatérített rendelés állapota ezen a végponton nem módosítható.'},{status:409});

  const currentStatus=current.status as Status,nextStatus=parsed.data.status;
  if(currentStatus!==nextStatus&&!allowed[currentStatus]?.includes(nextStatus)){
    return NextResponse.json({error:`Nem engedélyezett státuszváltás: ${currentStatus} → ${nextStatus}.`},{status:409});
  }

  const jobs:PlannedJob[]=[];
  const manualEvents:PlannedEvent[]=[];
  const emailProvider=process.env.EMAIL_PROVIDER||'resend';

  try{
    if(nextStatus==='paid'){
      jobs.push({kind:'email_send',provider:emailProvider,payload:{template:'payment_confirmed'}});
      const invoiceProvider=await getConfiguredInvoiceProviderCodeForInstance(scope.instanceId,{strict:true});
      if(invoiceProvider){
        jobs.push({kind:'invoice_create',provider:invoiceProvider,payload:{orderNumber:current.order_number,source:'admin_paid'}});
      }else{
        manualEvents.push({eventType:'invoice_manual_required',metadata:{source:'admin_paid',reason:'Automatikus számlázó adapter nincs aktiválva vagy ellenőrizve.'}});
      }
      if(current.shipping_method){
        const external=await getExternalLogisticsConfig(scope.instanceId,current.shipping_method,{strict:true});
        if(current.shipping_method==='external_logistics'&&!external){
          return NextResponse.json({error:'A külső logisztikai partner beállítása nem aktív vagy hiányos. A rendelés állapota nem változott.'},{status:409});
        }
        if(external)jobs.push({kind:'logistics_email',provider:'external_logistics_email',payload:{recipient:external.recipient,shippingCode:external.shippingCode,label:external.label}});
      }
    }

    if(nextStatus==='processing'){
      const external=current.shipping_method
        ?await getExternalLogisticsConfig(scope.instanceId,current.shipping_method,{strict:true})
        :null;
      if(current.shipping_method==='external_logistics'&&!external){
        return NextResponse.json({error:'A külső logisztikai partner beállítása nem aktív vagy hiányos. A rendelés állapota nem változott.'},{status:409});
      }
      if(current.shipping_method&&current.shipping_method!=='pickup'){
        if(external){
          if(current.payment_method==='cash_on_delivery'){
            jobs.push({kind:'logistics_email',provider:'external_logistics_email',payload:{recipient:external.recipient,shippingCode:external.shippingCode,label:external.label}});
          }
        }else{
          jobs.push({kind:'shipment_create',provider:current.shipping_method,payload:{orderNumber:current.order_number,shippingKind:'auto'}});
        }
      }
      if(current.payment_method==='cash_on_delivery'){
        const invoiceProvider=await getConfiguredInvoiceProviderCodeForInstance(scope.instanceId,{strict:true});
        if(invoiceProvider){
          jobs.push({kind:'invoice_create',provider:invoiceProvider,payload:{orderNumber:current.order_number,source:'cod_processing',paid:false}});
        }else{
          manualEvents.push({eventType:'invoice_manual_required',metadata:{source:'cod_processing',reason:'Automatikus számlázó adapter nincs aktiválva vagy ellenőrizve.'}});
        }
      }
    }

    if(nextStatus==='shipped'){
      jobs.push({kind:'email_send',provider:emailProvider,payload:{template:'order_shipped'}});
    }
    if(nextStatus==='completed'){
      jobs.push({kind:'email_send',provider:emailProvider,payload:{template:'order_completed'}});
    }
  }catch(error){
    console.error('order integration plan failed',{orderId:id,instanceId:scope.instanceId,targetStatus:nextStatus,error});
    return NextResponse.json({error:'A kapcsolódó szolgáltatói beállítások most nem ellenőrizhetők. A rendelés állapota nem változott.'},{status:503});
  }

  const{data:transitionData,error:transitionError}=await admin.rpc('admin_transition_order_with_outbox_v3',{
    p_instance_id:scope.instanceId,
    p_order_id:id,
    p_actor:actor.id,
    p_target_status:nextStatus,
    p_tracking_number:parsed.data.trackingNumber??null,
    p_jobs:jobs,
    p_manual_events:manualEvents
  });
  if(transitionError){
    const forbidden=transitionError.message.includes('ORDER_PERMISSION_REQUIRED');
    return NextResponse.json({
      error:forbidden?'Nincs jogosultság ehhez a webshophoz.':transitionError.message||'A rendelés frissítése nem sikerült. Egyetlen állapot- vagy integrációs változás sem került alkalmazásra.'
    },{status:forbidden?403:409});
  }

  const transition=(transitionData??{})as{
    orderId?:string;
    status?:Status;
    inventoryRestored?:boolean;
    replayed?:boolean;
    integrationJobs?:Array<{id?:string;kind?:string;provider?:string;status?:string}>;
    manualEvents?:Array<{id?:string;eventType?:string}>;
  };
  if(transition.orderId!==id||transition.status!==nextStatus){
    return NextResponse.json({error:'A rendelés állapotváltásának eredménye nem igazolható.'},{status:500});
  }

  const evidenceJobs=transition.integrationJobs??[];
  const jobEvidenceOk=evidenceJobs.length===jobs.length&&jobs.every((job,index)=>{
    const evidence=evidenceJobs[index];
    return Boolean(evidence?.id)&&evidence.kind===job.kind&&evidence.provider===job.provider&&['pending','processing','succeeded'].includes(String(evidence.status??''));
  });
  const evidenceEvents=transition.manualEvents??[];
  const eventEvidenceOk=evidenceEvents.length===manualEvents.length&&manualEvents.every((event,index)=>{
    const evidence=evidenceEvents[index];
    return Boolean(evidence?.id)&&evidence.eventType===event.eventType;
  });
  if(!jobEvidenceOk||!eventEvidenceOk){
    return NextResponse.json({error:'A rendeléshez tartozó integrációs terv eredménye nem igazolható.'},{status:500});
  }

  return NextResponse.json({
    ok:true,
    status:nextStatus,
    allowedNext:allowed[nextStatus],
    inventoryRestored:transition.inventoryRestored===true,
    integrationJobs:evidenceJobs.length,
    manualEvents:evidenceEvents.length
  });
}
