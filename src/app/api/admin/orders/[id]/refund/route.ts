import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

const schema=z.object({
  refundReference:z.string().trim().max(200).optional().default(''),
  adminNote:z.string().trim().max(2000).optional().default(''),
});
const manualPaymentMethods=new Set(['cash_on_delivery','bank_transfer']);
const refundableStatuses=new Set(['paid','processing','shipped','completed','refunded']);

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser('orders.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});

  let scope;
  try{scope=await requireCurrentStoreContext('orders.manage')}
  catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}

  const{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen rendelésazonosító.'},{status:400});

  let raw:unknown={};
  try{raw=await request.json()}
  catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen visszatérítési adat.'},{status:400});

  const admin=createAdminClient();
  const{data:current,error:readError}=await admin.from('orders')
    .select('id,order_number,status,payment_method,total_gross_huf,updated_at')
    .eq('id',id).eq('instance_id',scope.instanceId).maybeSingle();
  if(readError||!current)return NextResponse.json({error:'A rendelés nem található ebben a webshopban.'},{status:404});

  if(!manualPaymentMethods.has(current.payment_method)){
    return NextResponse.json({
      error:'Online fizetésnél a visszatérítést a fizetési szolgáltató ellenőrzött refund-folyamatán keresztül kell végrehajtani. Ezen a műveleten keresztül nem indul K&H vagy más kártyás tranzakció.'
    },{status:409});
  }
  if(!refundableStatuses.has(current.status)){
    return NextResponse.json({error:'Ebben a rendelési állapotban teljes admin visszatérítés nem rögzíthető.'},{status:409});
  }

  const{data,error}=await admin.rpc('admin_refund_order_manual_v1',{
    p_instance_id:scope.instanceId,
    p_order_id:id,
    p_actor:actor.id,
    p_expected_updated_at:current.updated_at,
    p_refund_reference:parsed.data.refundReference,
    p_admin_note:parsed.data.adminNote,
  });
  if(error){
    const message=error.message||'A teljes visszatérítés rögzítése nem sikerült.';
    if(message.includes('ORDER_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
    if(message.includes('MANUAL_REFUND_ORDER_NOT_FOUND'))return NextResponse.json({error:'A rendelés nem található ebben a webshopban.'},{status:404});
    if(message.includes('STALE_MANUAL_REFUND_ORDER'))return NextResponse.json({error:'A rendelést időközben módosították. Frissítsd az oldalt, majd ellenőrizd újra a visszatérítést.'},{status:409});
    if(message.includes('MANUAL_REFUND_PAYMENT_METHOD_REQUIRED'))return NextResponse.json({error:'Ehhez a fizetési módhoz szolgáltatói refund-folyamat szükséges; manuális admin visszatérítés nem indítható.'},{status:409});
    if(message.includes('MANUAL_REFUND_RETURN_CASE_ALREADY_OPEN'))return NextResponse.json({error:'Ehhez a rendeléshez már van folyamatban lévő visszáru vagy visszatérítési ügy. A meglévő ügyet folytasd.'},{status:409});
    if(message.includes('MANUAL_REFUND_PARTIAL_REFUND_EXISTS'))return NextResponse.json({error:'Ehhez a rendeléshez már tartozik korábbi visszatérítés. A további összeget a visszáru folyamatban kezeld.'},{status:409});
    if(message.includes('MANUAL_REFUND_ORDER_ALREADY_REFUNDED'))return NextResponse.json({error:'A rendelés már visszatérített állapotban van.'},{status:409});
    if(message.includes('MANUAL_REFUND_ORDER_STATUS_INVALID'))return NextResponse.json({error:'Ebben a rendelési állapotban teljes admin visszatérítés nem rögzíthető.'},{status:409});
    return NextResponse.json({error:'A teljes visszatérítés nem rögzíthető. Egyetlen rendelési vagy pénzügyi állapotot sem tekintünk módosítottnak.'},{status:500});
  }

  const result=(data??{})as{
    orderId?:string;
    orderNumber?:string;
    orderStatus?:string;
    returnCaseId?:string;
    refundAmount?:number;
    paymentMethod?:string;
    notificationQueued?:boolean;
    replayed?:boolean;
  };
  if(result.orderId!==id||result.orderStatus!=='refunded'||!result.returnCaseId||Number(result.refundAmount)!==Number(current.total_gross_huf)){
    return NextResponse.json({error:'A teljes visszatérítés eredménye nem igazolható.'},{status:500});
  }

  return NextResponse.json({
    ok:true,
    orderNumber:result.orderNumber??current.order_number,
    status:'refunded',
    returnCaseId:result.returnCaseId,
    refundAmount:result.refundAmount,
    paymentMethod:result.paymentMethod??current.payment_method,
    providerRefundTriggered:false,
    notificationQueued:result.notificationQueued===true,
    replayed:result.replayed===true,
  });
}
