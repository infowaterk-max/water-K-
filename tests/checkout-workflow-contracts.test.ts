import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const cartPage = read('src/app/kosar/page.tsx');
const checkoutPage = read('src/app/penztar/page.tsx');
const checkoutForm = read('src/components/checkout/checkout-form.tsx');

test('cart keeps the customer on the three-step commerce journey', () => {
  assert.match(cartPage, /1 · Kosár/);
  assert.match(cartPage, /2 · Adatok és szállítás/);
  assert.match(cartPage, /3 · Fizetés és rendelés/);
  assert.match(cartPage, /CartView/);
  assert.match(cartPage, /ProductRecommendations/);
});

test('checkout keeps recovery and configured commerce settings wired in', () => {
  assert.match(checkoutPage, /getCommerceSettings/);
  assert.match(checkoutPage, /CheckoutRecoverySaver/);
  assert.match(checkoutPage, /shippingOptions=\{settings\.shippingOptions\}/);
  assert.match(checkoutPage, /paymentOptions=\{settings\.paymentOptions\}/);
  assert.match(checkoutPage, /freeShippingThreshold=\{settings\.freeShippingThreshold\}/);
});

test('checkout validates parcel point and legal acceptance before order creation', () => {
  assert.match(checkoutForm, /shipping\.kind==='parcel_point'&&!parcelPointId/);
  assert.match(checkoutForm, /!legalAccepted/);
  assert.match(checkoutForm, /legalAccepted='true'/);
  assert.match(checkoutForm, /href="\/aszf"/);
  assert.match(checkoutForm, /href="\/adatvedelem"/);
});

test('order creation remains idempotent and server-backed', () => {
  assert.match(checkoutForm, /x-idempotency-key/);
  assert.match(checkoutForm, /fetch\('\/api\/orders'/);
  assert.match(checkoutForm, /confirmationToken/);
  assert.match(checkoutForm, /router\.replace\(`\/rendeles-sikeres\?token=/);
});

test('cart is cleared only after a confirmed order response', () => {
  const responseGuard = checkoutForm.indexOf("if(!r.ok||!p.orderNumber||!p.status||!p.confirmationToken)");
  const clearCall = checkoutForm.indexOf('clear();');
  assert.ok(responseGuard >= 0, 'confirmed-order response guard must exist');
  assert.ok(clearCall > responseGuard, 'cart must clear only after confirmed order response');
});

test('payment redirect and retry-safe failure handling remain available', () => {
  assert.match(checkoutForm, /paymentRedirectUrl/);
  assert.match(checkoutForm, /window\.location\.assign\(p\.paymentRedirectUrl\)/);
  assert.match(checkoutForm, /A kosarad megmaradt/);
  assert.match(checkoutForm, /submitting\.current=false/);
});

test('coupon and free-shipping calculations stay part of checkout', () => {
  assert.match(checkoutForm, /\/api\/coupons\/validate/);
  assert.match(checkoutForm, /freeShippingApplies/);
  assert.match(checkoutForm, /couponDiscount/);
  assert.match(checkoutForm, /deliveryFee/);
});
