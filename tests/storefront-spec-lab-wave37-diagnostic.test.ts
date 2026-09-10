import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {createStorefrontConfiguratorComponentRegistry} from '@/lib/builder/storefront-configurator';
import {evaluateStorefrontTemplateCapabilityGate} from '@/lib/builder/storefront-template-installation';
import {SPEC_LAB_TEMPLATE_PACKAGE} from '@/lib/builder/templates/spec-lab';

describe('Wave 37 Spec Lab capability gate diagnostic',()=>{
  it('prints exact shared-registry violations until the package is valid',()=>{
    const capability={plan:'alap' as const,features:PLANS.alap.features};
    const gate=evaluateStorefrontTemplateCapabilityGate({
      template:SPEC_LAB_TEMPLATE_PACKAGE,
      componentRegistry:createStorefrontConfiguratorComponentRegistry(),
      capability,
    });
    expect(gate.violations).toEqual([]);
  });
});
