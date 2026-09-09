import Link from 'next/link';
import { z } from 'zod';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCommunicationIdentityForInstance } from '@/lib/communication/identity';
import { emailDocumentSchema, type EmailRenderContext } from '@/lib/email-builder/types';
import { applyEmailBrandDesign } from '@/lib/email-builder/active-template';
import { renderEmail } from '@/lib/email-builder/render/render-email';

export const dynamic='force-dynamic';
const uuid=z.string().uuid();

const demoContext=(brand:{name:string;siteUrl:string;supportEmail:string|null},logoUrl:string|null):EmailRenderContext=>({
  store:{name:brand.name,siteUrl:brand.siteUrl,logoUrl,supportEmail:brand.supportEmail},
  customer:{firstName:'Anna',fullName:'Minta Anna',email:'anna@example.com',type:'b2c'},
  order:{number:'SHOP-2026-00124',subtotal:21980,shipping:1490,discount:2000,tax:4247,total:21470,currency:'HUF',items:[{name:'Prémium termék',variant:'750 g',quantity:1,unitPrice:14990,lineTotal:14990},{name:'Kiegészítő termék',variant:'40 g',quantity:2,unitPrice:3495,lineTotal:6990}],invoiceUrl:'https://example.com/szamla/demo'},
  payment:{method:'bank_transfer',accountHolder:'Minta Webshop Kft.',bankName:'Minta Bank',bankAccount:'HU00 0000 0000 0000 0000 0000 0000',note:'A közleményben kérjük add meg a rendelési számot.'},
  shipping:{method:'courier',carrier:'Minta Futár',trackingNumber:null,trackingUrl:null,address:'Minta Anna\n2760 Nagykáta\nMinta utca 12.'},
  billing:{address:'Minta Anna\n2760 Nagykáta\nMinta utca 12.'},
  coupon:{code:'WELCOME2000',discount:2000,expiry:null},
});

export default async function EmailTemplatePreview({params}:{params:Promise<{id:string}>}){
  const scope=await requireCurrentStoreContext('marketing.manage');
  const{id}=await params;
  if(!uuid.safeParse(id).success)return <section className="adminMain"><div className="errorNotice"><strong>Érvénytelen sablonazonosító.</strong></div></section>;
  const admin=createAdminClient();
  const{data:template,error}=await admin.from('email_templates').select('id,template_key,name,family,purpose,status,brand_kit_id,draft_document,draft_schema_version,active_version_id,updated_at').eq('instance_id',scope.instanceId).eq('id',id).maybeSingle();
  if(error||!template)return <section className="adminMain"><div className="errorNotice"><strong>A sablon nem tölthető be.</strong></div><div className="actions"><Link className="btn btnGhost" href="/admin/email-sablonok">Vissza a sablonokhoz</Link></div></section>;
  const parsed=emailDocumentSchema.safeParse(template.draft_document);
  if(!parsed.success)return <section className="adminMain"><div className="errorNotice"><strong>A piszkozat dokumentuma érvénytelen.</strong></div></section>;
  let brandKit:{logo_url:string|null;tokens:unknown}|null=null;
  if(template.brand_kit_id){const{data}=await admin.from('email_brand_kits').select('logo_url,tokens').eq('instance_id',scope.instanceId).eq('id',template.brand_kit_id).maybeSingle();brandKit=data??null;}
  else{const{data}=await admin.from('email_brand_kits').select('logo_url,tokens').eq('instance_id',scope.instanceId).eq('is_default',true).maybeSingle();brandKit=data??null;}
  const identity=await getCommunicationIdentityForInstance(scope.instanceId);
  const document=brandKit?applyEmailBrandDesign(parsed.data,brandKit.tokens):parsed.data;
  let rendered;try{rendered=renderEmail(document,demoContext({name:identity.brandName,siteUrl:identity.siteUrl,supportEmail:identity.supportEmail},brandKit?.logo_url??null));}catch{return <section className="adminMain"><div className="errorNotice"><strong>Az előnézet nem renderelhető biztonságosan.</strong></div></section>;}
  return <section className="adminMain">
    <div className="adminToolbar"><div><span className="eyebrow">Piszkozat előnézet · nincs aktiválás</span><h1 className="sectionTitle">{template.name}</h1><p className="lead">A preview demó rendelési adatokkal fut ugyanazon a renderer motoron, amelyet később az éles levél használhat. Ez a nézet nem küld e-mailt és nem módosítja az aktív verziót.</p></div><Link className="btn btnGhost" href="/admin/email-sablonok">Vissza</Link></div>
    <div className="cards" style={{gridTemplateColumns:'minmax(0,1fr) minmax(280px,.42fr)',alignItems:'start'}}>
      <div className="card" style={{padding:12,overflow:'hidden'}}><iframe title="E-mail sablon előnézet" sandbox="" srcDoc={rendered.html} style={{width:'100%',minHeight:760,border:0,borderRadius:20,background:'#fff'}}/></div>
      <aside className="card"><span className="badge">{template.status==='active'?'Aktív sablon · draft preview':'Piszkozat'}</span><h3>Preview adatok</h3><p><strong>Tárgy</strong><br/>{rendered.subject}</p><p><strong>Preheader</strong><br/>{rendered.preheader||'—'}</p><p><strong>Család</strong><br/>{template.family}</p><p><strong>Schema</strong><br/>v{template.draft_schema_version}</p><p><strong>Aktív verzió</strong><br/>{template.active_version_id?'Van – ezt a preview nem módosítja':'Nincs'}</p>{rendered.warnings.length>0&&<div className="notice"><strong>Figyelmeztetések</strong><ul>{rendered.warnings.map(item=><li key={item}>{item}</li>)}</ul></div>}<div className="notice"><strong>Biztonságos piszkozat</strong><p>Ezen a nézeten nincs aktiválás és nincs tesztküldés. Az aktív e-mail sablon változatlan marad.</p></div></aside>
    </div>
  </section>;
}
