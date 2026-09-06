import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('roadmap block 4 information architecture, navigation and reporting contract', () => {
  it('uses the accepted nine merchant workspaces from a central capability-aware manifest', () => {
    const manifest = read('src/lib/admin/workspace-navigation.ts');
    for (const label of ['Vezetői áttekintés', 'Értékesítés', 'Termékek', 'Ügyfelek', 'Készlet & Logisztika', 'Marketing', 'Digitális Iroda', 'Tartalom & Megjelenés', 'Beállítások']) {
      expect(manifest).toContain(`label: '${label}'`);
    }
    expect(manifest).toContain('feature?: FeatureCode');
    expect(manifest).toContain('permission?: StorePermission');
    expect(manifest).toContain("audience?: 'all' | 'pilot'");
    expect(manifest).toContain("audience: 'pilot'");
    expect(manifest).not.toMatch(/56ffdbca|water-k/i);
  });

  it('filters navigation by plan, permission and pilot audience without mixing platform navigation', () => {
    const layout = read('src/app/admin/layout.tsx');
    expect(layout).toContain('MERCHANT_WORKSPACES');
    expect(layout).toContain('hasPlanFeature(effectivePlan, item.feature)');
    expect(layout).toContain('can(item.permission)');
    expect(layout).toContain("item.audience !== 'pilot' || instance?.status === 'pilot'");
    expect(layout).toContain('isPlatform && !instance ? [] : merchantSections');
    expect(layout).toContain('isPlatform ? OPERATOR_NAV');
  });

  it('implements collapsed workspaces, delayed hover preview, persistent click accordion and keyboard controls', () => {
    const navigation = read('src/components/navigation/admin-navigation.tsx');
    expect(navigation).toContain('HOVER_OPEN_DELAY_MS = 220');
    expect(navigation).toContain('aria-expanded={isOpen}');
    expect(navigation).toContain('aria-controls={regionId}');
    expect(navigation).toContain("event.pointerType !== 'mouse'");
    expect(navigation).toContain("window.matchMedia('(hover:hover) and (pointer:fine)')");
    expect(navigation).toContain('setOpenSectionId((current) => current === section.id ? null : section.id)');
    expect(navigation).toContain("event.key === 'ArrowRight'");
    expect(navigation).toContain("event.key === 'ArrowLeft'");
    expect(navigation).toContain("event.key === 'Escape'");
    expect(navigation).toContain('adminNavFlyout');
  });

  it('provides one filtered breadcrumb and deterministic return path for nested admin routes', () => {
    const routeContext = read('src/components/navigation/admin-route-context.tsx');
    const layout = read('src/app/admin/layout.tsx');
    expect(routeContext).toContain('aria-label="Morzsamenü"');
    expect(routeContext).toContain('detailRoute');
    expect(routeContext).toContain('← Vissza: {baseItem.label}');
    expect(layout).toContain('<AdminRouteContext sections={sections} operatorItems={operatorItems} />');
  });

  it('keeps the admin shell body-driven and makes the new navigation responsive without a builder implementation', () => {
    const css = read('src/app/admin/block4-ia-reporting.css');
    expect(css).toContain('.adminContentShell');
    expect(css).toContain('overflow-y:visible!important');
    expect(css).toContain('.adminMerchantNav{display:grid!important');
    expect(css).toContain('.adminNavFlyout{display:none!important');
    expect(css).not.toMatch(/drag.?drop|live canvas|visual builder/i);
  });

  it('separates reporting facts, calculations and recommendations on the main analytical surfaces', () => {
    const contract = read('src/lib/admin/reporting-contract.ts');
    expect(contract).toContain("label: 'Tényadat'");
    expect(contract).toContain("label: 'Számított mutató'");
    expect(contract).toContain("label: 'Ajánlás'");
    for (const path of ['src/app/admin/elemzes/page.tsx', 'src/app/admin/keszlet-elemzes/page.tsx', 'src/app/admin/cashflow/page.tsx', 'src/app/admin/novekedes/page.tsx', 'src/app/admin/vezetoi/page.tsx']) {
      expect(read(path)).toContain('ReportingLegend');
      expect(read(path)).toContain('ReportingEvidence');
    }
    expect(read('src/app/admin/cashflow/page.tsx')).toContain('kind="fact"');
    expect(read('src/app/admin/cashflow/page.tsx')).toContain('kind="calculation"');
    expect(read('src/app/admin/novekedes/page.tsx')).toContain('kind="recommendation"');
    expect(read('src/app/admin/vezetoi/page.tsx')).toContain('kind="recommendation"');
  });
});
