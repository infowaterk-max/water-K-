import fs from'node:fs';
import{describe,expect,it}from'vitest';

const page=fs.readFileSync('src/app/oldal/[slug]/page.tsx','utf8');
const faqPage=fs.readFileSync('src/app/gyik/page.tsx','utf8');
const shell=fs.readFileSync('src/components/content/storefront-content-shell.tsx','utf8');
const source=fs.readFileSync('src/lib/builder/storefront-runtime-source.ts','utf8');
const css=fs.readFileSync('src/app/public-pages-polish.css','utf8');
const commerceSettings=fs.readFileSync('src/lib/commerce/settings.ts','utf8');
const acceptanceFixture=fs.readFileSync('supabase/acceptance/digital-commerce-provider-fixture.sql','utf8');

describe('storefront public information route integrity',()=>{
 it('keeps canonical footer information routes functional even without CMS content',()=>{
  expect(page).toMatch(/szallitas:\{title:'Szállítás'/);
  expect(page).toMatch(/fizetes:\{title:'Fizetés'/);
  expect(page).toMatch(/visszakuldes:\{title:'Visszaküldés'/);
  expect(page).toMatch(/if\(!SYSTEM_INFO\[slug\]\)notFound\(\)/);
  expect(page).toMatch(/getCommerceSettings\(\)/);
 });
 it('wraps public information pages in the active storefront template shell',()=>{
  expect(page).toMatch(/StorefrontContentShell/);
  expect(shell).toMatch(/resolveCurrentStorefrontRouteRuntimePage\(pageKey\)/);
  expect(shell).toMatch(/pageKey\?:StorefrontBuilderPageType/);
  expect(shell).toMatch(/data-storefront-template=\{runtime\.page\.templateKey\}/);
  expect(source).toMatch(/resolveCurrentStorefrontPublicStaticRuntimePage\(pageKey:StorefrontBuilderPageType\)/);
  expect(source).toMatch(/resolveCurrentStorefrontRouteRuntimePage\(pageKey:StorefrontBuilderPageType\)/);
  expect(source).toMatch(/getPreviewStorefrontDraftPage\(instance\.id,pageKey\)/);
  expect(source).toMatch(/resolveCurrentStorefrontPublicStaticRuntimePage\('home'\)/);
  expect(source).toMatch(/resolveCurrentStorefrontPublicStaticRuntimePage\('content'\)/);
  expect(source).toMatch(/resolveCurrentStorefrontPublicStaticRuntimePage\('contact'\)/);
  expect(css).toMatch(/\.storefrontContentShell\{/);
  expect(css).toMatch(/--shoporation-color-background/);
 });
 it('does not hardcode shipping providers into the public shipping fallback',()=>{
  expect(page).toMatch(/settings\.shippingOptions\.map/);
  expect(page).toMatch(/settings\.freeShippingThreshold/);
  expect(page).toMatch(/systemInfoStack/);
  expect(page).toMatch(/Hogyan működik\?/);
  expect(page).toMatch(/Rendelés után/);
  expect(css).toMatch(/\.systemInfoPage \.systemInfoStack\{display:grid;gap:/);
  expect(page).not.toMatch(/GLS|Foxpost|MPL|DPD/);
 });
 it('renders payment information from active tenant methods with the same system-page rhythm',()=>{
  expect(page).toMatch(/settings\.paymentOptions\.map/);
  expect(page).toMatch(/option\.flow==='bank_transfer'/);
  expect(page).toMatch(/Fizetési mód kiválasztása/);
  expect(page).toMatch(/Végösszeg ellenőrzése/);
  expect(page).toMatch(/Visszaigazolás/);
  expect(page).toMatch(/Vissza a webáruházba/);
  expect(page).not.toMatch(/SimplePay|Barion|Stripe|PayPal/);
 });
 it('uses a representative preview-only commerce fixture instead of testing only empty states',()=>{
  expect(commerceSettings).toMatch(/instance\.storefront\.acceptance==='digital-commerce-guest-matrix'/);
  expect(commerceSettings).toMatch(/Acceptance · személyes átvétel/);
  expect(commerceSettings).toMatch(/Acceptance · házhozszállítás/);
  expect(commerceSettings).toMatch(/Acceptance · csomagpont/);
  expect(commerceSettings).toMatch(/Acceptance · banki átutalás/);
  expect(commerceSettings).toMatch(/Acceptance · utánvét/);
  expect(commerceSettings).toMatch(/freeShippingThreshold:20000/);
  expect(acceptanceFixture).toMatch(/NOT a migration/);
  expect(acceptanceFixture).toMatch(/example\.invalid/);
  expect(acceptanceFixture).toMatch(/ne utalj valódi pénzt/);
  expect(acceptanceFixture).not.toMatch(/kh_card|stripe|simplepay|barion/);
 });

 it('keeps the public returns page informational and hands authenticated work to the real return center',()=>{
  expect(page).toMatch(/data-system-info-page="returns"/);
  expect(page).toMatch(/A visszaküldés mindig egy konkrét rendeléshez kapcsolódik/);
  expect(page).toMatch(/Tételek és ok megadása/);
  expect(page).toMatch(/nem jelent automatikus pénzvisszatérítést/);
  expect(page).toMatch(/href="\/fiokom\/visszakuldes">Visszaküldési központ/);
  expect(page).toMatch(/href="\/fiokom\/ugyek">Összes ügyem/);
  expect(page).toMatch(/href="\/aszf">ÁSZF megnyitása/);
  expect(page).not.toMatch(/14 nap|tizennégy nap|30 nap/);
 });

 it('keeps FAQ template-aware, commerce-contextual and merchant-overridable',()=>{
  expect(faqPage).toMatch(/StorefrontContentShell/);
  expect(faqPage).toMatch(/getPublicContentBySlug\('page','gyik'\)/);
  expect(faqPage).toMatch(/commerce\.shippingOptions\.map/);
  expect(faqPage).toMatch(/commerce\.paymentOptions\.map/);
  expect(faqPage).toMatch(/commerce\.freeShippingThreshold/);
  expect(faqPage).toMatch(/data-system-info-page="faq"/);
  expect(faqPage).toMatch(/Vásárlás és rendelési folyamat/);
  expect(faqPage).toMatch(/Aktív lehetőségek és díjak/);
  expect(faqPage).toMatch(/Fiók és ügyintézés/);
  expect(faqPage).toMatch(/href="\/oldal\/szallitas"/);
  expect(faqPage).toMatch(/href="\/oldal\/fizetes"/);
  expect(faqPage).toMatch(/href="\/oldal\/visszakuldes"/);
  expect(css).toMatch(/Shared FAQ system surface/);
  expect(css).toMatch(/\.storefrontContentShell \.faqPage \.faqGroups\{display:grid;gap:/);
  expect(css).toMatch(/\.faqItem p\{[^}]*color:var\(--shoporation-color-text/);
 });

});
