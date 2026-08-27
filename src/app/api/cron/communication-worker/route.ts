import { NextResponse } from 'next/server';
import { runCommunicationWorker } from '@/lib/communication/worker';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic='force-dynamic';

export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'Unauthorized'},{status:401});
 const admin=createAdminClient();
 const {data:run,error:runError}=await admin.from('communication_worker_runs').insert({source:'cron',status:'running'}).select('id').single();
 if(runError||!run)return NextResponse.json({error:'Run log unavailable'},{status:500});
 try{
  const summary=await runCommunicationWorker(20);
  await admin.from('communication_worker_runs').update({status:'success',...summary,finished_at:new Date().toISOString()}).eq('id',run.id);
  return NextResponse.json({ok:true,...summary});
 }catch(error){
  const message=error instanceof Error?error.message:'UNKNOWN_WORKER_ERROR';
  await admin.from('communication_worker_runs').update({status:'failed',error_message:message.slice(0,2000),finished_at:new Date().toISOString()}).eq('id',run.id);
  return NextResponse.json({error:'Worker failed'},{status:500});
 }
}
