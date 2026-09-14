import{NextResponse}from'next/server';
import{z}from'zod';
import{createClient}from'@/lib/supabase/server';
import{getCurrentWebshopInstance}from'@/lib/instances/access';
import{authorizeProductDocumentDownload,productDocumentRequestFingerprint}from'@/lib/commerce/product-documents';

const paramsSchema=z.object({documentId:z.string().uuid()});
const querySchema=z.object({variantId:z.string().uuid()});

export async function GET(request:Request,{params}:{params:Promise<{documentId:string}>}){
  const parsedParams=paramsSchema.safeParse(await params),url=new URL(request.url),parsedQuery=querySchema.safeParse({variantId:url.searchParams.get('variantId')});
  if(!parsedParams.success||!parsedQuery.success)return NextResponse.json({error:'A dokumentumkérés érvénytelen.'},{status:400,headers:{'Cache-Control':'no-store'}});
  const instance=await getCurrentWebshopInstance();
  if(!instance||!['pilot','active'].includes(instance.status))return NextResponse.json({error:'A dokumentum nem érhető el.'},{status:404,headers:{'Cache-Control':'no-store'}});
  const client=await createClient(),{data:{user}}=await client.auth.getUser();
  const fingerprint=productDocumentRequestFingerprint([instance.id,parsedParams.data.documentId,parsedQuery.data.variantId,user?.id??'public',request.headers.get('x-forwarded-for'),request.headers.get('user-agent')]);
  try{
    const signed=await authorizeProductDocumentDownload({instanceId:instance.id,documentId:parsedParams.data.documentId,variantId:parsedQuery.data.variantId,customerId:user?.id??null,requestFingerprint:fingerprint});
    return NextResponse.redirect(signed.url,302);
  }catch(error){
    console.error('product document authorization rejected',{instanceId:instance.id,documentId:parsedParams.data.documentId,variantId:parsedQuery.data.variantId,signedIn:Boolean(user?.id),error});
    return NextResponse.json({error:'A dokumentum ehhez a termékhez vagy fiókhoz nem érhető el.'},{status:403,headers:{'Cache-Control':'no-store'}});
  }
}
