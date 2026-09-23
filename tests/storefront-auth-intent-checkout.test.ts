import fs from'node:fs';
import{describe,expect,it}from'vitest';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const auth=read('src/components/auth/auth-form.tsx');
const dialog=read('src/components/auth/storefront-auth-dialog.tsx');
const middleware=read('src/middleware.ts');
const header=read('src/components/builder/storefront-commerce-header.tsx');
const purchase=read('src/components/builder/storefront-purchase-controls-client.tsx');
const checkout=read('src/components/checkout/checkout-form.tsx');
const checkoutPage=read('src/app/penztar/page.tsx');
const benefits=read('src/lib/account/checkout-account-benefits.ts');
const accountNav=read('src/components/account/account-subnav.tsx');
const success=read('src/app/rendeles-sikeres/page.tsx');
const postPurchase=read('src/components/account/post-purchase-account-opportunity.tsx');

describe('storefront auth intent and checkout account opportunity',()=>{
 it('opens account auth as one shared template-aware accessible dialog',()=>{
  expect(dialog).toMatch(/data-storefront-auth-dialog="true"/);
  expect(dialog).toMatch(/data-template-aware-auth="true"/);
  expect(dialog).toMatch(/role="dialog"/);
  expect(dialog).toMatch(/aria-modal="true"/);
  expect(dialog).toMatch(/aria-labelledby=/);
  expect(dialog).toMatch(/syncStorefrontAuthTheme\(dialog\)/);
  expect(dialog).toContain("'--shoporation-color-background'");
  expect(dialog).toContain("'--shoporation-color-accent'");
  expect(dialog).toContain("'--shoporation-heading-font'");
  expect(dialog).toMatch(/dialog\.style\.setProperty\(variable,value\)/);
  expect(dialog).toMatch(/showModal\(\)/);
  expect(dialog).toMatch(/onCancel=/);
  expect(dialog).toMatch(/restoreFocusRef/);
  expect(header).toMatch(/item\.href==='\/fiokom'\?<StorefrontAccountAuthTrigger/);
  expect(dialog).toContain('data-storefront-account-auth-trigger="true"');
  expect(dialog).toContain("window.location.pathname==='/storefront-template-preview'");
  expect(dialog).toContain("window.location.pathname==='/visual-fidelity-qa'");
  expect(dialog).toMatch(/if\(representativePreview\)\{setOpen\(true\);return\}/);
  expect(auth).toMatch(/resetPasswordForEmail/);
  expect(auth).toMatch(/\/fiokom\?auth_flow=recovery/);
 });
 it('keeps auth tab labels on one line across narrow mobile widths',()=>{
  expect(auth).toContain('grid-template-columns:repeat(2,minmax(0,1fr))');
  expect(auth).toContain('white-space:nowrap');
  expect(auth).toContain('font-size:clamp(.78rem,3.35vw,.92rem)');
  expect(auth).toContain('@media(max-width:360px)');
  expect(auth).toContain('font-size:.78rem');
  expect(auth).toMatch(/min-height:44px/);
  expect(auth).toContain('Bejelentkezés');
  expect(auth).toContain('Regisztráció');
 });
 it('preserves safe caller intent centrally for account deep links and registration confirmation',()=>{
  expect(auth).toMatch(/normalizeStorefrontReturnTarget\(returnTo\)\?\?safeRequestedNext\(\)/);
  expect(auth).toMatch(/emailRedirectTo:registrationReturn/);
  expect(auth).not.toMatch(/useRouter/);
  expect(auth).toMatch(/navigateAuthenticatedTarget/);
  expect(middleware).toMatch(/isProtectedAccountPage/);
  expect(middleware).toMatch(/customerAccountRedirect/);
  expect(middleware).toMatch(/storefrontAuthHref\(customerReturnPath\(request\)\)/);
  expect(dialog).toMatch(/returnTo="\/fiokom"/);
 });
 it('continues wishlist intent after auth instead of forcing account navigation',()=>{
  expect(purchase).toMatch(/wishlistAuthOpen/);
  expect(purchase).toMatch(/Belépés a kívánságlistához/);
  expect(purchase).toMatch(/onAuthenticated=.*requestSubmit/);
 });
 it('offers optional auth before completion while keeping guest checkout intact',()=>{
  expect(checkout).toMatch(/data-checkout-account-opportunity="true"/);
  expect(checkout).toMatch(/Mielőtt befejezed/);
  expect(checkout).toMatch(/Bejelentkezés/);
  expect(checkout).toMatch(/Regisztráció/);
  expect(checkout).toMatch(/Folytatás vendégként/);
  expect(checkout).toMatch(/A fiók nem kötelező a rendeléshez/);
  expect(checkout).toMatch(/onAuthenticated=\{\(\)=>\{setAccountConnected\(true\)/);
  expect(checkout).not.toMatch(/router\.replace\('\/fiokom'\)/);
 });
 it('renders checkout benefits only from capability flags and current basket capability',()=>{
  expect(benefits).toMatch(/CheckoutAccountBenefitFlags/);
  expect(benefits).toMatch(/\.filter\(key=>flags\[key\]\)/);
  expect(checkout).toMatch(/resolveCheckoutAccountBenefits/);
  expect(checkout).toMatch(/data-account-benefit=\{benefit\.key\}/);
  expect(checkoutPage).toMatch(/getFeatureEntitlementDecisions\(instance\.id,\['orders','returns'\]\)/);
  expect(checkoutPage).toMatch(/loyalty:Boolean\(loyaltyResult\.data\?\.enabled\)/);
  expect(checkout).not.toMatch(/rendelkezésre álló csomagkövetési adatok/);
 });
 it('keeps the complete checkout state under the existing checkout authority while auth is open',()=>{
  expect(checkout).toMatch(/const\{cart,clear,couponCode,setCouponCode\}=useCart\(\)/);
  expect(checkout).toMatch(/\[shippingCode,setShippingCode\]/);
  expect(checkout).toMatch(/\[paymentCode,setPaymentCode\]/);
  expect(checkout).toMatch(/\[parcelPointId,setParcelPointId\]/);
  expect(checkout).toMatch(/\[sameAddress,setSameAddress\]/);
  expect(checkout).toMatch(/\[activeStep,setActiveStep\]/);
  expect(checkout).toMatch(/name="billingPostcode"/);
  expect(checkout).toMatch(/name="billingCity"/);
  expect(checkout).toMatch(/name="billingAddress"/);
  expect(checkout).toMatch(/name="shippingPostcode"/);
  expect(checkout).toMatch(/name="shippingCity"/);
  expect(checkout).toMatch(/name="shippingAddress"/);
  expect(checkout).toMatch(/name="paymentProvider"/);
  expect(checkout).toMatch(/data-checkout-panel=\{step\}/);
  expect(checkout).toMatch(/<StorefrontAuthDialog[\s\S]*onAuthenticated=\{\(\)=>\{setAccountConnected\(true\)/);
  expect(checkout).not.toMatch(/checkoutAuthState|authCheckoutState|router\.replace\('\/fiokom'\)/);
 });
 it('keeps one canonical account navigation rail instead of legacy horizontal account nav',()=>{
  expect(accountNav).toMatch(/className="accountCapabilityRail"/);
  expect(accountNav).toMatch(/data-account-navigation-source="platform-ia"/);
  expect(accountNav).not.toMatch(/className="accountSubnav"/);
 });
 it('offers post-purchase account creation and authenticated token-bound claiming',()=>{
  expect(success).toMatch(/PostPurchaseAccountOpportunity/);
  expect(success).toMatch(/!order\.customer_id/);
  expect(postPurchase).toMatch(/Szeretnéd ezt és a következő rendeléseidet egy helyen látni\?/);
  expect(postPurchase).toMatch(/\/api\/orders\/claim/);
  expect(postPurchase).toMatch(/confirmationToken/);
 });
});
