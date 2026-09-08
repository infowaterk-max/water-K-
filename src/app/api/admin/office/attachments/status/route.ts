import{NextResponse}from'next/server';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{hasCurrentPlanFeature}from'@/lib/plans/access';
import{officeMalwareScannerConfigured}from'@/lib/office/attachment-malware-scanner';

export async function GET(){
  const actor=await getAdminRequestUser();
  if(!actor)return NextResponse.json({attachmentsEnabled:false},{status:403,headers:{'Cache-Control':'no-store'}});
  if(!(await hasCurrentPlanFeature('officeCommunication')))return NextResponse.json({attachmentsEnabled:false},{status:403,headers:{'Cache-Control':'no-store'}});
  try{await requireCurrentStoreContext()}catch{return NextResponse.json({attachmentsEnabled:false},{status:403,headers:{'Cache-Control':'no-store'}})}
  return NextResponse.json({attachmentsEnabled:officeMalwareScannerConfigured()},{headers:{'Cache-Control':'no-store'}});
}
