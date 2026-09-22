import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';
import{hasCurrentPlanFeature}from'@/lib/plans/access';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

const item=z.object({variantId:z.string().uuid(),quantity:z.number().int().min(1).max(100000),unitCostNetHuf:z.number().min(0).max(10000000)});
const schema=z.object({supplierName:z.string().trim().min(2).max(120),expectedAt:z.string().optional(),paymentTermsDays:z.number().int().min(0).max(365).default(8),notes:z.string().trim().max(1000).optional(),items:z.array(item).min(1).max(100)}).superRefine((d,c)=>{const ids=new Set<string>();for(const x of d.items){if(ids.has(x.variantId))c.addIssue({code:z.ZodIssueCode.custom,message:'Ugyanaz a termék csak egyszer szerepelhet a beszerzésben.',path:['items']});ids.add(x.variantId)}});

export async function POST(request:Request){
  const actor=await getAdminRequestUser('procurement.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('procurement.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  if(!(await hasCurrentPlanFeature('procurement')))return NextResponse.json({error:'A beszerzés a Pro csomag része.'},{status:403});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||'Érvénytelen beszerzési adat.'},{status:400});
  const d=parsed.data,expected=d.expectedAt?new Date(`${d.expectedAt}T12:00:00Z`):null;
  if(expected&&Number.isNaN(+expected))return NextResponse.json({error:'Érvénytelen várható érkezési dátum.'},{status:400});
  const paymentDue=expected?new Date(+expected+d.paymentTermsDays*86400000):new Date(Date.now()+d.paymentTermsDays*86400000);
  const orderNumber=`PO-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;

  const a=createAdminClient();
  const{data:created,error}=await a.rpc('admin_manage_purchase_order_v3',{
    p_instance_id:scope.instanceId,p_purchase_order_id:null,p_actor:actor.id,p_action:'create',
    p_payload:{orderNumber,supplierName:d.supplierName,paymentTermsDays:d.paymentTermsDays,expectedAt:expected?.toISOString().slice(0,10)??null,paymentDueAt:paymentDue.toISOString().slice(0,10),notes:d.notes??null,items:d.items}
  });
  if(error){
    if(error.message.includes('PROCUREMENT_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
    if(/termékváltozat|webshophoz tartozik/i.test(error.message))return NextResponse.json({error:'A beszerzés egyik terméke nem ehhez a webshophoz tartozik.'},{status:409});
    return NextResponse.json({error:error.message||'A beszerzési rendelés nem hozható létre.'},{status:500});
  }
  const result=(created??{})as{id?:string};
  if(!result.id)return NextResponse.json({error:'A beszerzési rendelés létrehozása nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,id:result.id,orderNumber});
}
