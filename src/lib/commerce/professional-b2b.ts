export const PROFESSIONAL_B2B_ENGINE_VERSION='shoporation.professional-b2b-experience.v1' as const;

export const PROFESSIONAL_B2B_SERVER_AUTHORITIES=[
  'b2b-approval-role',
  'channel-visibility',
  'pricing-tax',
  'stock',
  'moq-order-multiple',
  'rfq-offer-state',
  'offer-acceptance',
  'reorder-revalidation',
] as const;

export type ProfessionalChannel='b2c'|'b2b';
export type ProfessionalAccountStatus='guest'|'customer'|'pending'|'approved'|'suspended';
export type ProfessionalPriceAuthority='retail'|'partner'|'offer';
export type ProfessionalOfferStatus='draft'|'sent'|'accepted'|'expired'|'cancelled';

export type ProfessionalCustomerAuthoritySnapshot={
  authority:'server';
  channel:ProfessionalChannel;
  accountStatus:ProfessionalAccountStatus;
  approvedReseller:boolean;
  canRequestQuote:boolean;
  canViewOffers:boolean;
  canReorder:boolean;
};

export type ProfessionalProductAuthoritySnapshot={
  authority:'server';
  productId:string;
  variantId:string;
  sku:string;
  name:string;
  href:string;
  channelVisible:boolean;
  stockQuantity:number;
  stockLabel:string;
  displayNetPrice:string;
  displayGrossPrice:string;
  priceAuthority:ProfessionalPriceAuthority;
  minimumQuantity:number;
  orderMultiple:number;
  canRequestQuote:boolean;
};

export type ProfessionalProductReadModel=ProfessionalProductAuthoritySnapshot&{
  quantityHint:string;
  requiresServerRevalidation:true;
};

export type ProfessionalExperienceReadModel={
  channel:ProfessionalChannel;
  accountStatus:ProfessionalAccountStatus;
  showPartnerExperience:boolean;
  canRequestQuote:boolean;
  canViewOffers:boolean;
  canReorder:boolean;
};

export type ProfessionalOfferAuthoritySnapshot={
  authority:'server';
  id:string;
  number:string;
  status:ProfessionalOfferStatus;
  totalLabel:string;
  expiresAt?:string|null;
  canAccept:boolean;
  acceptanceHref?:string|null;
};

export type ProfessionalOfferReadModel=ProfessionalOfferAuthoritySnapshot&{
  acceptanceEnabled:boolean;
  safeAcceptanceHref:string|null;
  requiresServerRevalidation:true;
};

export type ProfessionalReorderAuthorityLine={
  authority:'server';
  productId:string;
  variantId:string;
  sku:string;
  name:string;
  previousQuantity:number;
  href:string;
};

export type ProfessionalReorderLine=ProfessionalReorderAuthorityLine&{
  requiresServerRevalidation:true;
};

export type ProfessionalValidationViolation={code:string;path:string;message:string};

const safeHref=(value:string)=>value.startsWith('/')||value.startsWith('#')||value.startsWith('https://');
const finiteInt=(value:number)=>Number.isInteger(value)&&Number.isFinite(value);
const clean=(value:string)=>value.trim();

export function validateProfessionalProductAuthority(snapshot:ProfessionalProductAuthoritySnapshot):ProfessionalValidationViolation[]{
  const violations:ProfessionalValidationViolation[]=[];
  const issue=(code:string,path:string,message:string)=>violations.push({code,path,message});
  if(snapshot.authority!=='server')issue('PROFESSIONAL_AUTHORITY_REQUIRED','authority','Professional storefront data must come from server authority.');
  if(!clean(snapshot.productId)||!clean(snapshot.variantId)||!clean(snapshot.sku)||!clean(snapshot.name))issue('PROFESSIONAL_IDENTITY_INVALID','identity','Product, variant, SKU and name are required.');
  if(!safeHref(snapshot.href))issue('PROFESSIONAL_URL_UNSAFE','href','Product href must be relative, hash or HTTPS.');
  if(!finiteInt(snapshot.stockQuantity)||snapshot.stockQuantity<0)issue('PROFESSIONAL_STOCK_INVALID','stockQuantity','Stock must be a non-negative integer snapshot.');
  if(!finiteInt(snapshot.minimumQuantity)||snapshot.minimumQuantity<1)issue('PROFESSIONAL_MOQ_INVALID','minimumQuantity','Minimum quantity must be a positive integer.');
  if(!finiteInt(snapshot.orderMultiple)||snapshot.orderMultiple<1)issue('PROFESSIONAL_ORDER_MULTIPLE_INVALID','orderMultiple','Order multiple must be a positive integer.');
  if(!clean(snapshot.displayNetPrice)||!clean(snapshot.displayGrossPrice))issue('PROFESSIONAL_PRICE_EVIDENCE_REQUIRED','pricing','Server-formatted net and gross price evidence is required.');
  return violations;
}

export function buildProfessionalProductReadModel(snapshot:ProfessionalProductAuthoritySnapshot):ProfessionalProductReadModel|null{
  if(validateProfessionalProductAuthority(snapshot).length||!snapshot.channelVisible)return null;
  return{...snapshot,quantityHint:`Minimum ${snapshot.minimumQuantity} db · ${snapshot.orderMultiple} db-os lépésekben`,requiresServerRevalidation:true};
}

export function buildProfessionalExperience(snapshot:ProfessionalCustomerAuthoritySnapshot):ProfessionalExperienceReadModel|null{
  if(snapshot.authority!=='server')return null;
  const showPartnerExperience=snapshot.channel==='b2b'&&snapshot.accountStatus==='approved'&&snapshot.approvedReseller;
  return{channel:snapshot.channel,accountStatus:snapshot.accountStatus,showPartnerExperience,canRequestQuote:showPartnerExperience&&snapshot.canRequestQuote,canViewOffers:showPartnerExperience&&snapshot.canViewOffers,canReorder:snapshot.canReorder};
}

export function buildProfessionalQuantityHint(input:{requestedQuantity:number;minimumQuantity:number;orderMultiple:number}){
  const minimum=finiteInt(input.minimumQuantity)&&input.minimumQuantity>0?input.minimumQuantity:1;
  const multiple=finiteInt(input.orderMultiple)&&input.orderMultiple>0?input.orderMultiple:1;
  const requested=finiteInt(input.requestedQuantity)&&input.requestedQuantity>0?input.requestedQuantity:minimum;
  const base=Math.max(minimum,requested);
  const delta=Math.max(0,base-minimum);
  const suggested=minimum+Math.ceil(delta/multiple)*multiple;
  return{requestedQuantity:input.requestedQuantity,suggestedQuantity:suggested,minimumQuantity:minimum,orderMultiple:multiple,clientHintOnly:true,requiresServerRevalidation:true as const};
}

export function buildProfessionalOfferReadModel(snapshot:ProfessionalOfferAuthoritySnapshot):ProfessionalOfferReadModel|null{
  if(snapshot.authority!=='server'||!clean(snapshot.id)||!clean(snapshot.number)||!clean(snapshot.totalLabel))return null;
  const href=snapshot.acceptanceHref&&safeHref(snapshot.acceptanceHref)?snapshot.acceptanceHref:null;
  const acceptanceEnabled=snapshot.status==='sent'&&snapshot.canAccept===true&&href!==null;
  return{...snapshot,acceptanceEnabled,safeAcceptanceHref:acceptanceEnabled?href:null,requiresServerRevalidation:true};
}

export function buildProfessionalReorderLines(lines:readonly ProfessionalReorderAuthorityLine[]):ProfessionalReorderLine[]{
  return lines.flatMap(line=>line.authority==='server'&&clean(line.productId)&&clean(line.variantId)&&clean(line.sku)&&clean(line.name)&&finiteInt(line.previousQuantity)&&line.previousQuantity>0&&safeHref(line.href)?[{...line,requiresServerRevalidation:true as const}]:[]);
}

export function normalizeQuickOrderSku(value:string){return value.trim().toUpperCase().replace(/[^A-Z0-9._/-]/g,'').slice(0,64);}

export const PROFESSIONAL_TEMPLATE_SWITCH_MUTATION_BOUNDARY=Object.freeze({
  storefrontPageDrafts:true,
  products:false,
  variants:false,
  customers:false,
  orders:false,
  b2bAccounts:false,
  pricing:false,
  inventory:false,
  offers:false,
} as const);
