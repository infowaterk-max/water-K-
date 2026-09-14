import {NextResponse} from 'next/server';
import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {getCurrentWebshopInstance} from '@/lib/instances/access';
import {authorizeDigitalDownload,digitalRequestFingerprint,recordDigitalDownloadDenial} from '@/lib/commerce/digital-commerce';

const paramsSchema=z.object({assetId:z.string().uuid()});
const querySchema=z.object({orderId:z.string().uuid(),token:z.string().regex(/^[a-f0-9]{64}$/).optional()});

export async function GET(request:Request,{params}:{params:Promise<{assetId:string}>}){
  const parsedParams=paramsSchema.safeParse(await params);
  const url=new URL(request.url);
  const parsedQuery=querySchema.safeParse({orderId:url.searchParams.get('orderId'),token:url.searchParams.get('token')??undefined});
  if(!parsedParams.success||!parsedQuery.success)return NextResponse.json({error:'A letöltési kérés érvénytelen.'},{status:400,headers:{'Cache-Control':'no-store'}});

  const instance=await getCurrentWebshopInstance();
  if(!instance||!['pilot','active'].includes(instance.status))return NextResponse.json({error:'A letöltés nem érhető el.'},{status:404,headers:{'Cache-Control':'no-store'}});

  const client=await createClient();
  const{data:{user}}=await client.auth.getUser();
  const guestToken=parsedQuery.data.token??null;
  if(!user?.id&&!guestToken)return NextResponse.json({error:'A letöltéshez bejelentkezés vagy érvényes vásárlói hozzáférés szükséges.'},{status:401,headers:{'Cache-Control':'no-store'}});

  const actorType=user?.id?'account':'guest';
  const fingerprint=digitalRequestFingerprint([
    instance.id,
    parsedQuery.data.orderId,
    parsedParams.data.assetId,
    user?.id??guestToken,
    request.headers.get('x-forwarded-for'),
    request.headers.get('user-agent'),
  ]);

  try{
    const signed=await authorizeDigitalDownload({
      instanceId:instance.id,
      orderId:parsedQuery.data.orderId,
      assetId:parsedParams.data.assetId,
      customerId:user?.id??null,
      guestToken,
      requestFingerprint:fingerprint,
    });
    return NextResponse.redirect(signed.url,302);
  }catch(error){
    console.error('digital download authorization rejected',{instanceId:instance.id,orderId:parsedQuery.data.orderId,assetId:parsedParams.data.assetId,actorType,error});
    await recordDigitalDownloadDenial({instanceId:instance.id,orderId:parsedQuery.data.orderId,assetId:parsedParams.data.assetId,actorType,reason:'DOWNLOAD_AUTHORIZATION_REJECTED',requestFingerprint:fingerprint}).catch(()=>undefined);
    return NextResponse.json({error:'A letöltés jelenleg nem engedélyezett. Ellenőrizd a rendelés és a hozzáférés állapotát.'},{status:403,headers:{'Cache-Control':'no-store'}});
  }
}
