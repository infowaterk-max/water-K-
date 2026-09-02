import{NextResponse}from'next/server';
import{z}from'zod';
import{createAdminClient}from'@/lib/supabase/admin';
import{getCurrentWebshopInstance}from'@/lib/instances/access';

const schema=z.object({email:z.string().trim().email().max(320),consent:z.literal(true),source:z.string().trim().max(80).default('storefront_newsletter')});
export async function POST(request:Request){
 let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
 const parsed=schema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'Adj meg érvényes e-mail címet és fogadd el a hozzájárulást.'},{status:400});
 const instance=await getCurrentWebshopInstance();if(!instance)return NextResponse.json({error:'A feliratkozás ehhez a webshophoz most nem érhető el.'},{status:409});
 const admin=createAdminClient(),email=parsed.data.email.toLowerCase();
 const{error}=await admin.from('marketing_consents').insert({instance_id:instance.id,user_id:null,email,channel:'email',status:'granted',source:parsed.data.source,policy_version:'2026-08-v1',metadata:{actor:'visitor'}});
 if(error)return NextResponse.json({error:'A feliratkozás most nem sikerült.'},{status:500});
 return NextResponse.json({ok:true,message:'Sikeres feliratkozás.'},{status:201});
}
