'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/webaruhaz', label: 'Webáruház' },
  { href: '/gyik', label: 'GYIK' },
  { href: '/kapcsolat', label: 'Kapcsolat' },
  { href: '/fiokom', label: 'Fiókom' },
  { href: '/kosar', label: 'Kosár', cart: true },
];

export function StoreNavigation() {
  const pathname = usePathname() || '/';
  const activeHref = ITEMS
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="navLinks" aria-label="Fő navigáció">
      {ITEMS.map((item) => {
        const active = item.href === activeHref;
        const className = [item.cart ? 'cartLink' : '', active ? 'navActive' : ''].filter(Boolean).join(' ');
        return (
          <Link key={item.href} className={className || undefined} href={item.href} aria-current={active ? 'page' : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
