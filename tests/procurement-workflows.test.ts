import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd();
const read=(f:string)=>fs.readFileSync(path.join(root,f),'utf8');
const page=read('src/app/admin/beszerzes/page.tsx');
const controls=read('src/components/admin/procurement-controls.tsx');
const createApi=read('src/app/api/admin/procurement/route.ts');
const updateApi=read('src/app/api/admin/procurement/[id]/route.ts');
const atomic=read('supabase/migrations/20260903146000_admin_procurement_return_evidence_atomic_v2.sql');

describe('procurement and stock receipt workflows',()=>{
 test('procurement remains Pro-only on page and write APIs',()=>{
   expect(page).toMatch(/requirePlanFeature\('procurement'\)/);
   for(const api of[createApi,updateApi]){
     expect(api).toMatch(/getAdminRequestUser\('procurement\.manage'\)/);
     expect(api).toMatch(/requireCurrentStoreContext\('procurement\.manage'\)/);
     expect(api).toMatch(/hasCurrentPlanFeature\('procurement'\)/);
     expect(api).toMatch(/status:403/);
   }
 });
 test('reorder proposal accounts for demand, incoming stock, lead time, safety stock, MOQ and multiples',()=>{
   expect(page).toMatch(/daily=q\/30/);
   expect(page).toMatch(/supplier_lead_time_days/);
   expect(page).toMatch(/safety_stock_days/);
   expect(page).toMatch(/minimum_order_quantity/);
   expect(page).toMatch(/order_multiple/);
   expect(page).toMatch(/position=p\.stock\+incoming/);
 });
 test('creating a purchase order is draft-first and validates duplicate variants and quantities',()=>{
   expect(createApi).toMatch(/Ugyanaz a termék csak egyszer szerepelhet/);
   expect(createApi).toMatch(/admin_manage_purchase_order_v3/);
   expect(createApi).toMatch(/p_instance_id:scope\.instanceId/);
   expect(atomic).toMatch(/public\.create_purchase_order_v2/);
   expect(controls).toMatch(/Piszkozat létrehozása/);
 });
 test('UI exposes the controlled draft to approved to ordered to received lifecycle',()=>{
   expect(controls).toMatch(/status==='draft'\?'approved'/);
   expect(controls).toMatch(/status==='approved'\?'ordered'/);
   expect(controls).toMatch(/status==='ordered'\|\|status==='partially_received'\?'received'/);
   expect(controls).toMatch(/piszkozat → jóváhagyva → megrendelve → részleges vagy teljes bevételezés/);
 });
 test('receipt mutations delegate stock changes to transactional database RPCs',()=>{
   expect(updateApi).toMatch(/admin_manage_purchase_order_v3/);
   expect(updateApi).not.toMatch(/from\('product_variants'\)\.update/);
   expect(atomic).toMatch(/public\.receive_purchase_order_items_v2/);
   expect(atomic).toMatch(/public\.receive_purchase_order_v2/);
 });
 test('partial receipts reject duplicate item identifiers and the UI caps receipt quantity at remaining stock',()=>{
   expect(updateApi).toMatch(/Set/);
   expect(controls).toMatch(/max=\{x\.ordered-x\.received\}/);
   expect(controls).toMatch(/x\.received<x\.ordered/);
 });
 test('purchase order writes remain audit logged atomically with domain state',()=>{
   expect(createApi).not.toMatch(/recordAdminAudit/);
   expect(updateApi).not.toMatch(/recordAdminAudit/);
   expect(atomic).toMatch(/insert into public\.admin_audit_log/);
   expect(atomic).toMatch(/'procurement\.purchase_order_created'/);
   expect(atomic).toMatch(/'procurement\.partial_receipt'/);
   expect(atomic).toMatch(/'procurement\.received'/);
   expect(atomic).toMatch(/public\.transition_purchase_order_v2/);
 });
});
