import type { Product } from '@/lib/catalog';
import { createClient } from '@/lib/supabase/server';

type VariantRow = {
  id: string;
  sku: string;
  label: string;
  net_price_huf: number;
  gross_price_huf: number;
  stock_quantity: number;
  weight_grams: number | null;
  product_id: string;
  products: { slug: string; name: string; short_description: string | null; active: boolean } | null;
};

const slugify = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const variantSlug = (productSlug: string, label: string, sku: string) => {
  const suffix = slugify(label) || slugify(sku);
  return suffix ? `${productSlug}-${suffix}` : productSlug;
};

export async function getProducts(): Promise<Product[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('product_variants')
      .select('id,sku,label,net_price_huf,gross_price_huf,stock_quantity,weight_grams,product_id,products!inner(slug,name,short_description,active)')
      .eq('active', true)
      .eq('products.active', true)
      .order('gross_price_huf');

    if (error || !data?.length) return [];

    return (data as unknown as VariantRow[]).map((row) => {
      const product = row.products;
      const baseSlug = product?.slug || slugify(product?.name || row.sku) || row.id;
      return {
        id: row.id,
        sku: row.sku,
        slug: variantSlug(baseSlug, row.label, row.sku),
        name: [product?.name, row.label].filter(Boolean).join(' '),
        size: row.label,
        grossPrice: row.gross_price_huf,
        netPrice: row.net_price_huf,
        stock: row.stock_quantity,
        short: product?.short_description ?? '',
        featured: false,
        weightGrams: row.weight_grams ?? 0,
        audience: 'retail',
        useCases: [],
        highlights: [],
      };
    });
  } catch {
    return [];
  }
}
