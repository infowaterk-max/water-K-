export type Product = { id:string; slug:string; name:string; size:string; grossPrice:number; netPrice:number; short:string; featured?:boolean; stock:number };

export const products: Product[] = [
  { id:'water-k-40-g', slug:'water-k-40-g', name:'Water-K 40 g', size:'40 g', grossPrice:990, netPrice:780, short:'Kisebb cserepes növényekhez és kipróbáláshoz.', stock:100 },
  { id:'water-k-750-g', slug:'water-k-750-g', name:'Water-K 750 g', size:'750 g', grossPrice:14990, netPrice:11803, short:'Kertekhez, ágyásokhoz, gyephez és több növényhez.', featured:true, stock:50 },
  { id:'water-k-25-kg', slug:'water-k-25-kg', name:'Water-K 25 kg', size:'25 kg', grossPrice:215900, netPrice:170000, short:'Nagyobb kertészeti és professzionális felhasználásra.', stock:10 }
];

export const formatHuf = (value:number) => new Intl.NumberFormat('hu-HU',{style:'currency',currency:'HUF',maximumFractionDigits:0}).format(value);
