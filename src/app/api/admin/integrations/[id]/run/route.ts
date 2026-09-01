import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';
import { processIntegrationJob } from '@/lib/integrations/processor';
import { recordAdminAudit } from '@/lib/admin/audit';
import { hasCurrentPlanFeature } from '@/lib/plans/access';

export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser();
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  if(!(await hasCurrentPlanFeature('advancedIntegrations')))return NextResponse.json({error:'A fejlett integrációs műveletek a Pro csomag részei.'},{status:403});
  const {id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen feladatazonosító.'},{status:400});
  const admin=createAdminClient();
  const {data:claimed,error:claimError}=await admin.rpc('claim_integration_job',{p_id:id});
  const claim=claimed?.[0];
  if(claimError)return NextResponse.json({error:'Az integrációs feladat zárolása nem sikerült.'},{status:500});
  if(!claim?.processing_token)return NextResponse.json({error:'A feladat jelenleg már feldolgozás alatt van, vagy nem futtatható újra.'},{status:409});
  try{
    const result=await processIntegrationJob(id,claim.processing_token);
    await recordAdminAudit({actorUserId:actor.id,action:'integration.retry_succeeded',entityType:'integration_job',entityId:id,summary:'Integrációs feladat kézi újrafuttatása sikeres',afterState:result});
    return NextResponse.json({ok:true,result});
  }catch(error){
    const message=error instanceof Error?error.message:'Az integrációs feladat nem futtatható.';
    await recordAdminAudit({actorUserId:actor.id,action:'integration.retry_failed',entityType:'integration_job',entityId:id,summary:'Integrációs feladat kézi újrafuttatása sikertelen',metadata:{error:message}});
    return NextResponse.json({error:message},{status:409});
  }
}
