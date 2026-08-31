import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const cashflow = read('src/app/admin/cashflow/page.tsx');
const analytics = read('src/app/admin/elemzes/page.tsx');

test('cash-flow remains a Pro-only decision-support module', () => {
  assert.match(cashflow, /requirePlanFeature\('cashflow'\)/);
  assert.match(cashflow, /90 napos működési cash-flow előrejelzés/);
  assert.match(cashflow, /tényleges fizetett forgalom/);
  assert.match(cashflow, /nyitott beszerzési fizetési kötelezettségek/);
  assert.match(cashflow, /Ez működési cash-flow előrejelzés, nem könyvelési pénzforgalmi kimutatás/);
});

test('cash-flow uses paid commerce revenue and open procurement obligations', () => {
  assert.match(cashflow, /const paid=\['paid','processing','shipped','completed'\]/);
  assert.match(cashflow, /from\('orders'\)/);
  assert.match(cashflow, /\.in\('status',paid\)/);
  assert.match(cashflow, /from\('purchase_orders'\)/);
  assert.match(cashflow, /\.not\('status','in','\(received,cancelled\)'\)/);
  assert.match(cashflow, /payment_due_at/);
  assert.match(cashflow, /net_total_huf/);
});

test('cash-flow keeps 30, 60 and 90 day obligations cumulative and visible', () => {
  assert.match(cashflow, /due30/);
  assert.match(cashflow, /due60/);
  assert.match(cashflow, /due90/);
  assert.match(cashflow, /net30=forecastRevenue30-due30/);
  assert.match(cashflow, /net60=forecastRevenue60-due30-due60/);
  assert.match(cashflow, /net90=forecastRevenue90-due30-due60-due90/);
  assert.match(cashflow, /0–30 nap/);
  assert.match(cashflow, /31–60 nap/);
  assert.match(cashflow, /61–90 nap/);
});

test('advanced analytics remains Pro-only and excludes unpaid orders from business KPIs', () => {
  assert.match(analytics, /requirePlanFeature\('advancedAnalytics'\)/);
  assert.match(analytics, /paidStatuses=\['paid','processing','shipped','completed'\]/);
  assert.match(analytics, /paid=orders\.filter\(o=>paidStatuses\.includes\(o\.status\)\)/);
  assert.match(analytics, /Értékesítési és fedezeti intelligencia/);
});

test('advanced analytics keeps frozen cost provenance and missing-cost honesty', () => {
  assert.match(analytics, /unit_cost_net_huf/);
  assert.match(analytics, /cost_source/);
  assert.match(analytics, /cost_source==='order_created'/);
  assert.match(analytics, /Hiányos önköltség/);
  assert.match(analytics, /pontos \/ történetileg visszatöltött darab/);
  assert.match(analytics, /rendeléskor ténylegesen befagyasztott költséggel/);
});

test('analytics protects profitability, retention, channel and coupon decision views', () => {
  assert.match(analytics, /Lakossági vs\. viszonteladói/);
  assert.match(analytics, /Termékprofitabilitás/);
  assert.match(analytics, /Ügyfélérték/);
  assert.match(analytics, /12 havi trend/);
  assert.match(analytics, /Kuponhatás/);
  assert.match(analytics, /repeatRate/);
  assert.match(analytics, /grossMargin/);
  assert.match(analytics, /channelMargin/);
});

test('analytics preserves explicit VAT and proportional order-discount assumptions', () => {
  assert.match(analytics, /VAT=1\.27/);
  assert.match(analytics, /discount_gross_huf/);
  assert.match(analytics, /share=orderSubtotal>0/);
  assert.match(analytics, /A rendelési kedvezményt arányosan osztjuk a tételekre/);
  assert.match(analytics, /nettósítás 27% ÁFA-val történik/);
});
