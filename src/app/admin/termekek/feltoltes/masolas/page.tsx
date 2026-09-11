import Link from'next/link';
import{createAdminClient}from'@/lib/supabase/admin';
import{requirePlanFeature}from'@/lib/plans/access';
import{requireCurrentStorePageContext}from'@/lib/instances/scope';
import{ProductCopyPanel}from'@/components/admin/product-copy-panel';
import styles from'../product-intake.module.css';
import v2 from'../product-intake-v2.module.css';

export const dynamic='force-dynamic';
export default async function ProductCopyPage(){
 await requirePlanFeature('importExport');const scope=await requireCurrentStorePageContext('catalog.manage'),admin=createAdminClient();
 const[productsResult,variantsResult]=await Promise.all([admin.from('products').select('id,name,active,updated_at').eq('instance_id',scope.instanceId).order('updated_at',{ascending:false}).limit(500),admin.from('product_variants').select('product_id').eq('instance_id',scope.instanceId)]);
 if(productsResult.error||variantsResult.error)return <section className={`${styles.productIntakeScreen} ${styles.editorScreen}`}><div className={styles.pageHeading}><Link className={styles.backButton} href="/admin/termekek/feltoltes">←</Link><div><h1>Termék másolása</h1><p>A katalógus most nem tölthető be biztonságosan.</p></div></div><div className={styles.errorBanner}>A másolást nem engedjük, amíg a forrástermékek tenant-scoped listája nem igazolható.</div></section>;
 const counts=new Map<string,number>();for(const row of variantsResult.data??[])counts.set(row.product_id,(counts.get(row.product_id)??0)+1);const products=(productsResult.data??[]).filter(item=>(counts.get(item.id)??0)>0).map(item=>({id:item.id,name:item.name,active:item.active,variantCount:counts.get(item.id)??0,updatedAt:item.updated_at}));
 return <section className={`${styles.productIntakeScreen} ${styles.editorScreen}`}><header className={styles.topBar}><div/><div className={styles.topActions}><Link className={styles.secondaryButton} href="/admin/termekek/feltoltes">Termékfeltöltő Központ</Link><Link className={styles.primaryButton} href="/admin/termekek/feltoltes/uj">＋ Új termék</Link></div></header><div className={styles.pageHeading}><Link className={styles.backButton} href="/admin/termekek/feltoltes">←</Link><div><div className={styles.titleLine}><h1>Meglévő termék másolása</h1><span className={styles.draftBadge}>Draft-first</span></div><p>Válassz forrást, majd döntsd el, mely adatok kerüljenek át az új piszkozatba.</p></div></div><div className={v2.copyPageBody}>{products.length?<ProductCopyPanel products={products}/>:<div className={styles.emptyState}>Még nincs másolható, variánssal rendelkező termék ebben a webshopban.</div>}</div></section>;
}
