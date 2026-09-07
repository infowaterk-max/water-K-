'use client';

import { useEffect,useMemo,useState, type MouseEvent } from 'react';
import { usePathname } from 'next/navigation';
import { AdminFontScale } from '@/components/admin/admin-font-scale';
import type { ResolvedAdminNavItem,ResolvedAdminNavSection } from '@/lib/navigation/admin-ia';

function getActiveHref(pathname:string,items:ResolvedAdminNavItem[]){
  return items
    .filter(item=>item.href==='/admin'?pathname==='/admin':pathname===item.href||pathname.startsWith(`${item.href}/`))
    .sort((a,b)=>b.href.length-a.href.length)[0]?.href;
}

function groupItems(items:ResolvedAdminNavItem[]){
  const groups=new Map<string,ResolvedAdminNavItem[]>();
  for(const item of items){const key=item.group??'';groups.set(key,[...(groups.get(key)??[]),item]);}
  return[...groups.entries()];
}

function forceNavigate(event:MouseEvent<HTMLAnchorElement>,href:string){
  event.preventDefault();
  event.stopPropagation();
  window.location.assign(href);
}

function ItemLinks({items,activeHref}:{items:ResolvedAdminNavItem[];activeHref?:string}){
  return <>{groupItems(items).map(([group,grouped])=><div className="adminMobileDrawerGroup" key={group||'default'}>
    {group&&<span className="adminMobileDrawerGroupLabel">{group}</span>}
    {grouped.map(item=>{const active=item.href===activeHref;return <a key={item.id} href={item.href} data-admin-target={item.href} onClick={event=>forceNavigate(event,item.href)} className={active?'adminMobileDrawerActive':undefined} aria-current={active?'page':undefined}>
      <span>{item.label}</span>
    </a>})}
  </div>)}</>;
}

export function AdminMobileNavigation({mobileTitle,sections,operatorItems,quickItems,showUpgrade}:{mobileTitle:string;sections:ResolvedAdminNavSection[];operatorItems:ResolvedAdminNavItem[];quickItems:ResolvedAdminNavItem[];showUpgrade:boolean}){
  const pathname=usePathname()||'/admin';
  const allItems=useMemo(()=>[...sections.flatMap(section=>section.items),...operatorItems],[sections,operatorItems]);
  const activeHref=getActiveHref(pathname,allItems);
  const activeItem=allItems.find(item=>item.href===activeHref);
  const activeSectionId=sections.find(section=>section.items.some(item=>item.href===activeHref))?.id;
  const activeSection=sections.find(section=>section.id===activeSectionId);
  const[currentOpenSection,setCurrentOpenSection]=useState<string|null>(activeSectionId??null);
  const[open,setOpen]=useState(false);
  const currentPath=activeSection&&activeItem
    ?activeSection.label===activeItem.label?activeItem.label:`${activeSection.label} / ${activeItem.label}`
    :activeItem?`Platform / ${activeItem.label}`:'Admin';

  useEffect(()=>{setOpen(false);setCurrentOpenSection(activeSectionId??null);},[pathname,activeSectionId]);
  useEffect(()=>{
    if(!open)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
    window.addEventListener('keydown',onKeyDown);
    return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onKeyDown);};
  },[open]);

  const close=()=>setOpen(false);
  const openMenu=()=>{setCurrentOpenSection(activeSectionId??null);setOpen(true);};

  return <div className="adminMobileNavigation">
    <div className="adminMobileHeader">
      <div className="adminMobileHeaderContext"><strong>{mobileTitle}</strong><span>{currentPath}</span></div>
      <button type="button" className="adminMobileMenuButton" aria-label="Admin menü megnyitása" aria-expanded={open} aria-controls="admin-mobile-drawer" onClick={openMenu}><span aria-hidden="true">☰</span><span>Menü</span></button>
    </div>
    {open&&<div className="adminMobileDrawerLayer">
      <button type="button" className="adminMobileDrawerBackdrop" aria-label="Admin menü bezárása" onClick={close}/>
      <aside id="admin-mobile-drawer" className="adminMobileDrawer" role="dialog" aria-modal="true" aria-label="Admin navigáció">
        <header className="adminMobileDrawerHeader"><div><strong>{mobileTitle}</strong><span>{currentPath}</span></div><button type="button" aria-label="Admin menü bezárása" onClick={close}>×</button></header>
        {quickItems.length>0&&<section className="adminMobileDrawerQuick" aria-label="Gyakori feladatok"><span>Gyakori feladatok</span><div>{quickItems.map(item=><a key={item.id} href={item.href} data-admin-target={item.href} onClick={event=>forceNavigate(event,item.href)}>{item.label}</a>)}</div></section>}
        {sections.length>0&&<nav className="adminMobileDrawerMerchant" aria-label="Aktuális webshop adminisztrációja">
          {sections.map(section=>{const expanded=currentOpenSection===section.id,active=activeSectionId===section.id;return <section key={section.id} className="adminMobileDrawerSection" data-active={active?'true':'false'}>
            <button type="button" aria-expanded={expanded} aria-controls={`admin-mobile-section-${section.id}`} onClick={()=>setCurrentOpenSection(current=>current===section.id?null:section.id)}><span>{section.label}</span><span aria-hidden="true">{expanded?'−':'+'}</span></button>
            <div id={`admin-mobile-section-${section.id}`} className="adminMobileDrawerPanel" hidden={!expanded}><ItemLinks items={section.items} activeHref={activeHref}/></div>
          </section>})}
          {showUpgrade&&<a className="adminMobileDrawerUpgrade" href="/admin/csomag" data-admin-target="/admin/csomag" onClick={event=>forceNavigate(event,'/admin/csomag')}>Pro funkciók megtekintése</a>}
        </nav>}
        {operatorItems.length>0&&<nav className="adminMobileDrawerPlatform" aria-label="Shoperation platform adminisztráció"><span>Shoperation Platform</span><ItemLinks items={operatorItems} activeHref={activeHref}/></nav>}
        <div className="adminMobileDrawerUtilities"><AdminFontScale/><a href="/" onClick={event=>forceNavigate(event,'/')}>← Webshop előnézet</a></div>
      </aside>
    </div>}
  </div>;
}
