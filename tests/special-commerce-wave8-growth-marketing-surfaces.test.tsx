import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_PAGE_SCHEMA_VERSION} from '@/lib/builder/storefront-foundation';
import {
  STOREFRONT_GROWTH_MARKETING_COMPONENT_DEFINITIONS,
  STOREFRONT_GROWTH_MARKETING_SURFACES,
  bindStorefrontGrowthMarketingRuntime,
  collectStorefrontGrowthMarketingCouponCodes,
} from '@/lib/builder/storefront-growth-marketing';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const capability={plan:'alap' as const,features:PLANS.alap.features};
const basePage=(child:StorefrontPageDocument['sections'][number]):StorefrontPageDocument=>({
  schemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,
  pageKey:'wave8.home',
  pageType:'home',
  templateKey:'reference.neutral',
  templateVersion:1,
  sections:[{id:'wave8-section',componentKey:'layout.section',componentVersion:1,config:{tone:'surface',spacing:'m',width:'full'},children:[child]}],
});

describe('Special Commerce Wave 8 growth / marketing surfaces',()=>{
  it('keeps the reconstructed surface catalogue on existing authorities and excludes unproven future domains',()=>{
    const source=JSON.stringify(STOREFRONT_GROWTH_MARKETING_SURFACES);
    expect(source).toContain('marketing_consents');
    expect(source).toContain('coupons');
    expect(source).toContain('commerce.interactive-scene');
    expect(source).toContain('retention.saved-cart-recovery');
    expect(source).not.toMatch(/gift.?card|store.?credit|referral|affiliate/i);
  });

  it('registers a Builder-editable promotion surface with coupon entitlement and runtime-owned business evidence',()=>{
    const definition=STOREFRONT_GROWTH_MARKETING_COMPONENT_DEFINITIONS[0];
    expect(definition.manifest.componentKey).toBe('marketing.promotion-banner');
    expect(definition.manifest.capability.features).toContain('coupons');
    expect(definition.manifest.configurable).toEqual(expect.arrayContaining(['couponCode','title','copy','ctaLabel','ctaHref','tone','showCode']));
    expect(definition.runtimeBindingSlots).toContain('promotion');
    const registered=createStorefrontVisualBuilderComponentRegistry().get('marketing.promotion-banner',1);
    expect(registered?.manifest.componentKey).toBe('marketing.promotion-banner');
  });

  it('projects only explicitly referenced, syntactically valid coupon codes and injects canonical offer bindings',()=>{
    const page=basePage({id:'promo',componentKey:'marketing.promotion-banner',componentVersion:1,config:{couponCode:' save-10 ',title:'Akció'},bindings:{promotion:{path:'content.fake'}}});
    page.sections.push({id:'bad-promo',componentKey:'layout.section',componentVersion:1,config:{},children:[{id:'bad',componentKey:'marketing.promotion-banner',componentVersion:1,config:{couponCode:'javascript:bad'}}]});
    expect(collectStorefrontGrowthMarketingCouponCodes(page)).toEqual(['SAVE-10']);
    const bound=bindStorefrontGrowthMarketingRuntime(page);
    const promo=bound.sections[0].children?.[0];
    const bad=bound.sections[1].children?.[0];
    expect(promo?.bindings?.promotion?.path).toBe('offer.promotions.SAVE-10');
    expect(bad?.bindings?.promotion).toBeUndefined();
  });

  it('renders an active canonical promotion and hides unverifiable promotion state',()=>{
    const page=basePage({id:'promo',componentKey:'marketing.promotion-banner',componentVersion:1,config:{couponCode:'SAVE10',eyebrow:'Hétvégi ajánlat',title:'Spórolj most',copy:'Ellenőrzött promóció.',ctaLabel:'Vásárlás',ctaHref:'/webaruhaz',showCode:true,tone:'surface'}});
    const componentRegistry=createStorefrontVisualBuilderComponentRegistry(),rendererRegistry=createStorefrontVisualBuilderRendererRegistry();
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer page={page} viewport="desktop" bindingContext={{offer:{promotions:{SAVE10:{code:'SAVE10',description:'',discountLabel:'10% kedvezmény',minimumLabel:'Nincs minimum kosárérték',validityLabel:'Visszavonásig érvényes',source:'canonical-coupon-authority'}}}}} componentRegistry={componentRegistry} rendererRegistry={rendererRegistry} capability={capability}/>);
    expect(html).toContain('data-storefront-marketing="promotion-banner"');
    expect(html).toContain('SAVE10');
    expect(html).toContain('canonical-coupon-authority');
    const hidden=renderToStaticMarkup(<StorefrontRuntimeRenderer page={page} viewport="mobile" bindingContext={{offer:{promotions:{}}}} componentRegistry={componentRegistry} rendererRegistry={rendererRegistry} capability={capability}/>);
    expect(hidden).not.toContain('promotion-banner');
  });

  it('reuses the canonical newsletter consent endpoint with explicit accessible consent instead of the legacy authored form target',()=>{
    const page=basePage({id:'newsletter',componentKey:'marketing.newsletter-signup',componentVersion:1,config:{eyebrow:'Hírlevél',title:'Maradj képben',copy:'Újdonságok e-mailben.',actionHref:'https://example.invalid/legacy',inputLabel:'E-mail-cím',buttonLabel:'Feliratkozom',consentLabel:'Hozzájárulok a marketing e-mailekhez.',tone:'surface'}});
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer page={page} viewport="mobile" bindingContext={{}} componentRegistry={createStorefrontVisualBuilderComponentRegistry()} rendererRegistry={createStorefrontVisualBuilderRendererRegistry()} capability={capability}/>);
    expect(html).toContain('data-consent-authority="marketing_consents"');
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain('example.invalid');
    const client=read('src/components/builder/storefront-newsletter-signup-runtime.tsx');
    expect(client).toContain("fetch('/api/marketing/newsletter'");
    expect(client).toContain('consent:true');
  });

  it('keeps the server projection tenant-scoped, read-only and bounded to referenced coupon codes',()=>{
    const server=read('src/lib/builder/storefront-growth-marketing-server.ts');
    expect(server).toContain(".eq('instance_id',instanceId)");
    expect(server).toContain(".in('code',[...codes])");
    expect(server).toContain('.limit(codes.length)');
    expect(server).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.rpc\(/);
    expect(server).toContain('usage_limit');
    expect(server).toContain('starts_at');
    expect(server).toContain('ends_at');
  });

  it('injects the same promotion state into preview and published runtime without a second storefront authority',()=>{
    const runtime=read('src/lib/builder/storefront-runtime-source.ts');
    expect(runtime).toContain('getStorefrontGrowthMarketingBundleForInstance(instance.id,materialized)');
    expect(runtime).toContain('getStorefrontGrowthMarketingBundleForInstance(instanceId,page)');
    expect(runtime).toContain('offer:{...current,promotions}');
    expect(runtime).not.toMatch(/marketing_campaigns.*insert|coupons.*insert|place_order\(/);
  });
});
