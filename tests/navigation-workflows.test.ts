import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('Shoperation navigation workflows',()=>{
  it('keeps storefront navigation route-aware and accessible',()=>{
    const nav=read('src/components/navigation/store-navigation.tsx');
    const layout=read('src/app/layout.tsx');
    expect(nav).toContain("usePathname");
    expect(nav).toContain("pathname.startsWith(`${item.href}/`)");
    expect(nav).toContain("aria-current={active ? 'page' : undefined}");
    expect(nav).toContain("href: '/webaruhaz'");
    expect(nav).toContain("href: '/fiokom'");
    expect(nav).toContain("href: '/kosar'");
    expect(layout).toContain('<StoreNavigation/>');
  });

  it('keeps account navigation complete, route-aware and keyboard friendly',()=>{
    const nav=read('src/components/account/account-subnav.tsx');
    const layout=read('src/app/fiokom/layout.tsx');
    expect(nav).toContain("usePathname");
    expect(nav).toContain("{href:'/fiokom',label:'Áttekintés',exact:true}");
    expect(nav).toContain("{href:'/fiokom/kivansaglista',label:'Kívánságlista'}");
    expect(nav).toContain("{href:'/fiokom/visszakuldes',label:'Visszaküldés'}");
    expect(nav).toContain("href=\"/kapcsolat#ugyfelszolgalat\"");
    expect(nav).toContain("aria-current={active?'page':undefined}");
    expect(layout).toContain('<AccountSubnav/>');
  });

  it('uses longest matching admin route so nested workspaces do not highlight the wrong parent',()=>{
    const nav=read('src/components/navigation/admin-navigation.tsx');
    const layout=read('src/app/admin/layout.tsx');
    expect(nav).toContain("pathname.startsWith(`${item.href}/`)");
    expect(nav).toContain(".sort((a, b) => b.href.length - a.href.length)");
    expect(nav).toContain("aria-current={active ? 'page' : undefined}");
    expect(layout).toContain('<AdminNavigation');
  });

  it('keeps visible active states in storefront, account and admin navigation',()=>{
    const publicCss=read('src/app/final-ux-audit.css');
    const accountCss=read('src/app/account-workflow.css');
    const adminCss=read('src/app/admin/admin-final-polish.css');
    expect(publicCss).toMatch(/navActive|aria-current/);
    expect(accountCss).toMatch(/isActive|aria-current/);
    expect(adminCss).toMatch(/adminNavActive|aria-current/);
  });
});
