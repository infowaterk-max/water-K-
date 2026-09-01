export type ParcelPoint={id:string;name:string;address:string;lat?:number;lng?:number};
export type CarrierCapability='home'|'parcel-points'|'pickup'|'shipment'|'label'|'tracking'|'returns';
export type CarrierDescriptor={code:string;capabilities:CarrierCapability[]};

export const carrierCapabilities:CarrierDescriptor[]=[
 {code:'foxpost',capabilities:['parcel-points','shipment','tracking']},
 {code:'gls',capabilities:['home','parcel-points','shipment','tracking']},
 {code:'mpl',capabilities:['home','parcel-points','shipment','tracking']},
 {code:'dpd',capabilities:['home','shipment','tracking']},
 {code:'packeta',capabilities:['home','parcel-points','shipment','label','tracking','returns']},
 {code:'expressone',capabilities:['home','parcel-points','shipment','tracking','returns']},
 {code:'pickup',capabilities:['pickup']},
];

export function getCarrierCapabilities(code:string){return carrierCapabilities.find(item=>item.code===code)?.capabilities??[]}
