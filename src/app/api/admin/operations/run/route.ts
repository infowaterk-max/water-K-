import{NextResponse}from'next/server';
import{getPlatformRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';

export async function POST(){
 const user=await getPlatformRequestUser();if(!user)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
 const a=createAdminClient(),runKey=`admin:${user.id}:${new Date().toISOString()}`;
 const{data,error}=await a.rpc('process_operations_cycle',{p_run_key:runKey});
 if(error)return NextResponse.json({error:'A műveleti ciklus futtatása nem sikerült.'},{status:500});
 const run=(data??{})as{id?:string;run_key?:string;completed_at?:string|null};
 if(!run.id||run.run_key!==runKey||!run.completed_at)return NextResponse.json({error:'A műveleti ciklus eredménye nem igazolható.'},{status:500});
 return NextResponse.json({ok:true,run});
}
