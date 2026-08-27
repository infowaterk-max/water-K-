import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { processIntegrationJob } from '@/lib/integrations/processor';

export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser();
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const {id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen feladatazonosító.'},{status:400});
  try{
    const result=await processIntegrationJob(id);
    return NextResponse.json({ok:true,result});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:'Az integrációs feladat nem futtatható.'},{status:409});
  }
}
