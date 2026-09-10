import {describe,expect,it} from 'vitest';
import {COMMERCE_AUTOMATION_RECOVERY_BUILDER_BLOCKS,COMMERCE_AUTOMATION_RECOVERY_POLICY,COMMERCE_AUTOMATION_RECOVERY_VERSION,buildCommerceRecoveryAccountModel,checkoutRecoveryHref} from '@/lib/commerce/commerce-automation-recovery';
import type {ReorderAuthoritySnapshot} from '@/lib/commerce/retention-reorder';
import {STOREFRONT_CONTEXT_RETENTION_COMPONENT_DEFINITIONS,STOREFRONT_CONTEXT_RETENTION_COMPONENTS_VERSION} from '@/lib/builder/storefront-context-retention';

const reorder:ReorderAuthoritySnapshot={authority:'server-retention-authority',journeyKind:'replenishment',journeyId:'j-1',signal:'due',productId:'product-1',variantId:'variant-1',label:'Daily Pack',href:'/termek/daily-pack',previousQuantity:3,channelVisible:true,eligible:true,price:{amountMinor:699000,currency:'HUF',display:'6 990 Ft',source:'shared-pricing-authority'},stock:{available:true,label:'Raktáron'},minimumQuantity:2,orderMultiple:2};

describe('Roadmap Block 16 – Commerce Automation & Recovery',()=>{
  it('builds customer recovery state only from active, non-expired authority evidence',()=>{
    const model=buildCommerceRecoveryAccountModel({
      now:new Date('2026-09-10T20:00:00Z'),
      journeys:[
        {id:'journey-replenishment',kind:'replenishment',status:'active',createdAt:'2026-09-10T10:00:00Z'},
        {id:'journey-old',kind:'winback',status:'completed',createdAt:'2026-09-01T10:00:00Z'},
      ],
      savedCheckouts:[
        {id:'checkout-live',recoveryToken:'550e8400-e29b-41d4-a716-446655440000',status:'open',expiresAt:'2026-09-11T20:00:00Z',lastSeenAt:'2026-09-10T19:00:00Z'},
        {id:'checkout-expired',recoveryToken:'550e8400-e29b-41d4-a716-446655440001',status:'open',expiresAt:'2026-09-09T20:00:00Z',lastSeenAt:'2026-09-09T19:00:00Z'},
      ],
      recentPurchases:[
        {orderId:'o-1',orderCreatedAt:'2026-09-09T10:00:00Z',variantId:'variant-1',productName:'Daily Pack',variantLabel:'750 g',quantity:3,productHref:'/termek/daily-pack'},
        {orderId:'o-2',orderCreatedAt:'2026-09-08T10:00:00Z',variantId:'variant-1',productName:'Daily Pack',variantLabel:'750 g',quantity:1,productHref:'/termek/daily-pack'},
      ],
      reorderSnapshots:[reorder],
    });
    expect(model.engineVersion).toBe(COMMERCE_AUTOMATION_RECOVERY_VERSION);
    expect(model.activeProcesses.map(x=>x.kind)).toEqual(['saved-checkout','replenishment']);
    expect(model.savedCheckoutHref).toBe('/kosar/visszaallitas?token=550e8400-e29b-41d4-a716-446655440000');
    expect(model.recentlyPurchased).toHaveLength(1);
    expect(model.reorder[0]).toMatchObject({productId:'product-1',previousQuantityStillValid:false,suggestedQuantity:4,requiresServerRevalidation:true,silentReplacementAllowed:false});
    expect(model.automaticRecurringOrder).toBe(false);
    expect(model.automaticRecurringCharge).toBe(false);
  });

  it('rejects unsafe recovery tokens and keeps stale/invalid cart state out of the surface',()=>{
    expect(checkoutRecoveryHref('not-a-token')).toBeNull();
    const model=buildCommerceRecoveryAccountModel({journeys:[],savedCheckouts:[{id:'x',recoveryToken:'not-a-token',status:'open',expiresAt:'2099-01-01T00:00:00Z',lastSeenAt:'2026-09-10T00:00:00Z'}],recentPurchases:[],now:new Date('2026-09-10T00:00:00Z')});
    expect(model.savedCheckoutHref).toBeNull();
    expect(model.activeProcesses).toEqual([]);
  });

  it('locks consent, suppression, idempotency and authority boundaries without inventing subscriptions',()=>{
    expect(COMMERCE_AUTOMATION_RECOVERY_POLICY).toMatchObject({usesExistingRetentionAuthority:true,usesExistingJourneyPlanner:true,usesExistingCheckoutRecovery:true,usesExistingCommunicationQueue:true,marketingConsentCheckedAtEnqueueAndSend:true,suppressionCheckedAtSend:true,idempotentJourneyEnrollment:true,duplicateJourneyDispatchSuppressed:true,currentCommerceRevalidationRequired:true,silentReplacementAllowed:false,subscription:false,recurringCharge:false,pageSchemaImplementation:false,visualBuilderImplementation:false});
  });

  it('registers the accepted Builder-ready recovery family while preserving the existing E9 reorder block',()=>{
    expect(STOREFRONT_CONTEXT_RETENTION_COMPONENTS_VERSION).toBe('shoporation.storefront-context-retention.v2');
    const keys=STOREFRONT_CONTEXT_RETENTION_COMPONENT_DEFINITIONS.map(x=>x.manifest.componentKey);
    expect(keys).toEqual(expect.arrayContaining([...COMMERCE_AUTOMATION_RECOVERY_BUILDER_BLOCKS]));
    for(const key of COMMERCE_AUTOMATION_RECOVERY_BUILDER_BLOCKS){
      const definition=STOREFRONT_CONTEXT_RETENTION_COMPONENT_DEFINITIONS.find(x=>x.manifest.componentKey===key);
      expect(definition, key).toBeTruthy();
      expect(definition?.manifest.capability.minPlan).toBe('alap');
    }
  });
});
