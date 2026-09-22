import{NextResponse}from'next/server';import{z}from'zod';import{createClient}from'@/lib/supabase/server';import{createAdminClient}from'@/lib/supabase/admin';import{getCurrentWebshopInstance}from'@/lib/instances/access';
const item=z.object({variantId:z.string().uuid(),quantity:z.number().int().min(1).max(100000),note:z.string().max(1000).optional().default('')});
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('save'),requestId:z.string().uuid().nullable().optional(),note:z.string().max(4000).optional().default(''),items:z.array(item).min(1).max(50)}),
 z.object({action:z.literal('submit'),requestId:z.string().uuid()}),
 z.object({action:z.literal('accept'),requestId:z.string().uuid(),offerId:z.string().uuid()}),
]);
function fail(message:string,status=409){return NextResponse.json({error:message},{status})}
export async function POST(req:Request){
 const[supabase,instance]=await Promise.all([createClient(),getCurrentWebshopInstance()]);const{data:{user}}=await supabase.auth.getUser();
 if(!user)return fail('Jelentkezz be a B2B ajánlatkérés használatához.',401);if(!instance)return fail('A webshop nem azonosítható.',404);
 let body:unknown;try{body=await req.json()}catch{return fail('Érvénytelen kérés.',400)}
 const parsed=schema.safeParse(body);if(!parsed.success)return fail('Érvénytelen ajánlatkérési adatok.',400);
 const admin=createAdminClient(),p=parsed.data;let result:{data:any;error:any};
 if(p.action==='save')result=await admin.rpc('customer_save_b2b_quote_request_v1',{p_instance_id:instance.id,p_actor:user.id,p_request_id:p.requestId??null,p_note:p.note,p_items:p.items});
 else if(p.action==='submit')result=await admin.rpc('customer_submit_b2b_quote_request_v1',{p_instance_id:instance.id,p_actor:user.id,p_request_id:p.requestId});
 else result=await admin.rpc('customer_accept_b2b_quote_offer_v1',{p_instance_id:instance.id,p_actor:user.id,p_request_id:p.requestId,p_offer_id:p.offerId});
 if(result.error){const m=String(result.error.message??'');if(m.includes('B2B_QUOTE_AUTHORITY_REQUIRED')||m.includes('B2B_QUOTE_ACCOUNT_REQUIRED'))return fail('Az ajánlatkérés csak jóváhagyott B2B partnerfiókkal használható.',403);if(m.includes('NOT_FOUND'))return fail('Az ajánlatkérés vagy ajánlat nem található.',404);if(m.includes('NOT_EDITABLE')||m.includes('NOT_SUBMITTABLE')||m.includes('NOT_ACCEPTABLE'))return fail('Ez az ajánlatkérés ebben az állapotban már nem módosítható.',409);return fail('Az ajánlatkérési művelet nem sikerült.',409)}
 return NextResponse.json(result.data);
}
