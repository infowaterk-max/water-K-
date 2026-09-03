import{NextResponse}from'next/server';
import{createClient}from'@/lib/supabase/server';
import{createAdminClient}from'@/lib/supabase/admin';
import{getCurrentWebshopInstance}from'@/lib/instances/access';

export async function POST(){
  const instance=await getCurrentWebshopInstance();
  if(!instance||!['pilot','active'].includes(instance.status))return NextResponse.json({error:'Nincs aktív webshop.'},{status:409});
  const session=await createClient(),{data:{user}}=await session.auth.getUser();
  if(!user)return NextResponse.json({error:'Jelentkezz be a partnerigényhez.'},{status:401});

  const admin=createAdminClient();
  const{data,error}=await admin.rpc('request_reseller_status_v2',{
    p_instance_id:instance.id,
    p_user_id:user.id,
  });
  if(error)return NextResponse.json({error:'A partnerigény mentése nem sikerült.'},{status:500});

  const result=(data??{})as{userId?:string;role?:string;approved?:boolean;requestedAt?:string|null};
  if(result.userId!==user.id||result.role!=='reseller'||typeof result.approved!=='boolean'){
    return NextResponse.json({error:'A partnerigény eredménye nem igazolható.'},{status:500});
  }
  return NextResponse.json({ok:true,approved:result.approved,requestedAt:result.requestedAt??null});
}
