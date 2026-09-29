'use client';

import {type ComponentProps,type MouseEvent,type ReactNode} from 'react';
import {useCart} from '@/components/cart/cart-provider';
import {CartView} from '@/components/cart/cart-view';
import {CheckoutForm} from '@/components/checkout/checkout-form';
import {AccountCollectionGrid} from '@/components/account/account-collection-grid';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import type {StorefrontResolvedComponentNode,StorefrontPageDocument,StorefrontRuntimeCapabilityContext} from '@/lib/builder/storefront-runtime';
import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';

export const STOREFRONT_TEMPLATE_PREVIEW_COMMERCE_RUNTIME_VERSION='shoporation.template-preview-commerce-shell.v1' as const;

type Routes={catalog:string;cart:string;checkout:string;account:string};

const PREVIEW_SHIPPING_OPTIONS:ComponentProps<typeof CheckoutForm>['shippingOptions']=[
  {code:'preview-courier',label:'Futárszolgálat',fee:1990,kind:'home_delivery',adapterKey:'preview-read-only',externalLogistics:true},
  {code:'preview-parcel',label:'Csomagpont / automata',fee:1290,kind:'parcel_point',adapterKey:'preview-read-only',externalLogistics:true},
  {code:'preview-pickup',label:'Személyes átvétel',fee:0,kind:'pickup',adapterKey:'preview-read-only',externalLogistics:false},
];
const PREVIEW_PAYMENT_OPTIONS:ComponentProps<typeof CheckoutForm>['paymentOptions']=[
  {code:'preview-card',label:'Bankkártya',adapterKey:'preview-read-only',flow:'online_redirect'},
  {code:'preview-transfer',label:'Banki átutalás',adapterKey:'preview-read-only',flow:'bank_transfer'},
  {code:'preview-cod',label:'Utánvét',adapterKey:'preview-read-only',flow:'cash_on_delivery'},
];
const PREVIEW_CUSTOMER_DEFAULTS:ComponentProps<typeof CheckoutForm>['customerDefaults']={
  name:'Teszt Vásárló',email:'preview@example.invalid',phone:'+36 30 000 0000',
  billingPostcode:'1000',billingCity:'Budapest',billingAddress:'Minta utca 1.',
  companyName:'',taxNumber:'',customerType:'retail',businessIdentityLocked:false,
};
const PREVIEW_ACCOUNT_BENEFITS:ComponentProps<typeof CheckoutForm>['accountBenefitCapabilities']={
  loyalty:false,orderHistory:true,returns:true,digitalDownloads:true,
};

function PreviewCartCommerceSurface(){
  const{items,hydrated}=useCart();
  const products=items.map(item=>({
    id:item.variantId??item.productId,name:item.name,slug:item.slug,grossPrice:item.unitPrice,
    minimumQuantity:item.minimumQuantity??1,orderMultiple:item.orderMultiple??1,fulfillmentType:'physical' as const,
  }));
  return <div data-storefront-commerce-shell="cart-v1" data-storefront-preview-cart={!hydrated?'hydrating':items.length?'interactive':'empty'}>
    <CartView freeShippingThreshold={20000} products={products}/>
  </div>;
}

function PreviewCheckoutCommerceSurface(){
  return <div data-storefront-commerce-shell="checkout-v1" data-storefront-preview-checkout="interactive-fail-closed">
    <CheckoutForm
      shippingOptions={PREVIEW_SHIPPING_OPTIONS}
      paymentOptions={PREVIEW_PAYMENT_OPTIONS}
      freeShippingThreshold={20000}
      resellerApproved={false}
      embedded
      acceptancePreview
      instanceId={null}
      signedIn={false}
      customerDefaults={PREVIEW_CUSTOMER_DEFAULTS}
      hasSavedBillingProfile={false}
      accountBenefitCapabilities={PREVIEW_ACCOUNT_BENEFITS}
    />
  </div>;
}

const PREVIEW_COLLECTION_ITEMS=Object.freeze([
  {id:'collection-1',name:'Vault Sentinel figura',href:'/termek/vault-sentinel',imageUrl:'/storefront-demo/loot-vault-v2/product-figure.webp',owned:true},
  {id:'collection-2',name:'Mythic Warden szobor',href:'/termek/mythic-warden',imageUrl:'/storefront-demo/loot-vault-v2/editorial-vault-shelf.webp',owned:true},
  {id:'collection-3',name:'Neon Controller Collector Edition',href:'/termek/neon-controller',imageUrl:'/storefront-demo/loot-vault-v2/editorial-collector-room.webp',owned:false},
  {id:'collection-4',name:'Vault Visor relikvia',href:'/termek/vault-visor',imageUrl:'/storefront-demo/loot-vault-v2/hero-cinematic.webp',owned:false},
] as const);

const ACCOUNT_PREVIEW_STATES:Readonly<Record<string,{title:string;copy:string}>>=Object.freeze({
  orders:{title:'Rendeléseim',copy:'Jelenleg nincs bemutató rendelésed. Az éles fiókban itt jelenik meg a saját rendelési előzményed.'},
  letoltesek:{title:'Letöltéseim',copy:'Jelenleg nincs letölthető digitális tartalmad.'},
  dokumentumok:{title:'Dokumentumaim',copy:'Jelenleg nincs megjeleníthető számlád vagy egyéb dokumentumod.'},
  kivansaglista:{title:'Kívánságlista',copy:'Jelenleg nincs termék a kívánságlistádon.'},
  wishlist:{title:'Kívánságlista',copy:'Jelenleg nincs termék a kívánságlistádon.'},
  gyujtemenyem:{title:'Gyűjteményem',copy:'A megszerzett állapot a vásárlási előzményből származik, nem a kívánságlistából.'},
  collection:{title:'Gyűjteményem',copy:'A megszerzett állapot a vásárlási előzményből származik, nem a kívánságlistából.'},
  ugyek:{title:'Ügyeim',copy:'Jelenleg nincs folyamatban lévő ügyed.'},
  cases:{title:'Ügyeim',copy:'Jelenleg nincs folyamatban lévő ügyed.'},
  visszakuldes:{title:'Visszaküldés',copy:'Jelenleg nincs folyamatban lévő visszaküldésed.'},
  profile:{title:'Fiókadatok',copy:'Itt kezelhetők a vásárlói és számlázási adatok.'},
  marketing:{title:'Marketing beállítások',copy:'Itt adhatók meg a hírlevél- és marketing-hozzájárulások.'},
});
function PreviewAccountCapabilityState({view,viewport}:{view:string;viewport:StorefrontViewport}){
  if(view==='gyujtemenyem'||view==='collection')return <section data-storefront-preview-account-state="gyujtemenyem" style={{marginTop:'1rem'}}><AccountCollectionGrid items={PREVIEW_COLLECTION_ITEMS}/></section>;
  const state=ACCOUNT_PREVIEW_STATES[view];
  if(!state)return null;
  return <section data-storefront-preview-account-state={view} style={{marginTop:'1rem',padding:viewport==='mobile'?'1rem':'1.25rem',border:'1px solid var(--shoporation-color-border,#ddd)',borderRadius:'var(--shoporation-radius-m,.75rem)',background:'var(--shoporation-color-surface,#111)',display:'grid',gap:'.55rem'}}>
    <small style={{letterSpacing:'.08em',textTransform:'uppercase',color:'var(--shoporation-color-muted-text,#777)'}}>Fiók</small>
    <h2 style={{margin:0,fontFamily:'var(--shoporation-heading-font,serif)'}}>{state.title}</h2>
    <p style={{margin:0,lineHeight:1.6,color:'var(--shoporation-color-muted-text,#777)'}}>{state.copy}</p>
  </section>;
}

export function StorefrontTemplatePreviewRuntime({page,viewport,bindingContext,capability,routes,accountView,interactionBasePath}:{page:StorefrontPageDocument;viewport:StorefrontViewport;bindingContext:Record<string,unknown>;capability?:StorefrontRuntimeCapabilityContext;routes:Routes;accountView?:string;interactionBasePath?:string}){
  const componentRegistry=createStorefrontVisualBuilderComponentRegistry();
  const rendererRegistry=createStorefrontVisualBuilderRendererRegistry();
  const decorateNode=(node:StorefrontResolvedComponentNode,rendered:ReactNode)=>{
    if(node.componentKey==='commerce.cart-summary')return <PreviewCartCommerceSurface/>;
    if(node.componentKey==='commerce.checkout-summary')return <PreviewCheckoutCommerceSurface/>;
    if(page.pageType==='account'&&accountView&&node.componentKey==='system.navigation'&&node.config.presentation==='account-capability-demo')return <>{rendered}<PreviewAccountCapabilityState view={accountView} viewport={viewport}/></>;
    return rendered;
  };
  const interceptPreviewRoute=(event:MouseEvent<HTMLDivElement>)=>{
    const target=event.target;
    if(!(target instanceof Element))return;
    const accountTrigger=target.closest('button[aria-label="Fiókom"]');
    if(accountTrigger){
      event.preventDefault();
      event.stopPropagation();
      window.location.assign(routes.account);
      return;
    }
    const anchor=target.closest('a[href]');
    if(!(anchor instanceof HTMLAnchorElement))return;
    const url=new URL(anchor.href,window.location.href);
    if(url.origin!==window.location.origin)return;
    if(url.pathname==='/kosar'){
      event.preventDefault();
      window.location.assign(routes.cart);
      return;
    }
    if(interactionBasePath&&url.pathname==='/storefront-template-preview'){
      event.preventDefault();
      const params=new URLSearchParams(url.search);
      params.set('commerceProof','1');
      window.location.assign(`${interactionBasePath}?${params.toString()}`);
    }
  };
  return <div data-storefront-template-preview-runtime="shared-commerce-shell-v1" onClickCapture={interceptPreviewRoute} style={{display:'contents'}}>
    <StorefrontRuntimeRenderer page={page} viewport={viewport} bindingContext={bindingContext} componentRegistry={componentRegistry} rendererRegistry={rendererRegistry} capability={capability} decorateNode={decorateNode}/>
  </div>;
}
