import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

const schema=z.object({ids:z.array(z.string().uuid()).min(1).max(500),operation:z.enum(['set_stock','adjust_stock','set_gross','set_net','activate','deactivate']),value:z.number().int().min(-10000000).max(10000000).optional()});

export async function POST(request:Request){
  const actor=await getAdminRequestUser('catalog.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;
  try{scope=await requireCurrentStoreContext('catalog.manage')}
  catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}

  let raw:unknown;
  try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen tömeges művelet.'},{status:400});

  const needsValue=!['activate','deactivate'].includes(parsed.data.operation);
  if(needsValue&&parsed.data.value===undefined)return NextResponse.json({error:'A művelethez érték szükséges.'},{status:400});

  const admin=createAdminClient();
  const{data:rows,error:readError}=await admin.from('product_variants')
    .select('id,stock_quantity,gross_price_huf,net_price_huf,active')
    .eq('instance_id',scope.instanceId)
    .in('id',parsed.data.ids);

  if(readError||!rows||rows.length!==parsed.data.ids.length)return NextResponse.json({error:'Egy vagy több termék nem található ebben a webshopban.'},{status:404});

  const changes=rows.map((r:any)=>{
    const c:any={id:r.id};
    switch(parsed.data.operation){
      case'set_stock':c.stock=parsed.data.value;break;
      case'adjust_stock':c.stock=r.stock_quantity+(parsed.data.value??0);break;
      case'set_gross':c.grossPrice=parsed.data.value;break;
      case'set_net':c.netPrice=parsed.data.value;break;
      case'activate':c.active=true;break;
      case'deactivate':c.active=false;break;
    }
    return c;
  });

  if(changes.some((c:any)=>c.stock!==undefined&&(c.stock<0||c.stock>100000)))return NextResponse.json({error:'A készletmódosítás legalább egy terméknél érvénytelen eredményt adna.'},{status:400});

  const{data,error}=await admin.rpc('bulk_update_product_variants_v3',{
    p_instance_id:scope.instanceId,
    p_changes:changes,
    p_actor:actor.id,
    p_audit_action:'catalog.bulk_update_applied',
    p_audit_summary:`Tömeges termékművelet: ${parsed.data.operation} · ${changes.length} tétel`,
    p_audit_metadata:{operation:parsed.data.operation,count:changes.length,value:parsed.data.value}
  });
  if(error)return NextResponse.json({error:'A tömeges tranzakció megszakadt. A módosítás és az audit együtt vissza lett vonva.'},{status:409});
  const evidence=Array.isArray(data)?data as {id?:string}[]:[],expectedIds=new Set(changes.map(c=>String(c.id))),evidenceIds=new Set(evidence.map(r=>r.id).filter((id):id is string=>Boolean(id)));
  if(evidence.length!==changes.length||evidenceIds.size!==expectedIds.size||[...expectedIds].some(id=>!evidenceIds.has(id)))return NextResponse.json({error:'A tömeges módosítás eredménye nem igazolható.'},{status:500});

  return NextResponse.json({ok:true,count:changes.length,result:data});
}
