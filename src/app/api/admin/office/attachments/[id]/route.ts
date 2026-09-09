import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{hasCurrentPlanFeature}from'@/lib/plans/access';
import{createAdminClient}from'@/lib/supabase/admin';
import{OFFICE_PRIVATE_ATTACHMENT_SIGNED_DOWNLOAD_SECONDS}from'@/lib/office/private-attachments';

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser();
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  if(!(await hasCurrentPlanFeature('teamChatSecureAttachments')))return NextResponse.json({error:'A biztonságos Team Chat csatolmányok Pro csomagban érhetők el.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext()}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  const{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen csatolmányazonosító.'},{status:400});

  const db=createAdminClient();
  const{data,error}=await db.rpc('admin_get_office_private_attachment_v1',{
    p_instance_id:scope.instanceId,
    p_actor:actor.id,
    p_attachment_id:id,
  });
  if(error){
    const reason=String(error.message??'');
    if(reason.includes('OFFICE_PRIVATE_THREAD_ACCESS_DENIED'))return NextResponse.json({error:'Nincs hozzáférésed ehhez a csatolmányhoz.'},{status:403});
    if(reason.includes('OFFICE_ATTACHMENT_NOT_FOUND'))return NextResponse.json({error:'A csatolmány nem található.'},{status:404});
    return NextResponse.json({error:'A csatolmány letöltése most nem engedélyezhető.'},{status:500});
  }
  const attachment=(data??{})as{storageBucket?:string;storagePath?:string;originalName?:string};
  if(!attachment.storageBucket||!attachment.storagePath||!attachment.originalName)return NextResponse.json({error:'A csatolmány adatai nem igazolhatók.'},{status:500});

  const signed=await db.storage.from(attachment.storageBucket).createSignedUrl(
    attachment.storagePath,
    OFFICE_PRIVATE_ATTACHMENT_SIGNED_DOWNLOAD_SECONDS,
    {download:attachment.originalName},
  );
  if(signed.error||!signed.data?.signedUrl)return NextResponse.json({error:'A biztonságos letöltési cím nem hozható létre.'},{status:500});
  const response=NextResponse.redirect(signed.data.signedUrl,302);
  response.headers.set('Cache-Control','no-store, private');
  return response;
}
