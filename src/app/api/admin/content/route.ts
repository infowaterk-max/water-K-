import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordAdminAudit } from '@/lib/admin/audit';
import { isSafeContentHref } from '@/lib/content/validation';

const schema = z.object({
  kind:z.enum(['blog','landing']),
  slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title:z.string().trim().min(2).max(160),
  excerpt:z.string().trim().max(500).nullable().optional(),
  body:z.string().max(50000).default(''),
  heroTitle:z.string().trim().max(180).nullable().optional(),
  heroSubtitle:z.string().trim().max(500).nullable().optional(),
  ctaLabel:z.string().trim().max(80).nullable().optional(),
  ctaHref:z.string().trim().max(300).nullable().optional(),
  seoTitle:z.string().trim().max(70).nullable().optional(),
  seoDescription:z.string().trim().max(180).nullable().optional(),
  status:z.enum(['draft','published']).default('draft')
}).refine(value => isSafeContentHref(value.ctaHref), { message:'Nem biztonságos CTA hivatkozás.', path:['ctaHref'] });

export async function POST(request:Request){
  const actor=await getAdminRequestUser();
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let raw:unknown;
  try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen tartalomadat.'},{status:400});
  const admin=createAdminClient(),p=parsed.data,payload={kind:p.kind,slug:p.slug,title:p.title,excerpt:p.excerpt||null,body:p.body,hero_title:p.heroTitle||null,hero_subtitle:p.heroSubtitle||null,cta_label:p.ctaLabel||null,cta_href:p.ctaHref||null,seo_title:p.seoTitle||null,seo_description:p.seoDescription||null,status:p.status,published_at:p.status==='published'?new Date().toISOString():null},{data,error}=await admin.from('content_pages').insert(payload).select('id').single();
  if(error)return NextResponse.json({error:'A mentés nem sikerült. Ellenőrizd, hogy az URL-azonosító egyedi-e.'},{status:409});
  await recordAdminAudit({actorUserId:actor.id,action:'content.created',entityType:'content_page',entityId:data.id,summary:`${p.kind==='blog'?'Blogbejegyzés':'Landing oldal'} létrehozva`,afterState:payload});
  return NextResponse.json({ok:true,id:data.id});
}
