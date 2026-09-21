import fs from'node:fs';
import{describe,expect,it}from'vitest';

const account=fs.readFileSync('src/app/fiokom/page.tsx','utf8');
const css=fs.readFileSync('src/app/account-workflow.css','utf8');
const runtime=fs.readFileSync('src/lib/builder/storefront-runtime-source.ts','utf8');
const migration=fs.readFileSync('supabase/migrations/20260921164500_customer_account_browser_grants.sql','utf8');
const baseline=fs.readFileSync('supabase/customer-baseline/migrations/0042_customer_account_browser_grants.sql','utf8');

describe('customer account runtime hardening',()=>{
 it('keeps authenticated preview accounts on the active template draft',()=>{
  expect(runtime).toMatch(/const previewDraft=process\.env\.VERCEL_ENV==='preview'/);
  expect(runtime).toMatch(/getPreviewStorefrontDraftPage\(instance\.id,'account'\)/);
  expect(runtime).not.toMatch(/previewDraft=!customerId/);
 });
 it('restores only the customer browser grants required by owner-scoped RLS',()=>{
  for(const source of[migration,baseline]){
   expect(source).toMatch(/grant select on table public\.profiles to authenticated/);
   expect(source).toMatch(/grant update\(full_name,company_name,tax_number\) on table public\.profiles to authenticated/);
   expect(source).toMatch(/grant select on table public\.wishlists to authenticated/);
   expect(source).toMatch(/revoke all on table public\.profiles from anon/);
   expect(source).toMatch(/revoke all on table public\.wishlists from anon/);
  }
 });
 it('uses semantic mobile cards instead of a wide customer order table',()=>{
  expect(account).toMatch(/accountOrderTableDesktop/);
  expect(account).toMatch(/accountOrderMobileList/);
  expect(account).toMatch(/accountOrderMobileCard/);
  expect(css).toMatch(/\.storefrontAccountShell \.accountOrderTableDesktop\{display:none\}/);
  expect(css).toMatch(/\.storefrontAccountShell \.accountOrderMobileList\{display:grid/);
 });
});
