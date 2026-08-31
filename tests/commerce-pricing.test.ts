import { describe, expect, it } from 'vitest';
import { orderTotal, shippingFee, type ShippingPricingConfig } from '../src/lib/commerce/pricing';

const demoShop: ShippingPricingConfig = {
  freeShippingThreshold: 30000,
  options: [
    { code: 'parcel_demo', fee: 1190, kind: 'parcel_point' },
    { code: 'courier_demo', fee: 1890, kind: 'home_delivery' },
    { code: 'local_pickup', fee: 500, kind: 'pickup' },
  ],
};

const secondShop: ShippingPricingConfig = {
  freeShippingThreshold: 80000,
  options: [
    { code: 'courier_demo', fee: 2990, kind: 'home_delivery' },
  ],
};

describe('tenant-configurable commerce pricing', () => {
  it('uses the selected webshop shipping fee below its own threshold', () => {
    expect(shippingFee('parcel_demo', 10000, demoShop)).toBe(1190);
    expect(shippingFee('courier_demo', 10000, demoShop)).toBe(1890);
  });

  it('uses each webshop own free-shipping threshold', () => {
    expect(shippingFee('courier_demo', 30000, demoShop)).toBe(0);
    expect(shippingFee('courier_demo', 30000, secondShop)).toBe(2990);
    expect(shippingFee('courier_demo', 80000, secondShop)).toBe(0);
  });

  it('keeps pickup free independently of provider code or configured fee', () => {
    expect(shippingFee('local_pickup', 0, demoShop)).toBe(0);
  });

  it('does not contain Water-K product, SKU or carrier assumptions', () => {
    expect(orderTotal(10000, 'parcel_demo', demoShop)).toBe(11190);
    expect(shippingFee('unknown-provider', 10000, demoShop)).toBe(0);
  });
});
