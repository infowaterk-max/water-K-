import{readFileSync}from'node:fs';import{resolve}from'node:path';import{describe,expect,it}from'vitest';
import{ADMIN_REPORTING_DESTINATIONS,MERCHANT_NAVIGATION,resolveFrequentTasks,resolveMerchantNavigation}from'../src/lib/navigation/admin-ia';
import{DEFAULT_STOREFRONT_NAVIGATION,STOREFRONT_NAVIGATION_BUILDER_MANIFEST,normalizeStorefrontNavigationConfig,resolveStorefrontNavigation}from'../src/lib/navigation/storefront-ia';
const read=(p:string)=>readFileSync(resolve(process.cwd(),p),'utf8');

describe('Roadmap Block 4 IA, navigation and reporting contract',()=>{
  it('uses the accepted nine business workspaces from one capability-aware registry',()=>{
    expect(MERCHANT_NAVIGATION.map(section=>section.label)).toEqual(['Vezetői áttekintés','Értékesítés','Termékek','Ügyfelek','Készlet & Logisztika','Marketing','Digitális Iroda','Tartalom & Megjelenés','Beállítások']);
    const allow=()=>true;
    const alap=resolveMerchantNavigation('alap',allow,'active').flatMap(section=>section.items);
    const pro=resolveMerchantNavigation('pro',allow,'active').flatMap(section=>section.items);
    expect(alap.some(item=>item.href==='/admin/rendelesek')).toBe(true);
    expect(alap.some(item=>item.href==='/admin/elemzes')).toBe(false);
    expect(alap.some(item=>item.href==='/admin/cashflow')).toBe(false);
    expect(pro.some(item=>item.href==='/admin/elemzes')).toBe(true);
    expect(pro.some(item=>item.href==='/admin/cashflow')).toBe(true);
    expect(pro.some(item=>item.href==='/admin/vezetoi')).toBe(true);
  });

  it('filters navigation and frequent tasks through least privilege and pilot audience rules',()=>{
    const readable=(permission?:string)=>permission==='store.read'||permission==='analytics.read';
    const items=resolveMerchantNavigation('pro',readable,'active').flatMap(section=>section.items);
    const quick=resolveFrequentTasks('pro',readable);
    expect(items.some(item=>item.href==='/admin')).toBe(true);
    expect(items.some(item=>item.href==='/admin/elemzes')).toBe(true);
    expect(items.some(item=>item.href==='/admin/rendelesek')).toBe(false);
    expect(items.some(item=>item.href==='/admin/termekek')).toBe(false);
    expect(quick).toEqual([]);
    const owner=()=>true;
    expect(resolveMerchantNavigation('pro',owner,'active').flatMap(section=>section.items).some(item=>item.href==='/admin/pilot-acceptance')).toBe(false);
    expect(resolveMerchantNavigation('pro',owner,'pilot').flatMap(section=>section.items).some(item=>item.href==='/admin/pilot-acceptance')).toBe(true);
  });

  it('maintains an auditable reporting registry with capability, permission and evidence ownership',()=>{
    const hrefs=ADMIN_REPORTING_DESTINATIONS.map(item=>item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toContain('/admin');
    expect(hrefs).toContain('/admin/elemzes');
    expect(hrefs).toContain('/admin/ugyfelertek');
    for(const report of ADMIN_REPORTING_DESTINATIONS.filter(item=>item.href!=='/admin')){
      expect(report.permission).toBe('analytics.read');
      expect(report.feature).toBeTruthy();
      expect(report.reportFamily).toBeTruthy();
      expect(report.evidenceKinds.length).toBeGreaterThan(0);
    }
    expect(ADMIN_REPORTING_DESTINATIONS.find(item=>item.href==='/admin/cashflow')?.evidenceKinds).toEqual(['fact','calculation']);
    expect(ADMIN_REPORTING_DESTINATIONS.find(item=>item.href==='/admin/novekedes')?.evidenceKinds).toEqual(['calculation','recommendation']);
  });

  it('keeps every advanced reporting route tenant-scoped and aligned with its registered capability gate',()=>{
    const contracts=[['src/app/admin/elemzes/page.tsx','advancedAnalytics'],['src/app/admin/novekedes/page.tsx','advancedAnalytics'],['src/app/admin/vezetoi/page.tsx','executiveAnalytics'],['src/app/admin/cashflow/page.tsx','cashflow'],['src/app/admin/keszlet-elemzes/page.tsx','advancedAnalytics'],['src/app/admin/ugyfelertek/page.tsx','crm']] as const;
    for(const[path,feature]of contracts){const source=read(path);expect(source).toContain(`requirePlanFeature('${feature}')`);expect(source).toContain("requireCurrentStoreContext('analytics.read')");expect(source).toContain('scope.instanceId');}
  });

  it('resolves tenant-configurable storefront navigation without Water-K hardcoding',()=>{
    const configured=resolveStorefrontNavigation({hidden:['faq'],order:['account','catalog'],labels:{catalog:'Termékeink'}});
    expect(configured.map(item=>item.id)).toEqual(['account','catalog','contact','cart']);
    expect(configured.find(item=>item.id==='catalog')?.label).toBe('Termékeink');
    expect(DEFAULT_STOREFRONT_NAVIGATION.map(item=>item.id)).toEqual(['catalog','faq','contact','account','cart']);
    expect(JSON.stringify(configured).toLowerCase()).not.toContain('water-k');
  });

  it('sanitizes unknown storefront navigation configuration and freezes the Builder Foundation manifest',()=>{
    const normalized=normalizeStorefrontNavigationConfig({hidden:['faq','unknown'],order:['cart','unknown'],labels:{cart:'Kosaram',unknown:'Tiltott'}});
    expect(normalized.hidden).toEqual(['faq']);expect(normalized.order).toEqual(['cart']);expect(normalized.labels).toEqual({cart:'Kosaram'});
    expect(STOREFRONT_NAVIGATION_BUILDER_MANIFEST.contractVersion).toBe(1);expect(STOREFRONT_NAVIGATION_BUILDER_MANIFEST.componentKey).toBe('storefront.navigation.link');expect(STOREFRONT_NAVIGATION_BUILDER_MANIFEST.schemaSlot).toBe('header.primaryNavigation');expect(STOREFRONT_NAVIGATION_BUILDER_MANIFEST.configurable).toEqual(['hidden','order','labels']);
  });

  it('implements progressive disclosure, mobile/touch IA, breadcrumbs and reporting trust without a visual editor',()=>{
    const navigation=read('src/components/navigation/admin-navigation.tsx'),routeContext=read('src/components/navigation/admin-route-context.tsx'),css=read('src/app/admin/block4-ia-navigation.css')+read('src/app/admin/block4-reporting-context.css'),layout=read('src/app/admin/layout.tsx');
    expect(navigation).toContain('useState<string|null>(null)');expect(navigation).toContain('setTimeout(()=>openPreview(sectionId,target),300)');expect(navigation).toContain('aria-expanded={open}');expect(navigation).toContain('Gyakori feladatok');expect(navigation).toContain('Intelligens Súgó');
    expect(navigation).toContain('left:rect.right+2');expect(navigation).toContain('setTimeout(()=>setPreview(null),260)');expect(navigation).toContain('onMouseDownCapture={()=>{clearClose();clearHover();}}');
    expect(css).toContain('@media(max-width:850px)');expect(css).toContain('.adminMobileSectionPanel');expect(routeContext).toContain('aria-label="Morzsamenü"');expect(routeContext).toContain('← Vissza: {baseItem.label}');expect(routeContext).toContain('Riport bizonyossági szintek');expect(routeContext).toContain("label:'Tényadat'");expect(routeContext).toContain("label:'Számított mutató'");expect(routeContext).toContain("label:'Ajánlás'");
    expect(layout).toContain('resolveMerchantNavigation(effectivePlan,can,instance?.status)');expect(layout).toContain('<AdminRouteContext sections={sections} operatorItems={operatorItems}/>');expect(layout).not.toContain('const MERCHANT_NAV');expect(navigation.toLowerCase()).not.toContain('drag');
  });

  it('routes tenant storefront configuration through a reusable component adapter and preserves future config keys',()=>{
    const configured=read('src/components/navigation/configured-store-navigation.tsx'),navigation=read('src/components/navigation/store-navigation.tsx'),platformActions=read('src/app/admin/platform/webaruhazak/actions.ts');
    expect(configured).toContain('instance?.storefront.navigation');expect(configured).toContain('resolveStorefrontNavigation');expect(navigation).toContain('data-builder-component="storefront.navigation.link"');expect(navigation).toContain('data-schema-slot="header.primaryNavigation"');expect(platformActions).toContain('...jsonObject(existing!.storefront_config)');expect(platformActions).toContain('Builder Foundation');
  });
});
