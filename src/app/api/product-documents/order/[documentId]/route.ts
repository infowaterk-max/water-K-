import{NextResponse}from'next/server';
import{z}from'zod';
import{getCurrentWebshopInstance}from'@/lib/instances/access';
import{authorizeOrderProductDocumentDownload,productDocumentRequestFingerprint}from'@/lib/commerce/product-documents';

const paramsSchema=z.object({documentId:z.string().uuid()});
const querySchema=z.object({orderId:z.string().uuid(),variantId:z.string().uuid(),token:z.string().uuid()});

export async function GET(request:Request,{params}:{params:Promise<{documentId:string}>}){
  const parsedParams=paramsSchema.safeParse(await params),url=new URL(request.url),parsedQuery=querySchema.safeParse({orderId:url.searchParams.get('orderId'),variantId:url.searchParams.get('variantId'),token:url.searchParams.get('token')});
  if(!parsedParams.success||!parsedQuery.success)return NextResponse.json({error:'A dokumentumkérés érvénytelen.'},{status:400,headers:{'Cache-Control':'no-store'}});
  const instance=await getCurrentWebshopInstance();
  if(!instance||!['pilot','active'].includes(instance.status))return NextResponse.json({error:'A dokumentum nem érhető el.'},{status:404,headers:{'Cache-Control':'no-store'}});
  const fingerprint=productDocumentRequestFingerprint([instance.id,parsedParams.data.documentId,parsedQuery.data.orderId,parsedQuery.data.variantId,request.headers.get('x-forwarded-for'),request.headers.get('user-agent')]);
  try{
    const signed=await authorizeOrderProductDocumentDownload({instanceId:instance.id,documentId:parsedParams.data.documentId,orderId:parsedQuery.data.orderId,variantId:parsedQuery.data.variantId,confirmationToken:parsedQuery.data.token,requestFingerprint:fingerprint});
    return NextResponse.redirect(signed.url,302);
  }catch(error){
    console.error('order product document authorization rejected',{instanceId:instance.id,documentId:parsedParams.data.documentId,orderId:parsedQuery.data.orderId,variantId:parsedQuery.data.variantId,error});
    return NextResponse.json({error:'A dokumentum ehhez a rendeléshez nem érhető el.'},{status:403,headers:{'Cache-Control':'no-store'}});
  }
}
