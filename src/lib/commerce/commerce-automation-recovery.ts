import {buildRetentionReorderSurface,type ReorderAuthoritySnapshot,type ReorderReadModel} from '@/lib/commerce/retention-reorder';

export const COMMERCE_AUTOMATION_RECOVERY_VERSION='shoporation.commerce-automation-recovery.v1' as const;

export type CommerceJourneyKind='post_purchase'|'replenishment'|'winback'|'abandoned_checkout';
export type CommerceJourneyStatus='active'|'completed'|'cancelled'|'failed'|'blocked'|string;
export type CommerceJourneyEvidence={
  id:string;
  kind:CommerceJourneyKind;
  status:CommerceJourneyStatus;
  createdAt:string;
  sourceKey?:string|null;
};
export type SavedCheckoutEvidence={
  id:string;
  recoveryToken:string;
  status:string;
  expiresAt:string;
  lastSeenAt:string;
};
export type RecentPurchaseEvidence={
  orderId:string;
  orderCreatedAt:string;
  variantId:string;
  productName:string;
  variantLabel?:string|null;
  quantity:number;
  productHref?:string|null;
};
export type RecoveryProcessKind='replenishment'|'post-purchase'|'win-back'|'saved-checkout';
export type RecoveryProcess={
  id:string;
  kind:RecoveryProcessKind;
  title:string;
  detail:string;
  href:string|null;
  actionLabel:string|null;
  marketingGated:boolean;
};
export type RecentlyPurchasedItem={
  orderId:string;
  variantId:string;
  label:string;
  quantity:number;
  purchasedAt:string;
  href:string|null;
};
export type CommerceRecoveryAccountModel={
  engineVersion:typeof COMMERCE_AUTOMATION_RECOVERY_VERSION;
  activeProcesses:RecoveryProcess[];
  reorder:ReorderReadModel[];
  recentlyPurchased:RecentlyPurchasedItem[];
  savedCheckoutHref:string|null;
  requiresCurrentCommerceRevalidation:true;
  automaticRecurringOrder:false;
  automaticRecurringCharge:false;
};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safeHref=(value:string|null|undefined)=>value&&(value.startsWith('/')||value.startsWith('https://'))?value:null;
const newestFirst=(a:{createdAt?:string;orderCreatedAt?:string},b:{createdAt?:string;orderCreatedAt?:string})=>new Date(b.createdAt??b.orderCreatedAt??0).getTime()-new Date(a.createdAt??a.orderCreatedAt??0).getTime();

export function checkoutRecoveryHref(token:string){return UUID.test(token)?`/kosar/visszaallitas?token=${encodeURIComponent(token)}`:null;}

function journeyProcess(journey:CommerceJourneyEvidence):RecoveryProcess|null{
  if(journey.status!=='active')return null;
  if(journey.kind==='replenishment')return{id:`journey:${journey.id}`,kind:'replenishment',title:'Ideje lehet újrarendelni',detail:'A korábbi vásárlásaid alapján van aktuális utánpótlási jelzés.',href:'#ujrarendeles',actionLabel:'Újrarendelési lehetőségek',marketingGated:true};
  if(journey.kind==='post_purchase')return{id:`journey:${journey.id}`,kind:'post-purchase',title:'Vásárlás utáni teendők',detail:'A legutóbbi rendelésedhez kapcsolódó következő lépések elérhetők.',href:'#korabbi-vasarlasok',actionLabel:'Megnézem',marketingGated:false};
  if(journey.kind==='winback')return{id:`journey:${journey.id}`,kind:'win-back',title:'Visszatérési ajánlás',detail:'A webshop aktuális kínálatából mutatunk ismét releváns lehetőségeket.',href:'/webaruhaz',actionLabel:'Aktuális kínálat',marketingGated:true};
  return null;
}

export function buildCommerceRecoveryAccountModel(input:{
  journeys:readonly CommerceJourneyEvidence[];
  savedCheckouts:readonly SavedCheckoutEvidence[];
  recentPurchases:readonly RecentPurchaseEvidence[];
  reorderSnapshots?:readonly ReorderAuthoritySnapshot[];
  now?:Date;
  recentLimit?:number;
}):CommerceRecoveryAccountModel{
  const now=(input.now??new Date()).getTime();
  const checkout=[...input.savedCheckouts]
    .filter(row=>row.status==='open'&&UUID.test(row.recoveryToken)&&new Date(row.expiresAt).getTime()>now)
    .sort((a,b)=>new Date(b.lastSeenAt).getTime()-new Date(a.lastSeenAt).getTime())[0]??null;
  const savedCheckoutHref=checkout?checkoutRecoveryHref(checkout.recoveryToken):null;
  const activeProcesses=input.journeys.flatMap(row=>{const process=journeyProcess(row);return process?[process]:[];}).sort((a,b)=>a.kind.localeCompare(b.kind,'hu'));
  if(checkout&&savedCheckoutHref)activeProcesses.unshift({id:`checkout:${checkout.id}`,kind:'saved-checkout',title:'Félbehagyott kosár',detail:'A mentett kosarad még helyreállítható. A folytatáskor az aktuális termék-, ár- és készletadatok érvényesek.',href:savedCheckoutHref,actionLabel:'Kosár folytatása',marketingGated:false});

  const seen=new Set<string>();
  const limit=Math.max(1,Math.min(24,Math.floor(input.recentLimit??8)));
  const recentlyPurchased=[...input.recentPurchases].sort(newestFirst).flatMap(row=>{
    if(seen.has(row.variantId)||!Number.isInteger(row.quantity)||row.quantity<1)return[];
    seen.add(row.variantId);
    return[{orderId:row.orderId,variantId:row.variantId,label:row.variantLabel?`${row.productName} – ${row.variantLabel}`:row.productName,quantity:row.quantity,purchasedAt:row.orderCreatedAt,href:safeHref(row.productHref)}];
  }).slice(0,limit);

  return{
    engineVersion:COMMERCE_AUTOMATION_RECOVERY_VERSION,
    activeProcesses,
    reorder:buildRetentionReorderSurface(input.reorderSnapshots??[]),
    recentlyPurchased,
    savedCheckoutHref,
    requiresCurrentCommerceRevalidation:true,
    automaticRecurringOrder:false,
    automaticRecurringCharge:false,
  };
}

export const COMMERCE_AUTOMATION_RECOVERY_POLICY=Object.freeze({
  usesExistingRetentionAuthority:true,
  usesExistingJourneyPlanner:true,
  usesExistingCheckoutRecovery:true,
  usesExistingCommunicationQueue:true,
  usesExistingStockNotificationFlow:true,
  marketingConsentCheckedAtEnqueueAndSend:true,
  suppressionCheckedAtSend:true,
  idempotentJourneyEnrollment:true,
  duplicateJourneyDispatchSuppressed:true,
  staleJourneyCancellationAuthority:'server-retention-authority',
  transactionalPriority:true,
  currentCommerceRevalidationRequired:true,
  silentReplacementAllowed:false,
  subscription:false,
  recurringCharge:false,
  pageSchemaImplementation:false,
  visualBuilderImplementation:false,
} as const);

export const COMMERCE_AUTOMATION_RECOVERY_BUILDER_BLOCKS=Object.freeze([
  'retention.reorder-row',
  'retention.recently-purchased',
  'retention.buy-again',
  'retention.profile-replenishment',
  'retention.post-purchase-recommendations',
  'retention.saved-cart-recovery',
] as const);
