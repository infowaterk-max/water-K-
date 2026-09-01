export type SalesChannelCode='b2c'|'b2b';

export type SalesChannelSettings={
  enabled:boolean;
  minimumOrderValue?:number;
  requirePartnerApproval?:boolean;
  defaultMinimumQuantity?:number;
};

export type ProductChannelSettings={
  channel:SalesChannelCode;
  visible:boolean;
  grossPrice?:number|null;
  minimumQuantity:number;
  discountPercent?:number|null;
};
