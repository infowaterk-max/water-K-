import 'server-only';
import {createAdminClient} from '@/lib/supabase/admin';
import {resolveAccountCapabilities} from '@/lib/account/account-capabilities';
import {
  classifyCheckoutFulfillment,
  listAccountDigitalDownloadSurface,
  type FulfillmentMode,
} from '@/lib/commerce/digital-commerce';
import {listAccountOrderDocuments} from '@/lib/commerce/order-documents';
import {
  listAccountProductDocuments,
  listStorefrontProductDocuments,
  type ProductDocumentKind,
} from '@/lib/commerce/product-documents';

export const STOREFRONT_DIGITAL_COMMERCE_SERVER_VERSION='shoporation.storefront-digital-commerce-server.v2' as const;

export type StorefrontDigitalCommerceRuntimeRequest=
  |{pageType:'product';variantId:string;customerId:string|null}
  |{pageType:'cart'|'checkout';items:readonly {variantId:string;quantity:number}[]}
  |{pageType:'account';customerId:string};

type VariantRow={id:string;label:string|null;fulfillment_type:string|null;products:{name:string;fulfillment_type:string|null}|null};
const kindLabel:Record<ProductDocumentKind,string>={manual:'Használati útmutató',datasheet:'Adatlap',size_guide:'Mérettáblázat',warranty_info:'Garanciális információ',compatibility:'Kompatibilitási lap',installation_guide:'Telepítési útmutató',other:'Dokumentum'};
const fileSize=(bytes:number)=>bytes<1024?`${bytes} B`:bytes<1024*1024?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/(1024*1024)).toFixed(1)} MB`;
const normalizeFulfillment=(value:unknown):'physical'|'digital'=>value==='digital'?'digital':'physical';

async function resolveLines(instanceId:string,items:readonly {variantId:string;quantity:number}[]){
  if(!items.length)throw new Error('STOREFRONT_DIGITAL_COMMERCE_ITEMS_REQUIRED');
  const ids=[...new Set(items.map(item=>item.variantId))];
  const admin=createAdminClient();
  const{data,error}=await admin.from('product_variants')
    .select('id,label,fulfillment_type,products!inner(name,fulfillment_type)')
    .eq('instance_id',instanceId).in('id',ids);
  if(error)throw error;
  const rows=(data??[])as unknown as VariantRow[];
  const byId=new Map(rows.map(row=>[row.id,row]));
  if(ids.some(id=>!byId.has(id)))throw new Error('STOREFRONT_DIGITAL_COMMERCE_VARIANT_CONTEXT_INVALID');
  return items.map(item=>{
    const row=byId.get(item.variantId)!;
    const fulfillmentType=normalizeFulfillment(row.fulfillment_type??row.products?.fulfillment_type);
    return{id:item.variantId,name:[row.products?.name,row.label].filter(Boolean).join(' ')||'Termék',quantity:item.quantity,fulfillmentType};
  });
}

function fulfillmentCopy(mode:FulfillmentMode){
  if(mode==='digital')return'Nincs fizikai szállítás. A digitális hozzáférés az igazolt fizetés után aktiválódik.';
  if(mode==='mixed')return'A fizikai tételek kézbesítést igényelnek; a digitális tartalmak az igazolt fizetés után külön hozzáférést kapnak.';
  return'A rendelés fizikai kézbesítést igényel.';
}

export async function getStorefrontDigitalCommerceRuntimeModel(instanceId:string,request:StorefrontDigitalCommerceRuntimeRequest):Promise<Record<string,unknown>>{
  if(request.pageType==='product'){
    const admin=createAdminClient();
    const[fulfillment,documents,relationResult]=await Promise.all([
      classifyCheckoutFulfillment(instanceId,[{variant_id:request.variantId,quantity:1}]),
      listStorefrontProductDocuments(instanceId,request.variantId,request.customerId),
      request.customerId?admin.from('customer_instance_roles').select('role,reseller_approved,b2b_account_id').eq('instance_id',instanceId).eq('user_id',request.customerId).maybeSingle():Promise.resolve({data:null,error:null}),
    ]);
    const productDocuments=documents.filter(document=>document.visibility==='public').map(document=>({
      id:document.documentId,kindLabel:kindLabel[document.kind],title:document.title,description:document.description,
      fileName:document.fileName,sizeLabel:fileSize(document.sizeBytes),variantSpecific:document.variantSpecific,
      downloadHref:`/api/product-documents/${document.documentId}?variantId=${encodeURIComponent(request.variantId)}`,
    }));
    const relation=relationResult.data as{role?:string;reseller_approved?:boolean;b2b_account_id?:string|null}|null;
    const quoteEligible=relation?.role==='reseller'&&relation?.reseller_approved===true&&Boolean(relation?.b2b_account_id);
    return{
      productFulfillment:{state:'ready',mode:fulfillment.mode,copy:fulfillmentCopy(fulfillment.mode),documentCenterHref:'/fiokom/letoltesek'},
      productDocuments:{state:'ready',documents:productDocuments},
      productDownloads:{state:'ready',mode:fulfillment.mode,documents:productDocuments,accountDownloadsHref:'/fiokom/letoltesek'},
      b2bQuote:{state:'ready',eligible:quoteEligible,href:quoteEligible?`/fiokom/ajanlatkeresek?variantId=${encodeURIComponent(request.variantId)}`:null},
    };
  }

  if(request.pageType==='cart'||request.pageType==='checkout'){
    const rpcItems=request.items.map(item=>({variant_id:item.variantId,quantity:item.quantity}));
    const[fulfillment,lines]=await Promise.all([classifyCheckoutFulfillment(instanceId,rpcItems),resolveLines(instanceId,request.items)]);
    const model={state:'ready',mode:fulfillment.mode,requiresShipping:fulfillment.requiresShipping,copy:fulfillmentCopy(fulfillment.mode),lines,documentCenterHref:'/fiokom/letoltesek'};
    return request.pageType==='cart'
      ?{cartFulfillment:model}
      :{checkoutFulfillment:model,postPurchase:{state:'ready',mode:fulfillment.mode,paymentStatus:'pending',copy:'A digitális hozzáférést kizárólag az igazolt fizetési állapot aktiválja.',documentCenterHref:'/fiokom/letoltesek'}};
  }

  if(request.pageType!=='account')throw new Error('STOREFRONT_DIGITAL_COMMERCE_PAGE_CONTEXT_INVALID');
  const customerId=request.customerId;
  const admin=createAdminClient();
  const[digital,orders,productDocuments,loyaltyResult,relationResult]=await Promise.all([
    listAccountDigitalDownloadSurface(instanceId,customerId),
    listAccountOrderDocuments(instanceId,customerId),
    listAccountProductDocuments(instanceId,customerId),
    admin.from('loyalty_program_settings').select('enabled').eq('instance_id',instanceId).maybeSingle(),
    admin.from('customer_instance_roles').select('role,reseller_approved,b2b_account_id').eq('instance_id',instanceId).eq('user_id',customerId).maybeSingle(),
  ]);
  const digitalEntries=digital.map(item=>({
    id:item.entitlementId,title:item.fileName,description:`Rendelés: ${item.orderNumber}`,
    meta:`Letöltések: ${item.remainingDownloads} / ${item.maxDownloads}`,status:item.status,
    ...(item.status==='available'?{href:`/api/digital-downloads/${item.assetId}?orderId=${encodeURIComponent(item.orderId)}`}:{}),
  }));
  const orderEntries=[
    ...orders.documents.map(item=>({id:item.documentId,title:item.title,description:`Rendelés: ${item.orderNumber}`,meta:item.fileName,status:'available',href:`/api/order-documents/${item.documentId}`})),
    ...orders.invoices.map(item=>({id:`invoice:${item.orderId}:${item.invoiceNumber}`,title:`Számla · ${item.invoiceNumber}`,description:`Rendelés: ${item.orderNumber}`,status:'available',href:'/fiokom/dokumentumok'})),
  ];
  const productEntries=productDocuments.map(item=>({
    id:item.documentId,title:item.title,description:item.productName,meta:[item.variantLabel,item.fileName].filter(Boolean).join(' · '),status:'available',href:item.downloadHref,
  }));
  const hasDocuments=Boolean(digitalEntries.length||orderEntries.length||productEntries.length);
  const relation=relationResult.data as{role?:string;reseller_approved?:boolean;b2b_account_id?:string|null}|null;
  const accountItems=resolveAccountCapabilities({showLoyalty:Boolean(loyaltyResult.data?.enabled),showB2BOrganization:Boolean(relation?.b2b_account_id),showB2BQuotes:relation?.role==='reseller'&&relation?.reseller_approved===true});
  return{
    accountCapabilities:{state:'ready',items:accountItems},
    accountDownloads:{state:'ready',digital:digitalEntries},
    accountDocuments:{state:'ready',orderDocuments:orderEntries,productDocuments:productEntries},
    documentsCenter:{state:'ready',digital:digitalEntries,orderDocuments:orderEntries,productDocuments:productEntries},
    postPurchase:{state:'ready',mode:'physical',paymentStatus:'paid',hasDocuments,documentCenterHref:'/fiokom/dokumentumok'},
  };
}
