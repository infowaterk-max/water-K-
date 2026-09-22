import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const confirmation = read('src/app/rendeles-sikeres/page.tsx');
const adminList = read('src/app/admin/rendelesek/page.tsx');
const adminDetail = read('src/app/admin/rendelesek/[id]/page.tsx');
const customerDetail = read('src/app/fiokom/rendeles/[id]/page.tsx');

describe('order lifecycle contracts', () => {
  test('public confirmation reveals an order only through a valid server confirmation token', () => {
    expect(confirmation).toMatch(/z\.string\(\)\.uuid\(\)\.safeParse\(params\.token\)/);
    expect(confirmation).toMatch(/\.eq\('confirmation_token',parsed\.data\)\.maybeSingle\(\)/);
    expect(confirmation).toMatch(/robots:\{index:false,follow:false\}/);
    expect(confirmation).not.toMatch(/\.eq\('order_number'/);
  });

  test('confirmation keeps payment state server-authoritative', () => {
    expect(confirmation).toMatch(/payment_flow==='online_redirect'/);
    expect(confirmation).toMatch(/hitelesített visszajelzése után/);
    expect(confirmation).toMatch(/Aktuális állapot:/);
  });

  test('admin order centre keeps operational search, status and attention queues', () => {
    expect(adminList).toMatch(/Rendelési központ/);
    expect(adminList).toMatch(/order_number\.ilike/);
    expect(adminList).toMatch(/priority==='attention'/);
    expect(adminList).toMatch(/OrderStatusControl/);
    expect(adminList).toMatch(/Fizetésre vár 24\+ óra/);
    expect(adminList).toMatch(/Feldolgozás 48\+ óra/);
  });

  test('admin detail preserves payment, integration and audit visibility', () => {
    expect(adminDetail).toMatch(/payment_attempts/);
    expect(adminDetail).toMatch(/order_events/);
    expect(adminDetail).toMatch(/integration_jobs/);
    expect(adminDetail).toMatch(/IntegrationJobRetry/);
    expect(adminDetail).toMatch(/ManualFulfillmentControl/);
    expect(adminDetail).toMatch(/invoice_manual_required/);
  });

  test('customer order detail requires authentication and uses scoped database reads', () => {
    expect(customerDetail).toMatch(/supabase\.auth\.getUser\(\)/);
    expect(customerDetail).toMatch(/if\(!user\)redirect\('\/fiokom'\)/);
    expect(customerDetail).toMatch(/supabase\.from\('orders'\)/);
    expect(customerDetail).toMatch(/supabase\.from\('order_items'\)/);
    expect(customerDetail).toMatch(/supabase\.from\('order_events'\)/);
  });

  test('customer order detail keeps safe payment retry, tracking, invoice and reorder flows', () => {
    expect(customerDetail).toMatch(/order\.status==='pending_payment'/);
    expect(customerDetail).toMatch(/PaymentRetryButton/);
    expect(customerDetail).toMatch(/trackingProviderUrl/);
    expect(customerDetail).toMatch(/invoice_url/);
    expect(customerDetail).toMatch(/Újrarendelés/);
    expect(customerDetail).toMatch(/Rendelési idővonal/);
  });
});
