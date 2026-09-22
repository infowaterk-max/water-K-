import fs from'node:fs';
import{describe,expect,it}from'vitest';

const route=fs.readFileSync('src/app/api/orders/claim/route.ts','utf8');
const migration=fs.readFileSync('supabase/migrations/20260921205500_authenticated_guest_order_claim_v1.sql','utf8');
const baseline=fs.readFileSync('supabase/customer-baseline/migrations/0043_authenticated_guest_order_claim_v1.sql','utf8');

describe('authenticated guest order claim authority',()=>{
 it('requires authenticated session plus confirmation token and never claims by email alone',()=>{
  expect(route).toMatch(/auth\.getUser\(\)/);
  expect(route).toMatch(/confirmationToken:z\.string\(\)\.uuid\(\)/);
  expect(route).toMatch(/p_confirmation_token:parsed\.data\.confirmationToken/);
  expect(route).toMatch(/p_customer_id:user\.id/);
  expect(route).toMatch(/p_customer_email:user\.email/);
  expect(migration).toMatch(/confirmation_token=p_confirmation_token/);
  expect(migration).toMatch(/customer_id is not null/);
  expect(migration).toMatch(/lower\(trim\(coalesce\(v_order\.customer_email,''\)\)\)<>v_email/);
  expect(migration).not.toMatch(/where\s+customer_email\s*=\s*p_customer_email\s*;/i);
 });
 it('moves digital entitlement ownership and revokes guest digital access after a verified claim',()=>{
  expect(migration).toMatch(/update public\.digital_entitlements[\s\S]*customer_id=p_customer_id/);
  expect(migration).toMatch(/perform private\.sync_order_digital_entitlements_v1\(v_order\.id\)/);
  expect(migration).toMatch(/update public\.digital_guest_access_tokens[\s\S]*revoked_at/);
 });
 it('keeps customer baseline migration identical to canonical migration',()=>{
  expect(baseline).toBe(migration);
 });
});
