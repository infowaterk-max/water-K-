import Link from'next/link';
import{createAdminClient}from'@/lib/supabase/admin';
import{requirePlanFeature}from'@/lib/plans/access';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{getCurrentWebshopInstance}from'@/lib/instances/access';
import{getPlatformRole,requirePlatformOperator}from'@/lib/auth/platform-operator';
import{ActionCycleButton,ProposalActions}from'@/components/admin/action-center-actions';
export const dynamic='force-dynamic';

type Proposal={id:string;instance_id:string;proposal_key:string;status:string;action_kind:string;impact_class:string;risk_score:number;rationale:string;expires_at:string;simulated_at:string|null;approved_at:string|null;executed_at:string|null;alert_id:string|null};
type Instance={id:string;name:string;slug:string;status:string;subscription_plan:string};

export default async function Page(){
  const[platformRole,currentInstance]=await Promise.all([getPlatformRole(),getCurrentWebshopInstance()]);
  if(platformRole&&!currentInstance){
    await requirePlatformOperator();
    const a=createAdminClient();
    const[{data:proposalData,error:proposalError},{data:instanceData,error:instanceError}]=await Promise.all([
      a.from('action_proposals').select('id,instance_id,proposal_key,status,action_kind,impact_class,risk_score,rationale,expires_at,simulated_at,approved_at,executed_at,alert_id').order('risk_score',{ascending:false}).order('expires_at',{ascending:true}).limit(500),
      a.from('webshop_instances').select('id,name,slug,status,subscription_plan').in('status',['pilot','active']).order('name'),
    ]);
    const rows=(proposalData??[])as Proposal[],instances=(instanceData??[])as Instance[],instanceById=new Map(instances.map(x=>[x.id,x]));
    const active=rows.filter(r=>['proposed','simulated','approved'].includes(r.status)),critical=active.filter(r=>Number(r.risk_score)>=80).length,affected=new Set(active.map(r=>r.instance_id)).size;
    return <section className="adminMain">
      <span className="eyebrow">Shoperation · Platform</span><h1 className="sectionTitle">Intézkedési központ</h1>
      <p className="lead">Platformszintű, tenantfüggetlen felügyeleti nézet. Itt minden aktív webshop javaslatai áttekinthetők; módosító műveletet csak konkrét webshop-környezetben engedünk.</p>
      {(proposalError||instanceError)&&<div className="errorNotice"><strong>Az intézkedési adatok egy része most nem tölthető be.</strong></div>}
      <div className="cards adminMetricCards"><div className="card"><span className="badge">Aktív javaslat</span><div className="price">{active.length}</div></div><div className="card"><span className="badge">Érintett webshop</span><div className="price">{affected}</div></div><div className="card"><span className="badge">80+ kockázat</span><div className="price">{critical}</div></div><div className="card"><span className="badge">Aktív webshop</span><div className="price">{instances.length}</div></div></div>
      <section className="card"><div className="adminToolbar"><div><span className="eyebrow">Platform felügyelet</span><h2>Javaslatok webshoponként</h2></div><Link className="btn btnGhost" href="/admin/platform/webaruhazak">Ügyfél-webshopok</Link></div>
      <div className="adminTableScroll"><table className="adminTable"><thead><tr><th>Webshop</th><th>Javaslat</th><th>Hatás</th><th>Kockázat</th><th>Állapot</th><th>Lejárat</th></tr></thead><tbody>{rows.map(r=>{const shop=instanceById.get(r.instance_id);return <tr key={r.id}><td><strong>{shop?.name??'Ismeretlen webshop'}</strong><div className="muted">{shop?.slug??r.instance_id}</div></td><td><strong>{r.action_kind}</strong><div className="muted">{r.rationale}</div></td><td>{r.impact_class}</td><td>{r.risk_score}</td><td>{r.status}</td><td>{new Date(r.expires_at).toLocaleString('hu-HU')}</td></tr>})}</tbody></table></div>{!rows.length&&<p className="muted">Nincs platformszinten megjeleníthető intézkedési javaslat.</p>}</section>
      <section className="card"><strong>Végrehajtási biztonság</strong><p className="muted">Szimuláció, jóváhagyás és végrehajtás kizárólag egy konkrét tenant kontextusában futtatható. A platformnézet ezért szándékosan csak olvasható.</p></section>
    </section>;
  }

  await requirePlanFeature('executiveAnalytics');
  const store=await requireCurrentStoreContext('analytics.read'),a=createAdminClient();
  const{data}=await a.from('action_proposals').select('id,proposal_key,status,action_kind,impact_class,risk_score,rationale,expires_at,simulated_at,approved_at,executed_at,alert_id').eq('instance_id',store.instanceId).order('risk_score',{ascending:false}).order('expires_at',{ascending:true}).limit(250);
  const rows=data??[],active=rows.filter((r:any)=>['proposed','simulated','approved'].includes(r.status)).length;
  return <section className="adminMain"><span className="eyebrow">Pro · Intézkedési központ</span><h1 className="sectionTitle">Intézkedési központ</h1><p className="lead">A javaslatok, jóváhagyások és végrehajtások webshoponként elkülönítve működnek. Más ügyfél adata nem kerülhet ebbe a munkafolyamatba.</p><div className="actions"><ActionCycleButton/></div><div className="cards adminMetricCards"><div className="card"><span className="badge">Aktív</span><div className="price">{active}</div></div><div className="card"><span className="badge">Összes</span><div className="price">{rows.length}</div></div></div><section className="card"><h2>Intézkedési sor</h2><div className="adminTableScroll"><table className="adminTable"><thead><tr><th>Javaslat</th><th>Hatás</th><th>Kockázat</th><th>Állapot</th><th>Lejárat</th><th>Művelet</th></tr></thead><tbody>{rows.map((r:any)=><tr key={r.id}><td><strong>{r.action_kind}</strong><div className="muted">{r.rationale}</div></td><td>{r.impact_class}</td><td>{r.risk_score}</td><td>{r.status}</td><td>{new Date(r.expires_at).toLocaleString('hu-HU')}</td><td><ProposalActions proposalId={r.id} status={r.status} approvalMode="single" approvalCount={r.approved_at?1:0}/></td></tr>)}</tbody></table></div>{!rows.length&&<p className="muted">Nincs ehhez a webshophoz tartozó intézkedési javaslat.</p>}</section></section>;
}
