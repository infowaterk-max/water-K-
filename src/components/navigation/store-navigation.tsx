'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DEFAULT_STOREFRONT_NAVIGATION,type StorefrontNavItem } from '@/lib/navigation/storefront-ia';

export function StoreNavigation({items=DEFAULT_STOREFRONT_NAVIGATION}:{items?:readonly StorefrontNavItem[]}) {
  const pathname = usePathname() || '/';
  const activeHref = items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="navLinks" aria-label="Fő navigáció" data-builder-component="storefront.navigation.link" data-schema-slot="header.primaryNavigation">
      {items.map((item) => {
        const active = item.href === activeHref;
        const className = [item.cart ? 'cartLink' : '', active ? 'navActive' : ''].filter(Boolean).join(' ');
        return (
          <Link key={item.id} className={className || undefined} href={item.href} aria-current={active ? 'page' : undefined} data-page-type={item.id}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
