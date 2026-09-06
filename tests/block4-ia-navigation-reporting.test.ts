import{readFileSync}from'node:fs';import{resolve}from'node:path';import{describe,expect,it}from'vitest';
import{ADMIN_REPORTING_DESTINATIONS,resolveFrequentTasks,resolveMerchantNavigation}from'../src/lib/navigation/admin-ia';
import{DEFAULT_STOREFRONT_NAVIGATION,STOREFRONT_NAVIGATION_BUILDER_MANIFEST,normalizeStorefrontNavigationConfig,resolveStorefrontNavigation}from'../src/lib/navigation/storefront-ia';
const read=(p:string)=>readFileSync(resolve(process.cwd(),p),'utf8');

describe('Roadmap Block 4 IA, navigation and reporting contract',()=>{
  it('keeps merchant navigation capability-gated for Alap and Pro',()=>{
    const allow=()=>true;
    const alap=resolveMerchantNavigation('alap',allow).flatMap(section=>section.items);
    const pro=resolveMerchantNavigation('pro',allow).flatMap(section=>section.items);
    expect(alap.some(item=>item.href==='/admin/rendelesek')).toBe(true);
    expect(alap.some(item=>item.href==='/admin/elemzes')).toBe(false);
    expect(alap.some(item=>item.href==='/admin/cashflow')).toBe(false);
    expect(pro.some(item=>item.href==='/admin/elemzes')).toBe(true);
    expect(pro.some(item=>item.href==='/admin/cashflow')).toBe(true);
    expect(pro.some(item=>item.href==='/admin/vezetoi')).toBe(true);
  });

  it('filters navigation and frequent tasks through the same least-privilege permission contract',()=>{
    const readable=(permission?:string)=>permission==='store.read'||permission==='analytics.read';
    const items=resolveMerchantNavigation('pro',readable).flatMap(section=>section.items);
    const quick=resolveFrequentTasks('pro',readable);
    expect(items.some(item=>item.href==='/admin')).toBe(true);
    expect(items.some(item=>item.href==='/admin/elemzes')).toBe(true);
    expect(items.some(item=>item.href==='/admin/rendelesek')).toBe(false);
    expect(items.some(item=>item.href==='/admin/termekek')).toBe(false);
    expect(quick).toEqual([]);
  });

  it('maintains one auditable reporting registry with explicit capability and permission ownership',()=>{
    const hrefs=ADMIN_REPORTING_DESTINATIONS.map(item=>item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toContain('/admin');
    expect(hrefs).toContain('/admin/elemzes');
    expect(hrefs).toContain('/admin/ugyfelertek');
    for(const report of ADMIN_REPORTING_DESTINATIONS.filter(item=>item.href!=='/admin')){
      expect(report.permission).toBe('analytics.read');
      expect(report.feature).toBeTruthy();
      expect(report.reportFamily).toBeTruthy();
    }
  });

  it('keeps every advanced reporting route tenant-scoped and aligned with its registered capability gate',()=>{
    const contracts=[
      ['src/app/admin/elemzes/page.tsx','advancedAnalytics'],
      ['src/app/admin/novekedes/page.tsx','advancedAnalytics'],
      ['src/app/admin/vezetoi/page.tsx','executiveAnalytics'],
      ['src/app/admin/cashflow/page.tsx','cashflow'],
      ['src/app/admin/keszlet-elemzes/page.tsx','advancedAnalytics'],
      ['src/app/admin/ugyfelertek/page.tsx','crm'],
    ] as const;
    for(const[path,feature]of contracts){
      const source=read(path);
      expect(source).toContain(`requirePlanFeature('${feature}')`);
      expect(source).toContain("requireCurrentStoreContext('analytics.read')");
      expect(source).toContain('scope.instanceId');
    }
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
    expect(normalized.hidden).toEqual(['faq']);
    expect(normalized.order).toEqual(['cart']);
    expect(normalized.labels).toEqual({cart:'Kosaram'});
    expect(STOREFRONT_NAVIGATION_BUILDER_MANIFEST.contractVersion).toBe(1);
    expect(STOREFRONT_NAVIGATION_BUILDER_MANIFEST.componentKey).toBe('storefront.navigation.link');
    expect(STOREFRONT_NAVIGATION_BUILDER_MANIFEST.schemaSlot).toBe('header.primaryNavigation');
    expect(STOREFRONT_NAVIGATION_BUILDER_MANIFEST.configurable).toEqual(['hidden','order','labels']);
  });

  it('implements the accepted progressive disclosure and mobile/touch IA without a visual editor',()=>{
    const navigation=read('src/components/navigation/admin-navigation.tsx');
    const css=read('src/app/admin/block4-ia-navigation.css');
    const layout=read('src/app/admin/layout.tsx');
    expect(navigation).toContain('useState<string|null>(null)');
    expect(navigation).toContain('setTimeout(()=>openPreview(sectionId,target),300)');
    expect(navigation).toContain('aria-expanded={open}');
    expect(navigation).toContain('onFocus={event=>openPreview(section.id,event.currentTarget)}');
    expect(navigation).toContain('Gyakori feladatok');
    expect(navigation).toContain('Intelligens Súgó');
    expect(css).toContain('@media(max-width:850px)');
    expect(css).toContain('.adminMobileSectionPanel');
    expect(layout).toContain('resolveMerchantNavigation(effectivePlan,can)');
    expect(layout).toContain('resolveFrequentTasks(effectivePlan,can)');
    expect(layout).not.toContain('const MERCHANT_NAV');
    expect(navigation.toLowerCase()).not.toContain('drag');
  });

  it('routes tenant storefront configuration through a reusable component adapter for later page-schema composition',()=>{
    const configured=read('src/components/navigation/configured-store-navigation.tsx');
    const navigation=read('src/components/navigation/store-navigation.tsx');
    const platformActions=read('src/app/admin/platform/webaruhazak/actions.ts');
    expect(configured).toContain('instance?.storefront.navigation');
    expect(configured).toContain('resolveStorefrontNavigation');
    expect(navigation).toContain('data-builder-component="storefront.navigation.link"');
    expect(navigation).toContain('data-schema-slot="header.primaryNavigation"');
    expect(platformActions).toContain('...jsonObject(existing.storefront_config)');
    expect(platformActions).toContain('Builder Foundation');
  });
});
