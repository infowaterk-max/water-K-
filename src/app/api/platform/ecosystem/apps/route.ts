import {NextRequest,NextResponse} from 'next/server';
import {getPlatformRequestUser} from '@/lib/auth/admin-api';
import {createAdminClient} from '@/lib/supabase/admin';
import {recordAdminAudit} from '@/lib/admin/audit';
import {registerExtensionApp} from '@/lib/platform/ecosystem';
import {normalizeExtensionScopes} from '@/lib/platform/ecosystem-contract';

export const dynamic='force-dynamic';

export async function GET(){
  const user=await getPlatformRequestUser();if(!user)return NextResponse.json({error:'Nincs platform jogosultság.'},{status:403});
  const admin=createAdminClient();
  const{data,error}=await admin.from('extension_app_catalog').select('app_key,display_name,version,release_state,allowed_scopes,metadata,created_at,updated_at').order('display_name');
  if(error)return NextResponse.json({error:'Az extension katalógus nem tölthető be.'},{status:503});
  return NextResponse.json({ok:true,apps:data??[]});
}

export async function PUT(request:NextRequest){
  const user=await getPlatformRequestUser();if(!user)return NextResponse.json({error:'Nincs platform jogosultság.'},{status:403});
  let body:{appKey?:unknown;displayName?:unknown;version?:unknown;releaseState?:unknown;allowedScopes?:unknown;metadata?:unknown};
  try{body=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})}
  if(typeof body.appKey!=='string'||typeof body.displayName!=='string'||typeof body.version!=='string'||!['draft','released','suspended'].includes(String(body.releaseState)))return NextResponse.json({error:'Hiányos extension metaadat.'},{status:400});
  const scopes=normalizeExtensionScopes(body.allowedScopes);if(scopes.length===0)return NextResponse.json({error:'Legalább egy támogatott scope szükséges.'},{status:400});
  try{
    const app=await registerExtensionApp({appKey:body.appKey,displayName:body.displayName,version:body.version,releaseState:body.releaseState as 'draft'|'released'|'suspended',allowedScopes:scopes,actorId:user.id,metadata:body.metadata&&typeof body.metadata==='object'&&!Array.isArray(body.metadata)?body.metadata as Record<string,unknown>:undefined});
    const audit=await recordAdminAudit({actorUserId:user.id,action:'platform.extension_app_upserted',entityType:'extension_app',entityId:String(app.app_key),summary:`Block 20 extension katalógus frissítve: ${String(app.app_key)}`,afterState:{appKey:app.app_key,version:app.version,releaseState:app.release_state,allowedScopes:app.allowed_scopes},metadata:{version:'block20.v1',authority:'platform-ecosystem'}});
    if(!audit)return NextResponse.json({error:'Az extension mentése megtörtént, de az audit evidence hiányzik.'},{status:500});
    return NextResponse.json({ok:true,app});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Az extension nem menthető.'},{status:409});}
}
