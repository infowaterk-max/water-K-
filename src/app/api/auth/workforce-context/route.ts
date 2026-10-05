import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { getActiveStoreRoles,hasStoreRoleBindingHistory,type StoreRole } from '@/lib/auth/store-rbac';
import { requiredWorkforceTotpFactors,type WorkforcePlatformRole,type WorkforceStoreRole } from '@/lib/auth/workforce-assurance-policy';

export const dynamic='force-dynamic';

function platformRoleOf(value:unknown):WorkforcePlatformRole{
  return value==='owner'||value==='admin'||value==='operator'?value:null;
}

function roleLabel(platformRole:WorkforcePlatformRole,storeRoles:readonly WorkforceStoreRole[]){
  if(platformRole==='owner')return'Platformtulajdonos';
  if(platformRole==='admin')return'Platform admin';
  if(platformRole==='operator')return'Platform operátor';
  if(storeRoles.includes('owner'))return'Webshop tulajdonos';
  if(storeRoles.includes('admin'))return'Webshop admin';
  if(storeRoles.includes('catalog_manager'))return'Katalóguskezelő';
  if(storeRoles.includes('order_manager'))return'Rendeléskezelő';
  if(storeRoles.includes('marketing_manager'))return'Marketing munkatárs';
  if(storeRoles.includes('support'))return'Ügyfélszolgálat';
  if(storeRoles.includes('analyst'))return'Elemző';
  return'Megtekintő';
}

export async function GET(){
  try{
    const supabase=await createClient();
    const{data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user)return NextResponse.json({error:'AUTH_REQUIRED'},{status:401});

    const admin=createAdminClient();
    const{data:platform,error:platformError}=await admin
      .from('platform_operators')
      .select('role')
      .eq('user_id',user.id)
      .maybeSingle();
    if(platformError)return NextResponse.json({error:'WORKFORCE_CONTEXT_UNAVAILABLE'},{status:503});

    const platformRole=platformRoleOf(platform?.role);
    let storeRoles:StoreRole[]=[];
    let instanceName:string|null=null;

    if(!platformRole){
      const instance=await getCurrentWebshopInstance();
      if(!instance)return NextResponse.json({error:'WORKFORCE_ACCESS_REQUIRED'},{status:403});
      instanceName=instance.name;
      storeRoles=await getActiveStoreRoles(instance.id);

      if(!storeRoles.length&&!(await hasStoreRoleBindingHistory(instance.id,user.id))){
        const[{data:profile},{data:legacy,error:legacyError}]=await Promise.all([
          supabase.from('profiles').select('role').eq('id',user.id).maybeSingle(),
          admin.from('webshop_instance_members').select('role').eq('instance_id',instance.id).eq('user_id',user.id).in('role',['owner','admin']).maybeSingle(),
        ]);
        if(legacyError)return NextResponse.json({error:'WORKFORCE_CONTEXT_UNAVAILABLE'},{status:503});
        if(profile?.role==='admin'&&(legacy?.role==='owner'||legacy?.role==='admin'))storeRoles=[legacy.role];
      }

      if(!storeRoles.length)return NextResponse.json({error:'WORKFORCE_ACCESS_REQUIRED'},{status:403});
    }

    const workforceStoreRoles=storeRoles as WorkforceStoreRole[];
    const requiredFactors=requiredWorkforceTotpFactors({platformRole,storeRoles:workforceStoreRoles});
    return NextResponse.json({
      platformRole,
      storeRoles:workforceStoreRoles,
      requiredFactors,
      roleLabel:roleLabel(platformRole,workforceStoreRoles),
      instanceName,
    });
  }catch{
    return NextResponse.json({error:'WORKFORCE_CONTEXT_UNAVAILABLE'},{status:503});
  }
}
