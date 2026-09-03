import{requirePlanFeature}from'@/lib/plans/access';
import{getAdminContent}from'@/lib/content/server';
import{ContentManager}from'@/components/admin/content-manager';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

export const dynamic='force-dynamic';

export default async function ContentAdmin(){
  await requirePlanFeature('contentMarketing');
  await requireCurrentStoreContext('marketing.manage');
  const items=await getAdminContent();
  return <section className="adminMain"><span className="eyebrow">Alap · Tartalom és keresőoptimalizálás</span><h1 className="sectionTitle">Tartalomkezelés</h1><p className="lead">Blogbejegyzések, kampányoldalak, jogi oldalak és keresőoptimalizálási mezők az aktuális webshophoz elkülönítve.</p><ContentManager items={items}/></section>;
}
