import {headers} from 'next/headers';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { CheckoutRecoverySaver } from '@/components/checkout/checkout-recovery-saver';
import { StorefrontCheckoutShell } from '@/components/checkout/storefront-checkout-shell';
import { getCommerceAccess } from '@/lib/commerce/access';
import { getCommerceSettings } from '@/lib/commerce/settings';
import { resolveCurrentStorefrontCheckoutRuntimePage } from '@/lib/builder/storefront-runtime-source';
import type { StorefrontViewport } from '@/lib/builder/storefront-foundation';
import { getPilotAcceptanceInstanceId } from '@/lib/storefront/pilot-access';
import {isStorefrontPreviewBrowseAccess,requireStorefrontBrowseAccess} from '@/lib/storefront/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { getFeatureEntitlementDecisions } from '@/lib/entitlements/access';
import { createClient } from '@/lib/supabase/server';
import { getCustomerBillingProfile } from '@/lib/account/billing-profile';
import { resolveB2BAccountContext } from '@/lib/commerce/b2b-account';

function storefrontViewportFromUserAgent(userAgent:string):StorefrontViewport{
  const value=userAgent.toLowerCase();
  if(/ipad|tablet|kindle|silk/.test(value))return'tablet';
  if(/mobi|iphone|ipod|android/.test(value))return'mobile';
  return'desktop';
}

export default async function Checkout(){
  const instance=await requireStorefrontBrowseAccess();
  if(!instance)throw new Error('STOREFRONT_CHECKOUT_INSTANCE_REQUIRED');
  const loyaltyPromise=createAdminClient().from('loyalty_program_settings').select('enabled').eq('instance_id',instance.id).maybeSingle();
  const accountBenefitPromise=getFeatureEntitlementDecisions(instance.id,['orders','returns']);
  const[settings,access,runtime,acceptanceInstanceId,previewBrowseAccess,userAgent,loyaltyResult,accountBenefitDecisions]=await Promise.all([
    getCommerceSettings(),
    getCommerceAccess(),
    resolveCurrentStorefrontCheckoutRuntimePage(),
    process.env.VERCEL_ENV==='preview'?getPilotAcceptanceInstanceId():Promise.resolve(null),
    isStorefrontPreviewBrowseAccess(instance),
    headers().then(value=>value.get('user-agent')??''),
    loyaltyPromise,
    accountBenefitPromise,
  ]);
  const acceptancePreview=Boolean(process.env.VERCEL_ENV==='preview'&&(acceptanceInstanceId===instance.id||previewBrowseAccess));
  const session=await createClient(),{data:{user}}=await session.auth.getUser();
  const[profileResult,billingProfile,b2bContext]=user?await Promise.all([
    createAdminClient().from('profiles').select('full_name,company_name,tax_number').eq('id',user.id).maybeSingle(),
    getCustomerBillingProfile(instance.id,user.id).catch(()=>null),
    access.reseller?resolveB2BAccountContext(instance.id,user.id).catch(()=>null):Promise.resolve(null),
  ]):[{data:null,error:null},null,null] as const;
  const profile=profileResult.data as{full_name?:string|null;company_name?:string|null;tax_number?:string|null}|null;
  const initialCustomerType:'reseller'|'company'|'retail'=access.resellerApproved?'reseller':'retail';
  const customerDefaults={name:billingProfile?.billingName||profile?.full_name||'',email:user?.email??'',phone:billingProfile?.phone??'',billingPostcode:billingProfile?.billingPostcode??'',billingCity:billingProfile?.billingCity??'',billingAddress:billingProfile?.billingAddress??'',companyName:b2bContext?.accountName||profile?.company_name||'',taxNumber:b2bContext?.taxNumber||profile?.tax_number||'',customerType:initialCustomerType,businessIdentityLocked:Boolean(access.reseller&&b2bContext)};
  const form=<>
    <CheckoutRecoverySaver/>
    <CheckoutForm
      shippingOptions={settings.shippingOptions}
      paymentOptions={settings.paymentOptions}
      freeShippingThreshold={settings.freeShippingThreshold}
      resellerApproved={access.resellerApproved}
      embedded={Boolean(runtime)}
      acceptancePreview={acceptancePreview}
      instanceId={instance.id}
      signedIn={access.signedIn}
      customerDefaults={customerDefaults}
      hasSavedBillingProfile={Boolean(billingProfile)}
      accountBenefitCapabilities={{
        loyalty:Boolean(loyaltyResult.data?.enabled),
        orderHistory:accountBenefitDecisions.get('orders')?.enabled===true,
        returns:accountBenefitDecisions.get('returns')?.enabled===true,
        digitalDownloads:true,
      }}
    />
  </>;
  if(runtime)return <StorefrontCheckoutShell runtime={runtime} viewport={storefrontViewportFromUserAgent(userAgent)}>{form}</StorefrontCheckoutShell>;

  return <main className="section checkoutShowcase" data-shared-checkout-contract="guided-accordion-v1" data-storefront-checkout-fallback="legacy"><div className="shell checkoutShell">
    <div className="checkoutHead"><div><span className="showcaseKicker">Biztonságos pénztár</span><h1>Rendelés véglegesítése.</h1></div><p>Add meg a szállításhoz szükséges adatokat, válassz fizetési módot, majd ellenőrizd a rendelést.</p></div>
    <div className="commerceSteps" aria-label="Rendelési folyamat"><span>1 · Kosár</span><span className="active">2 · Szállítás</span><span>3 · Fizetés</span><span>4 · Összesítés</span></div>
    {form}
    <div className="checkoutSecurity"><span>✓ Biztonságos adatkezelés</span><span>✓ Ellenőrzött készlet és ár</span><span>✓ Rendelés előtti összesítés</span></div>
  </div></main>;
}
