export type Money={amount:number;currency:'HUF'};
export type Address={country:string;postalCode:string;city:string;line1:string;line2?:string};
export type CheckoutCustomer={email:string;phone?:string;name:string;companyName?:string;taxNumber?:string};
export type InvoiceLine={name:string;sku:string;quantity:number;unitGrossHuf:number;lineGrossHuf:number};
export interface PaymentGateway{createPayment(input:{orderId:string;total:Money;returnUrl:string}):Promise<{redirectUrl:string;providerReference:string}>;verifyCallback(payload:unknown):Promise<{paid:boolean;providerReference:string}>}
export interface ShippingProvider{quote(input:{postalCode:string;weightGrams:number}):Promise<Money>;createShipment(input:{orderId:string;customer:CheckoutCustomer;address:Address;weightGrams:number}):Promise<{trackingNumber:string;labelUrl?:string}>}
export interface InvoiceProvider{createInvoice(input:{orderId:string;customer:CheckoutCustomer;billingAddress:Address;items:InvoiceLine[];shippingGrossHuf:number;totalGrossHuf:number}):Promise<{invoiceNumber:string;documentUrl?:string;providerReference?:string}>}
