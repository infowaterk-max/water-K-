import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic='force-dynamic';

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>null) as {email?:unknown}|null;
    const email=typeof body?.email==='string'?body.email.trim().toLowerCase():'';
    if(!email || email.length>254 || !email.includes('@')){
      return NextResponse.json({eligible:false},{status:400,headers:{'cache-control':'no-store'}});
    }
    const admin=createAdminClient();
    const {data,error}=await admin.rpc('platform_owner_claim_available',{p_email:email});
    if(error) throw error;
    return NextResponse.json({eligible:data===true},{headers:{'cache-control':'no-store'}});
  }catch{
    return NextResponse.json({eligible:false},{status:503,headers:{'cache-control':'no-store'}});
  }
}
