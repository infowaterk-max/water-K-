export type ShippingPricingOption = {
  code: string;
  fee: number;
  kind: 'parcel_point' | 'home_delivery' | 'pickup';
};

export type ShippingPricingConfig = {
  options: ShippingPricingOption[];
  freeShippingThreshold: number;
};

export function shippingFee(
  method: string,
  subtotal: number,
  config: ShippingPricingConfig,
) {
  const option = config.options.find((item) => item.code === method);
  if (!option) return 0;
  if (option.kind === 'pickup') return 0;
  if (config.freeShippingThreshold > 0 && subtotal >= config.freeShippingThreshold) return 0;
  return option.fee;
}

export function orderTotal(
  subtotal: number,
  method: string,
  config: ShippingPricingConfig,
) {
  return subtotal + shippingFee(method, subtotal, config);
}
