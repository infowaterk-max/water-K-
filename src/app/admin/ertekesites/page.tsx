import{requirePlanFeature}from'@/lib/plans/access';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{getPlatformRole}from'@/lib/auth/platform-operator';
import{getPilotAcceptanceInstanceId}from'@/lib/storefront/pilot-access';
import{createAdminClient}from'@/lib/supabase/admin';
import{formatHuf}from'@/lib/catalog';
import{CommercialRefresh,OpportunityActions,OfferCreate,TaskActions,OfferActions}from'@/components/admin/commercial-actions';
export const dynamic='force-dynamic';
type Summary={channel:string;open_count:number;pipeline_net_huf:number;weighted_pipeline_net_huf:number;overdue_pipeline_net_huf:number};
const statusLabels:Record<string,string>={draft:'Tervezet',approved:'Jóváhagyott',sent:'Kiküldött',accepted:'Elfogadott',cancelled:'Törölt',open:'Nyitott',in_progress:'Folyamatban',won:'Megnyert',lost:'Elvesztett'};
const kindLabels:Record<string,string>={retention:'Megtartás',winback:'Visszanyerés',upsell:'Nagyobb értékű ajánlat',cross_sell:'Kapcsolódó ajánlat',reseller:'Partnerértékesítés',quote:'Ajánlatkérés'};
const readable=(value:string,map:Record<string,string>)=>map[value]??value.replace(/[_-]+/g,' ').replace(/^./,c=>c.toUpperCase());
function rfqContext(source:unknown){
 const s=source&&typeof source==='object'&&!Array.isArray(source)?source as Record<string,unknown>:null;
 if(s?.origin!=='customer_b2b_rfq'||!Array.isArray(s.items))return null;
 const items=s.items.flatMap(item=>item&&typeof item==='object'&&!Array.isArray(item)?[item as Record<string,unknown>]:[]);
 const first=items[0];
 return{
  requestId:typeof s.quoteRequestId==='string'?s.quoteRequestId:'',
  note:typeof s.customerNote==='string'?s.customerNote:'',
  firstVariantId:typeof first?.variantId==='string'?first.variantId:'',
  firstQuantity:typeof first?.quantity==='number'?Math.max(1,Math.round(first.quantity)):1,
  summary:items.map(item=>[item.sku,item.label,`${Number(item.quantity)||1} db`].filter(Boolean).join(' · ')).join(' | '),
 };
}

async function requireSalesAcceptanceEntry(){
 const scope=await requireCurrentStoreContext('sales.manage');
 const acceptanceInstanceId=process.env.VERCEL_ENV==='preview'?await getPilotAcceptanceInstanceId():null;
 const platformRole=acceptanceInstanceId?await getPlatformRole():null;
 const isPlatformPilotAcceptance=Boolean(platformRole&&acceptanceInstanceId&&acceptanceInstanceId===scope.instanceId);
 if(!isPlatformPilotAcceptance)await requirePlanFeature('crm');
 return scope;
}

export default async function SalesAdmin(){
 const scope=await requireSalesAcceptanceEntry();const a=createAdminClient();
 const[summaryResult,opportunityResult,taskResult,offerResult,variantResult]=await Promise.all([
  a.from('commercial_pipeline_summary').select('*').eq('instance_id',scope.instanceId),
  a.from('commercial_opportunities').select('id,channel,kind,status,priority_score,expected_value_net_huf,probability_percent,due_at,reason,recommended_action,source').eq('instance_id',scope.instanceId).in('status',['open','in_progress']).order('priority_score',{ascending:false}).limit(100),
  a.from('sales_tasks').select('id,title,status,priority,due_at,description').eq('instance_id',scope.instanceId).in('status',['open','in_progress']).order('priority',{ascending:false}).limit(50),
  a.from('commercial_offers').select('id,status,quantity,discount_percent,minimum_margin_percent,total_net_huf').eq('instance_id',scope.instanceId).in('status',['draft','approved','sent']).order('created_at',{ascending:false}).limit(50),
  a.from('product_variants').select('id,sku,label').eq('instance_id',scope.instanceId).eq('active',true).order('sku'),
 ]);
 const sums=(summaryResult.data??[])as Summary[],opps=opportunityResult.data??[],tasks=taskResult.data??[],offers=offerResult.data??[],variants=variantResult.data??[],loadError=Boolean(summaryResult.error||opportunityResult.error||taskResult.error||offerResult.error||variantResult.error),canAct=!loadError,total=sums.reduce((x,r)=>x+Number(r.pipeline_net_huf||0),0),weighted=sums.reduce((x,r)=>x+Number(r.weighted_pipeline_net_huf||0),0),overdue=sums.reduce((x,r)=>x+Number(r.overdue_pipeline_net_huf||0),0);
 return <section className="adminMain">
  <span className="eyebrow">Pro · Kereskedelmi irányítóközpont</span><h1 className="sectionTitle">Értékesítési lehetőségek</h1><p className="lead">A CRM összegyűjti a nyitott értékesítési lehetőségeket, feladatokat és ajánlatokat, kizárólag az aktuális webshop adataiból.</p>
  {loadError&&<div className="errorNotice" role="alert"><strong>Az értékesítési adatok egy része most nem tölthető be.</strong> Biztonsági okból a módosító műveleteket addig letiltjuk.</div>}
  <section className="auditGuide"><div><span className="eyebrow">Mit jelentenek a számok?</span><h2>Nyitott értékből várható bevétel</h2></div><p>A „Nyitott lehetőség” az összes potenciális nettó érték. A „Várható érték” ezt a becsült sikerességi eséllyel súlyozza. A lejárt érték olyan lehetőség, amelynek határideje már elmúlt.</p></section>
  {canAct?<CommercialRefresh/>:<p className="muted">Frissítés az adatok teljes betöltése után indítható.</p>}
  <div className="cards adminMetricCards"><div className="card"><span className="badge">Nyitott lehetőség</span><div className="price">{summaryResult.error?'—':formatHuf(total)}</div></div><div className="card"><span className="badge">Várható érték</span><div className="price">{summaryResult.error?'—':formatHuf(weighted)}</div></div><div className="card"><span className="badge">Lejárt lehetőség</span><div className="price">{summaryResult.error?'—':formatHuf(overdue)}</div></div><div className="card"><span className="badge">Nyitott feladat</span><div className="price">{taskResult.error?'—':tasks.length}</div></div></div>
  <section className="card"><h2>Legfontosabb lehetőségek</h2><div className="adminTableScroll"><table className="adminTable"><thead><tr><th>Prioritás</th><th>Csatorna</th><th>Típus</th><th>Várható nettó érték</th><th>Becsült esély</th><th>Javasolt következő lépés</th><th>Művelet</th></tr></thead><tbody>{opps.map(x=>{const rfq=rfqContext(x.source);return <tr key={x.id}><td><strong>{x.priority_score}</strong></td><td>{x.channel.toUpperCase()}</td><td>{rfq?'Ajánlatkérés':readable(x.kind,kindLabels)}{rfq?<><br/><span className="muted">{rfq.summary||'B2B partnerkérés'}{rfq.note?` · ${rfq.note}`:''}</span></>:null}</td><td>{formatHuf(Number(x.expected_value_net_huf))}</td><td>{Number(x.probability_percent).toFixed(0)}%</td><td>{x.recommended_action??x.reason??'Nincs javaslat'}</td><td>{canAct?<><OpportunityActions id={x.id}/><OfferCreate opportunityId={x.id} variants={variants} defaultVariantId={rfq?.firstVariantId} defaultQuantity={rfq?.firstQuantity}/></>:<span className="muted">Adatbetöltés szükséges</span>}</td></tr>})}</tbody></table></div>{!loadError&&!opps.length&&<p className="muted">Nincs nyitott értékesítési lehetőség.</p>}</section>
  <div className="cards"><section className="card"><h2>Értékesítési feladatok</h2>{tasks.map(x=><div key={x.id}><p><strong>{x.priority} · {x.title}</strong><br/><span className="muted">{x.description??'Nincs leírás'}</span></p>{canAct?<TaskActions id={x.id}/>:<span className="muted">Adatbetöltés szükséges</span>}</div>)}{!taskResult.error&&!tasks.length&&<p className="muted">Nincs nyitott értékesítési feladat.</p>}</section><section className="card"><h2>Aktív ajánlatok</h2>{offers.map(x=><div key={x.id}><p><strong>{readable(x.status,statusLabels)} · {x.discount_percent}% kedvezmény</strong><br/><span className="muted">{x.quantity} db · elvárt minimum árrés {x.minimum_margin_percent}% · {x.total_net_huf==null?'még nincs jóváhagyott érték':formatHuf(Number(x.total_net_huf))}</span></p>{canAct?<OfferActions id={x.id} status={x.status}/>:<span className="muted">Adatbetöltés szükséges</span>}</div>)}{!offerResult.error&&!offers.length&&<p className="muted">Nincs aktív ajánlat.</p>}</section></div>
 </section>;
}
