import fs from'node:fs';
import{describe,expect,it}from'vitest';

const auth=fs.readFileSync('src/components/auth/auth-form.tsx','utf8');
const dialog=fs.readFileSync('src/components/auth/storefront-auth-dialog.tsx','utf8');
const header=fs.readFileSync('src/components/builder/storefront-commerce-header.tsx','utf8');
const checkout=fs.readFileSync('src/components/checkout/checkout-form.tsx','utf8');
const checkoutPage=fs.readFileSync('src/app/penztar/page.tsx','utf8');
const accountNav=fs.readFileSync('src/components/account/account-subnav.tsx','utf8');

describe('storefront auth intent and checkout account opportunity',()=>{
 it('opens account auth as a shared template-aware dialog while keeping direct account fallback',()=>{
  expect(dialog).toMatch(/data-storefront-auth-dialog="true"/);
  expect(dialog).toMatch(/StorefrontAccountAuthTrigger/);
  expect(header).toMatch(/item\.href==='\/fiokom'\?<StorefrontAccountAuthTrigger/);
  expect(auth).toMatch(/returnTo\?:string\|null/);
  expect(auth).toMatch(/if\(onAuthenticated\)\{onAuthenticated\(\);return;\}/);
  expect(auth).toMatch(/resetPasswordForEmail/);
  expect(auth).toMatch(/\/fiokom\?auth_flow=recovery/);
 });
 it('preserves caller intent instead of always redirecting login to account',()=>{
  expect(dialog).toMatch(/returnTo="\/fiokom"/);
  expect(checkout).toMatch(/onAuthenticated=\{\(\)=>\{setAccountConnected\(true\)/);
  expect(checkout).not.toMatch(/router\.replace\('\/fiokom'\)/);
 });
 it('offers optional login or registration before order completion without blocking guest checkout',()=>{
  expect(checkout).toMatch(/data-checkout-account-opportunity="true"/);
  expect(checkout).toMatch(/Mielőtt befejezed/);
  expect(checkout).toMatch(/Bejelentkezés/);
  expect(checkout).toMatch(/Regisztráció/);
  expect(checkout).toMatch(/Folytatás vendégként/);
  expect(checkout).toMatch(/A fiók nem kötelező a rendeléshez/);
  expect(checkout).toMatch(/loyaltyEnabled\?<li>Hűségpontok/);
  expect(checkout).toMatch(/containsDigital\?<li>Digitális letöltéseid/);
  expect(checkoutPage).toMatch(/signedIn=\{access\.signedIn\}/);
  expect(checkoutPage).toMatch(/loyaltyEnabled=\{Boolean\(loyaltyResult\.data\?\.enabled\)\}/);
 });
 it('keeps one canonical account navigation rail instead of legacy top subnav',()=>{
  expect(accountNav).toMatch(/className="accountCapabilityRail"/);
  expect(accountNav).not.toMatch(/accountSubnav/);
 });
});
