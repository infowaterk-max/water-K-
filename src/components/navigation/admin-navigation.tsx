'use client';

import Link from 'next/link';
import { useEffect,useMemo,useRef,useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdminMobileTableEnhancer } from '@/components/admin/admin-mobile-table-enhancer';

type NavItem={id:string;href:string;label:string;description:string;group?:string;reportFamily?:string};
type NavSection={id:string;label:string;items:NavItem[]};
type PreviewState={sectionId:string;top:number;left:number}|null;

function getActiveHref(pathname:string,items:NavItem[]){
  return items
    .filter(item=>item.href==='/admin'?pathname==='/admin':pathname===item.href||pathname.startsWith(`${item.href}/`))
    .sort((a,b)=>b.href.length-a.href.length)[0]?.href;
}

function groupItems(items:NavItem[]){
  const groups=new Map<string,NavItem[]>();
  for(const item of items){const key=item.group??'';groups.set(key,[...(groups.get(key)??[]),item]);}
  return[...groups.entries()];
}

function ItemLinks({items,activeHref,describe=false}:{items:NavItem[];activeHref?:string;describe?:boolean}){
  return <>{groupItems(items).map(([group,grouped])=><div className="adminNavItemGroup" key={group||'default'}>
    {group&&<span className="adminNavItemGroupLabel">{group}</span>}
    {grouped.map(item=>{const active=item.href===activeHref;return <Link key={item.id} href={item.href} className={active?'adminNavActive':undefined} aria-current={active?'page':undefined} title={item.description} data-report-family={item.reportFamily}>
      <span>{item.label}</span>{describe&&<small>{item.description}</small>}
    </Link>})}
  </div>)}</>;
}

export function AdminNavigation({
  sections,
  operatorItems,
  quickItems,
  showUpgrade,
}:{
  sections:NavSection[];
  operatorItems:NavItem[];
  quickItems:NavItem[];
  showUpgrade:boolean;
}){
  const pathname=usePathname()||'/admin';
  const stackRef=useRef<HTMLDivElement>(null);
  const hoverTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const closeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const allItems=useMemo(()=>[...sections.flatMap(section=>section.items),...operatorItems],[sections,operatorItems]);
  const activeHref=getActiveHref(pathname,allItems);
  const activeSectionId=sections.find(section=>section.items.some(item=>item.href===activeHref))?.id;
  const [openSection,setOpenSection]=useState<string|null>(null);
  const [preview,setPreview]=useState<PreviewState>(null);

  useEffect(()=>{setOpenSection(null);setPreview(null);},[pathname]);
  useEffect(()=>()=>{if(hoverTimer.current)clearTimeout(hoverTimer.current);if(closeTimer.current)clearTimeout(closeTimer.current);},[]);
  useEffect(()=>{
    if(!window.matchMedia('(max-width:850px)').matches)return;
    const active=stackRef.current?.querySelector<HTMLElement>('.adminNavSectionTrigger[data-active="true"]');
    const nav=active?.closest<HTMLElement>('.adminMerchantNav');
    if(!active||!nav)return;
    const navRect=nav.getBoundingClientRect(),activeRect=active.getBoundingClientRect();
    const target=nav.scrollLeft+(activeRect.left-navRect.left)-((navRect.width-activeRect.width)/2);
    nav.scrollTo({left:Math.max(0,target),behavior:'auto'});
  },[pathname,activeSectionId]);

  const clearHover=()=>{if(hoverTimer.current){clearTimeout(hoverTimer.current);hoverTimer.current=null;}};
  const clearClose=()=>{if(closeTimer.current){clearTimeout(closeTimer.current);closeTimer.current=null;}};
  const openPreview=(sectionId:string,target:HTMLElement)=>{
    if(!window.matchMedia('(min-width:851px)').matches||openSection===sectionId)return;
    const rect=target.getBoundingClientRect();
    setPreview({sectionId,top:Math.max(12,Math.min(rect.top,window.innerHeight-360)),left:rect.right+14});
  };
  const schedulePreview=(sectionId:string,target:HTMLElement)=>{
    clearClose();clearHover();
    hoverTimer.current=setTimeout(()=>openPreview(sectionId,target),300);
  };
  const scheduleClose=()=>{clearHover();clearClose();closeTimer.current=setTimeout(()=>setPreview(null),140);};
  const toggleSection=(sectionId:string)=>{clearHover();setPreview(null);setOpenSection(current=>current===sectionId?null:sectionId);};
  const activeSection=sections.find(section=>section.id===openSection)??sections.find(section=>section.id===activeSectionId);

  return (
    <div className="adminNavigationStack" ref={stackRef}>
      <AdminMobileTableEnhancer/>
      {quickItems.length>0&&<section className="adminDiscoveryLayer" aria-label="Gyors elérés">
        <span className="adminDiscoveryLabel">Gyakori feladatok</span>
        <div className="adminQuickTasks">{quickItems.map(item=><Link href={item.href} key={item.id} title={item.description}>{item.label}</Link>)}</div>
        <details className="adminHelpDiscovery">
          <summary>Intelligens Súgó</summary>
          <p>{activeSection?`${activeSection.label}: válassz egy konkrét feladatot; csak a csomagodhoz és jogosultságodhoz engedélyezett célok jelennek meg.`:'Csak az aktuális jogosultságodhoz és csomagodhoz elérhető adminfeladatok jelennek meg.'}</p>
        </details>
      </section>}
      {(sections.length>0||showUpgrade)&&<>
        <nav className="adminNav adminMerchantNav" aria-label="Aktuális webshop adminisztrációja">
          <span className="adminNavContextLabel">Aktuális webshop</span>
          {sections.map(section=>{
            const open=openSection===section.id,active=activeSectionId===section.id;
            return <section className="adminNavSection" key={section.id} data-open={open?'true':'false'}>
              <button
                type="button"
                className="adminNavSectionTrigger"
                data-active={active?'true':'false'}
                aria-expanded={open}
                aria-controls={`admin-nav-panel-${section.id}`}
                onClick={()=>toggleSection(section.id)}
                onMouseEnter={event=>schedulePreview(section.id,event.currentTarget)}
                onMouseLeave={scheduleClose}
                onFocus={event=>openPreview(section.id,event.currentTarget)}
                onBlur={scheduleClose}
              >
                <span>{section.label}</span><span aria-hidden="true">{open?'−':'+'}</span>
              </button>
              <div id={`admin-nav-panel-${section.id}`} className="adminNavInlinePanel" hidden={!open}>
                <ItemLinks items={section.items} activeHref={activeHref}/>
              </div>
            </section>;
          })}
          {showUpgrade&&<Link className="adminUpgrade" href="/admin/csomag">Pro funkciók megtekintése</Link>}
        </nav>
        {activeSection&&<section className="adminMobileSectionPanel" aria-label={`${activeSection.label} menüpontjai`}>
          <span className="adminMobileSectionTitle">{activeSection.label}</span>
          <ItemLinks items={activeSection.items} activeHref={activeHref}/>
        </section>}
      </>}
      {operatorItems.length>0&&<nav className="adminNav adminPlatformNav" aria-label="Shoperation platform adminisztráció">
        <span className="adminNavContextLabel adminPlatformContextLabel">Shoperation platform</span>
        <section className="adminNavSection adminOperator">
          <span className="adminNavLabel">Platformműveletek</span>
          <ItemLinks items={operatorItems} activeHref={activeHref}/>
        </section>
      </nav>}
      {preview&&(()=>{const section=sections.find(candidate=>candidate.id===preview.sectionId);return section?<aside className="adminNavFlyout" style={{top:preview.top,left:preview.left}} aria-label={`${section.label} előnézet`} onMouseEnter={()=>{clearClose();clearHover();}} onMouseLeave={scheduleClose}>
        <strong>{section.label}</strong><ItemLinks items={section.items} activeHref={activeHref} describe/>
      </aside>:null})()}
    </div>
  );
}
