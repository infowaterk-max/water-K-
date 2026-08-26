import type { ShippingMethod } from '@/lib/orders/types';
export type ParcelPoint = { id:string; name:string; address:string; lat?:number; lng?:number };
export interface ShippingAdapter { id: ShippingMethod; quote(input:{postalCode:string; weightGrams:number}):Promise<number>; parcelPoints?(query:string):Promise<ParcelPoint[]>; createShipment?(orderId:string):Promise<{trackingNumber:string;labelUrl?:string}>; }
export const carrierCapabilities: Record<ShippingMethod,string[]> = { foxpost:['parcel-points','shipment'], gls:['home','parcel-points','shipment'], mpl:['home','parcel-points','shipment'], pickup:['pickup'] };
