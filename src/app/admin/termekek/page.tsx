import { formatHuf } from '@/lib/catalog';
import { getProducts } from '@/lib/catalog-server';
import { InventoryEditor } from '@/components/admin/inventory-editor';

export default async function AdminProducts() {
  const products=await getProducts();
  return <section className="adminMain"><span className="eyebrow">Admin · Termékek</span><h1 className="sectionTitle">Termékkatalógus</h1>
    <div className="tableCard"><table className="adminTable"><thead><tr><th>Kiszerelés</th><th>Aktuális ár</th><th>Készlet / ár szerkesztése</th><th>Csatorna</th></tr></thead><tbody>{products.map(product=><tr key={product.id}><td><strong>{product.name}</strong><br/><span className="muted">{product.slug}</span></td><td>{formatHuf(product.grossPrice)}<br/><span className="muted">nettó {formatHuf(product.netPrice)}</span></td><td><InventoryEditor id={product.id} stock={product.stock} grossPrice={product.grossPrice} netPrice={product.netPrice}/></td><td><span className="badge">{product.audience==='professional'?'Viszonteladó':'Lakossági'}</span></td></tr>)}</tbody></table></div>
    <p className="muted">A módosítások közvetlenül a Supabase product_variants rekordjaira kerülnek, admin jogosultsági kapun keresztül.</p>
  </section>;
}
