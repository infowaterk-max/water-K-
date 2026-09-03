import Link from'next/link';
import{notFound}from'next/navigation';
import{createAdminClient}from'@/lib/supabase/admin';
import{requirePlanFeature}from'@/lib/plans/access';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{CampaignActions}from'@/components/admin/campaign-actions';

export const dynamic='force-dynamic';

const paid=['paid','processing','shipped','completed'];
type C={id:string;name:string;segment:string;status:string;channel:string;budget_huf:number;utm_campaign:string|null;external_impressions:number;external_clicks:number};
type O={id:string;order_number:string;customer_id:string|null;customer_email:string;total_gross_huf:number;created_at:string};
type I={order_id:string;quantity:number;line_total_net_huf_snapshot:number|null;unit_cost_net_huf_snapshot:number|null};
const money=(n:number)=>`${new Intl.NumberFormat('hu-HU').format(Math.round(n))} Ft`;
const channels:Record<string,string>={email:'Saját kommunikáció',facebook:'Facebook',instagram:'Instagram',tiktok:'TikTok',youtube:'YouTube',google:'Google',other:'Egyéb'};

export default async function Page({params}:{params:Promise<{id:string}>}){
  await requirePlanFeature('advancedCampaigns');
  const scope=await requireCurrentStoreContext('marketing.manage');
  const{id}=await params,a=createAdminClient();
  const{data:c,error:campaignError}=await a.from('marketing_campaigns')
    .select('id,name,segment,status,channel,budget_huf,utm_campaign,external_impressions,external_clicks')
    .eq('id',id).eq('instance_id',scope.instanceId).maybeSingle();

  if(campaignError)throw new Error('A kampány adatai most nem tölthetők be.');
  if(!c)notFound();
  const campaign=c as C;

  if(campaign.segment==='external'&&campaign.utm_campaign){
    const{data:od,error:orderError}=await a.from('orders')
      .select('id,order_number,customer_id,customer_email,total_gross_huf,created_at')
      .eq('instance_id',scope.instanceId).in('status',paid).ilike('utm_campaign',campaign.utm_campaign)
      .order('created_at',{ascending:false}).limit(10000);
    const orders=(od??[])as O[],ids=orders.map(o=>o.id);

    let items:I[]=[];let itemError=false;
    if(ids.length){
      const{data,error}=await a.from('order_items')
        .select('order_id,quantity,line_total_net_huf_snapshot,unit_cost_net_huf_snapshot')
        .eq('instance_id',scope.instanceId).in('order_id',ids).limit(50000);
      items=(data??[])as I[];itemError=Boolean(error);
    }

    const loadError=Boolean(orderError||itemError);
    const revenue=orders.reduce((s,o)=>s+Number(o.total_gross_huf||0),0);
    const completeProfitData=!orderError&&!itemError&&(orders.length===0||(items.length>0&&items.length<50000&&items.every(i=>i.line_total_net_huf_snapshot!=null&&i.unit_cost_net_huf_snapshot!=null)));
    const net=completeProfitData?items.reduce((s,i)=>s+Number(i.line_total_net_huf_snapshot||0),0):0;
    const cost=completeProfitData?items.reduce((s,i)=>s+Number(i.unit_cost_net_huf_snapshot)*Number(i.quantity||0),0):0;
    const margin=completeProfitData?net-cost:null,budget=Number(campaign.budget_huf||0),result=margin===null?null:margin-budget;
    const revenuePerSpend=budget>0?revenue/budget:null,buyers=new Set(orders.map(o=>o.customer_id??o.customer_email.toLowerCase())).size;
    const conversion=campaign.external_clicks>0?orders.length/campaign.external_clicks*100:null;

    return <section className="adminMain">
      <Link href="/admin/kampanyok" className="textLink">← Kampányok</Link>
      <span className="eyebrow">{channels[campaign.channel]??campaign.channel}</span>
      <h1 className="sectionTitle">{campaign.name}</h1>
      <p className="lead">Kampányazonosító: <code>{campaign.utm_campaign}</code></p>
      {loadError&&<div className="errorNotice" role="alert"><strong>A kampányhoz kapcsolódó rendelési vagy önköltségadatok egy része most nem tölthető be.</strong> Hiányos adatok mellett a megtérülési mutatókat nem számítjuk kész eredménynek.</div>}

      <div className="cards adminMetricCards">
        <div className="card"><span className="badge">Költés</span><div className="price">{money(budget)}</div></div>
        <div className="card"><span className="badge">Kattintás</span><div className="price">{campaign.external_clicks}</div><p className="muted">{campaign.external_impressions.toLocaleString('hu-HU')} megjelenés</p></div>
        <div className="card"><span className="badge">Rendelés / vásárló</span><div className="price">{orderError?'—':`${orders.length} / ${buyers}`}</div><p className="muted">{orderError?'A rendelési adat most nem elérhető.':conversion===null?'Nincs kattintási adat.':`${conversion.toFixed(1)}% kattintás → rendelés`}</p></div>
        <div className="card"><span className="badge">Kampányhoz köthető bevétel</span><div className="price">{orderError?'—':money(revenue)}</div><p className="muted">Bevétel / költés: {orderError||revenuePerSpend===null?'—':`${revenuePerSpend.toFixed(2)}×`}</p></div>
        <div className="card"><span className="badge">Becsült fedezet</span><div className="price">{margin===null?'—':money(margin)}</div><p className="muted">{margin===null?'Teljes önköltségadat szükséges.':'Nettó árbevétel mínusz rögzített önköltség.'}</p></div>
        <div className="card"><span className="badge">Kampány utáni eredmény</span><div className="price">{result===null?'—':money(result)}</div><p className="muted">{result===null?'Teljes önköltségadat szükséges.':result>=0?'A mért fedezet alapján megtérült.':'A mért fedezet alapján nem térült meg.'}</p></div>
      </div>

      <section className="tableCard">
        <h2>Kampányhoz köthető rendelések</h2>
        <div className="adminTableScroll"><table className="adminTable"><thead><tr><th>Rendelés</th><th>Vásárló</th><th>Időpont</th><th>Bruttó bevétel</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td>{o.order_number}</td><td>{o.customer_email}</td><td>{new Date(o.created_at).toLocaleString('hu-HU')}</td><td>{money(o.total_gross_huf)}</td></tr>)}</tbody></table></div>
        {!orderError&&orders.length===0&&<p className="muted">Még nincs ehhez a kampányazonosítóhoz köthető fizetett rendelés.</p>}
      </section>
    </section>;
  }

  const[
    {data:recipients,error:recipientError},
    {data:conversions,error:conversionError},
    {data:events,error:eventError},
  ]=await Promise.all([
    a.from('marketing_campaign_recipients').select('id,email,customer_name,eligible,communication_job_id').eq('instance_id',scope.instanceId).eq('campaign_id',id).limit(10000),
    a.from('marketing_campaign_conversions').select('recipient_id,order_id,order_number,total_gross_huf,order_created_at').eq('instance_id',scope.instanceId).eq('campaign_id',id).limit(10000),
    a.from('marketing_campaign_events').select('id,action,note,created_at').eq('instance_id',scope.instanceId).eq('campaign_id',id).order('created_at',{ascending:false}).limit(100),
  ]);
  const rows=recipients??[],cv=conversions??[],revenue=cv.reduce((s,v)=>s+Number(v.total_gross_huf||0),0),buyers=new Set(cv.map(v=>v.recipient_id)).size;
  const loadError=Boolean(recipientError||conversionError||eventError);

  return <section className="adminMain">
    <Link href="/admin/kampanyok" className="textLink">← Kampányok</Link>
    <span className="eyebrow">Saját kommunikáció</span>
    <h1 className="sectionTitle">{campaign.name}</h1>
    {loadError&&<div className="errorNotice" role="alert"><strong>A kampány célcsoport-, eredmény- vagy eseményadatai közül valamelyik most nem tölthető be.</strong> A hiányzó értékeket nem tekintjük nullának.</div>}
    <div className="cards adminMetricCards">
      <div className="card"><span className="badge">Célcsoport</span><div className="price">{recipientError?'—':rows.length}</div></div>
      <div className="card"><span className="badge">Vásárlóvá vált címzettek</span><div className="price">{conversionError?'—':buyers}</div></div>
      <div className="card"><span className="badge">Kampányhoz köthető rendelések</span><div className="price">{conversionError?'—':cv.length}</div></div>
      <div className="card"><span className="badge">Kampányhoz köthető bevétel</span><div className="price">{conversionError?'—':money(revenue)}</div></div>
    </div>
    <section className="card"><h2>Kampányműveletek</h2>{!loadError?<CampaignActions campaignId={campaign.id} status={campaign.status}/>:<div className="adminAuditNotice"><strong>Kampányművelet átmenetileg letiltva.</strong><p>Előbb a célcsoport-, eredmény- és eseményadatok teljes betöltése szükséges.</p></div>}</section>
    <section className="card"><h2>Kampánytörténet</h2><div className="integrationList">{events?.map(e=><div key={e.id}><span><strong>{e.action}</strong>{e.note&&<div className="muted">{e.note}</div>}</span><span>{new Date(e.created_at).toLocaleString('hu-HU')}</span></div>)}</div>{!eventError&&!events?.length&&<p className="muted">Még nincs naplózott kampányművelet.</p>}</section>
  </section>;
}
