import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const cartPage = read('src/app/kosar/page.tsx');
const checkoutPage = read('src/app/penztar/page.tsx');
const checkoutForm = read('src/components/checkout/checkout-form.tsx');

describe('checkout workflow contracts', () => {
  test('cart keeps the customer on the three-step commerce journey', () => {
    expect(cartPage).toMatch(/1 · Kosár/);expect(cartPage).toMatch(/2 · Adatok és szállítás/);expect(cartPage).toMatch(/3 · Fizetés és rendelés/);expect(cartPage).toMatch(/CartView/);expect(cartPage).toMatch(/ProductRecommendations/);
  });
  test('checkout keeps recovery and configured commerce settings wired in', () => {
    expect(checkoutPage).toMatch(/getCommerceSettings/);expect(checkoutPage).toMatch(/CheckoutRecoverySaver/);expect(checkoutPage).toMatch(/shippingOptions=\{settings\.shippingOptions\}/);expect(checkoutPage).toMatch(/paymentOptions=\{settings\.paymentOptions\}/);expect(checkoutPage).toMatch(/freeShippingThreshold=\{settings\.freeShippingThreshold\}/);
  });
  test('checkout validates parcel point and legal acceptance before order creation', () => {
    expect(checkoutForm).toMatch(/shipping\.kind==='parcel_point'&&!parcelPointId/);expect(checkoutForm).toMatch(/!legalAccepted/);expect(checkoutForm).toMatch(/legalAccepted='true'/);expect(checkoutForm).toMatch(/href="\/aszf"/);expect(checkoutForm).toMatch(/href="\/adatvedelem"/);
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
