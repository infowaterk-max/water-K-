import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processIntegrationJob } from '@/lib/integrations/processor';

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
  const {data:claimed,error}=await admin.rpc('claim_integration_jobs',{p_limit:10});
  if(error) return NextResponse.json({error:'Az integrációs feladatok zárolása nem sikerült.'},{status:500});

  const results:Array<{id:string;ok:boolean;error?:string}>=[];
  for(const row of claimed??[]){
    try{await processIntegrationJob(row.id,row.processing_token);results.push({id:row.id,ok:true});}
    catch(error){results.push({id:row.id,ok:false,error:error instanceof Error?error.message:'Ismeretlen hiba'});}
  }
  return NextResponse.json({ok:true,processed:results.length,results,checkedAt});
}

export async function GET(request:Request){return runWorker(request)}
export async function POST(request:Request){return runWorker(request)}
