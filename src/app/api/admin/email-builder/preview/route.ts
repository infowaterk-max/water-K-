import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { emailDocumentSchema } from '@/lib/email-builder/types';
import { emailRenderContextSchema } from '@/lib/email-builder/context-schema';
import { renderEmail } from '@/lib/email-builder/render/render-email';

const requestSchema=z.object({document:emailDocumentSchema,context:emailRenderContextSchema}).strict();
const sameOrigin=(request:Request)=>{const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;};

export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:'Érvénytelen kérés.'},{status:403});
  const actor=await getAdminRequestUser('marketing.manage');
  if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  try{await requireCurrentStoreContext('marketing.manage')}catch{return NextResponse.json({error:'Nincs aktív webshop kontextus.'},{status:403})}
  const body=await request.json().catch(()=>null),parsed=requestSchema.safeParse(body);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen előnézeti adat.',details:parsed.error.flatten()},{status:400});
  try{
    const rendered=renderEmail(parsed.data.document,parsed.data.context);
    return NextResponse.json(rendered,{headers:{'cache-control':'no-store'}});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:'EMAIL_PREVIEW_FAILED'},{status:400});
  }
}
