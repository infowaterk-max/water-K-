import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {
  STOREFRONT_CORE_COMMERCE_COMPONENT_DEFINITIONS,
  createStorefrontCoreCommerceComponentRegistry,
} from '@/lib/builder/storefront-commerce';
import {
  STOREFRONT_EDITORIAL_COMPONENT_DEFINITIONS,
  createStorefrontEditorialComponentRegistry,
} from '@/lib/builder/storefront-editorial';
import {MONARCHE_TEMPLATE_PACKAGE} from '@/lib/builder/templates/monarche';
import {evaluateStorefrontTemplateCapabilityGate} from '@/lib/builder/storefront-template-installation';

describe('Storefront Wave 1 core commerce/editorial component contracts',()=>{
  it('registers reusable commerce components on top of the Wave 0 primitives',()=>{
    const registry=createStorefrontCoreCommerceComponentRegistry();
    for(const definition of STOREFRONT_CORE_COMMERCE_COMPONENT_DEFINITIONS){
      expect(registry.get(definition.manifest.componentKey,1)).toBeDefined();
    }
    expect(registry.get('commerce.product-grid',1)?.manifest.capability.features).toContain('catalog');
    expect(registry.get('commerce.variant-swatches',1)?.manifest.capability.features).toEqual(['catalog','inventory']);
    expect(registry.get('commerce.checkout-summary',1)?.manifest.capability.features).toEqual(['catalog','orders','commerceIntegrations']);
  });

  it('registers Monarche editorial signatures without template-name branches in the runtime registry',()=>{
    const registry=createStorefrontEditorialComponentRegistry();
    for(const definition of STOREFRONT_EDITORIAL_COMPONENT_DEFINITIONS){
      expect(registry.get(definition.manifest.componentKey,1)).toBeDefined();
    }
    expect(registry.get('editorial.hero',1)?.manifest.pageTypes).toContain('home');
    expect(registry.get('marketing.newsletter-signup',1)?.manifest.capability.features).toContain('marketingBasics');
  });

  it('fails the Monarche Template Capability Gate closed when commerce/content capabilities are missing',()=>{
    const gate=evaluateStorefrontTemplateCapabilityGate({
      template:MONARCHE_TEMPLATE_PACKAGE,
      componentRegistry:createStorefrontEditorialComponentRegistry(),
      capability:{plan:'alap',features:[]},
    });
    expect(gate.ok).toBe(false);
    expect(gate.violations.some(item=>item.code==='TEMPLATE_FEATURE_REQUIRED'&&item.metadata?.feature==='catalog')).toBe(true);
    expect(gate.violations.some(item=>item.code==='COMPONENT_CAPABILITY_REQUIRED')).toBe(true);
  });

  it('passes with the actual Alap entitlement set because Golden #1 Core Commerce is Alap-compatible',()=>{
    const gate=evaluateStorefrontTemplateCapabilityGate({
      template:MONARCHE_TEMPLATE_PACKAGE,
      componentRegistry:createStorefrontEditorialComponentRegistry(),
      capability:{plan:'alap',features:PLANS.alap.features},
    });
    expect(gate.ok).toBe(true);
  });
});
