import type{OrderLifecycleStatus}from'@/lib/orders/orchestration-contract';

export type CustomerType='retail'|'company'|'reseller';
export type ShippingMethod=string;
export type PaymentMethod=string;
export type CheckoutInput={customerType:CustomerType;email:string;name:string;phone:string;companyName?:string;taxNumber?:string;billingAddress:string;shippingAddress:string;shippingMethod:ShippingMethod;paymentMethod:PaymentMethod;parcelPointId?:string;note?:string};
export type OrderStatus=OrderLifecycleStatus;
