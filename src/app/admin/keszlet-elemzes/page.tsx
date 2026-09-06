import { requirePlanFeature } from '@/lib/plans/access';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { formatHuf } from '@/lib/catalog';
import { createAdminClient } from '@/lib/supabase/admin';
import { ReportingEvidence, ReportingLegend } from '@/components/admin/reporting-evidence';

export const dynamic = 'force-dynamic';
const paid = ['paid', 'processing', 'shipped', 'completed'];
type Period = 30 | 90 | 365;
const periods: Period[] = [30, 90, 365];

export default async function InventoryAnalytics() {
  await requirePlanFeature('advancedAnalytics');
  const scope = await requireCurrentStoreContext('analytics.read');
  const a = createAdminClient(), now = Date.now(), day = 86400000, since = new Date(now - 365 * day).toISOString().slice(0, 10);
  const [{ data: snap, error: se }, { data: orders, error: oe }, { data: items, error: ie }, { data: variants, error: ve }] = await Promise.all([
    a.from('inventory_snapshots').select('snapshot_date,variant_id,stock_quantity,unit_cost_net_huf,inventory_cost_net_huf').eq('instance_id', scope.instanceId).gte('snapshot_date', since).order('snapshot_date', { ascending: true }).limit(50000),
    a.from('orders').select('id,created_at,status,subtotal_gross_huf,discount_gross_huf').eq('instance_id', scope.instanceId).gte('created_at', new Date(now - 365 * day).toISOString()).in('status', paid).limit(20000),
    a.from('order_items').select('order_id,variant_id,quantity,line_total_gross_huf,unit_cost_net_huf_snapshot,cost_snapshot_source').eq('instance_id', scope.instanceId).limit(50000),
    a.from('product_variants').select('id,sku,label').eq('instance_id', scope.instanceId).limit(5000),
  ]);
  const loadError = Boolean(se || oe || ie || ve), orderMap = new Map((orders ?? []).map((o) => [o.id, o])), rows = (snap ?? []).map((s) => ({ ...s, date: +new Date(`${s.snapshot_date}T12:00:00Z`), cost: s.inventory_cost_net_huf == null ? null : Number(s.inventory_cost_net_huf) }));
  function metric(period: Period, variantId?: string) { const start = now - period * day, ss = rows.filter((s) => s.date >= start && (!variantId || s.variant_id === variantId) && s.cost != null), dates = new Set(ss.map((s) => s.snapshot_date)), avg = ss.length ? ss.reduce((n, s) => n + (s.cost ?? 0), 0) / Math.max(1, dates.size) : 0; let cogs = 0, net = 0, exact = 0, backfilled = 0, missing = 0; for (const i of items ?? []) { if (!i.variant_id || variantId && i.variant_id !== variantId) continue; const o = orderMap.get(i.order_id); if (!o || +new Date(o.created_at) < start) continue; const cost = i.unit_cost_net_huf_snapshot == null ? null : Number(i.unit_cost_net_huf_snapshot); if (cost == null) missing++; else { cogs += cost * i.quantity; if (i.cost_snapshot_source === 'order_created') exact++; else backfilled++; } const subtotal = Number(o.subtotal_gross_huf || 0), share = subtotal > 0 ? Number(i.line_total_gross_huf || 0) / subtotal : 0; net += Math.max(0, (Number(i.line_total_gross_huf || 0) - Number(o.discount_gross_huf || 0) * share) / 1.27); } const profit = net - cogs, turn = avg > 0 && missing === 0 ? cogs / avg : null, gmroi = avg > 0 && missing === 0 ? profit / avg : null; return { avg, cogs, profit, turn, gmroi, days: dates.size, exact, backfilled, missing }; }
  const portfolio = periods.map((p) => [p, metric(p)] as const), sku = (variants ?? []).map((v) => ({ id: v.id, name: `${v.sku} · ${v.label}`, m: metric(90, v.id) })).filter((x) => x.m.days > 0).sort((x, y) => (y.m.gmroi ?? -999) - (x.m.gmroi ?? -999));

  return <section className="adminMain">
    <span className="eyebrow">Pro · Készletelemzés</span><h1 className="sectionTitle">Készlettőke és megtérülés</h1><p className="lead">A számítás kizárólag az aktuális webshop készletméréseiből és rendeléseiből készül.</p>
    {loadError && <div className="errorNotice"><strong>Az elemzés egy része most nem tölthető be.</strong></div>}
    <ReportingLegend kinds={['calculation']} />
    <ReportingEvidence kind="calculation">
      <section className="auditGuide"><div><span className="eyebrow">Mit jelentenek a mutatók?</span><h2>Készletforgás és készlettőke-megtérülés</h2></div><p>A készletforgás azt mutatja, hányszor fordult meg a készlet értéke az adott időszakban. A készlettőke-megtérülés azt mutatja, mennyi bruttó fedezet jutott egy forint átlagosan lekötött készlettőkére.</p></section>
      <div className="cards adminMetricCards">{portfolio.map(([p, m]) => <div className="card" key={p}><span className="badge">{p} nap</span><h3>Készlettőke-megtérülés {m.gmroi === null ? '—' : `${m.gmroi.toFixed(2)}×`}</h3><div className="price">{m.turn === null ? '—' : `${m.turn.toFixed(2)}×`}</div><p className="muted">készletforgás · {m.days} készletmérési nap</p></div>)}</div>
      <section className="card"><h2>SKU rangsor · 90 nap</h2><div className="adminTableScroll"><table className="adminTable"><thead><tr><th>SKU</th><th>Átlagkészlet</th><th>Eladott készlet önköltsége</th><th>Fedezet</th><th>Forgás</th><th>Készlettőke-megtérülés</th></tr></thead><tbody>{sku.map((x) => <tr key={x.id}><td><strong>{x.name}</strong></td><td>{formatHuf(Math.round(x.m.avg))}</td><td>{formatHuf(Math.round(x.m.cogs))}</td><td>{x.m.missing ? 'Hiányos önköltség' : formatHuf(Math.round(x.m.profit))}</td><td>{x.m.turn === null ? '—' : `${x.m.turn.toFixed(2)}×`}</td><td><strong>{x.m.gmroi === null ? '—' : `${x.m.gmroi.toFixed(2)}×`}</strong></td></tr>)}</tbody></table></div></section>
    </ReportingEvidence>
  </section>;
}
