'use client';

import Link from 'next/link';
import { useEffect,useRef } from 'react';
import { usePathname } from 'next/navigation';
import { AdminMobileTableEnhancer } from '@/components/admin/admin-mobile-table-enhancer';

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
  const stackRef=useRef<HTMLDivElement>(null);
  const allItems = [...sections.flatMap((section) => section.items), ...operatorItems];
  const activeHref = getActiveHref(pathname, allItems);

  useEffect(()=>{
    if(!window.matchMedia('(max-width:850px)').matches)return;
    const active=stackRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const nav=active?.closest<HTMLElement>('.adminNav');
    if(!active||!nav)return;
    const navRect=nav.getBoundingClientRect(),activeRect=active.getBoundingClientRect();
    const target=nav.scrollLeft+(activeRect.left-navRect.left)-((navRect.width-activeRect.width)/2);
    nav.scrollTo({left:Math.max(0,target),behavior:'auto'});
  },[pathname]);

  return (
    <div className="adminNavigationStack" ref={stackRef}>
      <AdminMobileTableEnhancer/>
      {(sections.length > 0 || showUpgrade) && (
        <nav className="adminNav adminMerchantNav" aria-label="Aktuális webshop adminisztrációja">
          <span className="adminNavContextLabel">Aktuális webshop</span>
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
        </nav>
      )}
      {operatorItems.length > 0 && (
        <nav className="adminNav adminPlatformNav" aria-label="Shoperation platform adminisztráció">
          <span className="adminNavContextLabel adminPlatformContextLabel">Shoperation platform</span>
          <section className="adminNavSection adminOperator">
            {operatorItems.map((item) => {
              const active = item.href === activeHref;
              return (
                <Link key={item.href} href={item.href} className={active ? 'adminNavActive' : undefined} aria-current={active ? 'page' : undefined}>
                  {item.label}
                </Link>
              );
            })}
          </section>
        </nav>
      )}
    </div>
  );
}
