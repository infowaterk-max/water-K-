import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processIntegrationJob } from '@/lib/integrations/processor';
import { runCommunicationWorker } from '@/lib/communication/worker';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(request:Request){
  const secret=process.env.CRON_SECRET;
  if(!secret) return false;
  return request.headers.get('authorization')===`Bearer ${secret}`;
}

async function runWorker(request:Request){
  if(!authorized(request)) return NextResponse.json({error:'Nincs jogosultság.'},{status:401});
  const admin=createAdminClient();
  const checkedAt=new Date().toISOString();

  let inventorySnapshot:{ok:boolean;captured?:number;error?:string};
  try{
    const {data,error}=await admin.rpc('capture_inventory_snapshot');
    if(error) throw error;
    inventorySnapshot={ok:true,captured:Number(data??0)};
  }catch(error){
    inventorySnapshot={ok:false,error:error instanceof Error?error.message:'A napi készletpillanatkép nem készült el.'};
  }

  const {data:claimed,error}=await admin.rpc('claim_integration_jobs',{p_limit:10});
  if(error) return NextResponse.json({error:'Az integrációs feladatok zárolása nem sikerült.',inventorySnapshot},{status:500});

  const integrationResults:Array<{id:string;ok:boolean;error?:string}>=[];
  for(const row of claimed??[]){
    try{await processIntegrationJob(row.id,row.processing_token);integrationResults.push({id:row.id,ok:true});}
    catch(error){integrationResults.push({id:row.id,ok:false,error:error instanceof Error?error.message:'Ismeretlen hiba'});}
  }

  const {data:communicationRun,error:runError}=await admin.from('communication_worker_runs').insert({source:'cron',status:'running'}).select('id').single();
  let communication:{ok:boolean;recovered?:number;claimed?:number;sent?:number;failed?:number;blocked?:number;error?:string};
  if(runError||!communicationRun){
    communication={ok:false,error:'A kommunikációs worker naplója nem indítható.'};
  }else{
    try{
      const summary=await runCommunicationWorker(20);
      await admin.from('communication_worker_runs').update({status:'success',...summary,finished_at:new Date().toISOString()}).eq('id',communicationRun.id);
      communication={ok:true,...summary};
    }catch(error){
      const message=error instanceof Error?error.message:'UNKNOWN_WORKER_ERROR';
      await admin.from('communication_worker_runs').update({status:'failed',error_message:message.slice(0,2000),finished_at:new Date().toISOString()}).eq('id',communicationRun.id);
      communication={ok:false,error:message};
    }
  }

  return NextResponse.json({
    ok:inventorySnapshot.ok&&integrationResults.every(result=>result.ok)&&communication.ok,
    inventorySnapshot,
    integrations:{processed:integrationResults.length,results:integrationResults},
    communication,
    checkedAt,
  });
}

export async function GET(request:Request){return runWorker(request)}
export async function POST(request:Request){return runWorker(request)}
