import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCurrentStoreContext } from '@/lib/instances/scope';

const bodySchema=z.object({status:z.enum(['pending','approved','suspended'])});

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser('sales.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('sales.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  const{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen B2B fiókazonosító.'},{status:400});
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=bodySchema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen partnerstátusz.'},{status:400});

  const admin=createAdminClient();
  const{data,error}=await admin.rpc('admin_set_b2b_account_status_v1',{
    p_instance_id:scope.instanceId,p_account_id:id,p_actor:actor.id,p_status:parsed.data.status,
  });
  if(error){
    if(error.message.includes('B2B_ACCOUNT_NOT_FOUND'))return NextResponse.json({error:'A B2B fiók nem található ebben a webshopban.'},{status:404});
    if(error.message.includes('SALES_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
    return NextResponse.json({error:'A B2B partnerstátusz módosítása nem sikerült.'},{status:500});
  }
  const result=(data??{})as{accountId?:unknown;status?:unknown;updatedAt?:unknown};
  if(result.accountId!==id||result.status!==parsed.data.status||typeof result.updatedAt!=='string')
    return NextResponse.json({error:'A B2B partnerstátusz eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,...result});
}
