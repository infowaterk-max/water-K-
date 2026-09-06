'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Item={href:string;label:string;exact?:boolean;loyalty?:boolean};
const items:Item[]=[
  {href:'/fiokom',label:'Áttekintés',exact:true},
  {href:'/fiokom/huseg',label:'Hűségprogram',loyalty:true},
  {href:'/fiokom/kivansaglista',label:'Kívánságlista'},
  {href:'/fiokom/ugyek',label:'Ügyeim'},
  {href:'/fiokom/visszakuldes',label:'Visszaküldés'},
];

export function AccountSubnav({showLoyalty=true}:{showLoyalty?:boolean}){
  const pathname=usePathname()||'/fiokom';
  const visibleItems=items.filter(item=>showLoyalty||!item.loyalty);
  return <nav className="accountSubnav" aria-label="Fiók navigáció"><div className="shell"><div className="actions">{visibleItems.map(item=>{const active=item.exact?pathname===item.href:pathname===item.href||pathname.startsWith(`${item.href}/`);return <Link key={item.href} className={`btn btnGhost${active?' isActive':''}`} href={item.href} aria-current={active?'page':undefined}>{item.label}</Link>})}<Link className="btn btnGhost" href="/kapcsolat#ugyfelszolgalat">Új ügyfélszolgálati kérdés</Link></div></div></nav>
}
