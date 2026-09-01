import Link from 'next/link';
import { formatHuf } from '@/lib/catalog';
import { getProducts } from '@/lib/catalog-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { InventoryEditor } from '@/components/admin/inventory-editor';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
export const dynamic='force-dynamic';

type VariantRow={id:string;reseller_gross_price_huf:number|null;reseller_net_price_huf:number|null;unit_cost_net_huf:number|null;supplier_lead_time_days:number|null;safety_stock_days:number|null;minimum_order_quantity:number|null;order_multiple:number|null};

export default async function AdminProducts(){
  const scope=await requireCurrentStoreContext('catalog.manage');
  const products=await getProducts();const admin=createAdminClient();
  const{data}=await admin.from('product_variants').select('id,reseller_gross_price_huf,reseller_net_price_huf,unit_cost_net_huf,supplier_lead_time_days,safety_stock_days,minimum_order_quantity,order_multiple').eq('instance_id',scope.instanceId);
  const byId=new Map(((data??[])as VariantRow[]).map(row=>[row.id,row]));
  const soldOut=products.filter(p=>p.stock<=0).length,low=products.filter(p=>p.stock>0&&p.stock<=5).length,stockValue=products.reduce((sum,p)=>sum+p.stock*p.netPrice,0);
  return <section className="adminMain"><span className="eyebrow">Katalógus · Termékek</span><h1 className="sectionTitle">Termékkezelés</h1><p className="lead">A katalógus, árak és készlet napi kezelése itt történik. A beszerzéstervezés külön Készlet és beszerzés modulban kapott helyet.</p>
    <div className="actions"><Link className="btn btnPrimary" href="/admin/termekek/import-export">Termékek feltöltése / import</Link><Link className="btn btnGhost" href="/admin/termekek/tomeges">Tömeges műveletek</Link><Link className="btn btnGhost" href="/admin/beszerzes">Készlet és beszerzés</Link></div>
    <div className="cards adminMetricCards"><article className="card"><span className="badge">Termékek</span><div className="price">{products.length}</div></article><article className="card"><span className="badge">Elfogyott</span><div className="price">{soldOut}</div></article><article className="card"><span className="badge">Alacsony készlet</span><div className="price">{low}</div></article><article className="card"><span className="badge">Készlet nettó értéke</span><div className="price">{formatHuf(stockValue)}</div></article></div>
    <section className="card"><div className="adminToolbar"><div><span className="eyebrow">Katalógus</span><h2>Terméklista és gyors szerkesztés</h2></div><Link className="btn btnGhost" href="/admin/termekek/import-export">CSV import / export</Link></div><div className="adminTableScroll"><table className="adminTable"><thead><tr><th>Termék</th><th>Készlet</th><th>Nettó ár</th><th>Bruttó ár</th><th>Állapot</th><th>Szerkesztés</th></tr></thead><tbody>{products.map(p=>{const row=byId.get(p.id);return <tr key={p.id}><td><strong>{p.name}</strong><div className="muted">/{p.slug}</div></td><td>{p.stock} db</td><td>{formatHuf(p.netPrice)}</td><td>{formatHuf(p.grossPrice)}</td><td><span className="badge">{p.stock<=0?'Elfogyott':p.stock<=5?'Alacsony készlet':'Raktáron'}</span></td><td><details><summary className="textLink">Ár, készlet és beszerzési adatok</summary><div style={{marginTop:12}}><InventoryEditor id={p.id} stock={p.stock} grossPrice={p.grossPrice} netPrice={p.netPrice} resellerGrossPrice={row?.reseller_gross_price_huf??null} resellerNetPrice={row?.reseller_net_price_huf??null} unitCostNet={row?.unit_cost_net_huf??null} supplierLeadTimeDays={Number(row?.supplier_lead_time_days??7)} safetyStockDays={Number(row?.safety_stock_days??7)} minimumOrderQuantity={Number(row?.minimum_order_quantity??1)} orderMultiple={Number(row?.order_multiple??1)}/></div></details></td></tr>})}</tbody></table></div>{products.length===0&&<div className="adminAuditNotice"><strong>Még nincs termék a katalógusban.</strong><p>A Termékek feltöltése / import gombbal töltheted fel az első katalógust.</p></div>}</section>
  </section>;
}
