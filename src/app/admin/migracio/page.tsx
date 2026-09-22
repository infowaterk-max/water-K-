import Link from'next/link';
import{requirePlanFeature}from'@/lib/plans/access';
import{requireCurrentStorePageContext}from'@/lib/instances/scope';
import{ShopwareMigrationAssistant}from'@/components/admin/shopware-migration-assistant';

export const dynamic='force-dynamic';
export default async function MigrationAssistantPage(){
  await requirePlanFeature('importExport');
  await requireCurrentStorePageContext('store.manage');
  return <section className="adminMain">
    <span className="eyebrow">Roadmap Block 12 · Migration Assistant 1.0</span>
    <h1 className="sectionTitle">Shopware 6 → Shoporation</h1>
    <p className="lead">Vezetett, checkpointos és dry-run alapú költöztetés. A rendszer ismeretlen vagy veszteséges célmappingnél nem talál ki adatot: stagingben megőrzi és jelzi.</p>
    <div className="adminToolbar"><Link className="btn btnGhost" href="/admin/termekek/import-export">CSV import / export</Link><Link className="btn btnGhost" href="/admin/audit">Auditnapló</Link></div>
    <div className="adminAuditNotice"><strong>Launch contract</strong><p>A Block 12 elsődleges natív forrása Shopware 6. Más platform connector, payment token, automatikus ügyfél-auth provisioning és egyedi komplex migráció nincs előrehozva.</p></div>
    <ShopwareMigrationAssistant/>
  </section>;
}
