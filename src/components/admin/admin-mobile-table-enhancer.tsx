'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const CARD_TABLE_PATHS = [
  '/admin/rendelesek',
  '/admin/visszaru',
  '/admin/ugyfelek',
  '/admin/ugyfelertek',
];
const METRIC_PAGE_PATHS = new Set([
  '/admin/rendelesek',
  '/admin/visszaru',
  '/admin/ugyfelek',
  '/admin/ugyfelertek',
]);

function pathUsesCardTables(pathname:string){
  return CARD_TABLE_PATHS.some(path=>pathname===path||pathname.startsWith(`${path}/`));
}

function enhanceTables(){
  document.querySelectorAll<HTMLTableElement>('.adminTable').forEach(table=>{
    if(table.classList.contains('adminMobileCardTable'))return;
    const headers=Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th')).map(cell=>cell.textContent?.trim()||'Adat');
    if(!headers.length)return;
    table.classList.add('adminMobileCardTable');
    table.closest<HTMLElement>('.adminTableScroll')?.classList.add('adminMobileCardTableWrap');
    table.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach(row=>{
      Array.from(row.children).forEach((cell,index)=>{
        if(cell instanceof HTMLTableCellElement)cell.dataset.mobileLabel=headers[index]??'Adat';
      });
    });
  });
}

function enhanceRoute(pathname:string){
  const main=document.querySelector<HTMLElement>('.adminMain');
  main?.classList.toggle('adminMobileMetricPage',METRIC_PAGE_PATHS.has(pathname));
  main?.classList.toggle('adminMobileOrderDetail',pathname.startsWith('/admin/rendelesek/'));
  if(!pathUsesCardTables(pathname))return;
  enhanceTables();
  if(pathname==='/admin/rendelesek')document.querySelector<HTMLElement>('form[role="search"]')?.classList.add('adminMobileCompactFilter');
  if(pathname==='/admin/ugyfelertek'){
    document.querySelectorAll<HTMLElement>('.adminMain section.card').forEach(section=>{
      const heading=section.querySelector('h2')?.textContent?.trim();
      if(heading==='Értékszintek')section.classList.add('adminMobileTierGrid');
    });
  }
}

export function AdminMobileTableEnhancer(){
  const pathname=usePathname()||'/admin';
  useEffect(()=>{
    let frame=0;
    const run=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>enhanceRoute(pathname));};
    run();
    const observer=new MutationObserver(run);
    observer.observe(document.getElementById('main-content')??document.body,{childList:true,subtree:true});
    return()=>{cancelAnimationFrame(frame);observer.disconnect();};
  },[pathname]);
  return null;
}
