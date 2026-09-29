import {redirect} from 'next/navigation';
import {requirePlatformOperator} from '@/lib/auth/platform-operator';
import {prepareCheckoutAcceptanceFixture} from '@/lib/commerce/checkout-acceptance-fixture';
import {getPilotAcceptanceInstanceId} from '@/lib/storefront/pilot-access';
import {CheckoutAcceptanceSeeder} from './checkout-acceptance-seeder';

export const dynamic='force-dynamic';

type Props={params:Promise<{instanceId:string}>};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CheckoutAcceptancePage({params}:Props){
  if(process.env.VERCEL_ENV!=='preview')redirect('/admin/platform');
  await requirePlatformOperator();
  const{instanceId}=await params;
  if(!UUID.test(instanceId))redirect('/admin/platform');
  const acceptedInstanceId=await getPilotAcceptanceInstanceId();
  if(acceptedInstanceId!==instanceId)redirect(`/admin/platform/acceptance/${instanceId}?reason=session`);

  const fixture=await prepareCheckoutAcceptanceFixture(instanceId);
  if(!fixture.ok)return <main className="adminMain">
    <span className="eyebrow">Phase 4 · Checkout acceptance</span>
    <h1 className="sectionTitle">A checkout acceptance fixture nem készíthető elő.</h1>
    <div className="errorNotice" role="alert"><strong>{fixture.code}</strong><br/>{fixture.message}</div>
  </main>;

  return <main className="adminMain">
    <span className="eyebrow">Phase 4 · Checkout acceptance</span>
    <h1 className="sectionTitle">Valódi pénztár runtime teszt</h1>
    <p className="lead">Ez a preview-only segédoldal ugyanazon a domainen tölti be a mixed acceptance kosarat, amelyet a valódi /penztar runtime olvas.</p>
    <CheckoutAcceptanceSeeder items={fixture.items}/>
  </main>;
}
