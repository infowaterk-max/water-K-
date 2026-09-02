import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const returnsPage = read('src/app/fiokom/visszakuldes/page.tsx');
const returnForm = read('src/components/account/return-request-form.tsx');
const returnsAdmin = read('src/app/admin/visszaru/page.tsx');
const returnActions = read('src/components/admin/return-case-actions.tsx');
const casesPage = read('src/app/fiokom/ugyek/page.tsx');
const ticketPage = read('src/app/fiokom/ugyek/[id]/page.tsx');
const customerReply = read('src/components/support/support-reply-form.tsx');
const supportAdmin = read('src/app/admin/ugyfelszolgalat/page.tsx');
const supportAdminDetail = read('src/app/admin/ugyfelszolgalat/[id]/page.tsx');
const adminReply = read('src/components/admin/support-reply-form.tsx');

describe('post-purchase service contracts', () => {
  test('customer returns stay authenticated and scoped to the current user', () => {
    expect(returnsPage).toMatch(/s\.auth\.getUser\(\)/);
    expect(returnsPage).toMatch(/if\(!user\)redirect\('\/fiokom'\)/);
    expect(returnsPage).toMatch(/\.eq\('customer_id',user\.id\)/);
    expect(returnsPage).toMatch(/\.eq\('user_id',user\.id\)/);
    expect(returnsPage).toMatch(/\.in\('status',\['shipped','completed'\]\)/);
  });

  test('return requests are item and quantity based and never promise automatic refunds', () => {
    expect(returnForm).toMatch(/orderItemId:i\.id,quantity:/);
    expect(returnForm).toMatch(/\.filter\(i=>i\.quantity>0\)/);
    expect(returnForm).toMatch(/max=\{i\.quantity\}/);
    expect(returnForm).toMatch(/fetch\('\/api\/account\/returns'/);
    expect(returnForm).toMatch(/nem jelent automatikus pénzvisszatérítést/);
  });

  test('return administration keeps refund and inventory restock as explicit operations', () => {
    expect(returnsAdmin).toMatch(/A banki pénzmozgás nem automatikus/);
    expect(returnsAdmin).toMatch(/return_case_items/);
    expect(returnsAdmin).toMatch(/inventory_restocked_at/);
    expect(returnsAdmin).toMatch(/ReturnCaseActions/);
    expect(returnActions).toMatch(/method:'PATCH'/);
    expect(returnActions).toMatch(/restock/);
    expect(returnActions).toMatch(/!inventoryRestockedAt/);
    expect(returnActions).toMatch(/Visszatérítve/);
  });

  test('customer case centre combines support and return status using user-scoped reads', () => {
    expect(casesPage).toMatch(/support_tickets/);
    expect(casesPage).toMatch(/return_cases/);
    expect(casesPage).toMatch(/\.eq\('user_id',user\.id\)/g);
    expect(casesPage).toMatch(/Új kérdés/);
    expect(casesPage).toMatch(/Visszaküldés indítása/);
  });

  test('customer support conversations require authentication and ownership', () => {
    expect(ticketPage).toMatch(/s\.auth\.getUser\(\)/);
    expect(ticketPage).toMatch(/if\(!user\)redirect\('\/fiokom'\)/);
    expect(ticketPage).toMatch(/\.eq\('id',id\)\.eq\('instance_id',instance\.id\)\.eq\('user_id',user\.id\)\.maybeSingle\(\)/);
    expect(ticketPage).toMatch(/support_ticket_messages/);
    expect(ticketPage).toMatch(/disabled=\{t\.status==='closed'\}/);
    expect(customerReply).toMatch(/\/api\/account\/support\/\$\{ticketId\}\/messages/);
    expect(customerReply).toMatch(/maxLength=\{4000\}/);
  });

  test('admin support keeps priority queue, conversation and explicit closed-state handling', () => {
    expect(supportAdmin).toMatch(/Ügyfélszolgálati inbox/);
    expect(supportAdmin).toMatch(/priority==='urgent'/);
    expect(supportAdmin).toMatch(/48\+ órás/);
    expect(supportAdmin).toMatch(/SupportTicketActions/);
    expect(supportAdminDetail).toMatch(/support_ticket_messages/);
    expect(supportAdminDetail).toMatch(/SupportReplyForm/);
    expect(adminReply).toMatch(/\/api\/admin\/support\/\$\{ticketId\}\/messages/);
    expect(adminReply).toMatch(/disabled=\{busy\|\|closed\}/);
  });
});
