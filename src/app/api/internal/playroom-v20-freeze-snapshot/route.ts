import {NextResponse} from 'next/server';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v20';
import {materializeStorefrontTemplateResponsiveStyles} from '@/lib/builder/storefront-responsive-isolation';

export const dynamic='force-dynamic';
const EXPECTED_BRANCH='feature/playroom-v20-functional-acceptance';

export async function GET(request:Request){
  if(process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_GIT_COMMIT_REF!==EXPECTED_BRANCH)return new NextResponse(null,{status:404});
  const proof=new URL(request.url).searchParams.get('proof')??'';
  if(!/^[a-f0-9]{40}$/.test(proof)||proof!==(process.env.VERCEL_GIT_COMMIT_SHA??''))return new NextResponse(null,{status:404});
  const snapshot=materializeStorefrontTemplateResponsiveStyles(PLAYROOM_V20_TEMPLATE_PACKAGE);
  return NextResponse.json(snapshot,{headers:{'Cache-Control':'no-store'}});
}
