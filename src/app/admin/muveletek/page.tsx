import{requirePlatformOperator}from'@/lib/auth/platform-operator';
import{createAdminClient}from'@/lib/supabase/admin';
import{formatHuf}from'@/lib/catalog';
import{OperationsCycleButton,OrderOperationAction}from'@/components/admin/operations-actions';
import{commerceStatusLabel,customerTierLabel,humanizeCode,operationalStatusLabel,stateTone}from'@/lib/admin/operational-display';

export const dynamic='force-dynamic';

type Queue={order_id:string;order_number:string;commerce_status:string;created_at:string;total_gross_huf:number;operational_status:string;priority_score:number;exception_code:string|null;customer_value_tier:string;customer_value_score:number;age_hours:number;open_support_count:number;urgent_support_count:number;open_return_count:number;service_attention_required:boolean};
type Kpi={open_orders:number;blocked_orders:number;ready_to_pack_orders:number;packed_orders:number;over_24h_orders:number;service_attention_orders:number;high_value_open_orders:number;avg_open_age_hours:number};
type Summary={open_orders:number;blocked_orders:number;fulfillment_backlog:number;zero_atp_variants:number;reserved_units:number;oversold_units:number};
type Atp={variant_id:string;sku:string;label:string;on_hand_quantity:number;reserved_quantity:number;available_to_promise_quantity:number;oversold_quantity:number};
type Instance={id:string;name:string;slug:string};

const exceptionLabel:Record<string,string>={insufficient_stock:'Nincs elegendő készlet',payment_fulfillment_mismatch:'Fizetés és teljesítés eltér',shipment_status_mismatch:'Szállítási állapot eltér',delivery_status_mismatch:'Kézbesítési állapot eltér',sla_over_48h:'48 órán túli feldolgozás',urgent_support:'Sürgős ügyfélszolgálati ügy',open_return:'Nyitott visszáru'};
const exceptionText=(value:string|null)=>value?(exceptionLabel[value]??humanizeCode(value)):'—';

export default async function OperationsPage(){
  await requirePlatformOperator();
  const a=createAdminClient();
  const[
    {data:q,error:queueError},
    {data:s,error:summaryError},
    {data:k,error:kpiError},
    {data:atp,error:stockError},
  ]=await Promise.all([
    a.from('order_service_operations').select('*').order('priority_score',{ascending:false}).order('created_at',{ascending:true}).limit(200),
    a.from('operations_inventory_summary').select('*').single(),
    a.from('operations_kpi_summary').select('*').single(),
    a.from('inventory_available_to_promise').select('*').order('available_to_promise_quantity',{ascending:true}).limit(100),
  ]);

  const rows=(q??[])as Queue[],summary=(s??{open_orders:0,blocked_orders:0,fulfillment_backlog:0,zero_atp_variants:0,reserved_units:0,oversold_units:0})as Summary;
  const kpi=(k??{open_orders:0,blocked_orders:0,ready_to_pack_orders:0,packed_orders:0,over_24h_orders:0,service_attention_orders:0,high_value_open_orders:0,avg_open_age_hours:0})as Kpi;
  const stock=(atp??[])as Atp[],orderIds=rows.map(x=>x.order_id),variantIds=stock.map(x=>x.variant_id);

  const[orderTenantResult,variantTenantResult]=await Promise.all([
    orderIds.length?a.from('orders').select('id,instance_id').in('id',orderIds):Promise.resolve({data:[] as {id:string;instance_id:string|null}[],error:null}),
    variantIds.length?a.from('product_variants').select('id,instance_id').in('id',variantIds):Promise.resolve({data:[] as {id:string;instance_id:string|null}[],error:null}),
  ]);

  const tenantByOrder=new Map((orderTenantResult.data??[]).map(x=>[x.id,x.instance_id] as const));
  const tenantByVariant=new Map((variantTenantResult.data??[]).map(x=>[x.id,x.instance_id] as const));
  const instanceIds=[...new Set([...tenantByOrder.values(),...tenantByVariant.values()].filter((x):x is string=>Boolean(x)))];
  const instanceResult=instanceIds.length?await a.from('webshop_instances').select('id,name,slug').in('id',instanceIds):{data:[] as Instance[],error:null};
  const instanceById=new Map(((instanceResult.data??[])as Instance[]).map(x=>[x.id,x]));
  const storeName=(instanceId:string|null|undefined)=>instanceId?(instanceById.get(instanceId)?.name??instanceById.get(instanceId)?.slug??'Ismeretlen webshop'):'Nincs tenant';

  const loadError=Boolean(queueError||summaryError||kpiError||stockError||orderTenantResult.error||variantTenantResult.error||instanceResult.error),canAct=!loadError;

  return <section className="adminMain">
    <span className="eyebrow">Platform · Működési kivételek</span>
    <h1 className="sectionTitle">Operációs irányítóközpont</h1>
    <p className="lead">A platformon figyelmet igénylő rendelési, teljesítési, ügyfélszolgálati és készletkivételek webshoponként azonosíthatóan. Ez a nézet nem helyettesíti az egyes webshopok napi rendeléskezelését.</p>
    {loadError&&<div className="errorNotice" role="alert"><strong>Az operációs adatok egy része most nem tölthető be.</strong> A hiányzó értékeket ne tekintsd nulla hibának vagy üres sornak.</div>}
    <div className="actions">{canAct?<OperationsCycleButton/>:<span className="muted">Operációs ciklus csak teljes adatbetöltés után indítható.</span>}</div>

    <div className="cards adminMetricCards">
      <div className="card"><span className="badge">Nyitott</span><div className="price">{kpiError?'—':kpi.open_orders}</div></div>
      <div className="card"><span className="badge">Blokkolt</span><div className="price">{kpiError?'—':kpi.blocked_orders}</div></div>
      <div className="card"><span className="badge">24 órán túl</span><div className="price">{kpiError?'—':kpi.over_24h_orders}</div></div>
      <div className="card"><span className="badge">Ügyfélszolgálati figyelem</span><div className="price">{kpiError?'—':kpi.service_attention_orders}</div></div>
      <div className="card"><span className="badge">Magas értékű nyitott</span><div className="price">{kpiError?'—':kpi.high_value_open_orders}</div></div>
      <div className="card"><span className="badge">Átlagos kor</span><div className="price">{kpiError?'—':`${Number(kpi.avg_open_age_hours).toFixed(1)} óra`}</div></div>
    </div>

    <section className="card">
      <h2>Operációs kivételsor</h2>
      <div className="adminTableScroll"><table className="adminTable">
        <thead><tr><th>Webshop</th><th>Rendelés</th><th>Kereskedelmi állapot</th><th>Teljesítési állapot</th><th>Prioritás</th><th>Ügyfélérték</th><th>Kor</th><th>Érték</th><th>Ügyek</th><th>Kivétel</th><th>Művelet</th></tr></thead>
        <tbody>{rows.map(r=><tr key={r.order_id}>
          <td><strong>{storeName(tenantByOrder.get(r.order_id))}</strong></td>
          <td><strong>{r.order_number}</strong></td>
          <td>{commerceStatusLabel(r.commerce_status)}</td>
          <td><span className={`adminStatePill ${stateTone(r.operational_status)}`}>{operationalStatusLabel(r.operational_status)}</span></td>
          <td>{r.priority_score}</td>
          <td>{customerTierLabel(r.customer_value_tier)} · {r.customer_value_score}</td>
          <td>{Number(r.age_hours).toFixed(1)} óra</td>
          <td>{formatHuf(Number(r.total_gross_huf))}</td>
          <td>{r.open_support_count} ügy · {r.open_return_count} visszáru</td>
          <td>{exceptionText(r.exception_code)}</td>
          <td>{canAct?<OrderOperationAction orderId={r.order_id} status={r.operational_status}/>:<span className="muted">Adatbetöltés szükséges</span>}</td>
        </tr>)}</tbody>
      </table></div>
      {!queueError&&rows.length===0&&<p className="muted">Nincs figyelmet igénylő operációs kivétel.</p>}
    </section>

    <section className="card">
      <h2>Készlet / még értékesíthető mennyiség</h2>
      <p className="muted">A szabad készlet a már lefoglalt mennyiség levonása után még értékesíthető darabszám. A platformnézet itt az eltérések és foglalási problémák felügyeletére szolgál.</p>
      <div className="adminTableScroll"><table className="adminTable">
        <thead><tr><th>Webshop</th><th>SKU</th><th>Változat</th><th>Fizikai készlet</th><th>Foglalt</th><th>Szabad</th><th>Túladott</th></tr></thead>
        <tbody>{stock.map(v=><tr key={v.variant_id}><td><strong>{storeName(tenantByVariant.get(v.variant_id))}</strong></td><td><strong>{v.sku}</strong></td><td>{v.label}</td><td>{v.on_hand_quantity}</td><td>{v.reserved_quantity}</td><td>{v.available_to_promise_quantity}</td><td><span className={v.oversold_quantity>0?'adminStatePill danger':'adminStatePill neutral'}>{v.oversold_quantity}</span></td></tr>)}</tbody>
      </table></div>
      {!stockError&&stock.length===0&&<p className="muted">Nincs készleteltérés a megjelenített sorban.</p>}
      <p className="muted">{summaryError?'Az összesített készletállapot most nem elérhető.':`Nyitott: ${summary.open_orders} · teljesítési sor: ${summary.fulfillment_backlog} · foglalt egység: ${summary.reserved_units} · 0 szabad készletű változat: ${summary.zero_atp_variants}`}</p>
    </section>
  </section>;
}
