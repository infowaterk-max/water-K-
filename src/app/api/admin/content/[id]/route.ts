import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';
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

function toPatch(p:z.infer<typeof schema>){
  const patch:Record<string,unknown>={};
  const values:Record<string,unknown>={
    slug:p.slug,title:p.title,excerpt:p.excerpt,body:p.body,
    hero_title:p.heroTitle,hero_subtitle:p.heroSubtitle,cta_label:p.ctaLabel,cta_href:p.ctaHref,
    seo_title:p.seoTitle,seo_description:p.seoDescription,status:p.status
  };
  for(const[k,v]of Object.entries(values))if(v!==undefined)patch[k]=v===''?null:v;
  return patch;
}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getAdminRequestUser('marketing.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;
  try{scope=await requireCurrentStoreContext('marketing.manage')}
  catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}

  const{id}=await params;
  if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Érvénytelen azonosító.'},{status:400});
  let raw:unknown;
  try{raw=await request.json()}
  catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen módosítás.'},{status:400});

  const admin=createAdminClient();
  const{data,error}=await admin.rpc('admin_mutate_content_page_v2',{
    p_instance_id:scope.instanceId,
    p_content_id:id,
    p_actor:actor.id,
    p_action:'update',
    p_payload:toPatch(parsed.data)
  });
  if(error){
    if(error.message.includes('CONTENT_NOT_FOUND'))return NextResponse.json({error:'A tartalom nem található ebben a webshopban.'},{status:404});
    if(error.message.includes('MARKETING_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
    return NextResponse.json({error:'A módosítás nem sikerült.'},{status:409});
  }
  if(!(data as {id?:string}|null)?.id)return NextResponse.json({error:'A módosítás eredménye nem igazolható.'},{status:500});
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
  const{data,error}=await admin.rpc('admin_mutate_content_page_v2',{
    p_instance_id:scope.instanceId,
    p_content_id:id,
    p_actor:actor.id,
    p_action:'delete',
    p_payload:{}
  });
  if(error){
    if(error.message.includes('CONTENT_NOT_FOUND'))return NextResponse.json({error:'A tartalom nem található ebben a webshopban.'},{status:404});
    if(error.message.includes('MARKETING_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
    return NextResponse.json({error:'A törlés nem sikerült.'},{status:500});
  }
  if(!(data as {id?:string}|null)?.id)return NextResponse.json({error:'A törlés eredménye nem igazolható.'},{status:500});
  return NextResponse.json({ok:true});
}
