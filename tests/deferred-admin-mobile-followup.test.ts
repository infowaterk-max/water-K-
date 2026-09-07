import{readFileSync}from'node:fs';import{resolve}from'node:path';import{describe,expect,it}from'vitest';
const read=(p:string)=>readFileSync(resolve(process.cwd(),p),'utf8');

describe('deferred admin mobile follow-up polish',()=>{
  it('collapses duplicate mobile section and item labels',()=>{
    const mobile=read('src/components/navigation/admin-mobile-navigation.tsx');
    expect(mobile).toContain('activeSection.label===activeItem.label?activeItem.label');
    expect(mobile).toContain('`${activeSection.label} / ${activeItem.label}`');
  });

  it('marks only the product landing page for compact mobile KPI treatment',()=>{
    const enhancer=read('src/components/admin/admin-mobile-table-enhancer.tsx');
    expect(enhancer).toContain("main?.classList.toggle('adminMobileProductPage',pathname==='/admin/termekek')");
  });

  it('renders product KPIs as a compact two-column mobile grid without global metric changes',()=>{
    const css=read('src/app/admin/deferred-ui-polish.css');
    expect(css).toContain('.adminMobileProductPage .adminMetricCards{grid-template-columns:repeat(2,minmax(0,1fr))!important');
    expect(css).toContain('.adminMobileProductPage .adminMetricCards>.card{min-height:0!important;padding:14px!important}');
    expect(css).toContain('@media(max-width:380px)');
    expect(css).not.toContain('.adminMain .adminMetricCards{grid-template-columns:repeat(2');
  });
});
