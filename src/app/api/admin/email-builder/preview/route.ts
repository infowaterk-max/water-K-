import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailDocumentSchema } from '@/lib/email-builder/types';
import { emailRenderContextSchema } from '@/lib/email-builder/context-schema';
import { applyEmailBrandDesign } from '@/lib/email-builder/active-template';
import { renderEmail } from '@/lib/email-builder/render/render-email';

const requestSchema=z.object({document:emailDocumentSchema,context:emailRenderContextSchema}).strict();
const sameOrigin=(request:Request)=>{const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;};

export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:'Érvénytelen kérés.'},{status:403});
  const actor=await getAdminRequestUser('marketing.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('marketing.manage')}catch{return NextResponse.json({error:'Nincs aktív webshop kontextus.'},{status:403})}
  const body=await request.json().catch(()=>null),parsed=requestSchema.safeParse(body);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen előnézeti adat.',details:parsed.error.flatten()},{status:400});
  try{
    const admin=createAdminClient();
    let document=parsed.data.document,context=parsed.data.context;
    const{data:template,error:templateError}=await admin.from('email_templates').select('brand_kit_id').eq('instance_id',scope.instanceId).eq('template_key',document.templateKey).maybeSingle();
    if(templateError)throw new Error('EMAIL_PREVIEW_TEMPLATE_RESOLUTION_FAILED');
    if(template){
      const query=admin.from('email_brand_kits').select('logo_url,tokens').eq('instance_id',scope.instanceId);
      const{data:brandKit,error:brandError}=template.brand_kit_id?await query.eq('id',template.brand_kit_id).maybeSingle():await query.eq('is_default',true).maybeSingle();
      if(brandError)throw new Error('EMAIL_PREVIEW_BRAND_RESOLUTION_FAILED');
      if(brandKit){
        document=applyEmailBrandDesign(document,brandKit.tokens);
        context={...context,store:{...context.store,logoUrl:brandKit.logo_url??context.store.logoUrl??null}};
      }
    }
    const rendered=renderEmail(document,context);
    return NextResponse.json(rendered,{headers:{'cache-control':'no-store'}});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:'EMAIL_PREVIEW_FAILED'},{status:400});
  }
}
