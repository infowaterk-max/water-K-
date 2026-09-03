import{NextResponse}from'next/server';
import{z}from'zod';
import{createClient}from'@/lib/supabase/server';
import{createAdminClient}from'@/lib/supabase/admin';
import{getCurrentWebshopInstance}from'@/lib/instances/access';

const schema=z.object({items:z.array(z.object({productId:z.string().uuid(),quantity:z.number().int().positive().max(99)})).min(1).max(30),checkout:z.record(z.string(),z.unknown()).optional().default({})});
export async function POST(request:Request){
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user?.email)return NextResponse.json({ok:true,stored:false,reason:'guest'});
 const instance=await getCurrentWebshopInstance();if(!instance)return NextResponse.json({error:'Nincs aktív webshop.'},{status:409});
 let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
 const parsed=schema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'Érvénytelen kosáradat.'},{status:400});
 const a=createAdminClient();const{data,error}=await a.rpc('upsert_checkout_recovery_intent_v2',{p_instance_id:instance.id,p_user_id:user.id,p_email:user.email,p_cart:parsed.data.items,p_checkout:parsed.data.checkout});
 if(error)return NextResponse.json({error:'A kosármentés most nem sikerült.'},{status:500});
 const recovery=(data??{})as{id?:string;token?:string;expiresAt?:string};
 if(!recovery.id)return NextResponse.json({error:'A kosármentés eredménye nem igazolható.'},{status:500});
 return NextResponse.json({ok:true,stored:true,recovery});
}
