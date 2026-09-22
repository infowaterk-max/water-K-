import Link from 'next/link';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCommunicationIdentityForInstance } from '@/lib/communication/identity';
import { EmailBrandKitEditor } from '@/components/admin/email-brand-kit-editor';

export const dynamic='force-dynamic';

type BrandKit={id:string;name:string;logo_url:string|null;tokens:unknown;company_details:unknown;social_links:unknown;updated_at:string|null};

export default async function EmailBrandKitPage(){
  const scope=await requireCurrentStoreContext('marketing.manage');
  const admin=createAdminClient();
  const{data,error}=await admin.from('email_brand_kits').select('id,name,logo_url,tokens,company_details,social_links,updated_at').eq('instance_id',scope.instanceId).eq('is_default',true).maybeSingle();
  const identity=await getCommunicationIdentityForInstance(scope.instanceId);
  return <section className="adminMain">
    <div className="adminToolbar"><div><span className="eyebrow">E-mail Builder</span><h1 className="sectionTitle">Brand Kit</h1><p className="lead">Közös márkaalap az e-mail sablonokhoz. A Brand Kit módosítása a piszkozatok előnézetét frissíti, de önmagában nem aktivál sablont.</p></div><Link className="btn btnGhost" href="/admin/email-sablonok">Vissza az e-mail sablonokhoz</Link></div>
    {error?<div className="errorNotice" role="alert"><strong>A Brand Kit most nem tölthető be.</strong><p>Hiányos állapotból nem engedünk mentést.</p></div>:<EmailBrandKitEditor initialBrandKit={(data??null) as BrandKit|null} fallbackName={identity.brandName}/>} 
  </section>;
}
