import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';

const schema=z.object({variantId:z.string().uuid(),discountPercent:z.number().min(0).max(100),minimumMarginPercent:z.number().min(0).max(100).default(20)});

export async function POST(request:Request){
  const actor=await getAdminRequestUser();
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let raw:unknown;
  try{raw=await request.json();}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400});}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen promóciós adatok.'},{status:400});
  const admin=createAdminClient();
  const {data,error}=await admin.rpc('preview_promotion_margin',{p_variant_id:parsed.data.variantId,p_discount_percent:parsed.data.discountPercent,p_min_margin_percent:parsed.data.minimumMarginPercent});
  if(error)return NextResponse.json({error:'A promóciós árrés nem számítható ki.'},{status:500});
  return NextResponse.json({ok:true,preview:data});
}
