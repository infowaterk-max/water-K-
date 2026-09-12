import {describe,expect,it} from 'vitest';
import {STOREFRONT_PURCHASE_CONTROLS_COMPONENT_DEFINITION} from '@/lib/builder/storefront-purchase-controls';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {isAllowedStorefrontBindingPath} from '@/lib/builder/storefront-runtime';
import {
  BEAUTY_LAB_REFERENCE_V28_HOME_PAGE,
  BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE,
} from '@/lib/builder/templates/beauty-lab-reference-v28';

const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const nodeById=(page:StorefrontPageDocument,id:string)=>walk(page.sections).find(node=>node.id===id);

describe('shared storefront purchase controls',()=>{
  it('is an Alap shared product component with authority-safe binding slots',()=>{
    const definition=STOREFRONT_PURCHASE_CONTROLS_COMPONENT_DEFINITION;
    expect(definition.manifest.componentKey).toBe('commerce.purchase-controls');
    expect(definition.manifest.pageTypes).toEqual(['product']);
    expect(definition.manifest.capability).toMatchObject({minPlan:'alap',features:['catalog','inventory']});
    expect(definition.bindingSlots).toEqual(expect.arrayContaining(['productId','variantId','slug','unitPrice','availableQuantity','minimumQuantity','orderMultiple']));
  });

  it('binds Beauty Lab operational commerce inputs only through allowed runtime namespaces and fails closed by fallback',()=>{
    const purchase=nodeById(BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE,'beauty-product-purchase');
    expect(purchase?.componentKey).toBe('commerce.purchase-controls');
    for(const binding of Object.values(purchase?.bindings??{}))expect(isAllowedStorefrontBindingPath(binding.path)).toBe(true);
    expect(purchase?.bindings?.productId).toEqual({path:'product.id',fallback:''});
    expect(purchase?.bindings?.variantId).toEqual({path:'variant.id',fallback:''});
    expect(purchase?.bindings?.availableQuantity).toEqual({path:'inventory.availableQuantity',fallback:0});
    expect(purchase?.config.presentation).toBe('compact-pdp');
  });

  it('uses a compact single-column mobile bestseller teaser without duplicating the product DOM',()=>{
    const featured=nodeById(BEAUTY_LAB_REFERENCE_V28_HOME_PAGE,'newFormulas');
    const slots=featured?.config.styleSlots as Record<string,{mobile?:Record<string,unknown>}>;
    expect(slots.title.mobile).toMatchObject({display:'none'});
    expect(slots.grid.mobile).toMatchObject({gridTemplateColumns:'1fr'});
    expect(slots.card.mobile).toMatchObject({display:'grid',gridTemplateColumns:'minmax(0,1.15fr) minmax(7.5rem,.85fr)'});
    expect(BEAUTY_LAB_REFERENCE_V28_HOME_PAGE.metadata).toMatchObject({mobileFeaturedPresentation:'single-column-bestseller-teaser'});
  });

  it('does not fabricate before/after evidence while the authoritative merchant evidence source is absent',()=>{
    expect(BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE.metadata).toMatchObject({
      purchaseControls:'shared-functional-quantity-cart-wishlist-v1',
      operationalFallbackPolicy:'identity-and-stock-fail-closed',
      beforeAfterStatus:'wired-fail-closed-awaiting-authoritative-merchant-evidence',
    });
  });
});