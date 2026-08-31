import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const cashflow = read('src/app/admin/cashflow/page.tsx');
const analytics = read('src/app/admin/elemzes/page.tsx');

describe('Pro finance and analytics contracts', () => {
  test('cash-flow remains a Pro-only decision-support module', () => {
    expect(cashflow).toMatch(/requirePlanFeature\('cashflow'\)/);
    expect(cashflow).toMatch(/90 napos működési cash-flow előrejelzés/);
    expect(cashflow).toMatch(/tényleges fizetett forgalom/);
    expect(cashflow).toMatch(/nyitott beszerzési fizetési kötelezettségek/);
    expect(cashflow).toMatch(/Ez működési cash-flow előrejelzés, nem könyvelési pénzforgalmi kimutatás/);
  });

  test('cash-flow uses paid commerce revenue and open procurement obligations', () => {
    expect(cashflow).toMatch(/const paid=\['paid','processing','shipped','completed'\]/);
    expect(cashflow).toMatch(/from\('orders'\)/);
    expect(cashflow).toMatch(/\.in\('status',paid\)/);
    expect(cashflow).toMatch(/from\('purchase_orders'\)/);
    expect(cashflow).toMatch(/\.not\('status','in','\(received,cancelled\)'\)/);
    expect(cashflow).toMatch(/payment_due_at/);
    expect(cashflow).toMatch(/net_total_huf/);
  });

  test('cash-flow keeps 30, 60 and 90 day obligations cumulative and visible', () => {
    expect(cashflow).toMatch(/due30/);
    expect(cashflow).toMatch(/due60/);
    expect(cashflow).toMatch(/due90/);
    expect(cashflow).toMatch(/net30=forecastRevenue30-due30/);
    expect(cashflow).toMatch(/net60=forecastRevenue60-due30-due60/);
    expect(cashflow).toMatch(/net90=forecastRevenue90-due30-due60-due90/);
    expect(cashflow).toMatch(/0–30 nap/);
    expect(cashflow).toMatch(/31–60 nap/);
    expect(cashflow).toMatch(/61–90 nap/);
  });

  test('advanced analytics remains Pro-only and excludes unpaid orders from business KPIs', () => {
    expect(analytics).toMatch(/requirePlanFeature\('advancedAnalytics'\)/);
    expect(analytics).toMatch(/paidStatuses=\['paid','processing','shipped','completed'\]/);
    expect(analytics).toMatch(/paid=orders\.filter\(o=>paidStatuses\.includes\(o\.status\)\)/);
    expect(analytics).toMatch(/Értékesítési és fedezeti intelligencia/);
  });

  test('advanced analytics keeps frozen cost provenance and missing-cost honesty', () => {
    expect(analytics).toMatch(/unit_cost_net_huf/);
    expect(analytics).toMatch(/cost_source/);
    expect(analytics).toMatch(/cost_source==='order_created'/);
    expect(analytics).toMatch(/Hiányos önköltség/);
    expect(analytics).toMatch(/pontos \/ történetileg visszatöltött darab/);
    expect(analytics).toMatch(/rendeléskor ténylegesen befagyasztott költséggel/);
  });

  test('analytics protects profitability, retention, channel and coupon decision views', () => {
    expect(analytics).toMatch(/Lakossági vs\. viszonteladói/);
    expect(analytics).toMatch(/Termékprofitabilitás/);
    expect(analytics).toMatch(/Ügyfélérték/);
    expect(analytics).toMatch(/12 havi trend/);
    expect(analytics).toMatch(/Kuponhatás/);
    expect(analytics).toMatch(/repeatRate/);
    expect(analytics).toMatch(/grossMargin/);
    expect(analytics).toMatch(/channelMargin/);
  });

  test('analytics preserves explicit VAT and proportional order-discount assumptions', () => {
    expect(analytics).toMatch(/VAT=1\.27/);
    expect(analytics).toMatch(/discount_gross_huf/);
    expect(analytics).toMatch(/share=orderSubtotal>0/);
    expect(analytics).toMatch(/A rendelési kedvezményt arányosan osztjuk a tételekre/);
    expect(analytics).toMatch(/nettósítás 27% ÁFA-val történik/);
  });
});
