import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processIntegrationJob } from '@/lib/integrations/processor';
import { runCommunicationWorker } from '@/lib/communication/worker';

export const dynamic='force-dynamic';
export const maxDuration=60;

type InstanceRow={id:string};
type JobRow={id:string;status:string;next_attempt_at:string|null;updated_at:string};
type JourneyResult={instanceId:string;ok:boolean;planned?:unknown;dispatched?:unknown;error?:string};
type LoyaltyRun={
  instance_id?:unknown;
  run_key?:unknown;
  accrued_points_entries?:unknown;
  reversed_points_entries?:unknown;
  refreshed_profiles?:unknown;
  completed_at?:unknown;
  metadata?:unknown;
};
type LoyaltyResult={
  instanceId:string;
  runKey:string;
  ok:boolean;
  accrued?:number;
  reversed?:number;
  refreshedProfiles?:number;
  completedAt?:string;
  error?:string;
};

function authorized(request:Request){
  const secret=process.env.CRON_SECRET;
  return Boolean(secret)&&request.headers.get('authorization')===`Bearer ${secret}`;
}
function due(job:JobRow,now:number){
  if(job.status==='pending')return true;
  if(job.status==='failed')return Boolean(job.next_attempt_at)&&new Date(job.next_attempt_at as string).getTime()<=now;
  if(job.status==='processing')return new Date(job.updated_at).getTime()<=now-15*60*1000;
  return false;
}
function nonNegativeInteger(value:unknown):value is number{
  return typeof value==='number'&&Number.isInteger(value)&&value>=0;
}
function loyaltyEvidence(data:unknown,instanceId:string,runKey:string){
  const raw=Array.isArray(data)?data[0]:data;
  if(!raw||typeof raw!=='object')return null;
  const row=raw as LoyaltyRun;
  const metadata=row.metadata;
  if(
    row.instance_id!==instanceId||
    row.run_key!==runKey||
    typeof row.completed_at!=='string'||
    row.completed_at.length===0||
    !nonNegativeInteger(row.accrued_points_entries)||
    !nonNegativeInteger(row.reversed_points_entries)||
    !nonNegativeInteger(row.refreshed_profiles)||
    !metadata||
    typeof metadata!=='object'||
    Array.isArray(metadata)||
    (metadata as Record<string,unknown>).authority!=='instance_id'
  )return null;
  return{
    accrued:row.accrued_points_entries,
    reversed:row.reversed_points_entries,
    refreshedProfiles:row.refreshed_profiles,
    completedAt:row.completed_at,
  };
}

async function runWorker(request:Request){
  if(!authorized(request))return NextResponse.json({error:'Nincs jogosultság.'},{status:401});
  const admin=createAdminClient(),checkedAt=new Date().toISOString();
  const{data:instanceData,error:instanceError}=await admin.from('webshop_instances').select('id').in('status',['pilot','active']).order('created_at',{ascending:true});
  if(instanceError)return NextResponse.json({error:'Az aktív webshopok nem tölthetők be.'},{status:500});
  const instances=(instanceData??[]) as InstanceRow[];

  let inventorySnapshot:{ok:boolean;captured?:number;error?:string};
  try{
    const{data,error}=await admin.rpc('capture_inventory_snapshot');
    if(error)throw error;
    inventorySnapshot={ok:true,captured:Number(data??0)};
  }catch(error){
    inventorySnapshot={ok:false,error:error instanceof Error?error.message:'A napi készletpillanatkép nem készült el.'};
  }

  const loyaltyRunKey=`daily:${checkedAt.slice(0,10)}`;
  const loyalty:LoyaltyResult[]=[];
  for(const instance of instances){
    try{
      const{data,error}=await admin.rpc('process_loyalty_lifecycle_v2',{
        p_instance_id:instance.id,
        p_run_key:loyaltyRunKey,
      });
      if(error)throw error;
      const evidence=loyaltyEvidence(data,instance.id,loyaltyRunKey);
      if(!evidence)throw new Error('LOYALTY_LIFECYCLE_EVIDENCE_MISSING');
      loyalty.push({instanceId:instance.id,runKey:loyaltyRunKey,ok:true,...evidence});
    }catch(error){
      loyalty.push({
        instanceId:instance.id,
        runKey:loyaltyRunKey,
        ok:false,
        error:error instanceof Error?error.message:'A tenant hűségprogram-feldolgozás nem sikerült.',
      });
    }
  }

  const journeys:JourneyResult[]=[];
  for(const instance of instances){
    try{
      const{data:planned,error:planError}=await admin.rpc('plan_customer_retention_journeys_v2',{p_instance_id:instance.id});
      if(planError)throw planError;
      const{data:dispatched,error:dispatchError}=await admin.rpc('dispatch_due_customer_journey_steps_v2',{p_instance_id:instance.id,p_limit:50});
      if(dispatchError)throw dispatchError;
      journeys.push({instanceId:instance.id,ok:true,planned,dispatched});
    }catch(error){
      journeys.push({instanceId:instance.id,ok:false,error:error instanceof Error?error.message:'A tenant ügyfélút-feldolgozás nem sikerült.'});
    }
  }

  const integrationResults:Array<{id:string;instanceId:string;ok:boolean;error?:string}>=[];
  let remaining=10;
  const now=Date.now();
  for(const instance of instances){
    if(remaining<=0)break;
    const{data:jobData,error:jobError}=await admin.from('integration_jobs')
      .select('id,status,next_attempt_at,updated_at')
      .eq('instance_id',instance.id)
      .in('status',['pending','failed','processing'])
      .order('created_at',{ascending:true})
      .limit(Math.min(50,remaining*5));
    if(jobError){
      integrationResults.push({id:'tenant-scan',instanceId:instance.id,ok:false,error:jobError.message});
      continue;
    }
    const jobs=((jobData??[]) as JobRow[]).filter(job=>due(job,now)).slice(0,remaining);
    for(const job of jobs){
      const{data:claimed,error:claimError}=await admin.rpc('claim_integration_job_v2',{p_instance_id:instance.id,p_id:job.id});
      if(claimError){
        integrationResults.push({id:job.id,instanceId:instance.id,ok:false,error:claimError.message});
        remaining--;
        continue;
      }
      const claim=claimed?.[0];
      if(!claim?.processing_token)continue;
      try{
        await processIntegrationJob(instance.id,job.id,claim.processing_token);
        integrationResults.push({id:job.id,instanceId:instance.id,ok:true});
      }catch(error){
        integrationResults.push({id:job.id,instanceId:instance.id,ok:false,error:error instanceof Error?error.message:'Ismeretlen hiba'});
      }
      remaining--;
      if(remaining<=0)break;
    }
  }

  let communication:{ok:boolean;recovered?:number;queuedStock?:number;queuedRecovery?:number;claimed?:number;sent?:number;failed?:number;blocked?:number;tenantFailures?:number;error?:string};
  try{
    const summary=await runCommunicationWorker(20);
    communication={ok:summary.tenantFailures===0,...summary};
  }catch(error){
    communication={ok:false,error:error instanceof Error?error.message:'UNKNOWN_WORKER_ERROR'};
  }

  const loyaltyOk=loyalty.every(result=>result.ok);
  const journeyOk=journeys.every(result=>result.ok);
  const ok=inventorySnapshot.ok&&loyaltyOk&&journeyOk&&integrationResults.every(result=>result.ok)&&communication.ok;
  return NextResponse.json({
    ok,
    inventorySnapshot,
    loyalty:{tenants:loyalty.length,runKey:loyaltyRunKey,results:loyalty},
    journeys:{tenants:journeys.length,results:journeys},
    integrations:{processed:integrationResults.length,results:integrationResults},
    communication,
    checkedAt,
  },{status:ok?200:503});
}

export async function GET(request:Request){return runWorker(request)}
export async function POST(request:Request){return runWorker(request)}
