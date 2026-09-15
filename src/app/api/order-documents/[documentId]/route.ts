import{NextResponse}from'next/server';
import{z}from'zod';
import{createClient}from'@/lib/supabase/server';
import{getCurrentWebshopInstance}from'@/lib/instances/access';
import{authorizeAccountOrderDocumentDownload,orderDocumentRequestFingerprint}from'@/lib/commerce/order-documents';

const paramsSchema=z.object({documentId:z.string().uuid()});

export async function GET(request:Request,{params}:{params:Promise<{documentId:string}>}){
  const parsed=paramsSchema.safeParse(await params);if(!parsed.success)return NextResponse.json({error:'Érvénytelen dokumentumazonosító.'},{status:400,headers:{'Cache-Control':'no-store'}});
  const instance=await getCurrentWebshopInstance();if(!instance||!['pilot','active'].includes(instance.status))return NextResponse.json({error:'A dokumentum nem érhető el.'},{status:404,headers:{'Cache-Control':'no-store'}});
  const client=await createClient(),{data:{user}}=await client.auth.getUser();if(!user?.id)return NextResponse.json({error:'A dokumentum letöltéséhez be kell jelentkezni.'},{status:401,headers:{'Cache-Control':'no-store'}});
  const fingerprint=orderDocumentRequestFingerprint([instance.id,parsed.data.documentId,user.id,request.headers.get('x-forwarded-for'),request.headers.get('user-agent')]);
  try{
    const signed=await authorizeAccountOrderDocumentDownload({instanceId:instance.id,documentId:parsed.data.documentId,customerId:user.id,requestFingerprint:fingerprint});
    return NextResponse.redirect(signed.url,302);
  }catch(error){
    console.error('order document download rejected',{instanceId:instance.id,documentId:parsed.data.documentId,userId:user.id,error});
    return NextResponse.json({error:'A dokumentum jelenleg nem tölthető le, vagy nem ehhez a fiókhoz tartozik.'},{status:403,headers:{'Cache-Control':'no-store'}});
  }
}
