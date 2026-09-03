import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordAdminAudit } from '@/lib/admin/audit';
import { requireCurrentStoreContext } from '@/lib/instances/scope';

const schema=z.object({
  sourceVariantId:z.string().uuid().nullable(),
  recommendedVariantId:z.string().uuid(),
  placement:z.enum(['cart','post_purchase']),
  priority:z.number().int().min(0).max(10000).default(100),
  headline:z.string().trim().max(120).nullable().optional(),
}).refine(v=>v.sourceVariantId!==v.recommendedVariantId,'A termék nem ajánlhatja saját magát.');

export async function POST(request:Request){
  const actor=await getAdminRequestUser('catalog.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('catalog.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen ajánlási szabály.'},{status:400});

  const admin=createAdminClient();
  const ids=[parsed.data.recommendedVariantId,...(parsed.data.sourceVariantId?[parsed.data.sourceVariantId]:[])];
  const{data:variants,error:variantError}=await admin.from('product_variants').select('id').eq('instance_id',scope.instanceId).in('id',ids);
  if(variantError||(variants?.length??0)!==ids.length)return NextResponse.json({error:'Az ajánlás csak az aktuális webshop termékei között hozható létre.'},{status:409});

  const payload={
    instance_id:scope.instanceId,
    source_variant_id:parsed.data.sourceVariantId,
    recommended_variant_id:parsed.data.recommendedVariantId,
    placement:parsed.data.placement,
    priority:parsed.data.priority,
    headline:parsed.data.headline||null,
    active:true,
  };
  const{data,error}=await admin.from('product_recommendation_rules').insert(payload).select('id').single();
  if(error)return NextResponse.json({error:'A szabály mentése nem sikerült. Lehet, hogy ez a kapcsolat már létezik.'},{status:409});
  await recordAdminAudit({
    actorUserId:actor.id,organizationId:scope.organizationId,instanceId:scope.instanceId,
    action:'catalog.recommendation_created',entityType:'product_recommendation_rule',entityId:data.id,
    summary:'Termékajánlási szabály létrehozva',afterState:payload,
  });
  return NextResponse.json({ok:true,id:data.id});
}
