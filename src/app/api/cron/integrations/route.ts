import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processIntegrationJob } from '@/lib/integrations/processor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(request:Request){
  const secret=process.env.CRON_SECRET;
  if(!secret) return false;
  const auth=request.headers.get('authorization');
  return auth===`Bearer ${secret}`;
}

async function runWorker(request:Request){
  if(!authorized(request)) return NextResponse.json({error:'Nincs jogosultság.'},{status:401});
  const admin=createAdminClient();
  const now=new Date().toISOString();
  const {data:jobs,error}=await admin.from('integration_jobs')
    .select('id,kind,provider,status,attempt_count,next_attempt_at,created_at')
    .or(`status.eq.pending,and(status.eq.failed,next_attempt_at.lte.${now})`)
    .order('created_at',{ascending:true})
    .limit(10);
  if(error) return NextResponse.json({error:'Az integrációs sor nem olvasható.'},{status:500});

  const results:Array<{id:string;ok:boolean;error?:string}>=[];
  for(const job of jobs??[]){
    try{await processIntegrationJob(job.id);results.push({id:job.id,ok:true});}
    catch(error){results.push({id:job.id,ok:false,error:error instanceof Error?error.message:'Ismeretlen hiba'});}
  }
  return NextResponse.json({ok:true,processed:results.length,results,checkedAt:now});
}

export async function GET(request:Request){return runWorker(request)}
export async function POST(request:Request){return runWorker(request)}
