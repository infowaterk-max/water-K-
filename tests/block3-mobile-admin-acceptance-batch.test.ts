import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe,expect,it } from 'vitest';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('roadmap block 3 mobile admin acceptance batch',()=>{
  it('applies one shared mobile-card contract to the audited admin data tables',()=>{
    const enhancer=read('src/components/admin/admin-mobile-table-enhancer.tsx');
    const css=read('src/app/admin/block3-pilot-batch.css');
    const auditedPages=[
      'src/app/admin/rendelesek/page.tsx',
      'src/app/admin/rendelesek/[id]/page.tsx',
      'src/app/admin/visszaru/page.tsx',
      'src/app/admin/ugyfelek/page.tsx',
      'src/app/admin/ugyfelertek/page.tsx',
    ];
    expect(enhancer).toContain("'/admin/rendelesek'");
    expect(enhancer).toContain("'/admin/visszaru'");
    expect(enhancer).toContain("'/admin/ugyfelek'");
    expect(enhancer).toContain("'/admin/ugyfelertek'");
    expect(enhancer).toContain("table.classList.add('adminMobileCardTable')");
    expect(enhancer).toContain('cell.dataset.mobileLabel=headers[index]');
    expect(enhancer).toContain('new MutationObserver(run)');
    auditedPages.forEach(path=>expect(read(path)).toContain('adminTable'));
    expect(css).toContain('.adminMobileCardTable td::before{content:attr(data-mobile-label)');
    expect(css).toContain('grid-template-columns:minmax(108px,.42fr) minmax(0,1fr)');
    expect(css).toContain('@media(max-width:520px)');
    expect(css).toContain('.adminMobileCardTable td{grid-template-columns:1fr!important');
  });

  it('compacts the order filter and loyalty tier grid without page-specific table forks',()=>{
    const enhancer=read('src/components/admin/admin-mobile-table-enhancer.tsx');
    const css=read('src/app/admin/block3-pilot-batch.css');
    expect(enhancer).toContain("pathname==='/admin/rendelesek'");
    expect(enhancer).toContain("classList.add('adminMobileCompactFilter')");
    expect(enhancer).toContain("heading==='Értékszintek'");
    expect(enhancer).toContain("classList.add('adminMobileTierGrid')");
    expect(enhancer).toContain("classList.add('adminMobileOrderDetail')");
    expect(css).toContain('.adminMobileCompactFilter{min-height:0!important');
    expect(css).toContain('.adminMobileTierGrid .cards{grid-template-columns:repeat(2,minmax(0,1fr))!important');
    expect(css).toContain('.adminMobileOrderDetail>.cards>.card{min-height:0!important');
  });

  it('keeps the active mobile admin destination centered in the horizontal navigation',()=>{
    const navigation=read('src/components/navigation/admin-navigation.tsx');
    expect(navigation).toContain('useEffect,useRef');
    expect(navigation).toContain("window.matchMedia('(max-width:850px)')");
    expect(navigation).toContain("querySelector<HTMLElement>('[aria-current=\"page\"]')");
    expect(navigation).toContain("nav.scrollTo({left:Math.max(0,target),behavior:'auto'})");
    expect(navigation).toContain('<AdminMobileTableEnhancer/>');
  });
});
