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

  it('compacts filters, KPI density and loyalty tiers on audited mobile admin pages',()=>{
    const enhancer=read('src/components/admin/admin-mobile-table-enhancer.tsx');
    const css=read('src/app/admin/block3-pilot-batch.css');
    expect(enhancer).toContain('METRIC_PAGE_PATHS');
    expect(enhancer).toContain("classList.toggle('adminMobileMetricPage',METRIC_PAGE_PATHS.has(pathname))");
    expect(enhancer).toContain("pathname==='/admin/rendelesek'");
    expect(enhancer).toContain("classList.add('adminMobileCompactFilter')");
    expect(enhancer).toContain("heading==='Értékszintek'");
    expect(enhancer).toContain("classList.add('adminMobileTierGrid')");
    expect(enhancer).toContain("classList.toggle('adminMobileOrderDetail',pathname.startsWith('/admin/rendelesek/'))");
    expect(css).toContain('.adminMobileCompactFilter{display:grid!important;grid-template-columns:1fr!important');
    expect(css).toContain('.adminMobileMetricPage>.cards{grid-template-columns:repeat(2,minmax(0,1fr))!important');
    expect(css).toContain('.adminMobileTierGrid .cards{grid-template-columns:repeat(2,minmax(0,1fr))!important');
    expect(css).toContain('.adminMobileOrderDetail>.cards>.card{min-height:0!important');
  });

  it('keeps order-detail cards one column and prevents mid-word mobile heading wrapping',()=>{
    const enhancer=read('src/components/admin/admin-mobile-table-enhancer.tsx');
    const hotfix=read('src/app/admin/block3-order-detail-hotfix.css');
    const layout=read('src/app/admin/layout.tsx');
    expect(enhancer).toContain("classList.toggle('adminMobileMetricPage',METRIC_PAGE_PATHS.has(pathname))");
    expect(enhancer).toContain("classList.toggle('adminMobileOrderDetail',pathname.startsWith('/admin/rendelesek/'))");
    expect(layout).toContain("import './block3-order-detail-hotfix.css';");
    expect(hotfix).toContain('.adminMobileOrderDetail>.cards{grid-template-columns:1fr!important}');
    expect(hotfix).toContain('overflow-wrap:normal!important;word-break:normal!important');
    expect(hotfix).toContain('.adminMobileOrderDetail .sectionIntro .sectionTitle{font-size:clamp(28px,8vw,36px)!important');
  });

  it('keeps return money fields readable on narrow screens without changing return business logic',()=>{
    const actions=read('src/components/admin/return-case-actions.tsx');
    const css=read('src/app/admin/block3-pilot-batch.css');
    expect(actions).toContain('className="returnCaseActions"');
    expect(actions).toContain('className="returnCaseRefundFields"');
    expect(actions).toContain("update('refunded')");
    expect(actions).toContain('update(status,true)');
    expect(css).toContain('.returnCaseRefundFields{display:grid;grid-template-columns:1fr 1fr');
    expect(css).toContain('@media(max-width:560px){\n  .returnCaseRefundFields{grid-template-columns:1fr!important}');
  });

  it('keeps the active mobile admin destination centered and visually signals horizontal scrolling',()=>{
    const navigation=read('src/components/navigation/admin-navigation.tsx');
    const css=read('src/app/admin/block3-pilot-batch.css');
    expect(navigation).toContain('useEffect,useRef');
    expect(navigation).toContain("window.matchMedia('(max-width:850px)')");
    expect(navigation).toContain("querySelector<HTMLElement>('[aria-current=\"page\"]')");
    expect(navigation).toContain("nav.scrollTo({left:Math.max(0,target),behavior:'auto'})");
    expect(navigation).toContain('<AdminMobileTableEnhancer/>');
    expect(css).toContain('mask-image:linear-gradient(to right,transparent,#000 18px');
  });
});
