import {NextResponse} from 'next/server';
import {getAdminRequestUser} from '@/lib/auth/admin-api';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {hasCurrentPlanFeature} from '@/lib/plans/access';
import {createAdminClient} from '@/lib/supabase/admin';

export async function GET(){
  const headers={'Cache-Control':'no-store'};
  const actor=await getAdminRequestUser('support.manage');
  if(!actor)return NextResponse.json({available:false,count:null,latest:null},{status:403,headers});
  if(!(await hasCurrentPlanFeature('support')))return NextResponse.json({available:false,count:null,latest:null},{status:403,headers});

  let scope;
  try{scope=await requireCurrentStoreContext('support.manage')}
  catch{return NextResponse.json({available:false,count:null,latest:null},{status:403,headers})}

  const db=createAdminClient();
  const{data,count,error}=await db
    .from('support_tickets')
    .select('id,ticket_number,subject,priority,created_at',{count:'exact'})
    .eq('instance_id',scope.instanceId)
    .eq('status','open')
    .order('created_at',{ascending:false})
    .limit(1);

  if(error)return NextResponse.json({available:false,count:null,latest:null},{status:503,headers});
  const latest=(data??[])[0]??null;
  return NextResponse.json({available:true,count:count??0,latest}, {headers});
}
