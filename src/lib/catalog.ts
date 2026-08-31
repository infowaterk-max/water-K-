export type Product = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  size: string;
  grossPrice: number;
  netPrice: number;
  short: string;
  featured?: boolean;
  stock: number;
  weightGrams: number;
  audience: 'retail' | 'professional';
  useCases: string[];
  highlights: string[];
};

// Kept as a compatibility export for client modules that previously consumed
// a compile-time fallback catalog. A Shoperation webshop must source products
// from its own database instead of inheriting reference-shop merchandise.
export const products: Product[] = [];

export const formatHuf = (value: number) =>
  new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(value);
