import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { createAdminClient } from '@/lib/supabase/admin';

const bodySchema=z.object({
  role:z.enum(['customer','reseller']).optional(),
  resellerApproved:z.boolean().optional(),
}).refine(value=>Object.keys(value).length>0,'Nincs módosítás.');

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser('sales.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const scope=await requireCurrentStoreContext('sales.manage');
  const{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen ügyfélazonosító.'},{status:400});
  let raw:unknown;
  try{raw=await request.json();}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400});}
  const parsed=bodySchema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen ügyféladat.'},{status:400});

  const admin=createAdminClient();
  const{data:membership,error}=await admin
    .from('customer_commercial_metrics')
    .select('customer_id')
    .eq('instance_id',scope.instanceId)
    .eq('customer_id',id)
    .maybeSingle();
  if(error||!membership)return NextResponse.json({error:'Az ügyfél nem tartozik ehhez a webshophoz.'},{status:404});

  return NextResponse.json({
    error:'A globális profil-szerepkör módosítása merchant felületről biztonsági okból le van tiltva. A store-szintű B2B partnerjóváhagyás külön tenantizált modulban lesz elérhető.',
  },{status:503});
}
