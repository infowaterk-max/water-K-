import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSafeContentHref } from '@/lib/content/validation';
import { requireCurrentStoreContext } from '@/lib/instances/scope';

const schema=z.object({
  kind:z.enum(['blog','landing','page']),
  slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title:z.string().trim().min(2).max(160),
  excerpt:z.string().trim().max(500).nullable().optional(),
  body:z.string().max(100000).default(''),
  heroTitle:z.string().trim().max(180).nullable().optional(),
  heroSubtitle:z.string().trim().max(500).nullable().optional(),
  ctaLabel:z.string().trim().max(80).nullable().optional(),
  ctaHref:z.string().trim().max(300).nullable().optional(),
  seoTitle:z.string().trim().max(70).nullable().optional(),
  seoDescription:z.string().trim().max(180).nullable().optional(),
  status:z.enum(['draft','published']).default('draft')
}).refine(v=>isSafeContentHref(v.ctaHref),{message:'Nem biztonságos CTA hivatkozás.',path:['ctaHref']});

export async function POST(request:Request){
  const actor=await getAdminRequestUser('marketing.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let store;
  try{store=await requireCurrentStoreContext('marketing.manage')}
  catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}

  let raw:unknown;
  try{raw=await request.json()}
  catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen tartalomadat.'},{status:400});

  const p=parsed.data;
  const payload={
    kind:p.kind,
    slug:p.slug,
    title:p.title,
    excerpt:p.excerpt||null,
    body:p.body,
    hero_title:p.heroTitle||null,
    hero_subtitle:p.heroSubtitle||null,
    cta_label:p.ctaLabel||null,
    cta_href:p.ctaHref||null,
    seo_title:p.seoTitle||null,
    seo_description:p.seoDescription||null,
    status:p.status
  };
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('admin_mutate_content_page_v2',{
    p_instance_id:store.instanceId,
    p_content_id:null,
    p_actor:actor.id,
    p_action:'create',
    p_payload:payload
  });
  if(error){
    if(error.message.includes('MARKETING_PERMISSION_REQUIRED'))return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403});
    return NextResponse.json({error:'A mentés nem sikerült. Ellenőrizd, hogy az URL-azonosító ebben a webshopban egyedi-e.'},{status:409});
  }
  const id=(data as {id?:string}|null)?.id;
  if(!id)return NextResponse.json({error:'A tartalom mentése nem igazolható.'},{status:500});
  return NextResponse.json({ok:true,id});
}
