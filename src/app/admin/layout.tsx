import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getCurrentPlan } from '@/lib/plans/access';
import { hasPlanFeature, PLANS, type FeatureCode } from '@/lib/plans/catalog';

type NavItem = { href: string; label: string; feature?: FeatureCode };

const NAV: NavItem[] = [
  { href: '/admin', label: 'Áttekintés' },
  { href: '/admin/iranyitokozpont', label: 'Irányítóközpont', feature: 'advancedAnalytics' },
  { href: '/admin/intezkedesek', label: 'Intézkedési központ', feature: 'automation' },
  { href: '/admin/automatizalas', label: 'Automatizálási központ', feature: 'automation' },
  { href: '/admin/biztositekok', label: 'Biztosítékok', feature: 'automation' },
  { href: '/admin/kiadasok', label: 'Kiadási központ', feature: 'automation' },
  { href: '/admin/rollout', label: 'Rollout központ', feature: 'automation' },
  { href: '/admin/utoellenorzes', label: 'Utóellenőrzés', feature: 'automation' },
  { href: '/admin/helyreallitas', label: 'Helyreállítás', feature: 'automation' },
  { href: '/admin/megfigyeles', label: 'Megfigyelés', feature: 'advancedAnalytics' },
  { href: '/admin/muveletek', label: 'Műveletek', feature: 'advancedAnalytics' },
  { href: '/admin/ertekesites', label: 'Értékesítés', feature: 'crm' },
  { href: '/admin/ugyfelertek', label: 'Ügyfélérték', feature: 'crm' },
  { href: '/admin/novekedes', label: 'Növekedés', feature: 'advancedAnalytics' },
  { href: '/admin/vezetoi', label: 'Vezetői analitika', feature: 'executiveAnalytics' },
  { href: '/admin/elemzes', label: 'Elemzés', feature: 'advancedAnalytics' },
  { href: '/admin/keszlet-elemzes', label: 'Készletelemzés', feature: 'advancedAnalytics' },
  { href: '/admin/beszerzes', label: 'Beszerzés', feature: 'procurement' },
  { href: '/admin/cashflow', label: 'Cash-flow', feature: 'cashflow' },
  { href: '/admin/utanakovetes', label: 'Utánkövetés', feature: 'crm' },
  { href: '/admin/kampanyok', label: 'Kampányok', feature: 'campaigns' },
  { href: '/admin/kommunikacio', label: 'Kommunikáció', feature: 'communication' },
  { href: '/admin/kommunikacio/tiltolista', label: 'Kommunikációs tiltólista', feature: 'communication' },
  { href: '/admin/ugyfelszolgalat', label: 'Ügyfélszolgálat', feature: 'support' },
  { href: '/admin/termekek', label: 'Termékek', feature: 'catalog' },
  { href: '/admin/rendelesek', label: 'Rendelések', feature: 'orders' },
  { href: '/admin/visszaru', label: 'Visszáru', feature: 'orders' },
  { href: '/admin/integraciok', label: 'Integrációk', feature: 'integrations' },
  { href: '/admin/naplo', label: 'Napló' },
  { href: '/admin/kuponok', label: 'Kuponok', feature: 'coupons' },
  { href: '/admin/ugyfelek', label: 'Ügyfelek', feature: 'customers' },
  { href: '/admin/beallitasok', label: 'Beállítások' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const plan = await getCurrentPlan();
  const definition = PLANS[plan];

  return (
    <main className="adminGrid">
      <aside className="adminSide">
        <strong>Water-K Admin</strong>
        <span className="muted">{definition.name} csomag</span>
        {NAV.filter((item) => !item.feature || hasPlanFeature(plan, item.feature)).map((item) => (
          <Link key={item.href} href={item.href}>{item.label}</Link>
        ))}
        {plan === 'alap' && <Link href="/admin/csomag">Pro csomag funkciói</Link>}
        <Link href="/admin/csomag">Csomagkezelés</Link>
        <Link href="/">Webshop megnyitása</Link>
      </aside>
      {children}
    </main>
  );
}
