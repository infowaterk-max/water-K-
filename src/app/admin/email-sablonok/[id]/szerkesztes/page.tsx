import Link from 'next/link';
import { z } from 'zod';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCommunicationIdentityForInstance } from '@/lib/communication/identity';
import { emailDocumentSchema, type EmailRenderContext } from '@/lib/email-builder/types';
import { EmailBuilderEditor } from '@/components/admin/email-builder-editor';
import { EmailBuilderMobileShell } from '@/components/admin/email-builder-mobile-shell';
import { EmailBuilderWordLikeShellV3 } from '@/components/admin/email-builder-wordlike-shell-v3';
import styles from './email-builder-workspace-page.module.css';

export const dynamic='force-dynamic';
const uuid=z.string().uuid();

function demoContext(store:{name:string;siteUrl:string;supportEmail:string|null},logoUrl:string|null):EmailRenderContext{
  return{
    store:{name:store.name,siteUrl:store.siteUrl,logoUrl,supportEmail:store.supportEmail},
    customer:{firstName:'Anna',fullName:'Minta Anna',email:'anna@example.com',type:'b2c'},
    order:{number:'SHOP-2026-00124',subtotal:21980,shipping:1490,discount:2000,tax:4247,total:21470,currency:'HUF',items:[{name:'Prémium termék',variant:'750 g',quantity:1,unitPrice:14990,lineTotal:14990},{name:'Kiegészítő termék',variant:'40 g',quantity:2,unitPrice:3495,lineTotal:6990}],invoiceUrl:'https://example.com/szamla/demo'},
    payment:{method:'bank_transfer',accountHolder:'Minta Webshop Kft.',bankName:'Minta Bank',bankAccount:'HU00 0000 0000 0000 0000 0000 0000',note:'A közleményben kérjük add meg a rendelési számot.'},
    shipping:{method:'courier',carrier:'Minta Futár',trackingNumber:null,trackingUrl:null,address:'Minta Anna\n2760 Nagykáta\nMinta utca 12.'},
    billing:{address:'Minta Anna\n2760 Nagykáta\nMinta utca 12.'},
    coupon:{code:'WELCOME2000',discount:2000,expiry:null},
  };
}

export default async function EmailTemplateEditorPage({params}:{params:Promise<{id:string}>}){
  const scope=await requireCurrentStoreContext('marketing.manage');
  const{id}=await params;
  if(!uuid.safeParse(id).success)return <section className="adminMain"><div className="errorNotice"><strong>Érvénytelen sablonazonosító.</strong></div></section>;
  const admin=createAdminClient();
  const{data:template,error}=await admin.from('email_templates').select('id,template_key,name,family,purpose,status,brand_kit_id,draft_document,draft_schema_version,active_version_id,updated_at').eq('instance_id',scope.instanceId).eq('id',id).maybeSingle();
  if(error||!template)return <section className="adminMain"><div className="errorNotice"><strong>A sablon nem tölthető be.</strong></div><div className="actions"><Link className="btn btnGhost" href="/admin/email-sablonok">Vissza a sablonokhoz</Link></div></section>;
  const parsed=emailDocumentSchema.safeParse(template.draft_document);
  if(!parsed.success)return <section className="adminMain"><div className="errorNotice"><strong>A piszkozat dokumentuma érvénytelen.</strong></div></section>;
  let logoUrl:string|null=null;
  if(template.brand_kit_id){const{data}=await admin.from('email_brand_kits').select('logo_url').eq('instance_id',scope.instanceId).eq('id',template.brand_kit_id).maybeSingle();logoUrl=data?.logo_url??null;}
  else{const{data}=await admin.from('email_brand_kits').select('logo_url').eq('instance_id',scope.instanceId).eq('is_default',true).maybeSingle();logoUrl=data?.logo_url??null;}
  const identity=await getCommunicationIdentityForInstance(scope.instanceId);
  const previewContext=demoContext({name:identity.brandName,siteUrl:identity.siteUrl,supportEmail:identity.supportEmail},logoUrl);
  return <div className={styles.workspacePage}><EmailBuilderWordLikeShellV3 previewContext={previewContext}><EmailBuilderMobileShell><EmailBuilderEditor template={{id:template.id,name:template.name,status:template.status,activeVersionId:template.active_version_id,updatedAt:template.updated_at}} initialDocument={parsed.data} previewContext={previewContext}/></EmailBuilderMobileShell></EmailBuilderWordLikeShellV3></div>;
}
