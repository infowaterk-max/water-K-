import {NextResponse} from 'next/server';
import {z} from 'zod';
import {getAdminRequestUser} from '@/lib/auth/admin-api';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {createAdminClient} from '@/lib/supabase/admin';
import {emailDocumentSchema} from '@/lib/email-builder/types';

const uuid=z.string().uuid();
const sameOrigin=(request:Request)=>{const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;};

export async function POST(request:Request,{params}:{params:Promise<{id:string;versionId:string}>}){
  if(!sameOrigin(request))return NextResponse.json({error:'Érvénytelen kérés.'},{status:403});
  const actor=await getAdminRequestUser('marketing.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('marketing.manage')}catch{return NextResponse.json({error:'Nincs aktív webshop kontextus.'},{status:403})}
  const{id,versionId}=await params;
  if(!uuid.safeParse(id).success||!uuid.safeParse(versionId).success)return NextResponse.json({error:'Érvénytelen verzióazonosító.'},{status:400});
  const admin=createAdminClient();
  const{data:template,error:templateError}=await admin.from('email_templates').select('id,status').eq('instance_id',scope.instanceId).eq('id',id).maybeSingle();
  if(templateError)return NextResponse.json({error:'A sablon nem tölthető be.'},{status:500});
  if(!template)return NextResponse.json({error:'A sablon nem található.'},{status:404});
  if(template.status==='archived')return NextResponse.json({error:'Archivált sablon piszkozata nem módosítható.'},{status:409});
  const{data:version,error:versionError}=await admin.from('email_template_versions').select('id,version_number,schema_version,document').eq('instance_id',scope.instanceId).eq('template_id',id).eq('id',versionId).maybeSingle();
  if(versionError)return NextResponse.json({error:'A verzió nem tölthető be.'},{status:500});
  if(!version)return NextResponse.json({error:'A verzió nem található.'},{status:404});
  const parsed=emailDocumentSchema.safeParse(version.document);
  if(!parsed.success)return NextResponse.json({error:'A mentett verzió dokumentuma érvénytelen.'},{status:409});
  const{data:result,error}=await admin.rpc('save_email_template_draft_v1',{p_instance_id:scope.instanceId,p_actor:actor.id,p_template_id:id,p_document:parsed.data});
  if(error||result!==true)return NextResponse.json({error:'A verzió visszatöltése sikertelen.'},{status:500});
  const{data:evidence,error:evidenceError}=await admin.from('email_templates').select('draft_schema_version,draft_document,active_version_id').eq('instance_id',scope.instanceId).eq('id',id).maybeSingle();
  const evidenceParsed=emailDocumentSchema.safeParse(evidence?.draft_document);
  if(evidenceError||!evidence||!evidenceParsed.success||JSON.stringify(evidenceParsed.data)!==JSON.stringify(parsed.data))return NextResponse.json({error:'A piszkozat visszaállításának bizonyítéka hiányzik.'},{status:500});
  return NextResponse.json({restoredDraft:{versionId:version.id,versionNumber:version.version_number},activeVersionId:evidence.active_version_id});
}
