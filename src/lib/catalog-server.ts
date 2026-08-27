import { products as fallbackProducts, type Product } from '@/lib/catalog';
import { createClient } from '@/lib/supabase/server';

type ProductRow = {
  id: string; slug: string; name: string; description: string | null; size_label: string;
  gross_price: number; net_price: number; stock: number; audience: string[];
};

export async function getProducts(): Promise<Product[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('products').select('id,slug,name,description,size_label,gross_price,net_price,stock,audience').eq('active', true).order('gross_price');
    if (error || !data?.length) return fallbackProducts;
    return (data as ProductRow[]).map((row) => ({
      id: row.id, slug: row.slug, name: row.name, size: row.size_label,
      grossPrice: row.gross_price, netPrice: row.net_price, stock: row.stock,
      short: row.description ?? '', featured: row.size_label === '750 g',
      weightGrams: row.size_label.includes('25') ? 25000 : row.size_label.includes('750') ? 750 : 40,
      audience: row.audience.includes('reseller') ? 'professional' : 'retail',
      useCases: [], highlights: [],
    }));
  } catch {
    return fallbackProducts;
  }
}
