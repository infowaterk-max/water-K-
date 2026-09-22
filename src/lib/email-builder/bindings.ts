import type { EmailRenderContext } from './types';

export type EmailBindingDefinition={key:string;label:string;requiredContext:'store'|'customer'|'order'|'payment'|'shipping'|'billing'|'coupon'};

export const emailBindingRegistry:EmailBindingDefinition[]=[
  {key:'store.name',label:'Webshop neve',requiredContext:'store'},
  {key:'store.siteUrl',label:'Webshop URL',requiredContext:'store'},
  {key:'store.logoUrl',label:'Webshop logó',requiredContext:'store'},
  {key:'store.supportEmail',label:'Kapcsolati e-mail',requiredContext:'store'},
  {key:'customer.firstName',label:'Vásárló keresztneve',requiredContext:'customer'},
  {key:'customer.lastName',label:'Vásárló vezetékneve',requiredContext:'customer'},
  {key:'customer.fullName',label:'Vásárló teljes neve',requiredContext:'customer'},
  {key:'customer.email',label:'Vásárló e-mail címe',requiredContext:'customer'},
  {key:'customer.type',label:'Vásárló típusa',requiredContext:'customer'},
  {key:'order.number',label:'Rendelésszám',requiredContext:'order'},
  {key:'order.subtotal',label:'Részösszeg',requiredContext:'order'},
  {key:'order.shipping',label:'Szállítás',requiredContext:'order'},
  {key:'order.discount',label:'Kedvezmény',requiredContext:'order'},
  {key:'order.tax',label:'Adó',requiredContext:'order'},
  {key:'order.total',label:'Végösszeg',requiredContext:'order'},
  {key:'order.invoiceUrl',label:'Számla URL',requiredContext:'order'},
  {key:'payment.method',label:'Fizetési mód',requiredContext:'payment'},
  {key:'payment.accountHolder',label:'Kedvezményezett',requiredContext:'payment'},
  {key:'payment.bankName',label:'Bank neve',requiredContext:'payment'},
  {key:'payment.bankAccount',label:'Bankszámlaszám / IBAN',requiredContext:'payment'},
  {key:'payment.note',label:'Átutalási megjegyzés',requiredContext:'payment'},
  {key:'shipping.method',label:'Szállítási mód',requiredContext:'shipping'},
  {key:'shipping.carrier',label:'Futárszolgálat',requiredContext:'shipping'},
  {key:'shipping.trackingNumber',label:'Csomagkövetési azonosító',requiredContext:'shipping'},
  {key:'shipping.trackingUrl',label:'Csomagkövetési URL',requiredContext:'shipping'},
  {key:'shipping.address',label:'Szállítási cím',requiredContext:'shipping'},
  {key:'billing.address',label:'Számlázási cím',requiredContext:'billing'},
  {key:'coupon.code',label:'Kuponkód',requiredContext:'coupon'},
  {key:'coupon.discount',label:'Kuponkedvezmény',requiredContext:'coupon'},
  {key:'coupon.expiry',label:'Kupon lejárata',requiredContext:'coupon'},
];

const allowed=new Set(emailBindingRegistry.map(item=>item.key));
export const isAllowedEmailBinding=(key:string)=>allowed.has(key);

export function getEmailBinding(context:EmailRenderContext,key:string):unknown{
  if(!isAllowedEmailBinding(key))return undefined;
  const [root,property]=key.split('.') as [keyof EmailRenderContext,string];
  const source=context[root] as Record<string,unknown>|undefined;
  return source?.[property];
}

const tokenPattern=/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
export function extractEmailBindings(value:string){return Array.from(value.matchAll(tokenPattern),match=>match[1]);}
export function resolveEmailString(value:string,context:EmailRenderContext){
  return value.replace(tokenPattern,(_token,key:string)=>{
    const resolved=getEmailBinding(context,key);
    return resolved===null||resolved===undefined?'':String(resolved);
  });
}
