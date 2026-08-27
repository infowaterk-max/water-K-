import { describe, expect, it } from 'vitest';
import { freeShippingThreshold, orderTotal, shippingFee } from '../src/lib/commerce/pricing';

describe('commerce pricing', () => {
  it('charges configured shipping below the free-shipping threshold', () => {
    expect(shippingFee('foxpost', freeShippingThreshold - 1)).toBe(1490);
    expect(shippingFee('gls', freeShippingThreshold - 1)).toBe(2190);
    expect(shippingFee('mpl', freeShippingThreshold - 1)).toBe(1990);
  });

  it('makes non-pickup shipping free at the threshold', () => {
    expect(shippingFee('foxpost', freeShippingThreshold)).toBe(0);
    expect(shippingFee('gls', freeShippingThreshold)).toBe(0);
    expect(shippingFee('mpl', freeShippingThreshold + 1000)).toBe(0);
  });

  it('keeps pickup free at every subtotal', () => {
    expect(shippingFee('pickup', 0)).toBe(0);
    expect(shippingFee('pickup', freeShippingThreshold - 1)).toBe(0);
  });

  it('calculates the final order total deterministically', () => {
    expect(orderTotal(10000, 'foxpost')).toBe(11490);
    expect(orderTotal(freeShippingThreshold, 'gls')).toBe(freeShippingThreshold);
  });
});
