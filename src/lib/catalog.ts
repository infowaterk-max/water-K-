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

export const products: Product[] = [
  {
    id: 'water-k-40-g',
    sku: 'WK-040',
    slug: 'water-k-40-g',
    name: 'Water-K 40 g',
    size: '40 g',
    grossPrice: 990,
    netPrice: 780,
    short: 'Belépő kiszerelés cserepes növényekhez, balkonládához és kipróbáláshoz.',
    stock: 100,
    weightGrams: 40,
    audience: 'retail',
    useCases: ['Cserepes növény', 'Balkonláda', 'Kisebb ültetés'],
    highlights: ['Kis kiszerelés', 'Egyszerű kipróbálás', 'Otthoni felhasználás'],
  },
  {
    id: 'water-k-750-g',
    sku: 'WK-750',
    slug: 'water-k-750-g',
    name: 'Water-K 750 g',
    size: '750 g',
    grossPrice: 14990,
    netPrice: 11803,
    short: 'A legjobb általános választás kertekhez, ágyásokhoz, gyephez és több növényhez.',
    featured: true,
    stock: 50,
    weightGrams: 750,
    audience: 'retail',
    useCases: ['Kert', 'Ágyás', 'Gyep', 'Dísznövény'],
    highlights: ['Legnépszerűbb', 'Sokoldalú', 'Kertméretű kiszerelés'],
  },
  {
    id: 'water-k-25-kg',
    sku: 'WK-25K',
    slug: 'water-k-25-kg',
    name: 'Water-K 25 kg',
    size: '25 kg',
    grossPrice: 215900,
    netPrice: 170000,
    short: 'Nagyobb kertészeti és professzionális felhasználásra, jelentős kezelendő területhez.',
    stock: 10,
    weightGrams: 25000,
    audience: 'professional',
    useCases: ['Kertészet', 'Nagyobb gyep', 'Faiskola', 'Professzionális felhasználás'],
    highlights: ['Professzionális', '25 kg', 'Nagyobb területhez'],
  },
];

export const formatHuf = (value: number) =>
  new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(value);
