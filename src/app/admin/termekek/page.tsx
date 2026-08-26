import { products, formatHuf } from '@/lib/catalog';
import { requireAdmin } from '@/lib/auth/require-admin';

export default async function AdminProducts() {
  await requireAdmin();

  return <main className="adminMain"><span className="eyebrow">Admin · Termékek</span><h1 className="sectionTitle">Termékkatalógus</h1><div className="tableCard"><table className="adminTable"><thead><tr><th>Termék</th><th>Bruttó ár</th><th>Nettó ár</th><th>Készlet</th><th>Állapot</th></tr></thead><tbody>{products.map((product)=><tr key={product.slug}><td><strong>{product.name}</strong><br/><span className="muted">{product.slug}</span></td><td>{formatHuf(product.grossPrice)}</td><td>{formatHuf(product.netPrice)}</td><td>{product.stock} db</td><td><span className="badge">Aktív</span></td></tr>)}</tbody></table></div><p className="muted">A következő lépésben ez a nézet már közvetlenül a Supabase products táblát szerkeszti, audit naplóval.</p></main>;
}
