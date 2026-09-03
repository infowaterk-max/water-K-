import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{createAdminClient}from'@/lib/supabase/admin';
import{parseCatalogCsv,type CatalogChange}from'@/lib/catalog-import';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

const change=z.object({id:z.string().uuid(),stock:z.number().int().min(0).max(100000).optional(),grossPrice:z.number().int().min(0).max(10000000).optional(),netPrice:z.number().int().min(0).max(10000000).optional(),active:z.boolean().optional()}).refine(v=>Object.keys(v).length>1,'Nincs módosítás.');
const body=z.discriminatedUnion('mode',[
  z.object({mode:z.literal('preview'),csv:z.string().min(1).max(1000000)}),
  z.object({mode:z.literal('apply'),changes:z.array(change).min(1).max(500)})
]);

export async function POST(request:Request){
  const actor=await getAdminRequestUser('catalog.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;
  try{scope=await requireCurrentStoreContext('catalog.manage')}
  catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}

  let raw:unknown;
  try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=body.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen importadat.'},{status:400});

  const admin=createAdminClient();

  if(parsed.data.mode==='preview'){
    const rows=parseCatalogCsv(parsed.data.csv);
    if(!rows.length)return NextResponse.json({error:'A CSV nem tartalmaz importálható adatsort.'},{status:400});
    const ids=rows.filter(r=>!r.error).map(r=>r.change.id);
    const{data,error}=ids.length
      ?await admin.from('product_variants').select('id,sku,stock_quantity,gross_price_huf,net_price_huf,active').eq('instance_id',scope.instanceId).in('id',ids)
      :{data:[]as any[],error:null};

    if(error)return NextResponse.json({error:'A termékadatok ellenőrzése nem sikerült.'},{status:500});
    const current=new Map((data??[]).map((r:any)=>[r.id,r]));
    const preview=rows.map(row=>{
      if(row.error)return{line:row.line,id:row.change.id,status:'error',message:row.error};
      const before=current.get(row.change.id);
      if(!before)return{line:row.line,id:row.change.id,status:'error',message:'A termék nem található ebben a webshopban.'};
      const after={stock:row.change.stock??before.stock_quantity,grossPrice:row.change.grossPrice??before.gross_price_huf,netPrice:row.change.netPrice??before.net_price_huf,active:row.change.active??before.active};
      const changed=after.stock!==before.stock_quantity||after.grossPrice!==before.gross_price_huf||after.netPrice!==before.net_price_huf||after.active!==before.active;
      return{line:row.line,id:row.change.id,sku:before.sku,status:changed?'change':'same',before:{stock:before.stock_quantity,grossPrice:before.gross_price_huf,netPrice:before.net_price_huf,active:before.active},after,change:row.change};
    });
    const validChanges=preview.filter((r:any)=>r.status==='change').map((r:any)=>r.change as CatalogChange);
    return NextResponse.json({preview,validChanges,errors:preview.filter((r:any)=>r.status==='error').length});
  }

  const{data,error}=await admin.rpc('bulk_update_product_variants_v3',{
    p_instance_id:scope.instanceId,
    p_changes:parsed.data.changes,
    p_actor:actor.id,
    p_audit_action:'catalog.csv_import_applied',
    p_audit_summary:`CSV import alkalmazva: ${parsed.data.changes.length} tétel`,
    p_audit_metadata:{count:parsed.data.changes.length}
  });
  if(error)return NextResponse.json({error:'Az import tranzakció megszakadt. A módosítás és az audit együtt vissza lett vonva.'},{status:409});

  return NextResponse.json({ok:true,count:parsed.data.changes.length,result:data});
}
