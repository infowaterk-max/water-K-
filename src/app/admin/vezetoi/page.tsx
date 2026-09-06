import { requirePlanFeature } from '@/lib/plans/access';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatHuf } from '@/lib/catalog';
import { ReportingEvidence, ReportingLegend } from '@/components/admin/reporting-evidence';

export const dynamic = 'force-dynamic';
type Channel = { channel: string; paying_customers: number; repeat_customers: number; repeat_rate_percent: number; paid_orders: number; revenue_gross_huf: number; aov_gross_huf: number; ltv_gross_huf: number; active_90d_customers: number; inactive_90d_customers: number };
type Cohort = { cohort_month: string; month_number: number; cohort_customers: number; active_customers: number; retention_percent: number; revenue_gross_huf: number };

export default async function Page() {
  await requirePlanFeature('executiveAnalytics');
  const scope = await requireCurrentStoreContext('analytics.read');
  const a = createAdminClient();
  const [{ data: channels, error: ce }, { data: cohorts, error: cohe }, { data: growth, error: ge }] = await Promise.all([
    a.from('v9_channel_retention_summary_v2').select('*').eq('instance_id', scope.instanceId),
    a.from('v9_monthly_customer_cohorts_v2').select('*').eq('instance_id', scope.instanceId).lte('month_number', 6).order('cohort_month', { ascending: false }).order('month_number', { ascending: true }).limit(84),
    a.from('v9_growth_dashboard_v2').select('*').eq('instance_id', scope.instanceId).maybeSingle(),
  ]);
  const ch = (channels ?? []) as Channel[], co = (cohorts ?? []) as Cohort[], retail = ch.find((x) => x.channel === 'retail'), reseller = ch.find((x) => x.channel === 'reseller');
  const revenue = ch.reduce((s, x) => s + Number(x.revenue_gross_huf || 0), 0), customers = ch.reduce((s, x) => s + Number(x.paying_customers || 0), 0), repeat = ch.reduce((s, x) => s + Number(x.repeat_customers || 0), 0);
  const repeatRate = customers ? repeat / customers * 100 : 0, weightedLtv = customers ? revenue / customers : 0, loadError = Boolean(ce || cohe || ge), cohortMonths = [...new Set(co.map((x) => x.cohort_month))].slice(0, 8);

  return <section className="adminMain">
    <span className="eyebrow">Pro · Vezetői analitika</span><h1 className="sectionTitle">Üzleti döntési központ</h1><p className="lead">B2C/B2B teljesítmény, visszatérő vásárlók, ügyfélérték és első vásárlási hónap szerinti megtartás egy helyen.</p>
    {loadError && <div className="errorNotice" role="alert"><strong>Az analitika egy része most nem tölthető be.</strong> Hiányos adatok mellett a nulla értékeket ne tekintsd biztos üzleti eredménynek.</div>}
    <ReportingLegend kinds={['calculation', 'recommendation']} />
    <ReportingEvidence kind="calculation">
      <div className="cards adminMetricCards"><div className="card"><span className="badge">Összes bevétel</span><div className="price">{ce ? '—' : formatHuf(revenue)}</div><p className="muted">fizetett rendelések</p></div><div className="card"><span className="badge">Visszatérő vásárlók aránya</span><div className="price">{ce ? '—' : `${repeatRate.toFixed(1)}%`}</div><p className="muted">{ce ? 'Az adat most nem elérhető.' : `${repeat} visszatérő / ${customers} fizető ügyfél`}</p></div><div className="card"><span className="badge">Átlagos ügyfélérték</span><div className="price">{ce ? '—' : formatHuf(Math.round(weightedLtv))}</div><p className="muted">történeti bevétel / fizető ügyfél</p></div><div className="card"><span className="badge">Megtartási teendő</span><div className="price">{ge ? '—' : Number(growth?.at_risk_customers ?? 0) + Number(growth?.winback_customers ?? 0)}</div><p className="muted">kockázatban lévő vagy visszanyerendő ügyfél</p></div></div>
      <div className="splitFeature"><section className="featurePanel"><span className="eyebrow">B2C</span><h2>{ce ? '—' : formatHuf(Number(retail?.revenue_gross_huf ?? 0))}</h2><div className="integrationList"><div><span>Fizető ügyfelek</span><strong>{ce ? '—' : retail?.paying_customers ?? 0}</strong></div><div><span>Visszatérő vásárlók aránya</span><strong>{ce ? '—' : `${Number(retail?.repeat_rate_percent ?? 0).toFixed(1)}%`}</strong></div><div><span>Átlagos rendelési érték</span><strong>{ce ? '—' : formatHuf(Number(retail?.aov_gross_huf ?? 0))}</strong></div><div><span>Átlagos történeti ügyfélérték</span><strong>{ce ? '—' : formatHuf(Number(retail?.ltv_gross_huf ?? 0))}</strong></div><div><span>90+ napja inaktív</span><strong>{ce ? '—' : retail?.inactive_90d_customers ?? 0}</strong></div></div></section><section className="featurePanel darkPanel"><span className="eyebrow">B2B / viszonteladó</span><h2>{ce ? '—' : formatHuf(Number(reseller?.revenue_gross_huf ?? 0))}</h2><div className="integrationList"><div><span>Fizető partnerek</span><strong>{ce ? '—' : reseller?.paying_customers ?? 0}</strong></div><div><span>Visszatérő partnerek aránya</span><strong>{ce ? '—' : `${Number(reseller?.repeat_rate_percent ?? 0).toFixed(1)}%`}</strong></div><div><span>Átlagos rendelési érték</span><strong>{ce ? '—' : formatHuf(Number(reseller?.aov_gross_huf ?? 0))}</strong></div><div><span>Átlagos történeti partnerérték</span><strong>{ce ? '—' : formatHuf(Number(reseller?.ltv_gross_huf ?? 0))}</strong></div><div><span>90+ napja inaktív</span><strong>{ce ? '—' : reseller?.inactive_90d_customers ?? 0}</strong></div></div></section></div>
      <section className="card"><span className="eyebrow">Megtartás első vásárlási hónap szerint</span><h2>Visszatérnek-e az új ügyfelek?</h2><p className="muted">M0 az első vásárlás hónapja, M1 az azt követő hónap, M2 a második követő hónap és így tovább.</p><div className="adminTableScroll"><table className="adminTable"><thead><tr><th>Első vásárlás hónapja</th><th>Induló ügyfelek</th><th>M0</th><th>M1</th><th>M2</th><th>M3</th><th>M6</th></tr></thead><tbody>{cohortMonths.map((m) => { const rows = co.filter((x) => x.cohort_month === m), get = (n: number) => rows.find((x) => x.month_number === n); return <tr key={m}><td><strong>{new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'short' }).format(new Date(m))}</strong></td><td>{get(0)?.cohort_customers ?? 0}</td>{[0, 1, 2, 3, 6].map((n) => <td key={n}>{get(n) ? `${Number(get(n)!.retention_percent).toFixed(1)}%` : '—'}</td>)}</tr>; })}</tbody></table></div>{!cohe && cohortMonths.length === 0 && <p className="muted">Még nincs elegendő történeti adat a megtartási elemzéshez.</p>}</section>
    </ReportingEvidence>
    <ReportingEvidence kind="recommendation">
      <section className="featurePanel"><span className="eyebrow">Döntési fókusz</span><h2>Hol kell most beavatkozni?</h2><div className="integrationList"><div><span>Nyitott mentett kosarak</span><strong>{ge ? '—' : growth?.open_checkout_recoveries ?? 0}</strong></div><div><span>Esedékes ügyfélút-lépések</span><strong>{ge ? '—' : growth?.due_journey_steps ?? 0}</strong></div><div><span>Lejárt B2B újrarendelések</span><strong>{ge ? '—' : growth?.overdue_resellers ?? 0}</strong></div><div><span>Hamarosan esedékes B2B újrarendelések</span><strong>{ge ? '—' : growth?.due_soon_resellers ?? 0}</strong></div></div></section>
    </ReportingEvidence>
  </section>;
}
