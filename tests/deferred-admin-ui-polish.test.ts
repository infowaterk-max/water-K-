import{readFileSync}from'node:fs';import{resolve}from'node:path';import{describe,expect,it}from'vitest';
const read=(p:string)=>readFileSync(resolve(process.cwd(),p),'utf8');

describe('deferred admin UI polish',()=>{
  it('loads the deferred override after the accepted Block 4 navigation layers',()=>{
    const layout=read('src/app/admin/layout.tsx');
    expect(layout).toContain("import './deferred-ui-polish.css';");
    expect(layout.indexOf("import './block4-mobile-navigation.css';")).toBeLessThan(layout.indexOf("import './deferred-ui-polish.css';"));
  });

  it('strengthens desktop sidebar contrast without changing the navigation model',()=>{
    const css=read('src/app/admin/deferred-ui-polish.css');
    expect(css).toContain('@media(min-width:851px)');
    expect(css).toContain('.adminSide .adminNavContextLabel');
    expect(css).toContain('.adminSide .adminNavSectionTrigger[data-active="true"]');
    expect(css).toContain('box-shadow:inset 3px 0 0 #245331!important');
  });

  it('visually separates fact, calculated metric and recommendation evidence',()=>{
    const css=read('src/app/admin/deferred-ui-polish.css');
    expect(css).toContain('.adminReportingTrustItem-fact');
    expect(css).toContain('.adminReportingTrustItem-calculation');
    expect(css).toContain('.adminReportingTrustItem-recommendation');
    expect(css).toContain('#eef7ef');
    expect(css).toContain('#fff6df');
    expect(css).toContain('#fbf0f8');
  });

  it('keeps the shared back-navigation contract and makes it visibly actionable',()=>{
    const routeContext=read('src/components/navigation/admin-route-context.tsx');
    const css=read('src/app/admin/deferred-ui-polish.css');
    expect(routeContext).toContain('← Vissza: {baseItem.label}');
    expect(css).toContain('.adminReturnLink{display:inline-flex');
    expect(css).toContain('.adminReturnLink:focus-visible');
  });

  it('extends mobile card-table treatment to deferred merchant tables',()=>{
    const enhancer=read('src/components/admin/admin-mobile-table-enhancer.tsx');
    for(const path of ['/admin/termekek','/admin/automatizalas','/admin/integraciok','/admin/naplo','/admin/cashflow','/admin/vezetoi','/admin/iranyitokozpont','/admin/biztositekok','/admin/muveletek','/admin/beallitasok'])expect(enhancer).toContain(`'${path}'`);
    expect(enhancer).toContain("table.classList.add('adminMobileCardTable')");
    expect(enhancer).toContain('cell.dataset.mobileLabel=headers[index]');
  });

  it('protects anchored mobile content from the sticky admin header',()=>{
    const css=read('src/app/admin/deferred-ui-polish.css');
    expect(css).toContain('scroll-padding-top:74px');
    expect(css).toContain('.adminContentShell,.adminRouteContext,.adminMain,.adminMain [id]{scroll-margin-top:74px}');
    expect(css).toContain('.adminTableScroll:not(.adminMobileCardTableWrap)');
  });
});
