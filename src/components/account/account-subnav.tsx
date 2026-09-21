'use client';
import Link from'next/link';
import{usePathname}from'next/navigation';
import{resolveAccountCapabilities}from'@/lib/account/account-capabilities';

export function AccountSubnav({showLoyalty=false,showB2BOrganization=false,showB2BQuotes=false}:{showLoyalty?:boolean;showB2BOrganization?:boolean;showB2BQuotes?:boolean}){
 const pathname=usePathname()||'/fiokom';
 const items=resolveAccountCapabilities({showLoyalty,showB2BOrganization,showB2BQuotes});
 return <nav className="accountCapabilityRail" data-storefront-account="capability-navigation" data-account-navigation-source="platform-ia" aria-label="Fiók navigáció">
  {items.map(item=>{const path=item.href.split('#')[0]!,active=item.exact?pathname===path:!item.href.includes('#')&&(pathname===path||pathname.startsWith(`${path}/`));return <Link key={item.key} className={`btn btnGhost${active?' isActive':''}`} href={item.href} aria-current={active?'page':undefined}>{item.label}</Link>})}
 </nav>;
}
