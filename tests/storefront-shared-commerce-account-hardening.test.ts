import{readFileSync}from'node:fs';import{join}from'node:path';import{describe,expect,it}from'vitest';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
describe('shared commerce/account hardening',()=>{
 it('keeps cart and checkout on template-native shared runtime authority in preview',()=>{
  const source=read('src/lib/builder/storefront-runtime-source.ts'),cart=read('src/app/kosar/page.tsx'),cartShell=read('src/components/cart/storefront-cart-shell.tsx'),checkoutShell=read('src/components/checkout/storefront-checkout-shell.tsx');
  expect(source).toContain("resolveCurrentStorefrontTaskRuntimePage(pageKey:'cart'|'checkout')");
  expect(source).toContain("getPreviewStorefrontDraftPage(instance.id,pageKey)");
  expect(source).not.toContain("getCurrentStorefrontPageState('checkout')");
  expect(cart).toContain('resolveCurrentStorefrontCartRuntimePage');
  expect(cart).toContain('StorefrontCartShell');
  expect(cartShell).toContain('data-storefront-cart-runtime="template-native"');
  expect(checkoutShell).toContain('data-storefront-checkout-runtime="template-native"');
 });
 it('uses one shared add-to-cart confirmation for template runtime and legacy catalog controls',()=>{
  const confirmation=read('src/components/cart/add-to-cart-confirmation.tsx'),runtime=read('src/components/builder/storefront-purchase-controls-client.tsx'),legacy=read('src/components/catalog/add-to-cart.tsx');
  expect(confirmation).toContain('data-storefront-cart-confirmation="shared-v1"');
  expect(confirmation).toContain('Kosár megnyitása');
  expect(confirmation).toContain('Tovább vásárolok');
  expect(confirmation).toContain('aria-live="polite"');
  expect(confirmation).toContain('left:50%;top:50%');
  expect(confirmation).toContain('transform:translate(-50%,-50%)');
  expect(confirmation).toContain('@media(max-width:767px)');
  expect(confirmation).toContain('top:auto;bottom:.75rem;transform:none');
  expect(runtime).toContain('AddToCartConfirmation');
  expect(legacy).toContain('AddToCartConfirmation');
 });
 it('keeps live cart and post-purchase confirmation inside the current template presentation authority',()=>{
  const source=read('src/lib/builder/storefront-runtime-source.ts'),cartShell=read('src/components/cart/storefront-cart-shell.tsx'),success=read('src/app/rendeles-sikeres/page.tsx'),postPurchase=read('src/components/checkout/storefront-post-purchase-shell.tsx');
  expect(cartShell).toContain("'--card':'var(--shoporation-color-surface)'");
  expect(cartShell).toContain("'--ink':'var(--shoporation-color-text)'");
  expect(cartShell).toContain("'--muted':'var(--shoporation-color-muted-text)'");
  expect(source).toContain('resolveCurrentStorefrontPostPurchaseRuntimePage');
  expect(success).toContain('resolveCurrentStorefrontPostPurchaseRuntimePage()');
  expect(success).toContain('StorefrontPostPurchaseShell');
  expect(postPurchase).toContain('data-storefront-post-purchase-runtime="template-native"');
  expect(postPurchase).toContain("'--card':'var(--shoporation-color-surface)'");
  expect(postPurchase).toContain('data-storefront-template-key');
 });
 it('keeps cross-sell before order submission and reduces document guidance to compact transactional notices',()=>{
  const cartPage=read('src/app/kosar/page.tsx'),recommendations=read('src/components/catalog/product-recommendations.tsx'),success=read('src/app/rendeles-sikeres/page.tsx'),checkout=read('src/components/checkout/checkout-form.tsx'),composition=read('src/lib/builder/storefront-digital-commerce-composition.ts'),admin=read('src/components/admin/recommendation-manager.tsx'),api=read('src/app/api/admin/recommendations/route.ts');
  expect(cartPage).toContain('<ProductRecommendations products={products} rules={rules}/>');
  expect(recommendations).toContain("'cart_cross_sell'");
  expect(recommendations).toContain('data-cart-cross-sell="shared"');
  expect(recommendations).not.toContain("'post_purchase_offer'");
  expect(recommendations).not.toContain("'confirmation'");
  expect(success).not.toContain('ProductRecommendations');
  expect(success).not.toContain("getRecommendationRules('post_purchase')");
  expect(success).toContain('data-post-purchase-access-notice="compact"');
  expect(checkout).toContain('data-checkout-access-notice="compact"');
  expect(composition).toContain("checkout:[]");
  expect(composition).toContain('isDeprecatedCheckoutDigitalCommerceSection');
  expect(admin).not.toContain('Rendelés utáni ajánlat');
  expect(api).toContain("placement:z.literal('cart')");
 });
 it('stores billing defaults per tenant and user and only after a successful checkout finalization',()=>{
  const sql=read('supabase/migrations/20260922053000_shared_customer_billing_b2b_identity_reverification.sql'),baseline=read('supabase/customer-baseline/migrations/0044_shared_customer_billing_b2b_identity_reverification.sql'),checkout=read('src/components/checkout/checkout-form.tsx'),page=read('src/app/penztar/page.tsx'),orders=read('src/app/api/orders/route.ts');
  expect(baseline).toBe(sql);
  expect(sql).toContain('primary key(instance_id,user_id)');
  expect(sql).toContain('revoke all on table public.customer_billing_profiles from public,anon,authenticated');
  expect(page).toContain('getCustomerBillingProfile(instance.id,user.id)');
  expect(checkout).toContain('Számlázási adatok mentése a fiókomba');
  expect(checkout).toContain("checkout.saveBillingProfile=saveBillingProfile?'true':'false'");
  expect(orders.indexOf("finalize_checkout_local_v2")).toBeLessThan(orders.indexOf("if(user?.id&&checkout.saveBillingProfile==='true'"));
  expect(orders).toContain("await upsertCustomerBillingProfile({instanceId:instance.id,userId:user.id");
 });
 it('makes approved B2B legal identity immutable and routes every change through audited merchant re-verification',()=>{
  const sql=read('supabase/migrations/20260922053000_shared_customer_billing_b2b_identity_reverification.sql'),profile=read('src/components/account/profile-form.tsx'),customer=read('src/components/account/b2b-identity-panel.tsx'),admin=read('src/components/admin/b2b-identity-review-control.tsx');
  expect(sql).toContain('B2B_IDENTITY_DIRECT_MUTATION_FORBIDDEN');
  expect(sql).toContain('b2b_request_identity_change_v1');
  expect(sql).toContain('admin_review_b2b_identity_change_v1');
  expect(sql).toContain('b2b.identity_change_requested');
  expect(sql).toContain("'b2b.identity_change_'||p_decision");
  expect(sql).toContain('b2b.identity_change_cancelled');
  expect(sql).toContain('b2b.reseller_registration_intent');
  expect(profile).toContain('businessIdentityLocked');
  expect(customer).toContain('Cégadatok módosításának kérése');
  expect(admin).toContain("decision:'approved'|'rejected'");
 });
 it('validates company and reseller tax numbers before signup and keeps approval separate from registration intent',()=>{
  const auth=read('src/components/auth/auth-form.tsx');
  expect(auth).toContain('normalizeHuTaxNumber(rawTaxNumber)');
  expect(auth).toContain("accountType!=='customer'&&!isValidHuTaxNumber(taxNumber)");
  expect(auth).toContain('partnerjogosultság csak kereskedői jóváhagyás után aktiválódhat');
 });
});
