import { NextResponse } from 'next/server';
import { runCommunicationWorker } from '@/lib/communication/worker';

export const dynamic='force-dynamic';

function authorized(request:Request){
 const secret=process.env.COMMUNICATION_WORKER_SECRET;
 if(!secret)return false;
 const header=request.headers.get('authorization');
 return header===`Bearer ${secret}`;
}

export async function POST(request:Request){
 if(!authorized(request))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{const summary=await runCommunicationWorker(20);return NextResponse.json({ok:true,...summary});}
 catch(error){console.error('communication worker failed',error);return NextResponse.json({error:'Worker failed'},{status:500});}
}
