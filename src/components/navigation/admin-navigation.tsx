'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = { href: string; label: string };
type NavSection = { label: string; items: NavItem[] };

function getActiveHref(pathname: string, items: NavItem[]) {
  return items
    .filter((item) => item.href === '/admin' ? pathname === '/admin' : pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function AdminNavigation({
  sections,
  operatorItems,
  showUpgrade,
}: {
  sections: NavSection[];
  operatorItems: NavItem[];
  showUpgrade: boolean;
}) {
  const pathname = usePathname() || '/admin';
  const allItems = [...sections.flatMap((section) => section.items), ...operatorItems];
  const activeHref = getActiveHref(pathname, allItems);

  return (
    <nav className="adminNav" aria-label="Webshop adminisztráció">
      {sections.map((section) => (
        <section className="adminNavSection" key={section.label}>
          <span className="adminNavLabel">{section.label}</span>
          {section.items.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link key={item.href} href={item.href} className={active ? 'adminNavActive' : undefined} aria-current={active ? 'page' : undefined}>
                {item.label}
              </Link>
            );
          })}
        </section>
      ))}
      {showUpgrade && <Link className="adminUpgrade" href="/admin/csomag">Pro funkciók megtekintése</Link>}
      {operatorItems.length > 0 && (
        <section className="adminNavSection adminOperator">
          <span className="adminNavLabel">Shoperation platform</span>
          {operatorItems.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link key={item.href} href={item.href} className={active ? 'adminNavActive' : undefined} aria-current={active ? 'page' : undefined}>
                {item.label}
              </Link>
            );
          })}
        </section>
      )}
    </nav>
  );
}
