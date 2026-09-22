'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { AdminEvidenceKind, ResolvedAdminNavItem, ResolvedAdminNavSection } from '@/lib/navigation/admin-ia';

const evidenceMeta:Record<AdminEvidenceKind,{label:string;description:string}>={
  fact:{label:'Tényadat',description:'Közvetlenül az aktuális webshop forrásadataiból megjelenített érték vagy esemény.'},
  calculation:{label:'Számított mutató',description:'Tényadatokból képlettel, időablakkal vagy attribúciós szabállyal előállított eredmény.'},
  recommendation:{label:'Ajánlás',description:'Szabály vagy modell alapján javasolt teendő; nem tény és nem automatikus üzleti döntés.'},
};

function matches(pathname:string,href:string){return href==='/admin'?pathname==='/admin':pathname===href||pathname.startsWith(`${href}/`)}
function activeItem(pathname:string,items:ResolvedAdminNavItem[]){return items.filter(item=>matches(pathname,item.href)).sort((a,b)=>b.href.length-a.href.length)[0]??null}

export function AdminRouteContext({sections,operatorItems}:{sections:ResolvedAdminNavSection[];operatorItems:ResolvedAdminNavItem[]}){
  const pathname=usePathname()||'/admin';
  const merchantItems=sections.flatMap(section=>section.items),merchantItem=activeItem(pathname,merchantItems);
  const merchantSection=merchantItem?sections.find(section=>section.items.some(item=>item.href===merchantItem.href))??null:null;
  const operatorItem=activeItem(pathname,operatorItems),baseItem=merchantItem??operatorItem;
  if(!baseItem)return null;
  const detailRoute=pathname!==baseItem.href&&pathname.startsWith(`${baseItem.href}/`),evidenceKinds=baseItem.evidenceKinds??[];
  return <div className="adminRouteContext">
    <div className="adminRouteContextTop">
      <nav className="adminBreadcrumb" aria-label="Morzsamenü">
        <Link href="/admin">Admin</Link>
        {merchantSection&&<><span aria-hidden="true">/</span><span>{merchantSection.label}</span></>}
        <span aria-hidden="true">/</span>{detailRoute?<Link href={baseItem.href}>{baseItem.label}</Link>:<span aria-current="page">{baseItem.label}</span>}
        {detailRoute&&<><span aria-hidden="true">/</span><span aria-current="page">Részletek</span></>}
      </nav>
      {detailRoute&&<Link className="adminReturnLink" href={baseItem.href}>← Vissza: {baseItem.label}</Link>}
    </div>
    {evidenceKinds.length>0&&<aside className="adminReportingTrust" aria-label="Riport bizonyossági szintek">
      {evidenceKinds.map(kind=><div className={`adminReportingTrustItem adminReportingTrustItem-${kind}`} key={kind}><strong>{evidenceMeta[kind].label}</strong><span>{evidenceMeta[kind].description}</span></div>)}
    </aside>}
  </div>;
}
