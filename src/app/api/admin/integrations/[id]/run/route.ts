import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { processIntegrationJob } from '@/lib/integrations/processor';
import { recordAdminAudit } from '@/lib/admin/audit';

export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser();
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  const {id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen feladatazonosító.'},{status:400});
  try{
    const result=await processIntegrationJob(id);
    await recordAdminAudit({actorUserId:actor.id,action:'integration.retry_succeeded',entityType:'integration_job',entityId:id,summary:'Integrációs feladat kézi újrafuttatása sikeres',afterState:result});
    return NextResponse.json({ok:true,result});
  }catch(error){
    const message=error instanceof Error?error.message:'Az integrációs feladat nem futtatható.';
    await recordAdminAudit({actorUserId:actor.id,action:'integration.retry_failed',entityType:'integration_job',entityId:id,summary:'Integrációs feladat kézi újrafuttatása sikertelen',metadata:{error:message}});
    return NextResponse.json({error:message},{status:409});
  }
}
