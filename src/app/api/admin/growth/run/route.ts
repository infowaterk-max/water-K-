import{NextResponse}from'next/server';
import{createAdminClient}from'@/lib/supabase/admin';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

type GrowthEvidence={
  ok?:boolean;
  planned?:{journeysSeen?:number;stepsCreated?:number};
  dispatched?:{seen?:number;queued?:number;blocked?:number};
  partial?:boolean;
  auditId?:string;
};

const nonNegativeInt=(value:unknown)=>typeof value==='number'&&Number.isInteger(value)&&value>=0;

export async function POST(){
  const user=await getAdminRequestUser('marketing.manage');
  if(!user)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;
  try{scope=await requireCurrentStoreContext('marketing.manage')}
  catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}

  const a=createAdminClient();
  const{data,error}=await a.rpc('admin_refresh_growth_workflows_v3',{
    p_instance_id:scope.instanceId,
    p_actor:user.id,
    p_limit:50
  });
  if(error){
    if(error.message.includes('MARKETING_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
    return NextResponse.json({error:'A növekedési folyamatok frissítése nem sikerült. A tervezést és a sorba állítást nem tekintjük lezártnak.'},{status:500});
  }

  const evidence=(data??{})as GrowthEvidence;
  const planned=evidence.planned??{},dispatched=evidence.dispatched??{};
  if(
    evidence.ok!==true||
    !evidence.auditId||
    !nonNegativeInt(planned.journeysSeen)||
    !nonNegativeInt(planned.stepsCreated)||
    !nonNegativeInt(dispatched.seen)||
    !nonNegativeInt(dispatched.queued)||
    !nonNegativeInt(dispatched.blocked)||
    Number(dispatched.queued)+Number(dispatched.blocked)>Number(dispatched.seen)||
    evidence.partial!==(Number(dispatched.blocked)>0)
  ){
    return NextResponse.json({error:'A növekedési frissítés eredménye nem igazolható.'},{status:500});
  }

  return NextResponse.json({
    ok:true,
    planned,
    dispatched,
    partial:evidence.partial,
    auditId:evidence.auditId,
    refreshedAt:new Date().toISOString()
  });
}
