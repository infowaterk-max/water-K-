import { formatHuf } from '@/lib/catalog';
import { getProducts } from '@/lib/catalog-server';

export default async function AdminProducts() {
  const products = await getProducts();
  return <section className="adminMain">
    <span className="eyebrow">Admin · Termékek</span><h1 className="sectionTitle">Termékkatalógus</h1>
    <div className="tableCard"><table className="adminTable"><thead><tr><th>Kiszerelés</th><th>Bruttó ár</th><th>Nettó ár</th><th>Készlet</th><th>Csatorna</th></tr></thead><tbody>{products.map(product=><tr key={product.id}><td><strong>{product.name}</strong><br/><span className="muted">{product.slug}</span></td><td>{formatHuf(product.grossPrice)}</td><td>{formatHuf(product.netPrice)}</td><td>{product.stock} db</td><td><span className="badge">{product.audience==='professional'?'Viszonteladó':'Lakossági'}</span></td></tr>)}</tbody></table></div>
    <p className="muted">Az ár- és készletadatok közvetlenül a Supabase product_variants táblából érkeznek.</p>
  </section>;
}
