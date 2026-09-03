import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatHuf } from '@/lib/catalog';
import { getProducts } from '@/lib/catalog-server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentPlan } from '@/lib/plans/access';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { getPlatformRole } from '@/lib/auth/platform-operator';

const paidStatuses = ['paid', 'processing', 'shipped', 'completed'];
const VAT = 1.27;

export default async function AdminPage() {
  const [plan, instance, platformRole] = await Promise.all([getCurrentPlan(), getCurrentWebshopInstance(), getPlatformRole()]);
  if (platformRole) redirect('/admin/platform');
  const isPro = plan === 'pro' && Boolean(instance);
  const products = await getProducts();
  const now = Date.now();
  const day = 86_400_000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let orders = 0;
  let pending = 0;
  let paidRevenue = 0;
  let paidOrders = 0;
  let todayOrders = 0;
  let todayRevenue = 0;
  let weekOrders = 0;
  let weekRevenue = 0;
  let openOrderValue = 0;
  let stalePending = 0;
  let staleProcessing = 0;
  let staleShipped = 0;
  let orderLoadError = false;

  try {
    const s = await createClient();
    const { data, error } = await s
      .from('orders')
      .select('status,total_gross_huf,created_at')
      .eq('instance_id', instance?.id ?? '00000000-0000-0000-0000-000000000000')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) orderLoadError = true;
    else if (data) {
      orders = data.length;
      pending = data.filter((o) => o.status === 'pending').length;
      const paid = data.filter((o) => paidStatuses.includes(o.status));
      paidOrders = paid.length;
      paidRevenue = paid.reduce((n, o) => n + Number(o.total_gross_huf || 0), 0);
      todayOrders = data.filter((o) => +new Date(o.created_at) >= +today).length;
      todayRevenue = paid.filter((o) => +new Date(o.created_at) >= +today).reduce((n, o) => n + Number(o.total_gross_huf || 0), 0);
      weekOrders = data.filter((o) => +new Date(o.created_at) >= now - 7 * day).length;
      weekRevenue = paid.filter((o) => +new Date(o.created_at) >= now - 7 * day).reduce((n, o) => n + Number(o.total_gross_huf || 0), 0);
      openOrderValue = data.filter((o) => ['pending', 'paid', 'processing', 'shipped'].includes(o.status)).reduce((n, o) => n + Number(o.total_gross_huf || 0), 0);
      stalePending = data.filter((o) => o.status === 'pending' && +new Date(o.created_at) < now - day).length;
      staleProcessing = data.filter((o) => o.status === 'processing' && +new Date(o.created_at) < now - 2 * day).length;
      staleShipped = data.filter((o) => o.status === 'shipped' && +new Date(o.created_at) < now - 3 * day).length;
    }
  } catch {
    orderLoadError = true;
  }

  const out = products.filter((p) => p.stock <= 0).length;
  const low = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
  const average = paidOrders ? Math.round(paidRevenue / paidOrders) : 0;

  let net30 = 0;
  let cogs30 = 0;
  let grossProfit30 = 0;
  let grossMargin30: number | null = null;
  let campaignRevenue = 0;
  let campaignBuyers = 0;
  let campaignSent = 0;
  let commApproval = 0;
  let commProblems = 0;
  let advancedLoadError = false;

  // Pro-only business intelligence. Alap never queries the advanced campaign,
  // communication or cost-intelligence tables just to render its dashboard.
  if (isPro && instance) {
    try {
      const a = createAdminClient();
      const since = new Date(now - 30 * day).toISOString();
      const [{ data: ro }, { data: oi }, { data: cj }, { data: cv }, { data: cr }] = await Promise.all([
        a.from('orders').select('id,subtotal_gross_huf,discount_gross_huf').eq('instance_id',instance.id).gte('created_at', since).in('status', paidStatuses),
        a.from('order_items').select('order_id,line_total_gross_huf,unit_cost_net_huf,quantity').eq('instance_id',instance.id),
        a.from('communication_jobs').select('id,status,requires_approval,approved_at').eq('instance_id',instance.id).limit(5000),
        a.from('marketing_campaign_conversions').select('recipient_id,total_gross_huf').eq('instance_id',instance.id).limit(50000),
        a.from('marketing_campaign_recipients').select('communication_job_id').eq('instance_id',instance.id).not('communication_job_id', 'is', null).limit(50000),
      ]);

      const orderMap = new Map((ro ?? []).map((o) => [o.id, o]));
      for (const i of oi ?? []) {
        const order = orderMap.get(i.order_id);
        if (!order) continue;
        const subtotal = Number(order.subtotal_gross_huf || 0);
        const share = subtotal > 0 ? Number(i.line_total_gross_huf || 0) / subtotal : 0;
        net30 += Math.max(0, (Number(i.line_total_gross_huf || 0) - Number(order.discount_gross_huf || 0) * share) / VAT);
        if (i.unit_cost_net_huf != null) cogs30 += Number(i.unit_cost_net_huf) * Number(i.quantity || 0);
      }
      grossProfit30 = net30 - cogs30;
      grossMargin30 = net30 > 0 ? (grossProfit30 / net30) * 100 : null;

      campaignRevenue = (cv ?? []).reduce((n, c) => n + Number(c.total_gross_huf || 0), 0);
      campaignBuyers = new Set((cv ?? []).map((c) => c.recipient_id)).size;
      const campaignJobIds = new Set((cr ?? []).map((r) => r.communication_job_id).filter((id): id is string => Boolean(id)));
      campaignSent = (cj ?? []).filter((j) => j.status === 'sent' && campaignJobIds.has(j.id)).length;
      commApproval = (cj ?? []).filter((j) => j.status === 'pending' && j.requires_approval && !j.approved_at).length;
      commProblems = (cj ?? []).filter((j) => j.status === 'failed' || j.status === 'blocked').length;
    } catch {
      advancedLoadError = true;
    }
  }

  return (
    <section className="adminMain">
      <span className="eyebrow">{isPro ? 'Pro üzleti központ' : 'Alap webshop központ'}</span>
      <h1 className="sectionTitle">Kereskedelmi irányítópult</h1>
      <p className="lead">
        {isPro
          ? 'Napi webshopműködés és fejlett üzleti döntéstámogatás egy nézetben.'
          : 'A napi értékesítéshez szükséges rendelések, forgalom, készlet és működési feladatok egy helyen.'}
      </p>

      {orderLoadError && <div className="errorNotice"><strong>A rendelési adatok egy része most nem érhető el.</strong></div>}
      {isPro && advancedLoadError && <div className="errorNotice"><strong>A Pro üzleti mutatók egy része most nem érhető el.</strong></div>}

      <div className="cards adminMetricCards">
        <div className="card"><span className="badge">Ma</span><h3>{todayOrders} rendelés</h3><div className="price">{formatHuf(todayRevenue)}</div></div>
        <div className="card"><span className="badge">7 nap</span><h3>{weekOrders} rendelés</h3><div className="price">{formatHuf(weekRevenue)}</div></div>
        <div className="card"><span className="badge">Nyitott állomány</span><h3>{pending} függő fizetés</h3><div className="price">{formatHuf(openOrderValue)}</div></div>
        <div className="card"><span className="badge">Átlagos kosár</span><div className="price">{formatHuf(average)}</div></div>
      </div>

      <section className="card">
        <div className="adminToolbar">
          <div><span className="eyebrow">Napi működés</span><h2>Teendők és készlet</h2></div>
          <div><Link className="btn" href="/admin/rendelesek">Rendelések</Link> <Link className="btn btnPrimary" href="/admin/termekek">Készletkezelés</Link></div>
        </div>
        <div className="cards adminMetricCards">
          <div className="card"><span className="badge">Kifogyott</span><div className="price">{out}</div><p className="muted">termék azonnali beavatkozással</p></div>
          <div className="card"><span className="badge">Alacsony készlet</span><div className="price">{low}</div><p className="muted">1–5 darabos készlet</p></div>
          <div className="card"><span className="badge">Régi függő</span><div className="price">{stalePending}</div><p className="muted">24+ órája fizetésre vár</p></div>
          <div className="card"><span className="badge">Elakadt rendelés</span><div className="price">{staleProcessing + staleShipped}</div><p className="muted">feldolgozás vagy szállítás ellenőrzendő</p></div>
        </div>
      </section>

      <section className="card">
        <div className="adminToolbar">
          <div><span className="eyebrow">Gyorsműveletek</span><h2>Webshop üzemeltetés</h2></div>
        </div>
        <div className="cards">
          <Link className="card textLink" href="/admin/termekek"><strong>Termékek és készlet</strong><p className="muted">Katalógus, árak és készletszintek kezelése.</p></Link>
          <Link className="card textLink" href="/admin/rendelesek"><strong>Rendelések</strong><p className="muted">Fizetés, feldolgozás és teljesítés követése.</p></Link>
          <Link className="card textLink" href="/admin/visszaru"><strong>Visszáru</strong><p className="muted">Elállások és visszaküldések kezelése.</p></Link>
          <Link className="card textLink" href="/admin/kuponok"><strong>Kuponok és akciók</strong><p className="muted">Alap értékesítési promóciók kezelése.</p></Link>
          <Link className="card textLink" href="/admin/ugyfelek"><strong>Ügyfelek</strong><p className="muted">Vásárlói adatok és alap ügyfélkezelés.</p></Link>
          <Link className="card textLink" href="/admin/beallitasok/fizetes-szallitas"><strong>Fizetés és szállítás</strong><p className="muted">A webshop normál kereskedelmi beállításai.</p></Link>
        </div>
      </section>

      {isPro ? (
        <>
          <section className="card">
            <div className="adminToolbar">
              <div><span className="eyebrow">Pro · 30 napos üzleti kép</span><h2>Fedezet és jövedelmezőség</h2></div>
              <Link className="btn btnPrimary" href="/admin/elemzes">Részletes elemzés</Link>
            </div>
            <div className="cards adminMetricCards">
              <div className="card"><span className="badge">Nettó árbevétel</span><div className="price">{formatHuf(Math.round(net30))}</div></div>
              <div className="card"><span className="badge">Bruttó fedezet</span><div className="price">{formatHuf(Math.round(grossProfit30))}</div></div>
              <div className="card"><span className="badge">Fedezeti ráta</span><div className="price">{grossMargin30 === null ? '—' : `${grossMargin30.toFixed(1)}%`}</div></div>
            </div>
          </section>

          <section className="card">
            <div className="adminToolbar">
              <div><span className="eyebrow">Pro · marketing és digitális iroda</span><h2>{formatHuf(campaignRevenue)} attribútált kampánybevétel</h2></div>
              <div><Link className="btn" href="/admin/kampanyok">Haladó kampányok</Link> <Link className="btn btnPrimary" href="/admin/kommunikacio">Digitális iroda</Link></div>
            </div>
            <div className="cards adminMetricCards">
              <div className="card"><span className="badge">Konvertáló vásárló</span><div className="price">{campaignBuyers}</div></div>
              <div className="card"><span className="badge">Kampányüzenet</span><div className="price">{campaignSent}</div></div>
              <div className="card"><span className="badge">Jóváhagyásra vár</span><div className="price">{commApproval}</div></div>
              <div className="card"><span className="badge">Kommunikációs probléma</span><div className="price">{commProblems}</div></div>
            </div>
          </section>
        </>
      ) : (
        <section className="card">
          <span className="eyebrow">Pro lehetőségek</span>
          <h2>A webshop működik nélkülük is — a Pro a növekedést és az automatizálást gyorsítja.</h2>
          <p className="muted">Digitális iroda, fejlett CRM, kampány-attribúció, üzleti analitika, automatizálás, beszerzési és cash-flow döntéstámogatás.</p>
          <Link className="btn btnPrimary" href="/admin/csomag">Pro funkciók megtekintése</Link>
        </section>
      )}

      <section className="card">
        <span className="eyebrow">Összesített működés</span>
        <h2>{orders} kezelt rendelés · {formatHuf(paidRevenue)} fizetett forgalom</h2>
        <p className="muted">Az Alap irányítópult kizárólag a napi webshopüzemeltetéshez szükséges adatokat tölti. A Pro üzleti intelligencia külön jogosultsági rétegben fut.</p>
      </section>
    </section>
  );
}
