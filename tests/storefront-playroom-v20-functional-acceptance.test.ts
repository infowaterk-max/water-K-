import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {bindStorefrontExistingCommerceRuntime} from '@/lib/builder/storefront-existing-commerce-bindings';
import {composeStorefrontDigitalCommerceCapabilities,composeStorefrontDigitalCommerceTemplatePackage} from '@/lib/builder/storefront-digital-commerce-composition';
import {augmentStorefrontDigitalCommercePreviewContext} from '@/lib/builder/storefront-digital-commerce-preview';
import {
  planStorefrontTemplateInstallation,
  STOREFRONT_TEMPLATE_SWITCH_DATA_BOUNDARY,
} from '@/lib/builder/storefront-template-installation';
import {listStorefrontContextualCapabilityOpportunities} from '@/lib/builder/storefront-template-capability-discovery';
import {
  getStorefrontGlobalStyleState,
  resolveStorefrontGlobalStyleCssVariables,
  setStorefrontGlobalStyleState,
  STOREFRONT_GLOBAL_STYLES_VERSION,
} from '@/lib/builder/storefront-global-styles';
import {setStorefrontNodeStyleSlot} from '@/lib/builder/storefront-fidelity-builder-operations';
import {resolveStorefrontVisualStyle} from '@/lib/builder/storefront-visual-style';
import {normalizeStorefrontTemplateRuntimeComposition} from '@/lib/builder/storefront-template-runtime-normalization';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v19-canonical';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v20';
import {STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES,STOREFRONT_TEMPLATE_LAUNCH_TARGET} from '@/lib/builder/storefront-template-catalog';
import {PLANS} from '@/lib/plans/catalog';

const read=(path:string)=>readFileSync(path,'utf8');
const registry=createStorefrontVisualBuilderComponentRegistry();
const rendererRegistry=createStorefrontVisualBuilderRendererRegistry();
const pro={plan:'pro' as const,features:PLANS.pro.features};
const alap={plan:'alap' as const,features:PLANS.alap.features};
const playroomPage=(pageType:StorefrontPageDocument['pageType'])=>structuredClone(PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(page=>page.pageType===pageType)!);

function findNode(document:StorefrontPageDocument,nodeId:string):StorefrontComponentNode{
  const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode|null=>{
    for(const node of nodes){
      if(node.id===nodeId)return node;
      const child=walk(node.children??[]);
      if(child)return child;
    }
    return null;
  };
  const found=walk(document.sections);
  if(!found)throw new Error(`TEST_NODE_NOT_FOUND:${nodeId}`);
  return found;
}

function collectNodes(document:StorefrontPageDocument,predicate:(node:StorefrontComponentNode)=>boolean):StorefrontComponentNode[]{
  const found:StorefrontComponentNode[]=[];
  const walk=(nodes:readonly StorefrontComponentNode[])=>{
    for(const node of nodes){
      if(predicate(node))found.push(node);
      walk(node.children??[]);
    }
  };
  walk(document.sections);
  return found;
}

function playroomFooterText(node:StorefrontComponentNode):boolean{
  const serialized=JSON.stringify(node.config);
  return serialized.includes('Vásárlási információk')||serialized.includes('Kövess minket')||serialized.includes('Szállítás')||serialized.includes('Fizetés');
}

function hasFactClusterHost(document:StorefrontPageDocument):boolean{
  const factKeys=new Set(['commerce.key-specs','commerce.specification-groups','commerce.technical-documents','compatibility.evidence','compatibility.status']);
  const purchaseKeys=new Set(['commerce.product-info','commerce.option-selector','commerce.variant-swatches','commerce.size-selector','commerce.purchase-controls','commerce.add-to-cart','content.button']);
  const subtreeHas=(node:StorefrontComponentNode,keys:Set<string>):boolean=>keys.has(node.componentKey)||(node.children??[]).some(child=>subtreeHas(child,keys));
  return collectNodes(document,node=>{
    if(!['layout.section','layout.container','layout.grid','layout.stack'].includes(node.componentKey))return false;
    const children=node.children??[];
    const factBranches=children.filter(child=>subtreeHas(child,factKeys)).length;
    const purchaseBranches=children.filter(child=>subtreeHas(child,purchaseKeys)).length;
    if(!factBranches)return false;
    if(purchaseBranches>0&&factBranches<2)return false;
    return true;
  }).length>0;
}

function render(page:StorefrontPageDocument,bindingContext:Record<string,unknown>,viewport:'desktop'|'tablet'|'mobile'='desktop'){
  return renderToStaticMarkup(createElement(StorefrontRuntimeRenderer,{
    page:bindStorefrontExistingCommerceRuntime(page),
    viewport,
    bindingContext,
    componentRegistry:registry,
    rendererRegistry,
    capability:pro,
  }));
}

describe('Playroom v20 functional acceptance',()=>{
  it('plans a real v19 -> v20 upgrade as draft-only while preserving page identities and revisions',()=>{
    const existingPages=PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE.pages.map((page,index)=>({
      pageKey:`merchant-${page.pageType}`,
      pageType:page.pageType,
      draftRevision:index+7,
      draftTemplateKey:'gaming.playroom',
      draftTemplateVersion:19,
      publishedTemplateKey:'gaming.playroom',
      publishedTemplateVersion:19,
    }));
    const template=composeStorefrontDigitalCommerceTemplatePackage(PLAYROOM_V20_TEMPLATE_PACKAGE);
    const plan=planStorefrontTemplateInstallation({template,componentRegistry:registry,capability:pro,existingPages});
    expect(plan.mode).toBe('upgrade');
    expect(plan.templateKey).toBe('gaming.playroom');
    expect(plan.templateVersion).toBe(20);
    expect(plan.pages).toHaveLength(14);
    expect(plan.pages.every((page,index)=>page.pageKey===`merchant-${page.pageType}`&&page.expectedDraftRevision===index+7)).toBe(true);
    expect(plan.mutationBoundary).toEqual(STOREFRONT_TEMPLATE_SWITCH_DATA_BOUNDARY);
    expect(plan.mutationBoundary.storefrontPageDrafts).toBe(true);
    for(const key of ['products','variants','customers','orders','content','b2b','seoBusinessData'] as const)expect(plan.mutationBoundary[key]).toBe(false);

    const actions=read('src/app/admin/tartalom/builder/actions.ts');
    const start=actions.indexOf('export async function installVisualBuilderTemplateAction');
    const end=actions.indexOf('export async function generateVisualBuilderStorefrontAction',start);
    const installAction=actions.slice(start,end);
    expect(installAction).toContain('saveCurrentStorefrontTemplateDraftPlan');
    expect(installAction).not.toContain('publishVisualBuilderPageAction');
    expect(installAction).not.toContain('publishCurrentStorefrontPage');
  });

  it('keeps Contact Form on the canonical ticket authority with validation, dedupe, spam sink and accessible feedback',()=>{
    const route=read('src/app/api/support/route.ts');
    const client=read('src/components/builder/storefront-support-contact-form-client.tsx');
    const atomic=read('supabase/migrations/20260903185000_support_submission_atomic_v2.sql');
    expect(route).toContain("subject:z.string().trim().min(3).max(180)");
    expect(route).toContain("message:z.string().trim().min(10).max(4000)");
    expect(route).toContain("if(parsed.data.website)return NextResponse.json({ok:true,ticketNumber:'SUP-OK'})");
    expect(route).toContain("rpc('create_support_ticket_v2'");
    expect(route).toContain("result.duplicate===true");
    expect(route).toContain("{status:429}");
    expect(route).toContain("{status:201}");
    expect(atomic).toContain('pg_advisory_xact_lock');
    expect(atomic).toContain('SUPPORT_INITIAL_MESSAGE_EVIDENCE_MISSING');
    expect(client).toContain("fetch('/api/support'");
    expect(client).toContain("role={feedback.kind==='error'?'alert':'status'}");
    expect(client).toContain('aria-live="polite"');
  });

  it('makes Newsletter consent tenant-scoped, explicit and idempotent for an already-active subscriber',()=>{
    const route=read('src/app/api/marketing/newsletter/route.ts');
    const client=read('src/components/builder/storefront-newsletter-signup-runtime.tsx');
    expect(route).toContain("consent:z.literal(true)");
    expect(route).toContain(".eq('instance_id',instance.id)");
    expect(route).toContain(".eq('email',email)");
    expect(route).toContain(".eq('channel','email')");
    expect(route).toContain("latest?.status==='granted'");
    expect(route).toContain("duplicate:true");
    expect(route).toContain("message:'Már feliratkoztál.'");
    expect(route).toContain("status:'granted'");
    expect(route).toContain("duplicate:false");
    expect(client).toContain("data-consent-authority=\"marketing_consents\"");
    expect(client).toContain("if(!consent)");
    expect(client).toContain("role={feedback.kind==='error'?'alert':'status'}");
  });

  it('keeps acceptance deep links on persisted runtime page keys and Direct Preview on the same shared digital composition as Builder',()=>{
    const acceptance=read('src/app/admin/platform/acceptance/[instanceId]/actions.ts');
    expect(acceptance).toContain("page=home&acceptance=platform");
    expect(acceptance).not.toContain("page=playroom.home");

    const builder=read('src/app/admin/tartalom/builder/page.tsx');
    const runtimeSource=read('src/lib/builder/storefront-runtime-source.ts');
    expect(builder).toContain('composeStorefrontDigitalCommerceCapabilities(normalizeStorefrontTemplateRuntimeComposition(document))');
    expect(runtimeSource).toContain('const composedPage=composeStorefrontDigitalCommerceCapabilities(normalizeStorefrontTemplateRuntimeComposition(page))');
    expect(runtimeSource).toContain('page:failClosedSpecialCommerce(composedPage,runtime.capability)');
  });

  it('exposes a preview-only interactive checkout acceptance path with a real mixed cart seed',()=>{
    const entry=read('src/app/admin/platform/acceptance/[instanceId]/page.tsx');
    const actions=read('src/app/admin/platform/acceptance/[instanceId]/actions.ts');
    const checkoutEntry=read('src/app/admin/platform/acceptance/[instanceId]/checkout/page.tsx');
    const seeder=read('src/app/admin/platform/acceptance/[instanceId]/checkout/checkout-acceptance-seeder.tsx');
    const cartProvider=read('src/components/cart/cart-provider.tsx');
    expect(entry).toContain('Interaktív pénztár teszt');
    expect(entry).toContain('name="flow" value="checkout"');
    expect(actions).toContain("if(flow==='checkout')");
    expect(actions).toContain('/checkout');
    expect(checkoutEntry).toContain("process.env.VERCEL_ENV!=='preview'");
    expect(checkoutEntry).toContain('getPilotAcceptanceInstanceId');
    expect(checkoutEntry).toContain("acceptance-physical-product");
    expect(checkoutEntry).toContain("acceptance-digital-product");
    expect(checkoutEntry).toContain(".from('storefront_reusable_symbols')");
    expect(checkoutEntry).toContain('STOREFRONT_SYMBOL_SCHEMA_REQUIRED');
    expect(cartProvider).toContain('hydrated:boolean');
    expect(cartProvider).toContain("hydrated,setHydrated");
    expect(cartProvider).toContain("hydrated,add(item)");
    expect(seeder).toContain("useCart");
    expect(seeder).toContain("setCouponCode,hydrated");
    expect(seeder).toContain("if(!hydrated||seeded.current)return");
    expect(seeder).toContain("const ready=hydrated&&");
    expect(seeder).toContain("replace(items)");
    expect(seeder).toContain("setCouponCode('')");
    expect(seeder).toContain("href={ready?'/penztar':'#'}");
    expect(seeder).not.toContain("localStorage.setItem('shoperation-cart-v4'");
  });

  it('renders the real E13 checkout inside the active Playroom template instead of the generic checkout shell',()=>{
    const route=read('src/app/penztar/page.tsx');
    const shell=read('src/components/checkout/storefront-checkout-shell.tsx');
    const runtimeSource=read('src/lib/builder/storefront-runtime-source.ts');
    const settings=read('src/lib/commerce/settings.ts');
    const acceptanceCheckoutPage=read('src/app/admin/platform/acceptance/[instanceId]/checkout/page.tsx');
    const couponPrivilegeRepair=read('supabase/migrations/20260920072500_coupons_service_role_privilege_repair.sql');
    const checkout=read('src/components/checkout/checkout-form.tsx');
    const checkoutCss=read('src/components/checkout/checkout-guided.module.css');
    const playroom=read('src/lib/builder/templates/playroom-v20.ts');
    const header=read('src/components/builder/storefront-commerce-header.tsx');
    const normalizer=read('src/lib/builder/storefront-template-runtime-normalization.ts');
    expect(route).toContain('resolveCurrentStorefrontCheckoutRuntimePage');
    expect(route).toContain('<StorefrontCheckoutShell');
    expect(route).toContain('embedded={Boolean(runtime)}');
    expect(route).toContain('acceptancePreview={acceptancePreview}');
    expect(shell).toContain("node.componentKey==='commerce.checkout-summary'");
    expect(shell).toContain('data-storefront-checkout-runtime="template-native"');
    expect(shell).toContain('data-storefront-live-checkout="shared-e13"');
    expect(shell).toContain('resolveStorefrontGlobalStyleCssVariables');
    expect(shell).toContain('const inherited=resolveStorefrontGlobalStyleCssVariables(page)');
    expect(shell).not.toContain("cssValue(theme,'surface','#ffffff')");
    expect(shell).toContain("assign('headingText','--shoporation-checkout-heading-color')");
    expect(shell).toContain("assign('fieldLabel','--shoporation-checkout-field-label-color')");
    expect(shell).toContain("assign('inputText','--shoporation-checkout-input-text-color')");
    expect(shell).toContain("assign('placeholder','--shoporation-checkout-placeholder-color')");
    expect(shell).toContain("assign('helperText','--shoporation-checkout-helper-color')");
    expect(header).toContain('data-storefront-search-icon="true"');
    expect(header).toContain('width="22" height="22"');
    expect(header).toContain("minWidth:'3rem',width:'3rem',height:'auto',minHeight:0,padding:0,lineHeight:0");
    expect(header).toContain("left:'50%',top:'50%'");
    expect(header).toContain("transform:'translate(-50%,-50%)'");
    const checkoutTemplate=playroomPage('checkout');
    const checkoutSearch=findNode(checkoutTemplate,'playroom-checkout-search');
    expect(checkoutSearch.config.style).toMatchObject({height:'2.24rem'});
    expect(normalizer).toContain("padding:'1.45rem 2.35rem 1.7rem'");
    expect(normalizer).toContain("minHeight:'12rem'");
    const originalFooter=checkoutTemplate.sections.at(-1)!;
    let remapIndex=0;
    const remap=(node:StorefrontComponentNode):StorefrontComponentNode=>({
      ...structuredClone(node),
      id:remapIndex++===0?'global-footer-test':`sym-test-${remapIndex}`,
      ...(node.children?{children:node.children.map(remap)}:{}),
    });
    const remapped={...checkoutTemplate,sections:[...checkoutTemplate.sections.slice(0,-1),remap(originalFooter)]};
    const normalizedRemapped=normalizeStorefrontTemplateRuntimeComposition(remapped);
    const footer=normalizedRemapped.sections.at(-1)!;
    expect(footer.id).toBe('global-footer-test');
    expect(footer.config.style).toMatchObject({padding:'1.45rem 2.35rem 1.7rem',minHeight:'12rem'});
    const footerNav=collectNodes(normalizedRemapped,node=>node.componentKey==='system.navigation'&&playroomFooterText(node)).at(-1);
    expect(footerNav).toBeTruthy();
    expect(footerNav?.config.style).toMatchObject({lineHeight:1.5,gap:'.32rem'});
    expect(footerNav?.config.styleSlots).toMatchObject({item:{base:{minHeight:'1.75rem',display:'flex',alignItems:'center'}}});
    const footerOnly={...normalizedRemapped,sections:[footer]};
    const renderedFooter=render(footerOnly,{});
    expect(renderedFooter).toContain('min-height:12rem');
    expect(renderedFooter).toContain('padding:1.45rem 2.35rem 1.7rem');
    expect(renderedFooter).toContain('line-height:1.5');
    expect(renderedFooter).toContain('min-height:1.75rem');
    expect(runtimeSource).toContain("getCurrentStorefrontPageState('checkout')");
    expect(runtimeSource).toContain('acceptanceMode:true');
    expect(playroom).toContain("checkoutTheme:{");
    expect(playroom).toContain("background:'#020b17'");
    expect(playroom).toContain("fieldLabel:'#dce9f5'");
    expect(playroom).toContain("placeholder:'#9bb1c6'");
    expect(checkoutCss).toContain('--checkout-heading:var(--shoporation-checkout-heading-color');
    expect(checkoutCss).toContain('--checkout-label:var(--shoporation-checkout-field-label-color');
    expect(checkoutCss).toContain('--checkout-input-text:var(--shoporation-checkout-input-text-color');
    expect(checkoutCss).toContain('--checkout-placeholder:var(--shoporation-checkout-placeholder-color');
    expect(checkoutCss).toContain('--checkout-helper:var(--shoporation-checkout-helper-color');
    expect(settings).toContain("label:'Acceptance · személyes átvétel'");
    expect(settings).toContain("label:'Acceptance · banki átutalás'");
    expect(acceptanceCheckoutPage).toContain("code:'ACCEPT10'");
    expect(acceptanceCheckoutPage).toContain("discount_type:'percent'");
    expect(acceptanceCheckoutPage).toContain("discount_value:10");
    expect(acceptanceCheckoutPage).toContain("{onConflict:'instance_id,code'}");
    expect(acceptanceCheckoutPage).toContain('ACCEPTANCE_COUPON_FIXTURE_REQUIRED');
    expect(couponPrivilegeRepair).toContain('revoke all on table public.coupons from service_role');
    expect(couponPrivilegeRepair).toContain('grant select,insert,update,delete on table public.coupons to service_role');
    expect(couponPrivilegeRepair).not.toContain('grant select,insert,update,delete on table public.coupons to authenticated');
    expect(checkout).toContain('const previousQuote=quote');
    expect(checkout).toContain('if(previousQuote)setQuote(previousQuote)');
    expect(checkout).toContain('Az ellenőrzött kosárösszeg változatlan maradt.');
    expect(checkout).toContain("control.setAttribute('aria-invalid','true')");
    expect(checkout).toContain('kitöltése kötelező.');
    expect(checkout).toContain('checkoutStepError');
    expect(checkout).toContain('onInput={clearFieldValidationFeedback}');
    expect(checkoutCss).toContain('[aria-invalid="true"]');
    expect(checkout).toContain("Acceptance proof: a rendelés leadási kísérletét a rendszer blokkolta.");
    expect(checkout).toContain("data-checkout-embedded={embedded?'true':'false'}");
    expect(checkoutCss).toContain('.formSection legend){float:left;width:100%');
    expect(checkoutCss).toContain('color:var(--checkout-text)!important');
    expect(checkoutCss).toContain('.checkoutField>span');
    expect(checkoutCss).toContain('font-weight:800');
    expect(checkoutCss).toContain('input::placeholder');
    expect(checkoutCss).toContain('.checkoutField>textarea');
    expect(checkoutCss).toContain('input:-webkit-autofill');
    expect(checkoutCss).toContain('-webkit-box-shadow:0 0 0 1000px var(--checkout-surface) inset!important');
    expect(checkout).toContain('[termsAccepted,setTermsAccepted]=useState(false)');
    expect(checkout).toContain('[privacyAcknowledged,setPrivacyAcknowledged]=useState(false)');
    expect(checkout).toContain('name="termsAccepted"');
    expect(checkout).toContain('name="privacyAcknowledged"');
    expect(checkout).toContain('type="submit" disabled={state===\'sending\'||quoteLoading||!quote||!termsAccepted||!privacyAcknowledged||!payment}');
    expect(checkout).toContain('Acceptance · rendelésleadás tesztelése');
    expect(checkout).not.toContain("type={acceptancePreview?'button':'submit'}");
    expect(checkout).not.toContain("disabled={acceptancePreview||");
    expect(checkout.indexOf('if(acceptancePreview){')).toBeLessThan(checkout.indexOf("fetch('/api/orders'"));
    expect(checkout).toContain('!termsAccepted||!privacyAcknowledged');
    expect(checkout).toContain('!termsAccepted||!privacyAcknowledged||!payment');
    expect(checkoutCss).toContain('.legalConsentList');
    expect(checkoutCss).toContain('grid-template-columns:auto minmax(0,1fr)');
    expect(checkoutCss).toContain('.checkoutSummary .summaryLine>span');
    expect(checkoutCss).toContain('color:var(--checkout-label)!important');
    expect(checkoutCss).toContain('.checkoutSummary .trustList');
    expect(checkoutCss).toContain('color:var(--checkout-helper)!important');
    expect(checkoutCss).toContain('white-space:nowrap');
  });

  it('proves one Playroom package for Alap and Pro and exposes contextual locked/available capabilities from real manifests',()=>{
    for(const capability of[alap,pro]){
      const template=composeStorefrontDigitalCommerceTemplatePackage(PLAYROOM_V20_TEMPLATE_PACKAGE);
      const plan=planStorefrontTemplateInstallation({template,componentRegistry:registry,capability});
      expect(plan.gate.ok,capability.plan).toBe(true);
      expect(plan.pages).toHaveLength(14);
    }
    const product=playroomPage('product');
    const alapItems=listStorefrontContextualCapabilityOpportunities({document:product,capability:alap});
    const proItems=listStorefrontContextualCapabilityOpportunities({document:product,capability:pro});
    expect(alapItems.find(item=>item.key==='special:scene')?.availability).toBe('locked');
    expect(proItems.find(item=>item.key==='special:scene')?.availability).toBe('available');
    expect(alapItems.find(item=>item.key==='special:compatibility')?.availability).toBe('available');
    expect(alapItems.find(item=>item.key==='fulfillment')?.availability).toBe('available');
    expect(alapItems.find(item=>item.key==='product-documents')?.availability).toBe('available');
    const contact=listStorefrontContextualCapabilityOpportunities({document:playroomPage('contact'),capability:alap});
    expect(contact.find(item=>item.key==='support')?.availability).toBe('available');
    const home=listStorefrontContextualCapabilityOpportunities({document:playroomPage('home'),capability:alap});
    expect(home.find(item=>item.key==='newsletter')?.availability).toBe('available');
  });

  it('mutates Playroom Global Styles without changing commerce content and resets a local add-on style back to inherited',()=>{
    const original=playroomPage('product');
    const styled=setStorefrontGlobalStyleState(original,{version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{accent:'#22aa88',surface:'#101820',radiusScale:'rounded'}});
    expect(getStorefrontGlobalStyleState(styled).tokens).toMatchObject({accent:'#22aa88',surface:'#101820',radiusScale:'rounded'});
    expect(resolveStorefrontGlobalStyleCssVariables(styled)).toMatchObject({
      '--shoporation-color-accent':'#22aa88',
      '--shoporation-color-surface':'#101820',
      '--shoporation-radius-m':'1.125rem',
    });
    expect(findNode(styled,'playroom-product-downloads').config.title).toBe('Letöltések');

    const overridden=setStorefrontNodeStyleSlot(styled,'playroom-product-downloads','root','mobile',{backgroundColor:'#334455'});
    const overriddenNode=findNode(overridden,'playroom-product-downloads');
    const overrideSlots=overriddenNode.config.styleSlots as Record<string,Record<string,unknown>>;
    expect(resolveStorefrontVisualStyle(overrideSlots.root,'mobile').backgroundColor).toBe('#334455');

    const reset=setStorefrontNodeStyleSlot(overridden,'playroom-product-downloads','root','mobile',{});
    const resetNode=findNode(reset,'playroom-product-downloads');
    const resetSlots=resetNode.config.styleSlots as Record<string,Record<string,unknown>>;
    expect(resolveStorefrontVisualStyle(resetSlots.root,'mobile').backgroundColor).toBeUndefined();
    expect(resolveStorefrontGlobalStyleCssVariables(reset)['--shoporation-color-surface']).toBe('#101820');
  });

  it('keeps the Playroom cart customer-task focused and removes redundant internal validation panels',()=>{
    const cart=playroomPage('cart');
    const ids=collectNodes(cart,()=>true).map(node=>node.id);
    expect(ids).not.toContain('playroom-cart-intro-status');
    expect(ids).not.toContain('playroom-cart-next-shell');
    expect(ids).not.toContain('playroom-cart-trust-preset');
    expect(ids).not.toContain('playroom-cart-digital-commerce');
    expect(collectNodes(cart,node=>node.componentKey==='commerce.fulfillment-summary')).toHaveLength(0);
    expect(findNode(cart,'playroom-cart-summary-shell').responsive?.desktop?.gridSpan).toBe(12);
    expect(findNode(cart,'playroom-cart-intro-copy').responsive?.desktop?.gridSpan).toBe(12);

    const source=read('src/lib/builder/storefront-digital-commerce-composition.ts');
    expect(source).toContain("cart:[]");
    expect(source).toContain("isDeprecatedCartDigitalCommerceSection");
  });

  it('injects a mixed non-empty cart only for the signed platform acceptance preview',()=>{
    const cart=playroomPage('cart');
    const ordinary=augmentStorefrontDigitalCommercePreviewContext({page:cart,context:{cart:{lines:[]}}});
    expect((ordinary.cart as {lines?:unknown[]}).lines).toEqual([]);

    const acceptance=augmentStorefrontDigitalCommercePreviewContext({page:cart,context:{cart:{lines:[]}},acceptanceMode:true});
    const fixture=acceptance.cart as {lines:Array<{name:string;variantLabel:string;quantity:number;lineTotal:number}>;subtotal:number;total:number};
    expect(fixture.lines).toEqual([
      expect.objectContaining({name:'Acceptance Physical Product',variantLabel:'Fizikai termék',quantity:1,lineTotal:1270}),
      expect.objectContaining({name:'Acceptance Digital Product',variantLabel:'Digitális termék',quantity:1,lineTotal:2540}),
    ]);
    expect(fixture.subtotal).toBe(3810);
    expect(fixture.total).toBe(3810);

    const html=render(cart,acceptance);
    expect(html).toContain('Acceptance Physical Product');
    expect(html).toContain('Fizikai termék');
    expect(html).toContain('Acceptance Digital Product');
    expect(html).toContain('Digitális termék');
    expect(html).toContain('data-cart-quantity-controls="true"');
    expect(html).toContain('data-cart-quantity-layout="vertical-arrows"');
    expect(html).toContain('data-cart-stepper="vertical"');
    expect(html).toContain('data-cart-step="increase"');
    expect(html).toContain('data-cart-step="decrease"');
    expect(html).toContain('data-cart-icon="chevron-up"');
    expect(html).toContain('data-cart-icon="chevron-down"');
    expect(html).toContain('fill="currentColor"');
    expect(html).toContain('Mennyiség csökkentése');
    expect(html).toContain('Mennyiség növelése');
    expect(html).toContain('data-cart-remove-control="true"');
    expect(html).toContain('data-cart-icon="trash"');
    expect(html).toContain('Tétel törlése');
    expect(html).toContain('data-cart-coupon-entry="true"');
    expect(html).toContain('data-cart-coupon-presentation="template-native"');
    expect(html).toContain('data-cart-coupon-input="true"');
    expect(html).toContain('data-cart-coupon-apply="true"');
    expect(html).toContain('var(--shoporation-color-surface');
    expect(html).toContain('var(--shoporation-color-primary');
    expect(html).toContain('Van kuponkódod?');
    expect(html).toContain('Tovább a pénztárhoz');

    const builder=read('src/app/admin/tartalom/builder/page.tsx');
    expect(builder).toContain('acceptanceMode:isPlatformPilotAcceptance');
  });

  it('shares one persisted coupon between cart and checkout while keeping the checkout step-4 entry',()=>{
    const provider=read('src/components/cart/cart-provider.tsx');
    const cart=read('src/components/cart/cart-view.tsx');
    const checkout=read('src/components/checkout/checkout-form.tsx');
    const quote=read('src/app/api/checkout/quote/route.ts');
    expect(provider).toContain("CART_STORAGE_KEY='shoperation-cart-v4'");
    expect(provider).toContain('setCouponCode:(code:string)=>void');
    expect(cart).toContain("mode:'cart'");
    expect(cart).toContain('Van kuponkódod?');
    expect(cart).toContain('data-cart-coupon-presentation="template-native"');
    expect(cart).toContain('data-cart-coupon-input="true"');
    expect(cart).toContain('data-cart-coupon-apply="true"');
    expect(cart).toContain('data-cart-quantity-layout="vertical-arrows"');
    expect(cart).toContain('data-cart-stepper="vertical"');
    expect(cart).toContain('data-cart-step="increase"');
    expect(cart).toContain('data-cart-step="decrease"');
    expect(cart).toContain('data-cart-remove-control="true"');
    expect(cart).toContain('Tétel törlése');
    expect(cart).toContain('<CartTrashIcon/>');
    expect(cart).toContain('<CartChevronIcon direction="up"/>');
    expect(cart).toContain('<CartChevronIcon direction="down"/>');
    expect(cart).toContain('fill="currentColor"');
    const builderCss=read('src/components/admin/storefront-visual-builder-final-fix.module.css');
    expect(builderCss).toContain('[data-cart-coupon-input="true"]');
    expect(builderCss).toContain('background:var(--shoporation-color-surface,#15142c)!important');
    expect(builderCss).toContain('[data-cart-coupon-apply="true"]');
    expect(checkout).toContain('couponCode,setCouponCode}=useCart()');
    expect(checkout).toContain('step="summary" number={4}');
    expect(checkout).toContain('<span>Kuponkód</span>');
    expect(checkout).toContain('Kupon alkalmazása');
    expect(quote).toContain("mode:z.enum(['cart','checkout'])");
  });

  it('renders a useful empty-cart exit and hides an empty recommendation section',()=>{
    const cart=playroomPage('cart');
    const html=render(cart,{cart:{lines:[],subtotal:'',total:''},recommendations:{products:[]}});
    expect(html).toContain('data-cart-empty-state="true"');
    expect(html).toContain('Vásárlás folytatása');
    expect(html).toContain('href="/webaruhaz"');
    expect(html).not.toContain('data-storefront-commerce="recommendation-row"');
    expect(html).not.toContain('Jelenleg nincs kapcsolódó ajánlat.');
  });

  it.each(['physical','digital','mixed'] as const)('renders Playroom checkout fulfillment state %s through the shared runtime',mode=>{
    const checkout=playroomPage('checkout');
    const html=render(checkout,{commerce:{digitalCommerce:{
      checkoutFulfillment:{
        state:'ready',mode,requiresShipping:mode!=='digital',
        copy:`Acceptance ${mode}`,
        lines:[
          ...(mode!=='digital'?[{id:'physical',name:'Neon Pro Controller',quantity:1,fulfillmentType:'physical'}]:[]),
          ...(mode!=='physical'?[{id:'digital',name:'Orbit Breakers Digital',quantity:1,fulfillmentType:'digital'}]:[]),
        ],
        documentCenterHref:'/fiokom/letoltesek',
      },
      postPurchase:{state:'ready',mode,paymentStatus:'pending',copy:'Fizetés után aktiválódik.',documentCenterHref:'/fiokom/letoltesek'},
    }}});
    expect(html).toContain(`data-fulfillment-mode="${mode}"`);
    expect(html).toContain(`Acceptance ${mode}`);
    if(mode==='digital')expect(html).not.toContain('Neon Pro Controller');
    if(mode==='mixed'){expect(html).toContain('Neon Pro Controller');expect(html).toContain('Orbit Breakers Digital');}
  });

  it('applies the downloads placement contract across every implemented template and remains future-template generic',()=>{
    expect(STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES.length).toBeLessThanOrEqual(STOREFRONT_TEMPLATE_LAUNCH_TARGET);
    for(const template of STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES){
      const source=structuredClone(template.pages.find(page=>page.pageType==='product')!);
      delete source.metadata?.digitalCommerceCompositionVersion;
      const composed=composeStorefrontDigitalCommerceTemplatePackage({...template,pages:[source]}).pages[0];
      const tiles=collectNodes(composed,node=>node.componentKey==='commerce.downloads-tile');
      expect(tiles,template.manifest.templateKey).toHaveLength(1);

      const eligibleCluster=hasFactClusterHost(source);
      const standalone=composed.sections.find(section=>section.id.startsWith('shared-')&&section.id.endsWith('-digital-commerce'));
      if(eligibleCluster)expect(standalone,template.manifest.templateKey).toBeUndefined();
      else {
        expect(standalone,template.manifest.templateKey).toBeTruthy();
        const primaryIndex=composed.sections.findIndex(section=>collectNodes({...composed,sections:[section]},node=>['commerce.product-gallery','commerce.product-info','commerce.variant-swatches','commerce.option-selector','commerce.purchase-controls','commerce.add-to-cart'].includes(node.componentKey)).length>0);
        expect(composed.sections.indexOf(standalone!),template.manifest.templateKey).toBe(primaryIndex+1);
      }
    }
  });

  it('migrates an already-saved standalone downloads section into an existing Product Facts cluster',()=>{
    const product=playroomPage('product');
    const factsGrid=findNode(product,'playroom-product-facts-grid');
    const tile=factsGrid.children?.find(item=>item.id==='playroom-product-downloads');
    expect(tile).toBeTruthy();
    factsGrid.children=(factsGrid.children??[]).filter(item=>item.id!=='playroom-product-downloads');
    product.sections.splice(2,0,{
      id:'playroom-product-digital-commerce',
      componentKey:'layout.section',componentVersion:1,config:{},
      children:[{id:'playroom-product-digital-commerce-container',componentKey:'layout.container',componentVersion:1,config:{},children:[structuredClone(tile!)]}],
    });
    product.metadata={...(product.metadata??{}),digitalCommerceCompositionVersion:'shoporation.storefront-digital-commerce-composition.v4'};
    const migrated=composeStorefrontDigitalCommerceTemplatePackage({...PLAYROOM_V20_TEMPLATE_PACKAGE,pages:[product]}).pages[0];
    const migratedFacts=findNode(migrated,'playroom-product-facts-grid');
    expect(migrated.sections.some(section=>section.id==='playroom-product-digital-commerce')).toBe(false);
    expect(migratedFacts.children?.map(item=>item.id)).toEqual([
      'playroom-product-facts-specs',
      'playroom-product-facts-compatibility',
      'playroom-product-downloads',
    ]);
  });

  it('keeps public documents as the third Product Facts tile while purchased digital files stay in Fiókom → Letöltéseim',()=>{
    const product=playroomPage('product');
    const factsGrid=findNode(product,'playroom-product-facts-grid');
    expect(factsGrid.children?.map(item=>item.id)).toEqual([
      'playroom-product-facts-specs',
      'playroom-product-facts-compatibility',
      'playroom-product-downloads',
    ]);
    expect(factsGrid.children?.map(item=>item.responsive?.desktop?.gridSpan)).toEqual([4,4,4]);
    expect(factsGrid.children?.map(item=>item.responsive?.tablet?.gridSpan)).toEqual([4,4,4]);
    expect(factsGrid.children?.map(item=>item.responsive?.mobile?.gridSpan)).toEqual([12,12,12]);
    expect(product.sections.some(section=>section.id==='playroom-product-digital-commerce')).toBe(false);

    const withDownloads=render(product,{commerce:{digitalCommerce:{
      productDownloads:{state:'ready',mode:'mixed',accountDownloadsHref:'/fiokom/letoltesek',documents:[{
        id:'manual-1',kindLabel:'Használati útmutató',title:'Neon Pro Controller kézikönyv',
        description:'Magyar használati útmutató',fileName:'controller-manual.pdf',sizeLabel:'1.2 MB',
        variantSpecific:true,downloadHref:'/api/product-documents/manual-1?variantId=variant-1',
      }]},
    }}});
    expect(withDownloads).toContain('data-storefront-digital-commerce="downloads-tile"');
    expect(withDownloads).toContain('Letöltések');
    expect(withDownloads).toContain('data-presentation="playroom-facts-tile"');
    expect(withDownloads).toContain('Használati útmutató');
    expect(withDownloads).not.toContain('Dokumentumok · 1 db');
    expect(withDownloads).toContain('Megnyitás');
    expect(withDownloads).toContain('Digitális tartalom: Fiókom → Letöltéseim');
    expect(withDownloads).toContain('data-digital-download-location="account"');
    expect(withDownloads).not.toContain('Neon Pro Controller kézikönyv');
    expect(withDownloads).not.toContain('href="/fiokom/letoltesek"');

    const emptyPhysical=render(product,{commerce:{digitalCommerce:{
      productDownloads:{state:'ready',mode:'physical',documents:[]},
    }}});
    expect(emptyPhysical).not.toContain('data-storefront-digital-commerce="downloads-tile"');

    const server=read('src/lib/builder/storefront-digital-commerce-server.ts');
    expect(server).toContain("documents.filter(document=>document.visibility==='public')");
    const accountPage=read('src/app/fiokom/page.tsx');
    const downloadsPage=read('src/app/fiokom/letoltesek/page.tsx');
    expect(accountPage).toContain('href="/fiokom/letoltesek">Letöltéseim</Link>');
    expect(downloadsPage).toContain('<h1 className="sectionTitle">Letöltéseim</h1>');
    expect(downloadsPage).toContain('listAccountDigitalDownloads');
  });

  it('renders the customer document center with invoice and merchant warranty while keeping authorities distinct',()=>{
    const account=playroomPage('account');
    const html=render(account,{commerce:{digitalCommerce:{documentsCenter:{
      state:'ready',
      digital:[{id:'game-1',title:'Orbit Breakers Digital',description:'Rendelés: SHOP-1001',status:'available',href:'/api/digital-downloads/asset-1?orderId=order-1'}],
      orderDocuments:[
        {id:'invoice-1',title:'Számla · INV-1001',description:'Rendelés: SHOP-1001',status:'available',href:'/fiokom/letoltesek'},
        {id:'warranty-1',title:'Garancialevél · Neon Pro Controller',description:'Merchant által feltöltött dokumentum',meta:'warranty.pdf',status:'available',href:'/api/order-documents/warranty-1'},
      ],
      productDocuments:[{id:'manual-1',title:'Controller kézikönyv',description:'Neon Pro Controller',meta:'controller-manual.pdf',status:'available',href:'/api/product-documents/manual-1?variantId=variant-1'}],
    },postPurchase:{state:'ready',mode:'mixed',paymentStatus:'paid',hasDocuments:true,documentCenterHref:'/fiokom/letoltesek'}}}});
    expect(html).toContain('data-document-authority="digital"');
    expect(html.match(/data-document-authority="order"/g)?.length).toBe(2);
    expect(html).toContain('data-document-authority="product"');
    expect(html).toContain('Számla · INV-1001');
    expect(html).toContain('Garancialevél · Neon Pro Controller');
    expect(html).toContain('Controller kézikönyv');
    const composedAccount=composeStorefrontDigitalCommerceCapabilities(account);
    expect(collectNodes(composedAccount,node=>node.componentKey==='commerce.post-purchase-guidance')).toHaveLength(0);
    const footerIndex=composedAccount.sections.findIndex(section=>collectNodes({...composedAccount,sections:[section]},node=>node.componentKey==='system.footer'||node.componentKey==='editorial.footer'||node.componentKey.endsWith('.footer')).length>0);
    expect(footerIndex).toBe(composedAccount.sections.length-1);
  });

  it('keeps Playroom factory fixtures explicit for downloadable, physical and mixed acceptance without creating a local engine',()=>{
    const fixtures=PLAYROOM_V20_TEMPLATE_PACKAGE.demoFixtures??[];
    expect(fixtures.some(item=>item.entityKey==='a3-downloadable-game'&&item.payload.fulfillment_type==='digital')).toBe(true);
    expect(fixtures.some(item=>item.entityKey==='a3-physical-controller'&&item.payload.fulfillment_type==='physical')).toBe(true);
    const source=read('src/lib/builder/templates/playroom-v20.ts');
    expect(source).not.toMatch(/createSignedUrl|digital_entitlements|place_order_provider|payment_secret|shipping_provider/i);
    for(const page of PLAYROOM_V20_TEMPLATE_PACKAGE.pages)expect(page.metadata?.digitalCommerceFactoryAcceptance).toEqual(['downloadable-game','physical-gaming-product','mixed-basket']);
  });
});
