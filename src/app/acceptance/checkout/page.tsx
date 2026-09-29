import {redirect} from 'next/navigation';
import {CheckoutAcceptanceSeeder} from '@/app/admin/platform/acceptance/[instanceId]/checkout/checkout-acceptance-seeder';
import {getAdminRequestUser} from '@/lib/auth/admin-api';
import {prepareCheckoutAcceptanceFixture} from '@/lib/commerce/checkout-acceptance-fixture';
import {getCurrentWebshopInstance} from '@/lib/instances/access';
import {getPilotAcceptanceInstanceId} from '@/lib/storefront/pilot-access';

export const dynamic='force-dynamic';

export default async function SharedCheckoutAcceptancePage(){
  if(process.env.VERCEL_ENV!=='preview')redirect('/');
  const actor=await getAdminRequestUser('store.read');
  if(!actor)redirect('/fiokom?reason=login');
  const acceptanceInstanceId=await getPilotAcceptanceInstanceId();
  const instance=await getCurrentWebshopInstance();
  if(!acceptanceInstanceId||!instance||instance.id!==acceptanceInstanceId||instance.status!=='pilot')redirect('/webaruhaz?reason=acceptance-session');

  const fixture=await prepareCheckoutAcceptanceFixture(instance.id);
  if(!fixture.ok)return <main className="adminMain" data-engine-functional-proof="E13">
    <span className="eyebrow">Shared E13 · Checkout acceptance</span>
    <h1 className="sectionTitle">A funkcionális checkout proof nem indítható.</h1>
    <div className="errorNotice" role="alert"><strong>{fixture.code}</strong><br/>{fixture.message}</div>
  </main>;

  return <main className="adminMain" data-engine-functional-proof="E13">
    <span className="eyebrow">Shared E13 · Checkout acceptance</span>
    <h1 className="sectionTitle">Valódi shared checkout engine proof</h1>
    <p className="lead">A meglévő preview-only mixed acceptance kosár ugyanazt a /penztar runtime-ot, quote authorityt és fail-closed submit határt használja, mint a storefront.</p>
    <CheckoutAcceptanceSeeder items={fixture.items}/>
  </main>;
}
