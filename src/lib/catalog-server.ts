import { products as fallbackProducts, type Product } from '@/lib/catalog';
import { createClient } from '@/lib/supabase/server';

type VariantRow = {
  id: string;
  sku: string;
  label: string;
  net_price_huf: number;
  gross_price_huf: number;
  stock_quantity: number;
  product_id: string;
  products: { slug: string; name: string; short_description: string | null; active: boolean } | null;
};

const slugFromVariant = (sku: string, label: string) => {
  const suffix = sku === 'WK-040' ? '40-g' : sku === 'WK-750' ? '750-g' : sku === 'WK-25K' ? '25-kg' : label.toLowerCase().replace(/\s+/g, '-');
  return `water-k-${suffix}`;
};

const metadata = (sku: string) => {
  if (sku === 'WK-040') return { audience: 'retail' as const, weightGrams: 40, useCases: ['Cserepes növény','Balkonláda','Kisebb ültetés'], highlights: ['Kis kiszerelés','Egyszerű kipróbálás','Otthoni felhasználás'] };
  if (sku === 'WK-750') return { audience: 'retail' as const, weightGrams: 750, useCases: ['Kert','Ágyás','Gyep','Dísznövény'], highlights: ['Legnépszerűbb','Sokoldalú','Kertméretű kiszerelés'] };
  return { audience: 'professional' as const, weightGrams: 25000, useCases: ['Kertészet','Nagyobb gyep','Faiskola','Professzionális felhasználás'], highlights: ['Professzionális','25 kg','Nagyobb területhez'] };
};

export async function getProducts(): Promise<Product[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('product_variants')
      .select('id,sku,label,net_price_huf,gross_price_huf,stock_quantity,product_id,products!inner(slug,name,short_description,active)')
      .eq('active', true)
      .eq('products.active', true)
      .order('gross_price_huf');

    if (error || !data?.length) return fallbackProducts;

    return (data as unknown as VariantRow[]).map((row) => {
      const meta = metadata(row.sku);
      return {
        id: row.id,
        slug: slugFromVariant(row.sku, row.label),
        name: `${row.products?.name ?? 'Water-K'} ${row.label}`,
        size: row.label,
        grossPrice: row.gross_price_huf,
        netPrice: row.net_price_huf,
        stock: row.stock_quantity,
        short: row.products?.short_description ?? 'Water-K vízmegtartó technológia.',
        featured: row.sku === 'WK-750',
        ...meta,
      };
    });
  } catch {
    return fallbackProducts;
  }
}
