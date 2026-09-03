import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordAdminAudit } from '@/lib/admin/audit';
import { isSafeContentHref } from '@/lib/content/validation';
import { requireCurrentStoreContext } from '@/lib/instances/scope';

const schema=z.object({
  slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  title:z.string().trim().min(2).max(160).optional(),
  excerpt:z.string().trim().max(500).nullable().optional(),
  body:z.string().max(50000).optional(),
  heroTitle:z.string().trim().max(180).nullable().optional(),
  heroSubtitle:z.string().trim().max(500).nullable().optional(),
  ctaLabel:z.string().trim().max(80).nullable().optional(),
  ctaHref:z.string().trim().max(300).nullable().optional(),
  seoTitle:z.string().trim().max(70).nullable().optional(),
  seoDescription:z.string().trim().max(180).nullable().optional(),
  status:z.enum(['draft','published']).optional()
}).refine(v=>Object.keys(v).length>0,'Nincs módosítás.').refine(v=>isSafeContentHref(v.ctaHref),{message:'Nem biztonságos CTA hivatkozás.',path:['ctaHref']});

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser('marketing.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;
  try{scope=await requireCurrentStoreContext('marketing.manage')}
  catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}

  const{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen azonosító.'},{status:400});
  let raw:unknown;
  try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen módosítás.'},{status:400});

  const admin=createAdminClient();
  const{data:before}=await admin.from('content_pages').select('*').eq('id',id).eq('instance_id',scope.instanceId).maybeSingle();
  if(!before)return NextResponse.json({error:'A tartalom nem található ebben a webshopban.'},{status:404});

  const p=parsed.data,update:Record<string,unknown>={updated_at:new Date().toISOString()};
  const nullableEntries:Record<string,string|null|undefined>={slug:p.slug,title:p.title,excerpt:p.excerpt,hero_title:p.heroTitle,hero_subtitle:p.heroSubtitle,cta_label:p.ctaLabel,cta_href:p.ctaHref,seo_title:p.seoTitle,seo_description:p.seoDescription};
  for(const[k,v]of Object.entries(nullableEntries))if(v!==undefined)update[k]=v===''?null:v;
  if(p.body!==undefined)update.body=p.body;
  if(p.status!==undefined){update.status=p.status;update.published_at=p.status==='published'?(before.published_at??new Date().toISOString()):null}

  const{data:after,error}=await admin.from('content_pages').update(update).eq('id',id).eq('instance_id',scope.instanceId).select('*').single();
  if(error)return NextResponse.json({error:'A módosítás nem sikerült.'},{status:409});

  await recordAdminAudit({actorUserId:actor.id,organizationId:scope.organizationId,instanceId:scope.instanceId,action:'content.updated',entityType:'content_page',entityId:id,summary:'Tartalom módosítva',beforeState:before,afterState:after});
  return NextResponse.json({ok:true});
}

export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser('marketing.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;
  try{scope=await requireCurrentStoreContext('marketing.manage')}
  catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}

  const{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen azonosító.'},{status:400});
  const admin=createAdminClient();
  const{data:before}=await admin.from('content_pages').select('*').eq('id',id).eq('instance_id',scope.instanceId).maybeSingle();
  if(!before)return NextResponse.json({error:'A tartalom nem található ebben a webshopban.'},{status:404});

  const{error}=await admin.from('content_pages').delete().eq('id',id).eq('instance_id',scope.instanceId);
  if(error)return NextResponse.json({error:'A törlés nem sikerült.'},{status:500});

  await recordAdminAudit({actorUserId:actor.id,organizationId:scope.organizationId,instanceId:scope.instanceId,action:'content.deleted',entityType:'content_page',entityId:id,summary:'Tartalom törölve',beforeState:before});
  return NextResponse.json({ok:true});
}
