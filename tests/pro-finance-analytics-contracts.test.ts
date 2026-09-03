import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const cashflow = read('src/app/admin/cashflow/page.tsx');
const analytics = read('src/app/admin/elemzes/page.tsx');

describe('Pro finance and analytics contracts', () => {
  test('cash-flow remains Pro-only, tenant-scoped decision support', () => {
    expect(cashflow).toMatch(/requirePlanFeature\('cashflow'\)/);
    expect(cashflow).toMatch(/requireCurrentStoreContext\('analytics\.read'\)/);
    expect(cashflow).toMatch(/90 napos működési pénzáram-előrejelzés/);
    expect(cashflow).toMatch(/utolsó 90 nap fizetett rendeléseinek/);
    expect(cashflow).toMatch(/Működési előrejelzés, nem bankszámla-egyenleg/);
  });

  test('cash-flow uses paid commerce revenue and open procurement obligations', () => {
    expect(cashflow).toMatch(/const paid=\['paid','processing','shipped','completed'\]/);
    expect(cashflow).toMatch(/from\('orders'\)/);
    expect(cashflow).toMatch(/\.eq\('instance_id',scope\.instanceId\)/);
    expect(cashflow).toMatch(/\.in\('status',paid\)/);
    expect(cashflow).toMatch(/from\('purchase_orders'\)/);
    expect(cashflow).toMatch(/\.not\('status','in','\(received,cancelled\)'\)/);
    expect(cashflow).toMatch(/payment_due_at/);
    expect(cashflow).toMatch(/net_total_huf/);
  });

  test('cash-flow keeps 30, 60 and 90 day obligations cumulative and visible', () => {
    expect(cashflow).toMatch(/const overdue=/);
    expect(cashflow).toMatch(/net30=forecastRevenue30-overdue-due30/);
    expect(cashflow).toMatch(/net60=forecastRevenue60-overdue-due30-due60/);
    expect(cashflow).toMatch(/net90=forecastRevenue90-overdue-due30-due60-due90/);
    expect(cashflow).toMatch(/Lejárt/);
    expect(cashflow).toMatch(/0–30 nap/);
    expect(cashflow).toMatch(/31–60 nap/);
    expect(cashflow).toMatch(/61–90 nap/);
  });

  test('advanced analytics remains Pro-only, tenant-scoped and excludes unpaid orders', () => {
    expect(analytics).toMatch(/requirePlanFeature\('advancedAnalytics'\)/);
    expect(analytics).toMatch(/requireCurrentStoreContext\('analytics\.read'\)/);
    expect(analytics).toMatch(/const paid=\['paid','processing','shipped','completed'\]/);
    expect(analytics).toMatch(/\.eq\('instance_id',scope\.instanceId\)\.in\('status',paid\)/);
    expect(analytics).toMatch(/Értékesítési és fedezeti intelligencia/);
  });

  test('advanced analytics keeps frozen cost fields and missing-cost honesty', () => {
    expect(analytics).toMatch(/unit_cost_net_huf/);
    expect(analytics).toMatch(/cost_source/);
    expect(analytics).toMatch(/cost=i\.unit_cost_net_huf==null\?null:Number/);
    expect(analytics).toMatch(/p\.missing=true/);
    expect(analytics).toMatch(/Hiányos/);
  });

  test('analytics protects profitability and retention decision views', () => {
    expect(analytics).toMatch(/Termékenkénti fedezet/);
    expect(analytics).toMatch(/Ügyfélérték/);
    expect(analytics).toMatch(/repeatRate/);
    expect(analytics).toMatch(/grossMargin/);
    expect(analytics).toMatch(/coupon_code/);
  });

  test('analytics preserves explicit VAT and proportional order-discount assumptions', () => {
    expect(analytics).toMatch(/VAT=1\.27/);
    expect(analytics).toMatch(/discount_gross_huf/);
    expect(analytics).toMatch(/const share=Number\(o\.subtotal_gross_huf\|\|0\)>0/);
    expect(analytics).toMatch(/Number\(o\.discount_gross_huf\|\|0\)\*share/);
  });
});
