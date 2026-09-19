import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const cartPage = read('src/app/kosar/page.tsx');
const checkoutPage = read('src/app/penztar/page.tsx');
const checkoutForm = read('src/components/checkout/checkout-form.tsx');
const checkoutStyle = read('src/components/checkout/checkout-guided.module.css');

describe('checkout workflow contracts', () => {
  test('checkout exposes the canonical four-step journey while cart stays customer-task focused', () => {
    expect(cartPage).toMatch(/CartView/);expect(cartPage).toMatch(/ProductRecommendations/);
    expect(cartPage).not.toMatch(/commerceSteps/);
    expect(cartPage).not.toMatch(/cartAssurance/);
    expect(cartPage).not.toMatch(/Valós készlet/);
    expect(checkoutPage).toMatch(/1 · Kosár/);
    expect(checkoutPage).toMatch(/2 · Szállítás/);
    expect(checkoutPage).toMatch(/3 · Fizetés/);
    expect(checkoutPage).toMatch(/4 · Összesítés/);
    expect(checkoutPage).toMatch(/data-shared-checkout-contract="guided-accordion-v1"/);
  });
  test('checkout keeps recovery and configured commerce settings wired in', () => {
    expect(checkoutPage).toMatch(/getCommerceSettings/);expect(checkoutPage).toMatch(/CheckoutRecoverySaver/);expect(checkoutPage).toMatch(/shippingOptions=\{settings\.shippingOptions\}/);expect(checkoutPage).toMatch(/paymentOptions=\{settings\.paymentOptions\}/);expect(checkoutPage).toMatch(/freeShippingThreshold=\{settings\.freeShippingThreshold\}/);
  });
  test('shared E13 checkout owns a real accessible accordion instead of template-local fake steps',()=>{
    expect(checkoutForm).toMatch(/type CheckoutStep='shipping'\|'payment'\|'summary'/);
    expect(checkoutForm).toMatch(/aria-expanded=\{active\}/);
    expect(checkoutForm).toMatch(/aria-controls=\{panelId\}/);
    expect(checkoutForm).toMatch(/data-checkout-panel=\{step\}/);
    expect(checkoutForm).toMatch(/activeStep==='shipping'/);
    expect(checkoutForm).toMatch(/activeStep==='payment'/);
    expect(checkoutForm).toMatch(/activeStep==='summary'/);
    expect(checkoutForm).toMatch(/Tovább a fizetéshez/);
    expect(checkoutForm).toMatch(/Tovább az összesítéshez/);
  });
  test('shipping and payment providers occupy their semantic add-on insertion points',()=>{
    expect(checkoutForm).toMatch(/data-addon-insertion-point="checkout\.shipping\.methods"/);
    expect(checkoutForm).toMatch(/data-addon-insertion-point="checkout\.payment\.methods"/);
    expect(checkoutForm).toMatch(/data-storefront-design-inheritance="current-theme"/);
  });
  test('checkout presentation resolves current storefront design tokens before shared fallbacks',()=>{
    expect(checkoutStyle).toMatch(/--shoporation-color-background/);
    expect(checkoutStyle).toMatch(/--shoporation-color-surface/);
    expect(checkoutStyle).toMatch(/--shoporation-color-text/);
    expect(checkoutStyle).toMatch(/--shoporation-color-primary/);
    expect(checkoutStyle).toMatch(/--shoporation-radius-l/);
    expect(checkoutStyle).toMatch(/--shoporation-space-m/);
    expect(checkoutStyle).toMatch(/checkoutSummary/);
    expect(checkoutStyle).toMatch(/position:sticky/);
  });
  test('checkout validates parcel point and legal acceptance before order creation', () => {
    expect(checkoutForm).toMatch(/requiresShipping&&shipping\?\.kind==='parcel_point'&&!parcelPointId/);expect(checkoutForm).toMatch(/!legalAccepted/);expect(checkoutForm).toMatch(/legalAccepted='true'/);expect(checkoutForm).toMatch(/href="\/aszf"/);expect(checkoutForm).toMatch(/href="\/adatvedelem"/);
  });
  test('checkout snapshots the submitted form before awaiting quote refresh', () => {
    const snapshot=checkoutForm.indexOf('const form=e.currentTarget');
    const quoteRefresh=checkoutForm.indexOf('const verified=await refreshQuote()');
    const formData=checkoutForm.indexOf('new FormData(form)');
    expect(snapshot).toBeGreaterThanOrEqual(0);
    expect(quoteRefresh).toBeGreaterThan(snapshot);
    expect(formData).toBeGreaterThan(quoteRefresh);
    expect(checkoutForm).not.toMatch(/new FormData\(e\.currentTarget\)/);
  });
  test('order creation remains idempotent and server-backed', () => {
    expect(checkoutForm).toMatch(/x-idempotency-key/);expect(checkoutForm).toMatch(/fetch\('\/api\/orders'/);expect(checkoutForm).toMatch(/confirmationToken/);expect(checkoutForm).toMatch(/router\.replace\(`\/rendeles-sikeres\?token=/);
  });
  test('cart is cleared only after a confirmed order response', () => {
    const responseGuard=checkoutForm.indexOf("if(!r.ok||!p.orderNumber||!p.status||!p.confirmationToken)");const clearCall=checkoutForm.indexOf('clear();');expect(responseGuard).toBeGreaterThanOrEqual(0);expect(clearCall).toBeGreaterThan(responseGuard);
  });
  test('payment redirect and retry-safe failure handling remain available', () => {
    expect(checkoutForm).toMatch(/paymentRedirectUrl/);expect(checkoutForm).toMatch(/window\.location\.assign\(p\.paymentRedirectUrl\)/);expect(checkoutForm).toMatch(/A kosarad megmaradt/);expect(checkoutForm).toMatch(/submitting\.current=false/);
  });
  test('coupon, shipping, price and stock are quoted by the authoritative checkout engine', () => {
    expect(checkoutForm).toMatch(/\/api\/checkout\/quote/);
    expect(checkoutForm).toMatch(/discount_gross_huf/);
    expect(checkoutForm).toMatch(/shipping_gross_huf/);
    expect(checkoutForm).toMatch(/subtotal_gross_huf/);
    expect(checkoutForm).toMatch(/total_gross_huf/);
    expect(checkoutForm).toMatch(/availableQuantity/);
    expect(checkoutForm).toMatch(/variantId/);
    expect(checkoutForm).not.toMatch(/\/api\/coupons\/validate/);
    expect(checkoutForm).not.toMatch(/freeShippingApplies/);
  });
});
