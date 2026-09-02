import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

export async function POST(request:Request){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user?.email)return NextResponse.json({error:'Bejelentkezés szükséges.'},{status:401});
 const instance=await getCurrentWebshopInstance();if(!instance)return NextResponse.json({error:'Nincs aktív webshop.'},{status:409});
 let body:{consent?:unknown};try{body=await request.json();}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400});}if(typeof body.consent!=='boolean')return NextResponse.json({error:'Érvénytelen hozzájárulási érték.'},{status:400});
 const admin=createAdminClient();const {error}=await admin.from('marketing_consents').insert({instance_id:instance.id,user_id:user.id,email:user.email.toLowerCase(),channel:'email',status:body.consent?'granted':'withdrawn',source:'account_settings',policy_version:'2026-08-v1',metadata:{actor:'customer'}});
 if(error)return NextResponse.json({error:'A beállítás most nem menthető.'},{status:500});
 return NextResponse.json({ok:true,consent:body.consent});
}
