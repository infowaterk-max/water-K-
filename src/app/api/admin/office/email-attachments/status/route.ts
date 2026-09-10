import{NextResponse}from'next/server';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{hasCurrentPlanFeature}from'@/lib/plans/access';
import{officeMalwareScannerConfigured}from'@/lib/office/attachment-malware-scanner';

export async function GET(){
  const actor=await getAdminRequestUser('support.manage');
  if(!actor)return NextResponse.json({attachmentsEnabled:false,reason:'forbidden'},{status:403,headers:{'Cache-Control':'no-store'}});
  if(!(await hasCurrentPlanFeature('officeCommunication')))return NextResponse.json({attachmentsEnabled:false,reason:'plan_required'},{status:403,headers:{'Cache-Control':'no-store'}});
  try{await requireCurrentStoreContext('support.manage')}catch{return NextResponse.json({attachmentsEnabled:false,reason:'forbidden'},{status:403,headers:{'Cache-Control':'no-store'}})}
  const scannerReady=officeMalwareScannerConfigured();
  return NextResponse.json({attachmentsEnabled:scannerReady,reason:scannerReady?'ready':'scanner_unavailable'},{headers:{'Cache-Control':'no-store'}});
}
