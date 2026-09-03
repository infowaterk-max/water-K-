import { requirePlatformOperator } from '@/lib/auth/platform-operator';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatHuf } from '@/lib/catalog';
import { OperationsCycleButton,OrderOperationAction } from '@/components/admin/operations-actions';
import { commerceStatusLabel,customerTierLabel,humanizeCode,operationalStatusLabel,stateTone } from '@/lib/admin/operational-display';

export const dynamic='force-dynamic';

type Queue={order_id:string;order_number:string;commerce_status:string;created_at:string;total_gross_huf:number;operational_status:string;priority_score:number;exception_code:string|null;customer_value_tier:string;customer_value_score:number;age_hours:number;open_support_count:number;urgent_support_count:number;open_return_count:number;service_attention_required:boolean};
type Kpi={open_orders:number;blocked_orders:number;ready_to_pack_orders:number;packed_orders:number;over_24h_orders:number;service_attention_orders:number;high_value_open_orders:number;avg_open_age_hours:number};
type Summary={open_orders:number;blocked_orders:number;fulfillment_backlog:number;zero_atp_variants:number;reserved_units:number;oversold_units:number};
type Atp={variant_id:string;sku:string;label:string;on_hand_quantity:number;reserved_quantity:number;available_to_promise_quantity:number;oversold_quantity:number};

export default async function OperationsPage(){
  await requirePlatformOperator();
  const a=createAdminClient();
  const[queueResult,summaryResult,kpiResult,stockResult]=await Promise.all([
    a.from('order_service_operations').select('*').order('priority_score',{ascending:false}).order('created_at',{ascending:true}).limit(200),
    a.from('operations_inventory_summary').select('*').maybeSingle(),
    a.from('operations_kpi_summary').select('*').maybeSingle(),
    a.from('inventory_available_to_promise').select('*').order('available_to_promise_quantity',{ascending:true}).limit(100),
  ]);
  const rows=(queueResult.data??[]) as Queue[];
  const summary=(summaryResult.data??{open_orders:0,blocked_orders:0,fulfillment_backlog:0,zero_atp_variants:0,reserved_units:0,oversold_units:0}) as Summary;
  const kpi=(kpiResult.data??{open_orders:0,blocked_orders:0,ready_to_pack_orders:0,packed_orders:0,over_24h_orders:0,service_attention_orders:0,high_value_open_orders:0,avg_open_age_hours:0}) as Kpi;
  const stock=(stockResult.data??[]) as Atp[];
  const loadError=Boolean(queueResult.error||summaryResult.error||kpiResult.error||stockResult.error);

  return <section className="adminMain">
    <span className="eyebrow">Platform · Működési kivételek</span>
    <h1 className="sectionTitle">Operációs irányítóközpont</h1>
    <p className="lead">A platformon figyelmet igénylő rendelési, teljesítési, ügyfélszolgálati és készletkivételek. Ez a nézet nem helyettesíti az egyes webshopok napi rendeléskezelését.</p>
    {loadError&&<div className="errorNotice" role="alert"><strong>Az operációs adatok egy része most nem tölthető be.</strong></div>}

    <div className="actions"><OperationsCycleButton/></div>
    <div className="cards adminMetricCards">
      <div className="card"><span className="badge">Nyitott</span><div className="price">{kpi.open_orders}</div></div>
      <div className="card"><span className="badge">Blokkolt</span><div className="price">{kpi.blocked_orders}</div></div>
      <div className="card"><span className="badge">Csomagolható</span><div className="price">{kpi.ready_to_pack_orders}</div></div>
      <div className="card"><span className="badge">24 órán túl</span><div className="price">{kpi.over_24h_orders}</div></div>
      <div className="card"><span className="badge">Ügyfélszolgálati figyelem</span><div className="price">{kpi.service_attention_orders}</div></div>
      <div className="card"><span className="badge">Átlagos kor</span><div className="price">{Number(kpi.avg_open_age_hours).toFixed(1)} óra</div></div>
    </div>

    <section className="card">
      <h2>Operációs kivételsor</h2>
      <div className="adminTableScroll"><table className="adminTable">
        <thead><tr><th>Rendelés</th><th>Kereskedelmi állapot</th><th>Operációs állapot</th><th>Prioritás</th><th>Ügyfélszint</th><th>Kor</th><th>Érték</th><th>Kapcsolódó ügyek</th><th>Kivétel</th><th>Művelet</th></tr></thead>
        <tbody>{rows.map(r=><tr key={r.order_id}>
          <td><strong>{r.order_number}</strong></td>
          <td>{commerceStatusLabel(r.commerce_status)}</td>
          <td><span className={`adminStatePill ${stateTone(r.operational_status)}`}>{operationalStatusLabel(r.operational_status)}</span></td>
          <td><strong>{r.priority_score}</strong>{r.service_attention_required&&<div className="muted">ügyfélszolgálati figyelem</div>}</td>
          <td>{customerTierLabel(r.customer_value_tier)} · {r.customer_value_score}</td>
          <td>{Number(r.age_hours).toFixed(1)} óra</td>
          <td>{formatHuf(Number(r.total_gross_huf))}</td>
          <td>{r.open_support_count} ügy · {r.open_return_count} visszáru{r.urgent_support_count>0&&<div className="muted">{r.urgent_support_count} sürgős ügy</div>}</td>
          <td>{r.exception_code?humanizeCode(r.exception_code):'—'}</td>
          <td><OrderOperationAction orderId={r.order_id} status={r.operational_status}/></td>
        </tr>)}</tbody>
      </table></div>
      {!loadError&&rows.length===0&&<p className="muted">Nincs figyelmet igénylő operációs kivétel.</p>}
    </section>

    <section className="card">
      <h2>Készlet / értékesíthető mennyiség</h2>
      <p className="muted">A szabad készlet a checkout után még értékesíthető mennyiség. Itt csak az eltérések és foglalási problémák platformszintű felügyelete a cél.</p>
      <div className="adminTableScroll"><table className="adminTable">
        <thead><tr><th>SKU</th><th>Variáns</th><th>Becsült fizikai</th><th>Foglalt</th><th>Szabad</th><th>Túladott</th></tr></thead>
        <tbody>{stock.map(v=><tr key={v.variant_id}>
          <td><strong>{v.sku}</strong></td><td>{v.label}</td><td>{v.on_hand_quantity}</td><td>{v.reserved_quantity}</td>
          <td><strong>{v.available_to_promise_quantity}</strong></td>
          <td><span className={v.oversold_quantity>0?'adminStatePill danger':'adminStatePill neutral'}>{v.oversold_quantity}</span></td>
        </tr>)}</tbody>
      </table></div>
      <p className="muted">Nyitott: {summary.open_orders} · teljesítési backlog: {summary.fulfillment_backlog} · foglalt egység: {summary.reserved_units} · 0 szabad készletű variáns: {summary.zero_atp_variants} · túladott egység: {summary.oversold_units}</p>
    </section>
  </section>;
}
