import type { ShippingMethod } from '@/lib/orders/types';

export const shippingOptions: Array<{
  id: ShippingMethod;
  label: string;
  description: string;
  fee: number;
  parcelPoint: boolean;
}> = [
  { id: 'foxpost', label: 'Foxpost automata', description: 'Csomagautomata választással.', fee: 1490, parcelPoint: true },
  { id: 'gls', label: 'GLS házhozszállítás', description: 'Kiszállítás megadott magyarországi címre.', fee: 2190, parcelPoint: false },
  { id: 'mpl', label: 'MPL', description: 'Házhoz vagy később választható átvételi pontra.', fee: 1990, parcelPoint: false },
  { id: 'pickup', label: 'Személyes átvétel', description: 'Egyeztetés után, szállítási díj nélkül.', fee: 0, parcelPoint: false },
];

export const freeShippingThreshold = 50000;

export function shippingFee(method: ShippingMethod, subtotal: number) {
  if (subtotal >= freeShippingThreshold && method !== 'pickup') return 0;
  return shippingOptions.find((option) => option.id === method)?.fee ?? 0;
}

export function orderTotal(subtotal: number, method: ShippingMethod) {
  return subtotal + shippingFee(method, subtotal);
}
