import {NextRequest,NextResponse} from 'next/server';
import {authenticateExtensionRequest} from '@/lib/platform/ecosystem';
import {createAdminClient} from '@/lib/supabase/admin';

export const dynamic='force-dynamic';

export async function GET(request:NextRequest){
  const auth=await authenticateExtensionRequest(request,'catalog.read');if(!auth)return NextResponse.json({error:'Érvénytelen vagy nem jogosult extension credential.'},{status:401});
  const admin=createAdminClient();
  const{data,error}=await admin.from('products').select('id,slug,name,short_description,active,featured,audience,updated_at,product_variants(id,sku,label,net_price_huf,gross_price_huf,stock_quantity,active,updated_at)').eq('instance_id',auth.instanceId).order('updated_at',{ascending:false}).limit(100);
  if(error){console.error('block20 catalog api failed',error);return NextResponse.json({error:'A katalógus most nem olvasható.'},{status:503});}
  return NextResponse.json({ok:true,version:'block20.v1',data:data??[]});
}
