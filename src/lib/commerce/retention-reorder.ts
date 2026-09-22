export const RETENTION_REORDER_ENGINE_VERSION='shoporation.retention-reorder-engine.v1' as const;
export type ReplenishmentSignal='due'|'due-soon'|'available'|'not-due';
export type ReorderPriceEvidence={amountMinor:number;currency:string;display:string;source:'shared-pricing-authority'};
export type ReorderAuthoritySnapshot={authority:'server-retention-authority';journeyKind:'replenishment'|'reorder';journeyId?:string|null;signal:ReplenishmentSignal;profileId?:string|null;productId:string;variantId:string;label:string;href:string;previousQuantity:number;channelVisible:boolean;eligible:boolean;price:ReorderPriceEvidence;stock:{available:boolean;label:string};minimumQuantity:number;orderMultiple:number};
export type ReorderViolation={code:string;path:string;message:string};
export type ReorderReadModel={productId:string;variantId:string;label:string;href:string;signal:ReplenishmentSignal;profileId:string|null;previousQuantity:number;currentPriceDisplay:string;stockLabel:string;minimumQuantity:number;orderMultiple:number;previousQuantityStillValid:boolean;suggestedQuantity:number;requiresServerRevalidation:true;silentReplacementAllowed:false};
export type ReorderCartIntent={engineVersion:typeof RETENTION_REORDER_ENGINE_VERSION;operation:'reorder';atomic:true;productId:string;variantId:string;quantity:number;profileId:string|null;requiredRevalidation:readonly ['eligibility','channel','price','stock','moq','order-multiple'];pricingAuthority:'shared-pricing-authority';silentReplacementAllowed:false;subscription:false};
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;const safeHref=(value:string)=>value.startsWith('/')||value.startsWith('#')||value.startsWith('https://');const issue=(out:ReorderViolation[],code:string,path:string,message:string)=>out.push({code,path,message});const positiveInt=(value:number)=>Number.isInteger(value)&&value>0;

export function validateReorderAuthoritySnapshot(snapshot:ReorderAuthoritySnapshot):ReorderViolation[]{
  const out:ReorderViolation[]=[];
  if(snapshot.authority!=='server-retention-authority')issue(out,'REORDER_AUTHORITY_REQUIRED','authority','Reorder surfaces require server retention authority.');
  if(!ID.test(snapshot.productId)||!ID.test(snapshot.variantId)||!snapshot.label.trim())issue(out,'REORDER_IDENTITY_INVALID','identity','Product, variant and label are required.');
  if(!safeHref(snapshot.href))issue(out,'REORDER_HREF_UNSAFE','href','Product href must be relative, hash or HTTPS.');
  if(!positiveInt(snapshot.previousQuantity))issue(out,'REORDER_PREVIOUS_QUANTITY_INVALID','previousQuantity','Previous quantity must be a positive integer.');
  if(!positiveInt(snapshot.minimumQuantity)||!positiveInt(snapshot.orderMultiple))issue(out,'REORDER_QUANTITY_RULE_INVALID','quantityRules','Current MOQ and order multiple must be positive integers.');
  if(!Number.isInteger(snapshot.price.amountMinor)||snapshot.price.amountMinor<0||!snapshot.price.currency.trim()||!snapshot.price.display.trim()||snapshot.price.source!=='shared-pricing-authority')issue(out,'REORDER_PRICE_EVIDENCE_INVALID','price','Current price evidence must come from shared pricing authority.');
  return out;
}

export function isValidReorderQuantity(quantity:number,minimumQuantity:number,orderMultiple:number){return positiveInt(quantity)&&quantity>=minimumQuantity&&(quantity-minimumQuantity)%orderMultiple===0;}
export function suggestReorderQuantity(quantity:number,minimumQuantity:number,orderMultiple:number){const base=Math.max(positiveInt(quantity)?quantity:minimumQuantity,minimumQuantity);return minimumQuantity+Math.ceil(Math.max(0,base-minimumQuantity)/orderMultiple)*orderMultiple;}

export function buildReorderReadModel(snapshot:ReorderAuthoritySnapshot):ReorderReadModel|null{
  if(validateReorderAuthoritySnapshot(snapshot).length||!snapshot.eligible||!snapshot.channelVisible)return null;
  const previousQuantityStillValid=isValidReorderQuantity(snapshot.previousQuantity,snapshot.minimumQuantity,snapshot.orderMultiple);
  return{productId:snapshot.productId,variantId:snapshot.variantId,label:snapshot.label,href:snapshot.href,signal:snapshot.signal,profileId:snapshot.profileId??null,previousQuantity:snapshot.previousQuantity,currentPriceDisplay:snapshot.price.display,stockLabel:snapshot.stock.label,minimumQuantity:snapshot.minimumQuantity,orderMultiple:snapshot.orderMultiple,previousQuantityStillValid,suggestedQuantity:suggestReorderQuantity(snapshot.previousQuantity,snapshot.minimumQuantity,snapshot.orderMultiple),requiresServerRevalidation:true,silentReplacementAllowed:false};
}

export function buildRetentionReorderSurface(snapshots:readonly ReorderAuthoritySnapshot[]):ReorderReadModel[]{
  const order:Record<ReplenishmentSignal,number>={due:0,'due-soon':1,available:2,'not-due':3};
  return snapshots.flatMap(snapshot=>{const model=buildReorderReadModel(snapshot);return model&&snapshot.stock.available?[model]:[];}).sort((a,b)=>order[a.signal]-order[b.signal]||a.label.localeCompare(b.label,'hu')||a.productId.localeCompare(b.productId));
}

export function buildReorderCartIntent(snapshot:ReorderAuthoritySnapshot,requestedQuantity:number):ReorderCartIntent|null{
  if(validateReorderAuthoritySnapshot(snapshot).length||!snapshot.eligible||!snapshot.channelVisible||!snapshot.stock.available)return null;
  if(!isValidReorderQuantity(requestedQuantity,snapshot.minimumQuantity,snapshot.orderMultiple))return null;
  return{engineVersion:RETENTION_REORDER_ENGINE_VERSION,operation:'reorder',atomic:true,productId:snapshot.productId,variantId:snapshot.variantId,quantity:requestedQuantity,profileId:snapshot.profileId??null,requiredRevalidation:['eligibility','channel','price','stock','moq','order-multiple'],pricingAuthority:'shared-pricing-authority',silentReplacementAllowed:false,subscription:false};
}

export const RETENTION_REORDER_RUNTIME_CONTRACT=Object.freeze({usesExistingRetentionAuthority:true,subscriptionEngine:false,historicalPriceIsCurrentAuthority:false,silentReplacementAllowed:false,currentPriceStockMoqOrderMultipleRevalidation:true,previewUsesProductionRules:true,demoOnlyReorderAllowed:false} as const);
export const RETENTION_REORDER_TEMPLATE_SWITCH_MUTATION_BOUNDARY=Object.freeze({storefrontPageDrafts:true,retentionJourneys:false,reorderSignals:false,products:false,variants:false,pricing:false,inventory:false,carts:false,customers:false,orders:false} as const);
