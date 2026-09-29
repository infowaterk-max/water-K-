import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';
import {STOREFRONT_PAGE_TYPES,STOREFRONT_VIEWPORTS,STOREFRONT_CANONICAL_VIEWPORT_WIDTH_PX} from '@/lib/builder/storefront-foundation';
import {getStorefrontTemplatePackage,STOREFRONT_TEMPLATE_CATALOG} from '@/lib/builder/storefront-template-catalog';
import {getStorefrontCookieConsentPreset} from '@/lib/builder/storefront-cookie-consent-presets';
import {
  PLAYROOM_V20_QUALITY_MANIFEST,
  STOREFRONT_TEMPLATE_QUALITY_GATE_VERSION,
  evaluateStorefrontTemplateQualityGate,
} from '@/lib/builder/storefront-template-quality-gate';
import {STOREFRONT_TEMPLATE_QUALITY_CANDIDATES} from '@/lib/builder/storefront-template-quality-candidates';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('Template Factory Quality Gate v2',()=>{
  it('locks the strict Playroom acceptance matrix to all canonical pages and viewports',()=>{
    expect(PLAYROOM_V20_QUALITY_MANIFEST.gateVersion).toBe(STOREFRONT_TEMPLATE_QUALITY_GATE_VERSION);
    expect(STOREFRONT_PAGE_TYPES).toHaveLength(14);
    expect(STOREFRONT_VIEWPORTS).toHaveLength(3);
    expect(STOREFRONT_PAGE_TYPES.length*STOREFRONT_VIEWPORTS.length).toBe(42);
    expect(PLAYROOM_V20_QUALITY_MANIFEST.pageTypes).toEqual(STOREFRONT_PAGE_TYPES);
    expect(PLAYROOM_V20_QUALITY_MANIFEST.viewports).toEqual(STOREFRONT_VIEWPORTS);
    expect(PLAYROOM_V20_QUALITY_MANIFEST.responsiveIsolation.explicitEffectiveStyles).toBe(true);
    expect(PLAYROOM_V20_QUALITY_MANIFEST.sourcePrefixes).toContain('src/lib/builder/templates/playroom-');
    expect(PLAYROOM_V20_QUALITY_MANIFEST.sourcePrefixes).toContain('src/lib/builder/templates/gaming/playroom/v20/');
    expect(PLAYROOM_V20_QUALITY_MANIFEST.status).toBe('accepted');
    expect(PLAYROOM_V20_QUALITY_MANIFEST.golden.required).toBe(true);
    expect(PLAYROOM_V20_QUALITY_MANIFEST.golden.baselineDirectory).toBe('tests/visual-baselines/gaming.playroom/v20');
  });

  it('keeps Playroom v20 structurally clean before browser acceptance',()=>{
    const template=getStorefrontTemplatePackage('gaming.playroom',20);
    expect(template).toBeTruthy();
    const result=evaluateStorefrontTemplateQualityGate({template:template!,manifest:PLAYROOM_V20_QUALITY_MANIFEST});
    expect(result).toEqual({ok:true,issues:[]});
  });

  it('requires interactive commerce proof in the exact-head Factory browser gate instead of screenshot presence alone',()=>{
    const gate=read('scripts/template-factory-quality-gate.mjs');
    expect(gate).toContain('proveFactoryCommerceInteraction');
    expect(gate).toContain('FACTORY_COMMERCE_INTERACTION_NOT_PROVEN');
    expect(gate).toContain('data-storefront-preview-order-blocked');
    expect(gate).toContain('data-storefront-preview-cart-quantity');
    expect(gate).toContain('commerceInteractionPassed');
    expect(gate).toContain('selectedState');
    expect(gate).toContain('priceUpdate');
    expect(gate).toContain('stockUpdate');
    expect(gate).toContain('totalConsistency');
    expect(gate).toContain('representativeQuoteSource');
    expect(gate).toContain('COMMERCE_INITIAL_QUOTE_TIMEOUT');
    expect(gate).toContain('await terms.check()');
    expect(gate).toContain('await privacy.check()');
    expect(gate).toContain('data-checkout-quote-source="representative-preview"');
    expect(gate).not.toContain('shippingQuoteRefresh');
    expect(gate).toContain("getByPlaceholder('Írd be a választott automata vagy átvételi pont nevét / címét')");
    expect(gate).toContain("name:'Tovább a fizetéshez'");
    expect(gate).toContain("name:'Tovább az összesítéshez'");
    expect(gate).toContain('legalConsent');
    expect(gate).toContain('[data-storefront-preview-order-submit="true"]:not([disabled])');
    expect(gate).not.toContain("document.querySelector('[data-storefront-preview-order-submit=\"true\"]')");
    expect(gate).toContain('Acceptance proof: a rendelés leadási kísérletét a rendszer blokkolta.');
    expect(gate).toContain('productionCommerceMutationRequestAttempted');
    expect(gate).toContain("page.route('**/api/**'");
  });

  it('keeps Builder v3 and storefront preview on the same Runtime renderer and canonical viewport authority',()=>{
    const builder=read('src/components/admin/storefront-visual-builder-v3.tsx');
    const previewPage=read('src/app/storefront-template-preview/page.tsx');
    const previewRuntime=read('src/components/builder/storefront-template-preview-runtime.tsx');
    expect(builder).toContain('StorefrontRuntimeRenderer');
    expect(previewPage).toContain('StorefrontTemplatePreviewRuntime');
    expect(previewRuntime).toContain('StorefrontRuntimeRenderer');
    expect(previewRuntime).not.toContain('new StorefrontRendererRegistry');
    expect(builder).toContain("const viewportWidth=VIEWPORTS.find(item=>item.key===viewport)?.width??1200");
    expect(builder).toContain('page={document}');
    expect(previewPage).toContain('page={page}');
    expect(previewRuntime).toContain('page={page}');
    expect(STOREFRONT_CANONICAL_VIEWPORT_WIDTH_PX).toEqual({desktop:1200,tablet:768,mobile:390});
  });

  it('preserves account subroute intent in template preview and proves a real empty state',()=>{
    const route=read('src/lib/builder/storefront-template-route-integrity.ts');
    const page=read('src/app/storefront-template-preview/page.tsx');
    const previewRuntime=read('src/components/builder/storefront-template-preview-runtime.tsx');
    const handoff=read('scripts/template-factory-product-owner-handoff.mjs');
    expect(route).toContain("params.set('accountView',accountView)");
    expect(page).toContain("accountView={pageType==='account'?query.accountView:undefined}");
    expect(previewRuntime).toContain('data-storefront-preview-account-state');
    expect(previewRuntime).toContain('Jelenleg nincs folyamatban lévő ügyed.');
    expect(previewRuntime).toContain("url.pathname==='/fiokom'||url.pathname.startsWith('/fiokom/')||url.pathname==='/kedvencek'");
    expect(previewRuntime).toContain("hashView:Record<string,string>={rendelesek:'orders',fiokadatok:'profile',marketing:'marketing'}");
    expect(previewRuntime).toContain("accountUrl.searchParams.set('accountView',accountView)");
    expect(handoff).toContain('accountInteractionPassed');
    expect(handoff).toContain('ACCOUNT_INTERACTION_NOT_PROVEN');
    expect(handoff).toContain("['Ügyeim','ugyek','/fiokom/ugyek']");
    expect(handoff).not.toContain("new URL(href,page.url()).searchParams.get('accountView')===view");
  });

  it('requires Product Owner handoff to prove the interactive preview commerce journey fail-closed',()=>{
    const gate=read('scripts/template-factory-quality-gate.mjs');
    const handoff=read('scripts/template-factory-product-owner-handoff.mjs');
    const previewRuntime=read('src/components/builder/storefront-template-preview-runtime.tsx');
    const commerceRenderer=read('src/components/builder/storefront-commerce.tsx');
    const previewDemo=read('src/lib/builder/storefront-template-preview-demo.ts');
    const checkout=read('src/components/checkout/checkout-form.tsx');
    const checkoutPage=read('src/app/penztar/page.tsx');
    expect(handoff).toContain('COMMERCE_INTERACTION_NOT_PROVEN');
    expect(handoff).toContain('commerceInteractionPassed');
    expect(handoff).toContain('templateAwareAuthContentReady');
    expect(handoff).toContain('templateAwareAuthShellCount');
    expect(handoff).toContain('visibleTemplateAwareAuthShellCount');
    expect(handoff).toContain('visibleAccountShellCount');
    expect(handoff).toContain('hiddenTemplateAwareAuthShellCount');
    expect(handoff).toContain("checks.templateAwareAuthShell=checks.visibleTemplateAwareAuthShellCount===1&&checks.visibleAccountShellCount===1");
    expect(handoff).toContain('main[data-template-preview-auth="true"] [data-storefront-auth-surface="true"]:visible');
    expect(handoff).toContain("name:'Mennyiség növelése'");
    expect(handoff).toContain("name:'Tétel törlése'");
    expect(handoff).toContain("getByRole('radio',{name:/Csomagpont/}).first()");
    expect(handoff).toContain("name:'Banki átutalás'");
    expect(handoff).toContain('data-storefront-preview-order-blocked');
    expect(handoff).toContain('selectedState');
    expect(handoff).toContain('priceUpdate');
    expect(handoff).toContain('stockUpdate');
    expect(handoff).toContain('quantityIncrease');
    expect(handoff).toContain('quantityDecrease');
    expect(handoff).toContain('reAddItem');
    expect(handoff).toContain('checkoutEntry');
    expect(handoff).toContain('shippingSelection');
    expect(handoff).toContain('representativeQuoteSource');
    expect(handoff).toContain('[data-storefront-preview-order-submit="true"]:not([disabled])');
    expect(handoff).toContain('totalRecalculation');
    expect(handoff).toContain('totalConsistency');
    expect(handoff).toContain("name:'Tovább a fizetéshez'");
    expect(handoff).toContain("name:'Tovább az összesítéshez'");
    expect(handoff).toContain('legalConsent');
    expect(handoff).toContain('await terms.check()');
    expect(handoff).toContain('await privacy.check()');
    expect(handoff).toContain('input[name="paymentProvider"][value="preview-transfer"]:checked');
    expect(handoff).toContain("selectedTransfer.waitFor({state:'attached',timeout:5000})");
    expect(handoff).toContain('data-checkout-quote-source="representative-preview"');
    expect(handoff).toContain('Acceptance proof: a rendelés leadási kísérletét a rendszer blokkolta.');
    expect(handoff).toContain('realOrderRequestAttempted');
    expect(handoff).toContain('realPaymentRequestAttempted');
    expect(handoff).toContain('productionCommerceMutationRequestAttempted');
    expect(handoff).toContain("page.route('**/api/**'");
    expect(previewRuntime).toContain('data-storefront-commerce-shell="cart-v1"');
    expect(previewRuntime).toContain('data-storefront-commerce-shell="checkout-v1"');
    expect(previewRuntime).toContain('<CartView freeShippingThreshold={20000} products={products}/>');
    expect(previewRuntime).toContain('<CheckoutForm');
    expect(previewRuntime).toContain('representativePreviewQuote');
    expect(gate).toContain('representativeQuoteSource');
    expect(handoff).toContain('representativeQuoteSource');
    expect(checkout).toContain('representativePreviewQuote=false');
    expect(checkout).toContain('if(representativePreviewQuote)');
    expect(checkout).toContain("fetch('/api/checkout/quote'");
    expect(checkout).toContain("data-checkout-quote-source={representativePreviewQuote?'representative-preview':'authoritative-server'}");
    expect(checkoutPage).not.toContain('representativePreviewQuote');
    expect(previewRuntime).toContain("if(url.pathname==='/penztar')");
    expect(previewRuntime).toContain('window.location.assign(routes.checkout)');
    expect(checkout).toContain("data-storefront-preview-order-submit={acceptancePreview?'true':undefined}");
    expect(checkout).toContain('data-storefront-preview-order-blocked="true"');
    expect(commerceRenderer).toContain('data-storefront-product-price="true"');
    expect(commerceRenderer).toContain('data-storefront-product-stock="true"');
    expect(previewDemo).toContain('Raktáron · ${selected.stock} db');
    expect(checkout).toContain("setError('Acceptance proof: a rendelés leadási kísérletét a rendszer blokkolta.')");
  });

  it('rejects partial page or viewport manifests as non-acceptance even when the underlying template is complete',()=>{
    const template=getStorefrontTemplatePackage('gaming.playroom',20)!;
    const partial={
      ...PLAYROOM_V20_QUALITY_MANIFEST,
      pageTypes:STOREFRONT_PAGE_TYPES.slice(0,6),
      viewports:['desktop','mobile'] as const,
    };
    const result=evaluateStorefrontTemplateQualityGate({template,manifest:partial});
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({code:'QUALITY_CANONICAL_PAGE_MATRIX_REQUIRED'}),
      expect.objectContaining({code:'QUALITY_CANONICAL_VIEWPORT_MATRIX_REQUIRED'}),
    ]));
  });

  it('requires accepted templates to promote a golden baseline instead of silently remaining candidate evidence',()=>{
    const template=getStorefrontTemplatePackage('gaming.playroom',20)!;
    const accepted={...PLAYROOM_V20_QUALITY_MANIFEST,status:'accepted' as const,golden:{...PLAYROOM_V20_QUALITY_MANIFEST.golden,required:false}};
    const result=evaluateStorefrontTemplateQualityGate({template,manifest:accepted});
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({code:'QUALITY_ACCEPTED_GOLDEN_REQUIRED'})]));
  });

  it('keeps the browser runner and CI workflow mandatory rather than commit-message gated',()=>{
    const workflow=read('.github/workflows/template-factory-quality-gate.yml');
    const runner=read('scripts/template-factory-quality-gate.mjs');
    const knowledgeScope=read('quality/knowledge/knowledge-scope-policy.v1.json');
    expect(workflow).not.toContain('head_commit.message');
    expect(workflow).toContain('Run scoped Template Factory browser proof (acceptance requires 14x3)');
    expect(workflow).toContain('workflow_dispatch');
    expect(workflow).not.toContain("'quality/knowledge/**'");
    expect(workflow).not.toContain("'src/lib/quality-system/**'");
    expect(workflow).not.toContain("'scripts/shoperation-*.mjs'");
    expect(workflow).toContain('QUALITY_HEAD_SHA: ${{ github.event.pull_request.head.sha || github.sha }}');
    expect(workflow).toContain('ref: ${{ github.event.pull_request.head.sha || github.sha }}');
    expect(runner).toContain('process.env.QUALITY_HEAD_SHA??process.env.GITHUB_SHA');
    expect(workflow).toContain("src/lib/auth/storefront-return-target.ts");
    expect(workflow).toContain("src/app/api/orders/claim/**");
    expect(workflow).toContain('tests/storefront-auth-return-target.test.ts');
    expect(workflow).toContain('tests/storefront-guest-order-claim.test.ts');
    expect(workflow).toContain('tests/storefront-shared-commerce-account-hardening.test.ts');
    expect(workflow).toContain("'src/components/cart/**'");
    expect(workflow).toContain("'src/lib/account/**'");
    expect(workflow).toContain('20260922053000_shared_customer_billing_b2b_identity_reverification.sql');
    expect((runner.match(/TEMPLATE_FACTORY_QUALITY_MANIFEST_REQUIRED/g)??[])).toHaveLength(2);
    expect(runner).toContain('const modifiedTemplateFiles=');
    expect(runner).not.toContain('LEGACY_TEMPLATE_REACCEPTANCE_PENDING');
    expect(knowledgeScope).toContain('"scripts/template-factory-quality-gate.mjs"');
    expect(runner).toContain("mode:'full',reason:'template-source-changed'");
    expect(runner).toContain("mode:'full',reason:'shared-runtime-changed'");
    expect(runner).toContain("const mode=template.factoryCandidate?'full':'canary'");
    expect(runner).toContain("const reason=template.factoryCandidate?'factory-exact-head-full':'default-canary'");
    expect(runner).toContain("'src/components/admin/storefront-visual-builder-v3.tsx'");
    expect(runner).toContain("'src/components/cart/'");
    expect(runner).toContain("'src/components/checkout/'");
    expect(runner).toContain("'src/components/account/'");
    expect(runner).toContain("'src/app/storefront-template-preview/'");
    expect(runner).toContain('MOBILE_DESKTOP_NAV_LEAK');
    expect(runner).toContain('SOCIAL_LINK_INTEGRITY');
    expect(runner).toContain('COOKIE_TEMPLATE_PRESET_REQUIRED');
    expect(runner).toContain('COOKIE_TEMPLATE_AUTHORITY');
    expect(runner).toContain('GOLDEN_BASELINE_MISSING');
    expect(runner).toContain("manifest.qualityCandidate?'&qualityCandidate=1'");
    expect(runner).toContain('manifest.factoryCandidate||manifest.qualityCandidate');
    expect(runner).toContain('CANDIDATE_SHOWROOM_PLACEHOLDER_WARNING_PRESENT');
    expect(runner).toContain('DEMO_SHOWROOM_READINESS_MISSING');
    expect(runner).toContain('CANDIDATE_DEMO_NOT_SHOWROOM_READY');
    expect(runner).toContain('SHOWROOM_READY_DEMO_WARNING_PRESENT');
    const qa=read('src/app/visual-fidelity-qa/page.tsx');
    expect(qa).toContain('demoShowroomReady=isStorefrontShowroomReadyDemoContent(demoFixture)');
    expect(qa).toContain('data-demo-showroom-ready');
  });

  it('keeps canonical quality candidates QA-only and distinct from production catalog or Factory recipe candidates',()=>{
    const route=read('src/app/api/visual-fidelity/templates/route.ts');
    const qa=read('src/app/visual-fidelity-qa/page.tsx');
    expect(STOREFRONT_TEMPLATE_QUALITY_CANDIDATES.every(item=>item.manifest.status==='candidate')).toBe(true);
    expect(STOREFRONT_TEMPLATE_QUALITY_CANDIDATES.every(item=>item.manifest.golden.required===false)).toBe(true);
    expect(route).toContain('provenance:build.report.provenance');
    expect(route).toContain('showroomEvidence:build.report.showroomEvidence');
    expect(route).toContain('STOREFRONT_TEMPLATE_QUALITY_CANDIDATES.map');
    expect(route).toContain('qualityCandidate:true');
    expect(qa).toContain("query.qualityCandidate==='1'");
    expect(qa).toContain('resolveStorefrontTemplateQualityCandidate');
    expect(qa).toContain('if(factoryCandidate&&qualityCandidate)notFound()');
  });
  it('requires a unique explicit cookie consent preset for every implemented template',()=>{
    const presetIds=new Set<string>();
    for(const entry of STOREFRONT_TEMPLATE_CATALOG){
      const preset=getStorefrontCookieConsentPreset(entry.templateKey);
      expect(preset,entry.templateKey).toBeTruthy();
      expect(preset?.templateKey).toBe(entry.templateKey);
      expect(preset?.presetId).toBeTruthy();
      expect(presetIds.has(preset!.presetId),entry.templateKey).toBe(false);
      presetIds.add(preset!.presetId);
    }
    expect(presetIds.size).toBe(STOREFRONT_TEMPLATE_CATALOG.length);
  });

});
