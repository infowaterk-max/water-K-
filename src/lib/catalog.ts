export type Product = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  size: string;
  grossPrice: number;
  netPrice: number;
  originalGrossPrice?: number;
  discountPercent?: number;
  short: string;
  featured?: boolean;
  stock: number;
  weightGrams: number;
  audience: 'retail' | 'professional';
  useCases: string[];
  highlights: string[];
  minimumQuantity: number;
  orderMultiple: number;
};

export const products: Product[] = [];

export const formatHuf = (value: number) =>
  new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(value);