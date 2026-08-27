import { formatHuf } from '@/lib/catalog';
import { getProducts } from '@/lib/catalog-server';
import { InventoryEditor } from '@/components/admin/inventory-editor';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function AdminProducts() {
  const products=await getProducts();
  const admin=createAdminClient();
  const {data:partnerRows}=await admin.from('product_variants').select('id,reseller_gross_price_huf,reseller_net_price_huf');
  const partnerPrice=new Map((partnerRows??[]).map(row=>[row.id,row]));
  return <section className="adminMain"><span className="eyebrow">Admin · Termékek</span><h1 className="sectionTitle">Termékkatalógus</h1>
    <div className="tableCard"><table className="adminTable"><thead><tr><th>Kiszerelés</th><th>Lakossági ár</th><th>Készlet és árak</th><th>Partnerár</th></tr></thead><tbody>{products.map(product=>{
      const partner=partnerPrice.get(product.id);
      return <tr key={product.id}><td><strong>{product.name}</strong><br/><span className="muted">{product.slug}</span></td><td>{formatHuf(product.grossPrice)}<br/><span className="muted">nettó {formatHuf(product.netPrice)}</span></td><td><InventoryEditor id={product.id} stock={product.stock} grossPrice={product.grossPrice} netPrice={product.netPrice} resellerGrossPrice={partner?.reseller_gross_price_huf??null} resellerNetPrice={partner?.reseller_net_price_huf??null}/></td><td>{partner?.reseller_gross_price_huf!=null?<><strong>{formatHuf(partner.reseller_gross_price_huf)}</strong><br/><span className="muted">nettó {partner.reseller_net_price_huf!=null?formatHuf(partner.reseller_net_price_huf):'—'}</span></>:<span className="badge">Nincs beállítva</span>}</td></tr>;
    })}</tbody></table></div>
    <p className="muted">A partnerár kizárólag jóváhagyott viszonteladói rendelésnél alkalmazódik az adatbázisban. A publikus katalógus nem kapja meg ezt az árat.</p>
  </section>;
}
