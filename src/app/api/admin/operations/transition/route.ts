import{NextRequest,NextResponse}from'next/server';
import{getPlatformRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';

export async function POST(req:NextRequest){
 const user=await getPlatformRequestUser();if(!user)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 let body:{orderId?:string;targetStatus?:string};try{body=await req.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
 const orderId=String(body.orderId??''),targetStatus=String(body.targetStatus??'');
 if(!orderId||!['ready_to_pack','packed','handed_over','delivered'].includes(targetStatus))return NextResponse.json({error:'Érvénytelen művelet.'},{status:400});
 const eventKey=`admin:${orderId}:${targetStatus}:${crypto.randomUUID()}`,a=createAdminClient();
 const{data,error}=await a.rpc('transition_order_operation',{p_order_id:orderId,p_target_status:targetStatus,p_event_key:eventKey,p_actor_id:user.id});
 if(error)return NextResponse.json({error:error.message||'Az állapotváltás nem sikerült.'},{status:409});
 const operation=(data??{})as{order_id?:string;operational_status?:string};
 if(operation.order_id!==orderId||operation.operational_status!==targetStatus)return NextResponse.json({error:'A műveleti állapotváltás eredménye nem igazolható.'},{status:500});
 return NextResponse.json({ok:true,operation});
}
