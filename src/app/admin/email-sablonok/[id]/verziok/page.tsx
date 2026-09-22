import Link from 'next/link';
import {z} from 'zod';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {createAdminClient} from '@/lib/supabase/admin';
import {EmailPublicationPanel} from '@/components/admin/email-publication-panel';

export const dynamic='force-dynamic';
const uuid=z.string().uuid();

type VersionRow={id:string;version_number:number;schema_version:number;activated_at:string;created_at:string};

export default async function EmailTemplateVersionsPage({params}:{params:Promise<{id:string}>}){
  const scope=await requireCurrentStoreContext('marketing.manage');
  const{id}=await params;
  if(!uuid.safeParse(id).success)return <section className="adminMain"><div className="errorNotice"><strong>Érvénytelen sablonazonosító.</strong></div></section>;
  const admin=createAdminClient();
  const{data:template,error}=await admin.from('email_templates').select('id,name,status,active_version_id,draft_document').eq('instance_id',scope.instanceId).eq('id',id).maybeSingle();
  if(error||!template)return <section className="adminMain"><div className="errorNotice"><strong>A sablon nem tölthető be.</strong></div><Link className="btn btnGhost" href="/admin/email-sablonok">Vissza</Link></section>;
  const{data:versionData,error:versionError}=await admin.from('email_template_versions').select('id,version_number,schema_version,activated_at,created_at').eq('instance_id',scope.instanceId).eq('template_id',id).order('version_number',{ascending:false});
  if(versionError)return <section className="adminMain"><div className="errorNotice"><strong>A verzióelőzmények nem tölthetők be.</strong></div></section>;
  const versions=(versionData??[]) as VersionRow[];
  let draftMatchesActive=false;
  if(template.active_version_id){
    const{data:active}=await admin.from('email_template_versions').select('document').eq('instance_id',scope.instanceId).eq('template_id',id).eq('id',template.active_version_id).maybeSingle();
    draftMatchesActive=Boolean(active&&JSON.stringify(active.document)===JSON.stringify(template.draft_document));
  }
  return <section className="adminMain">
    <div className="adminToolbar"><div><span className="eyebrow">E-mail Builder</span><h1 className="sectionTitle">Verziók és aktiválás</h1><p className="lead">{template.name} · A szerkesztett piszkozat és az éles, immutable verziók külön kezelhetők.</p></div><div className="actions"><Link className="btn btnGhost" href={`/admin/email-sablonok/${id}/elonezet`}>Előnézet</Link><Link className="btn btnGhost" href={`/admin/email-sablonok/${id}/szerkesztes`}>Szerkesztés</Link><Link className="btn btnGhost" href="/admin/email-sablonok">Vissza</Link></div></div>
    <EmailPublicationPanel template={{id:template.id,name:template.name,status:template.status,activeVersionId:template.active_version_id}} versions={versions.map(version=>({id:version.id,versionNumber:version.version_number,schemaVersion:version.schema_version,activatedAt:version.activated_at,createdAt:version.created_at,isActive:version.id===template.active_version_id}))} draftMatchesActive={draftMatchesActive}/>
  </section>;
}
