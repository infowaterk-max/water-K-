import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';
import{hasCurrentPlanFeature}from'@/lib/plans/access';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

const schema=z.discriminatedUnion('action',[
  z.object({action:z.literal('refresh')}),
  z.object({action:z.literal('opportunity'),id:z.string().uuid(),status:z.enum(['open','in_progress','won','lost','dismissed'])}),
  z.object({action:z.literal('task'),id:z.string().uuid(),status:z.enum(['open','in_progress','completed','cancelled']),outcome:z.string().max(1000).optional()}),
  z.object({action:z.literal('create_offer'),opportunityId:z.string().uuid(),variantId:z.string().uuid(),quantity:z.number().int().positive(),discountPercent:z.number().min(0).max(100),minimumMarginPercent:z.number().min(0).max(100)}),
  z.object({action:z.literal('approve_offer'),id:z.string().uuid()}),
  z.object({action:z.literal('offer_status'),id:z.string().uuid(),status:z.enum(['sent','accepted','expired','cancelled'])})
]);

type Evidence={ok?:boolean;id?:string;status?:string;auditId?:string;offer?:unknown;opportunities?:unknown;tasks?:number;cancelledOffers?:number;cancelledTasks?:number};

function fail(error:{message?:string}|null,fallback:string){
  const message=String(error?.message??'');
  if(message.includes('SALES_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
  if(message.includes('B2B_RESELLER_AUTHORITY_REQUIRED'))return NextResponse.json({error:'A viszonteladói jogosultság már nem aktív ehhez a webshophoz.'},{status:409});
  if(message.includes('COMMERCIAL_OPPORTUNITY_NOT_ACTIVE'))return NextResponse.json({error:'A kapcsolt értékesítési lehetőség már lezárt; az ajánlat nem vihető tovább.'},{status:409});
  if(message.includes('COMMERCIAL_VARIANT_TENANT_MISMATCH')||message.includes('COMMERCIAL_OPPORTUNITY_TENANT_MISMATCH'))return NextResponse.json({error:'Az ajánlat és a kapcsolt adatok nem ugyanahhoz a webshophoz tartoznak.'},{status:409});
  if(message.includes('NOT_FOUND')||message.includes('not_found'))return NextResponse.json({error:'A kért értékesítési elem nem található ebben a webshopban.'},{status:404});
  return NextResponse.json({error:fallback},{status:409});
}
function hasAudit(data:unknown):data is Evidence{
  const e=(data??{})as Evidence;
  return e.ok===true&&typeof e.auditId==='string'&&e.auditId.length>0;
}

export async function POST(req:Request){
  const user=await getAdminRequestUser('sales.manage');
  if(!user)return NextResponse.json({error:'Nincs értékesítési jogosultság.'},{status:403});
  let store;
  try{store=await requireCurrentStoreContext('sales.manage')}
  catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  if(!(await hasCurrentPlanFeature('crm')))return NextResponse.json({error:'Az értékesítési CRM a Pro csomag része.'},{status:403});

  let body:unknown;
  try{body=await req.json()}
  catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(body);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen művelet.'},{status:400});

  const a=createAdminClient(),p=parsed.data;

  if(p.action==='refresh'){
    const{data,error}=await a.rpc('admin_refresh_commercial_workspace_v3',{
      p_instance_id:store.instanceId,p_actor:user.id
    });
    if(error)return fail(error,'Az értékesítési lehetőségek és feladatok frissítése nem sikerült. A frissítést nem tekintjük lezártnak.');
    if(!hasAudit(data)||typeof (data as Evidence).tasks!=='number'||!(data as Evidence).opportunities){
      return NextResponse.json({error:'Az értékesítési frissítés eredménye nem igazolható.'},{status:500});
    }
    return NextResponse.json(data);
  }

  if(p.action==='opportunity'){
    const{data,error}=await a.rpc('admin_transition_commercial_opportunity_v4',{
      p_instance_id:store.instanceId,p_opportunity_id:p.id,p_actor:user.id,p_status:p.status
    });
    if(error)return fail(error,'A lehetőség állapota nem módosítható.');
    const e=(data??{})as Evidence;
    const countsValid=Number.isInteger(e.cancelledOffers)&&Number(e.cancelledOffers)>=0&&Number.isInteger(e.cancelledTasks)&&Number(e.cancelledTasks)>=0;
    if(!hasAudit(data)||e.id!==p.id||e.status!==p.status||!countsValid)return NextResponse.json({error:'A lehetőség módosításának eredménye nem igazolható.'},{status:500});
    return NextResponse.json(e);
  }

  if(p.action==='task'){
    const{data,error}=await a.rpc('admin_transition_sales_task_v3',{
      p_instance_id:store.instanceId,p_task_id:p.id,p_actor:user.id,p_status:p.status,p_outcome:p.outcome??null
    });
    if(error)return fail(error,'Az értékesítési feladat nem módosítható.');
    const e=(data??{})as Evidence;
    if(!hasAudit(data)||e.id!==p.id||e.status!==p.status)return NextResponse.json({error:'A feladat módosításának eredménye nem igazolható.'},{status:500});
    return NextResponse.json(e);
  }

  if(p.action==='create_offer'){
    const{data,error}=await a.rpc('admin_create_commercial_offer_v3',{
      p_instance_id:store.instanceId,p_opportunity_id:p.opportunityId,p_variant_id:p.variantId,
      p_quantity:p.quantity,p_discount_percent:p.discountPercent,p_minimum_margin_percent:p.minimumMarginPercent,p_actor:user.id
    });
    if(error)return fail(error,'Az ajánlattervezet nem hozható létre.');
    const e=(data??{})as Evidence;
    if(!hasAudit(data)||!e.id||e.status!=='draft'||!e.offer)return NextResponse.json({error:'Az ajánlattervezet létrehozásának eredménye nem igazolható.'},{status:500});
    return NextResponse.json(e);
  }

  if(p.action==='approve_offer'){
    const{data,error}=await a.rpc('admin_approve_commercial_offer_v3',{
      p_instance_id:store.instanceId,p_offer_id:p.id,p_actor:user.id
    });
    if(error)return fail(error,'Az ajánlat nem hagyható jóvá.');
    const e=(data??{})as Evidence;
    if(!hasAudit(data)||e.id!==p.id||e.status!=='approved'||!e.offer)return NextResponse.json({error:'Az ajánlat jóváhagyásának eredménye nem igazolható.'},{status:500});
    return NextResponse.json(e);
  }

  const{data,error}=await a.rpc('admin_transition_commercial_offer_v3',{
    p_instance_id:store.instanceId,p_offer_id:p.id,p_actor:user.id,p_status:p.status
  });
  if(error)return fail(error,'Az ajánlat állapota nem módosítható.');
  const e=(data??{})as Evidence;
  if(!hasAudit(data)||e.id!==p.id||e.status!==p.status||!e.offer)return NextResponse.json({error:'Az ajánlat módosításának eredménye nem igazolható.'},{status:500});
  return NextResponse.json(e);
}
