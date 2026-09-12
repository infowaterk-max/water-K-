import Link from'next/link';
import{hasCurrentPlanFeature,requirePlanFeature}from'@/lib/plans/access';
import{getAdminContent}from'@/lib/content/server';
import{ContentManager}from'@/components/admin/content-manager';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

export const dynamic='force-dynamic';

export default async function ContentAdmin(){
  await requirePlanFeature('contentMarketing');
  await requireCurrentStoreContext('marketing.manage');
  const[result,recipeCommerce]=await Promise.all([
    getAdminContent({throwOnError:true}).then(data=>({data,error:false})).catch(()=>({data:[],error:true})),
    hasCurrentPlanFeature('recipeCommerce'),
  ]),items=result.data;
  return <section className="adminMain"><span className="eyebrow">Alap · Tartalom és keresőoptimalizálás</span><h1 className="sectionTitle">Tartalomkezelés</h1><p className="lead">Blogbejegyzések, kampányoldalak, jogi oldalak és keresőoptimalizálási mezők az aktuális webshophoz elkülönítve.</p><div className="actions"><Link className="btn btnPrimary" href="/admin/tartalom/builder">Visual Builder megnyitása</Link>{recipeCommerce?<Link className="btn" href="/admin/tartalom/receptek">Recipe Commerce receptkönyvtár</Link>:null}</div>{result.error?<div className="errorNotice" role="alert"><strong>A tartalomlista most nem tölthető be.</strong> Hiányos állapotból tartalmat nem hozunk létre és nem módosítunk.</div>:<ContentManager items={items}/>}</section>;
}
