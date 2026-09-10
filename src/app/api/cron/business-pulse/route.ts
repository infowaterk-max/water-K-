import {NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';

export const dynamic='force-dynamic';
export const maxDuration=30;

type DueRun={
  runKey?:unknown;
  generated?:unknown;
  failed?:unknown;
  failures?:unknown;
  checkedAt?:unknown;
};

function authorized(request:Request){
  const secret=process.env.CRON_SECRET;
  return Boolean(secret)&&request.headers.get('authorization')===`Bearer ${secret}`;
}

function nonNegativeInteger(value:unknown):value is number{
  return typeof value==='number'&&Number.isInteger(value)&&value>=0;
}

async function run(request:Request){
  if(!authorized(request))return NextResponse.json({error:'Nincs jogosultság.'},{status:401});
  const checkedAt=new Date().toISOString();
  const runKey=`daily:${checkedAt.slice(0,10)}`;
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('service_generate_due_business_pulse_reports_v1',{p_run_key:runKey});
  if(error)return NextResponse.json({ok:false,error:'BUSINESS_PULSE_DUE_RUN_FAILED',checkedAt},{status:503});

  const row=(data??{}) as DueRun;
  if(
    row.runKey!==runKey||
    !nonNegativeInteger(row.generated)||
    !nonNegativeInteger(row.failed)||
    !Array.isArray(row.failures)||
    typeof row.checkedAt!=='string'
  ){
    return NextResponse.json({ok:false,error:'BUSINESS_PULSE_DUE_RUN_EVIDENCE_MISSING',checkedAt},{status:503});
  }

  const ok=row.failed===0;
  return NextResponse.json({ok,runKey,generated:row.generated,failed:row.failed,failures:row.failures,checkedAt:row.checkedAt},{status:ok?200:503});
}

export async function GET(request:Request){return run(request)}
export async function POST(request:Request){return run(request)}
