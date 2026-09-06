'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { VisibleAdminNavItem, VisibleAdminNavSection } from '@/lib/admin/workspace-navigation';

function matches(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`);
}

function activeItem(pathname: string, items: VisibleAdminNavItem[]) {
  return items.filter((item) => matches(pathname, item.href)).sort((a, b) => b.href.length - a.href.length)[0] ?? null;
}

export function AdminRouteContext({ sections, operatorItems }: { sections: VisibleAdminNavSection[]; operatorItems: VisibleAdminNavItem[] }) {
  const pathname = usePathname() || '/admin';
  const merchantItems = sections.flatMap((section) => section.items);
  const merchantItem = activeItem(pathname, merchantItems);
  const merchantSection = merchantItem ? sections.find((section) => section.items.some((item) => item.href === merchantItem.href)) ?? null : null;
  const operatorItem = activeItem(pathname, operatorItems);
  const baseItem = merchantItem ?? operatorItem;
  const detailRoute = Boolean(baseItem && pathname !== baseItem.href && pathname.startsWith(`${baseItem.href}/`));

  if (!merchantSection && !operatorItem && pathname === '/admin') return null;

  return <div className="adminRouteContext">
    <nav className="adminBreadcrumb" aria-label="Morzsamenü">
      <Link href="/admin">Admin</Link>
      {merchantSection && <><span aria-hidden="true">/</span><span>{merchantSection.label}</span></>}
      {baseItem && <><span aria-hidden="true">/</span>{detailRoute ? <Link href={baseItem.href}>{baseItem.label}</Link> : <span aria-current="page">{baseItem.label}</span>}</>}
      {detailRoute && <><span aria-hidden="true">/</span><span aria-current="page">Részletek</span></>}
    </nav>
    {detailRoute && baseItem && <Link className="adminReturnLink" href={baseItem.href}>← Vissza: {baseItem.label}</Link>}
  </div>;
}
