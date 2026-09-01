import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const page = read('src/app/admin/beszerzes/page.tsx');
const controls = read('src/components/admin/procurement-controls.tsx');
const createApi = read('src/app/api/admin/procurement/route.ts');
const updateApi = read('src/app/api/admin/procurement/[id]/route.ts');

describe('procurement and stock receipt workflows', () => {
  test('procurement remains Pro-only on page and write APIs', () => {
    expect(page).toMatch(/requirePlanFeature\('procurement'\)/);
    for (const api of [createApi, updateApi]) {
      expect(api).toMatch(/getAdminRequestUser\(\)/);
      expect(api).toMatch(/hasCurrentPlanFeature\('procurement'\)/);
      expect(api).toMatch(/status:403/);
    }
  });

  test('reorder proposal accounts for demand, incoming stock, lead time, safety stock, MOQ and multiples', () => {
    expect(page).toMatch(/daily=q\/30/);
    expect(page).toMatch(/supplier_lead_time_days/);
    expect(page).toMatch(/safety_stock_days/);
    expect(page).toMatch(/minimum_order_quantity/);
    expect(page).toMatch(/order_multiple/);
    expect(page).toMatch(/position=p\.stock\+incoming/);
    expect(page).toMatch(/reorderPoint=Math\.ceil/);
  });

  test('creating a purchase order is draft-first and validates duplicate variants and quantities', () => {
    expect(controls).toMatch(/Piszkozat létrehozása/);
    expect(controls).toMatch(/A létrehozás még nem jelent megrendelést a beszállítónál/);
    expect(createApi).toMatch(/quantity:z\.number\(\)\.int\(\)\.min\(1\)/);
    expect(createApi).toMatch(/Ugyanaz a termék csak egyszer szerepelhet a beszerzésben/);
    expect(createApi).toMatch(/create_purchase_order/);
    expect(createApi).toMatch(/p_created_by:actor\.id/);
  });

  test('UI exposes the controlled draft to approved to ordered to received lifecycle', () => {
    expect(controls).toMatch(/status==='draft'\?'approved'/);
    expect(controls).toMatch(/status==='approved'\?'ordered'/);
    expect(controls).toMatch(/status==='ordered'\|\|status==='partially_received'\?'received'/);
    expect(controls).toMatch(/partial_receipt/);
  });

  test('receipt mutations delegate stock changes to transactional database RPCs', () => {
    expect(updateApi).toMatch(/receive_purchase_order_items/);
    expect(updateApi).toMatch(/receive_purchase_order/);
    expect(updateApi).toMatch(/transition_purchase_order/);
    expect(updateApi).toMatch(/p_actor:actor\.id/);
    expect(updateApi).toMatch(/status:409/);
  });

  test('partial receipts reject duplicate item identifiers and the UI caps receipt quantity at remaining stock', () => {
    expect(updateApi).toMatch(/unique\.size!==p\.data\.items\.length/);
    expect(updateApi).toMatch(/Ugyanaz a beszerzési tétel csak egyszer adható meg/);
    expect(controls).toMatch(/max=\{x\.ordered-x\.received\}/);
    expect(controls).toMatch(/filter\(x=>x\.quantity>0\)/);
  });

  test('purchase order writes remain audit logged', () => {
    expect(createApi).toMatch(/recordAdminAudit/);
    expect(createApi).toMatch(/procurement\.purchase_order_created/);
    expect(updateApi).toMatch(/procurement\.partial_receipt/);
    expect(updateApi).toMatch(/procurement\.received/);
    expect(updateApi).toMatch(/beforeState:\{status:po\.status\}/);
  });
});
