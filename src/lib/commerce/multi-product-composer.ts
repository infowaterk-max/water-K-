export const MULTI_PRODUCT_COMPOSER_ENGINE_VERSION='shoporation.multi-product-composer.v1' as const;

export type ComposerMode='pool'|'slots';
export type ComposerPriceEvidence={amountMinor:number;currency:string;display:string;source:'shared-pricing-authority'};
export type ComposerStockEvidence={available:boolean;statusLabel:string};
export type ComposerSlot={id:string;label:string;minItems:number;maxItems:number;eligibleProductIds?:readonly string[]};
export type MultiProductComposerConfig={
  version:1;
  tenantId:string;
  composerKey:string;
  label:string;
  mode:ComposerMode;
  minItems:number;
  maxItems:number;
  duplicateLimit:number;
  slots?:readonly ComposerSlot[];
};
export type ComposerCatalogItem={
  productId:string;
  variantId:string;
  label:string;
  href:string;
  eligible:boolean;
  channelVisible:boolean;
  slotIds?:readonly string[];
  price:ComposerPriceEvidence;
  stock:ComposerStockEvidence;
};
export type ComposerSelection={productId:string;variantId:string;quantity:number;slotId?:string};
export type ComposerViolation={code:string;path:string;message:string};
export type ComposerSelectionReadModel={selection:ComposerSelection;item:ComposerCatalogItem;lineSubtotalMinor:number};
export type ComposerReadModel={
  status:'incomplete'|'ready'|'invalid';
  totalItems:number;
  selections:ComposerSelectionReadModel[];
  currentSubtotalMinor:number|null;
  currency:string|null;
  pricingAuthoritative:false;
  requiresCartRevalidation:true;
  violations:ComposerViolation[];
};
export type ComposerCartLineIntent={productId:string;variantId:string;quantity:number;slotId?:string;compositionId:string};
export type ComposerCartIntent={
  engineVersion:typeof MULTI_PRODUCT_COMPOSER_ENGINE_VERSION;
  operation:'add'|'replace';
  atomic:true;
  compositionId:string;
  composerKey:string;
  composerVersion:1;
  lines:ComposerCartLineIntent[];
  requiredRevalidation:readonly ['composer-eligibility','channel','price','stock'];
  pricingAuthority:'shared-pricing-authority';
  silentReplacementAllowed:false;
};
export type ComposerRemoveIntent={engineVersion:typeof MULTI_PRODUCT_COMPOSER_ENGINE_VERSION;operation:'remove';atomic:true;compositionId:string};
export type ComposerAuthoritativeOrderLine={lineId:string;compositionId?:string|null;productId:string;variantId:string;label:string;quantity:number;unitPriceMinor:number;currency:string};
export type ComposerOrderSnapshot={compositionId:string;composerKey:string;composerVersion:1;lines:readonly ComposerAuthoritativeOrderLine[];refundableLineIds:readonly string[]};

const KEY=/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const SAFE_ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const safeHref=(value:string)=>value.startsWith('/')||value.startsWith('#')||value.startsWith('https://');
const issue=(out:ComposerViolation[],code:string,path:string,message:string)=>out.push({code,path,message});
const positiveInt=(value:number)=>Number.isInteger(value)&&value>0;

export function validateMultiProductComposerConfig(config:MultiProductComposerConfig):ComposerViolation[]{
  const out:ComposerViolation[]=[];
  if(config.version!==1)issue(out,'COMPOSER_VERSION_UNSUPPORTED','version','Only Multi-Product Composer config v1 is supported.');
  if(!KEY.test(config.tenantId)||!KEY.test(config.composerKey))issue(out,'COMPOSER_IDENTITY_INVALID','identity','Tenant and composer keys must be lowercase and key-safe.');
  if(!config.label.trim())issue(out,'COMPOSER_LABEL_REQUIRED','label','Composer label is required.');
  if(!positiveInt(config.minItems)||!positiveInt(config.maxItems)||config.minItems>config.maxItems||config.maxItems>100)issue(out,'COMPOSER_ITEM_RANGE_INVALID','items','Composer min/max items are invalid.');
  if(!positiveInt(config.duplicateLimit)||config.duplicateLimit>config.maxItems)issue(out,'COMPOSER_DUPLICATE_LIMIT_INVALID','duplicateLimit','Duplicate limit must be a positive integer no greater than maxItems.');
  const slots=config.slots??[];
  if(config.mode==='pool'&&slots.length)issue(out,'COMPOSER_POOL_SLOTS_FORBIDDEN','slots','Pool mode must not define slots.');
  if(config.mode==='slots'&&!slots.length)issue(out,'COMPOSER_SLOTS_REQUIRED','slots','Slots mode requires at least one slot.');
  const seen=new Set<string>();let minTotal=0;
  slots.forEach((slot,index)=>{
    const path=`slots.${index}`;
    if(!KEY.test(slot.id)||seen.has(slot.id))issue(out,'COMPOSER_SLOT_ID_INVALID',`${path}.id`,'Slot id must be unique and lowercase key-safe.');seen.add(slot.id);
    if(!slot.label.trim())issue(out,'COMPOSER_SLOT_LABEL_REQUIRED',`${path}.label`,'Slot label is required.');
    if(!Number.isInteger(slot.minItems)||slot.minItems<0||!positiveInt(slot.maxItems)||slot.minItems>slot.maxItems)issue(out,'COMPOSER_SLOT_RANGE_INVALID',path,'Slot min/max items are invalid.');
    minTotal+=slot.minItems;
    if(slot.eligibleProductIds&&new Set(slot.eligibleProductIds).size!==slot.eligibleProductIds.length)issue(out,'COMPOSER_SLOT_ELIGIBILITY_DUPLICATE',`${path}.eligibleProductIds`,'Eligible product ids must be unique.');
  });
  if(config.mode==='slots'&&minTotal>config.maxItems)issue(out,'COMPOSER_SLOT_MIN_EXCEEDS_GLOBAL_MAX','slots','Required slot minimums exceed global maxItems.');
  return out;
}

function findItem(catalog:readonly ComposerCatalogItem[],selection:ComposerSelection){return catalog.find(item=>item.productId===selection.productId&&item.variantId===selection.variantId);}

export function validateComposerSelections(input:{config:MultiProductComposerConfig;selections:readonly ComposerSelection[];catalog:readonly ComposerCatalogItem[]}):ComposerViolation[]{
  const out=validateMultiProductComposerConfig(input.config);
  if(out.length)return out;
  const total=input.selections.reduce((sum,item)=>sum+(Number.isInteger(item.quantity)?item.quantity:0),0);
  if(total<input.config.minItems)issue(out,'COMPOSER_MIN_ITEMS_NOT_MET','selections','Composition does not meet the minimum item count.');
  if(total>input.config.maxItems)issue(out,'COMPOSER_MAX_ITEMS_EXCEEDED','selections','Composition exceeds the maximum item count.');
  const duplicateCounts=new Map<string,number>();const slotCounts=new Map<string,number>();
  input.selections.forEach((selection,index)=>{
    const path=`selections.${index}`;
    if(!SAFE_ID.test(selection.productId)||!SAFE_ID.test(selection.variantId))issue(out,'COMPOSER_SELECTION_ID_INVALID',path,'Product and variant ids must be stable identifiers.');
    if(!positiveInt(selection.quantity))issue(out,'COMPOSER_QUANTITY_INVALID',`${path}.quantity`,'Quantity must be a positive integer.');
    const identity=`${selection.productId}:${selection.variantId}`;duplicateCounts.set(identity,(duplicateCounts.get(identity)??0)+Math.max(0,selection.quantity));
    const item=findItem(input.catalog,selection);
    if(!item){issue(out,'COMPOSER_ITEM_NOT_FOUND',path,'Selected catalog item is unavailable.');return;}
    if(!safeHref(item.href))issue(out,'COMPOSER_ITEM_HREF_UNSAFE',path,'Selected item href is unsafe.');
    if(!item.eligible)issue(out,'COMPOSER_ITEM_INELIGIBLE',path,'Selected item is not eligible for this composition.');
    if(!item.channelVisible)issue(out,'COMPOSER_ITEM_CHANNEL_HIDDEN',path,'Selected item is not visible in the active commerce channel.');
    if(!item.stock.available)issue(out,'COMPOSER_ITEM_OUT_OF_STOCK',path,'Selected item is not currently available.');
    if(!Number.isInteger(item.price.amountMinor)||item.price.amountMinor<0||!item.price.currency.trim()||item.price.source!=='shared-pricing-authority')issue(out,'COMPOSER_PRICE_EVIDENCE_INVALID',path,'Current price evidence must come from the shared pricing authority.');
    if(input.config.mode==='pool'){
      if(selection.slotId!==undefined)issue(out,'COMPOSER_POOL_SLOT_FORBIDDEN',`${path}.slotId`,'Pool mode selections must not carry a slot id.');
    }else{
      if(!selection.slotId){issue(out,'COMPOSER_SLOT_REQUIRED',`${path}.slotId`,'Slots mode selections require a slot id.');return;}
      const slot=input.config.slots?.find(candidate=>candidate.id===selection.slotId);
      if(!slot){issue(out,'COMPOSER_SLOT_UNKNOWN',`${path}.slotId`,'Selected slot does not exist.');return;}
      slotCounts.set(slot.id,(slotCounts.get(slot.id)??0)+Math.max(0,selection.quantity));
      if(slot.eligibleProductIds&&!slot.eligibleProductIds.includes(selection.productId))issue(out,'COMPOSER_SLOT_PRODUCT_INELIGIBLE',path,'Selected product is not eligible for this slot.');
      if(item.slotIds&&!item.slotIds.includes(slot.id))issue(out,'COMPOSER_ITEM_SLOT_INELIGIBLE',path,'Catalog evidence does not permit the selected item in this slot.');
    }
  });
  for(const[countKey,count]of duplicateCounts)if(count>input.config.duplicateLimit)issue(out,'COMPOSER_DUPLICATE_LIMIT_EXCEEDED',`selection:${countKey}`,'Duplicate limit is exceeded.');
  if(input.config.mode==='slots')for(const slot of input.config.slots??[]){const count=slotCounts.get(slot.id)??0;if(count<slot.minItems)issue(out,'COMPOSER_SLOT_MIN_NOT_MET',`slot:${slot.id}`,'Required slot minimum is not met.');if(count>slot.maxItems)issue(out,'COMPOSER_SLOT_MAX_EXCEEDED',`slot:${slot.id}`,'Slot maximum is exceeded.');}
  return out;
}

export function buildComposerReadModel(input:{config:MultiProductComposerConfig;selections:readonly ComposerSelection[];catalog:readonly ComposerCatalogItem[]}):ComposerReadModel{
  const violations=validateComposerSelections(input);const selectionRows:ComposerSelectionReadModel[]=[];
  for(const selection of input.selections){const item=findItem(input.catalog,selection);if(item)selectionRows.push({selection:{...selection},item,lineSubtotalMinor:item.price.amountMinor*selection.quantity});}
  const currencies=new Set(selectionRows.map(row=>row.item.price.currency));if(currencies.size>1)issue(violations,'COMPOSER_CURRENCY_MISMATCH','pricing','Composition price evidence must use one currency.');
  const totalItems=input.selections.reduce((sum,item)=>sum+(Number.isInteger(item.quantity)?Math.max(0,item.quantity):0),0);
  const ready=!violations.length;
  return{status:ready?'ready':totalItems<input.config.minItems&&violations.every(v=>v.code==='COMPOSER_MIN_ITEMS_NOT_MET')?'incomplete':'invalid',totalItems,selections:selectionRows,currentSubtotalMinor:currencies.size===1?selectionRows.reduce((sum,row)=>sum+row.lineSubtotalMinor,0):null,currency:currencies.size===1?[...currencies][0]??null:null,pricingAuthoritative:false,requiresCartRevalidation:true,violations};
}

function buildIntent(operation:'add'|'replace',compositionId:string,input:{config:MultiProductComposerConfig;selections:readonly ComposerSelection[];catalog:readonly ComposerCatalogItem[]}):ComposerCartIntent|null{
  if(!KEY.test(compositionId)||validateComposerSelections(input).length)return null;
  return{engineVersion:MULTI_PRODUCT_COMPOSER_ENGINE_VERSION,operation,atomic:true,compositionId,composerKey:input.config.composerKey,composerVersion:input.config.version,lines:input.selections.map(selection=>({...selection,compositionId})),requiredRevalidation:['composer-eligibility','channel','price','stock'],pricingAuthority:'shared-pricing-authority',silentReplacementAllowed:false};
}
export function buildComposerAddIntent(compositionId:string,input:{config:MultiProductComposerConfig;selections:readonly ComposerSelection[];catalog:readonly ComposerCatalogItem[]}){return buildIntent('add',compositionId,input);}
export function buildComposerEditIntent(compositionId:string,input:{config:MultiProductComposerConfig;selections:readonly ComposerSelection[];catalog:readonly ComposerCatalogItem[]}){return buildIntent('replace',compositionId,input);}
export function buildComposerRemoveIntent(compositionId:string):ComposerRemoveIntent|null{return KEY.test(compositionId)?{engineVersion:MULTI_PRODUCT_COMPOSER_ENGINE_VERSION,operation:'remove',atomic:true,compositionId}:null;}

export function createComposerOrderSnapshot(input:{compositionId:string;composerKey:string;composerVersion:1;lines:readonly ComposerAuthoritativeOrderLine[]}):ComposerOrderSnapshot|null{
  if(!KEY.test(input.compositionId)||!KEY.test(input.composerKey))return null;
  const lines=input.lines.filter(line=>line.compositionId===input.compositionId);
  if(!lines.length)return null;
  return{compositionId:input.compositionId,composerKey:input.composerKey,composerVersion:input.composerVersion,lines:lines.map(line=>({...line})),refundableLineIds:lines.map(line=>line.lineId)};
}

export const MULTI_PRODUCT_COMPOSER_TEMPLATE_SWITCH_MUTATION_BOUNDARY=Object.freeze({storefrontPageDrafts:true,composerConfiguration:false,products:false,variants:false,pricing:false,inventory:false,carts:false,customers:false,orders:false} as const);
