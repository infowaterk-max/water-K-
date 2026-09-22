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
  if(error){
    if(error.message.includes('B2B_COMPANY_REQUIRED'))return NextResponse.json({error:'A B2B partnerfiókhoz előbb add meg a céged nevét a profilodban.'},{status:409});
    if(error.message.includes('B2B_TAX_NUMBER_REQUIRED'))return NextResponse.json({error:'A B2B partnerfiókhoz előbb add meg az adószámot a profilodban.'},{status:409});
    if(error.message.includes('B2B_ACCOUNT_INVITATION_REQUIRED'))return NextResponse.json({error:'Ehhez a céghez már létezik B2B fiók. Kérj meghívót a szervezet tulajdonosától vagy adminjától.'},{status:409});
    return NextResponse.json({error:'A B2B partnerfiók igénylése nem sikerült.'},{status:500});
  }

  const result=(data??{})as{userId?:unknown;role?:unknown;approved?:unknown;requestedAt?:unknown;accountId?:unknown;memberRole?:unknown;accountStatus?:unknown};
  if(
    result.userId!==user.id||
    result.role!=='reseller'||
    typeof result.approved!=='boolean'||
    typeof result.accountId!=='string'||
    !['owner','admin','buyer'].includes(String(result.memberRole))||
    !['pending','approved','suspended'].includes(String(result.accountStatus))
  )return NextResponse.json({error:'A B2B partnerfiók eredménye nem igazolható.'},{status:500});

  return NextResponse.json({
    ok:true,
    approved:result.approved,
    requestedAt:typeof result.requestedAt==='string'?result.requestedAt:null,
    accountId:result.accountId,
    memberRole:result.memberRole,
    accountStatus:result.accountStatus,
  });
}
