import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';

const clone=<T>(value:T):T=>structuredClone(value);
const rec=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};

/**
 * Representative preview data only. It never runs in published storefront data
 * authority and never creates entitlements, orders or storage URLs.
 */
export function augmentStorefrontDigitalCommercePreviewContext(input:{
  template?:StorefrontInstallableTemplatePackage;
  page:StorefrontPageDocument;
  context:Record<string,unknown>;
  acceptanceMode?:boolean;
}):Record<string,unknown>{
  const next=clone(input.context);
  const commerce=rec(next.commerce),digitalCommerce=rec(commerce.digitalCommerce);
  const mixedLines=[
    {id:'preview-digital-game',name:'Digitális bemutatótermék',quantity:1,fulfillmentType:'digital'},
    {id:'preview-physical-controller',name:'Fizikai bemutatótermék',quantity:1,fulfillmentType:'physical'},
  ];
  const acceptanceCartLines=[
    {id:'acceptance-physical-product',name:'Acceptance Physical Product',variantLabel:'Fizikai termék',quantity:1,lineTotal:1270,fulfillmentType:'physical'},
    {id:'acceptance-digital-product',name:'Acceptance Digital Product',variantLabel:'Digitális termék',quantity:1,lineTotal:2540,fulfillmentType:'digital'},
  ];
  const productDocuments={state:'ready',documents:[
    {id:'preview-manual',kindLabel:'Használati útmutató',title:'Termék – gyors kezdés',description:'Preview dokumentum a Product Documents komponens vizuális ellenőrzéséhez.',fileName:'product-guide.pdf',sizeLabel:'1.2 MB',variantSpecific:true,downloadHref:'/storefront-template-preview?previewDocument=1'},
  ]};
  const documentsCenter={state:'ready',digital:[
    {id:'preview-game-download',title:'Digitális bemutatótermék',description:'Megvásárolt digitális játék',status:'available',href:'/fiokom/letoltesek'},
    {id:'preview-revoked',title:'Korábbi digitális tartalom',description:'Revoked állapot mintája',status:'revoked'},
  ],orderDocuments:[
    {id:'preview-invoice',title:'Számla · PLAY-2026-001',description:'Rendelési dokumentum',status:'available',href:'/fiokom/letoltesek'},
    {id:'preview-warranty',title:'Garancialevél · Fizikai bemutatótermék',description:'Merchant által biztosított rendelési dokumentum',status:'available',href:'/fiokom/letoltesek'},
  ],productDocuments:[
    {id:'preview-product-manual',title:'Fizikai bemutatótermék – használati útmutató',description:'Termékhez kapcsolódó dokumentum, külön Product Documents authorityból.',meta:'Fizikai bemutatótermék · PDF',status:'available',href:'/storefront-template-preview?previewProductDocument=1'},
  ]};
  if(input.page.pageType==='product'){
    digitalCommerce.productFulfillment={state:'ready',mode:'digital',copy:'Digitális termék: nincs fizikai szállítás, a hozzáférés az igazolt fizetés után aktiválódik.',documentCenterHref:'/fiokom/letoltesek'};
    digitalCommerce.productDocuments=productDocuments;
    digitalCommerce.productDownloads={state:'ready',mode:'digital',documents:productDocuments.documents,accountDownloadsHref:'/fiokom/letoltesek'};
    digitalCommerce.b2bQuote={state:'ready',eligible:true,href:'/fiokom/ajanlatkeresek?variantId=preview-variant'};
  }
  if(input.page.pageType==='cart'){
    digitalCommerce.cartFulfillment={state:'ready',mode:'mixed',copy:'A kosár digitális és fizikai tételt is tartalmaz.',lines:mixedLines,documentCenterHref:'/fiokom/letoltesek'};
    if(input.acceptanceMode)next.cart={lines:acceptanceCartLines,subtotal:3810,total:3810,shipping:0,currency:'HUF'};
  }
  if(input.page.pageType==='checkout'){
    if(input.acceptanceMode)next.cart={lines:acceptanceCartLines,subtotal:3810,total:3810,shipping:0,currency:'HUF'};
    digitalCommerce.checkoutFulfillment={state:'ready',mode:'mixed',copy:'A fizikai tétel kézbesítést kap, a digitális tartalom az igazolt fizetés után válik letölthetővé.',lines:mixedLines,documentCenterHref:'/fiokom/letoltesek'};
    digitalCommerce.postPurchase={state:'ready',mode:'mixed',paymentStatus:'pending',copy:'A digitális hozzáférés a fizetés hitelesítése után aktiválódik.',documentCenterHref:'/fiokom/letoltesek'};
  }
  if(input.page.pageType==='account'){
    digitalCommerce.accountCapabilities={state:'ready',items:[
      {key:'overview',label:'Áttekintés',href:'/fiokom'},{key:'orders',label:'Rendeléseim',href:'/fiokom#rendelesek'},
      {key:'downloads',label:'Letöltéseim',href:'/fiokom/letoltesek'},{key:'documents',label:'Dokumentumaim',href:'/fiokom/dokumentumok'},
      {key:'wishlist',label:'Kívánságlista',href:'/fiokom/kivansaglista'},{key:'cases',label:'Ügyeim',href:'/fiokom/ugyek'},
      {key:'b2bQuotes',label:'Ajánlatkéréseim',href:'/fiokom/ajanlatkeresek'},{key:'loyalty',label:'Hűségprogram',href:'/fiokom/huseg'}
    ]};
    digitalCommerce.accountDownloads={state:'ready',digital:documentsCenter.digital};
    digitalCommerce.accountDocuments={state:'ready',orderDocuments:documentsCenter.orderDocuments,productDocuments:documentsCenter.productDocuments};
    digitalCommerce.documentsCenter=documentsCenter;
    digitalCommerce.postPurchase={state:'ready',mode:'mixed',paymentStatus:'paid',hasDocuments:true,documentCenterHref:'/fiokom/letoltesek'};
  }
  next.commerce={...commerce,digitalCommerce};
  return next;
}
