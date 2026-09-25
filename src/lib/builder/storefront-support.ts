import {STOREFRONT_BUILDER_FOUNDATION_VERSION,defineStorefrontBuilderComponent} from '@/lib/builder/storefront-foundation';
import type {StorefrontRuntimeComponentDefinition} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_SUPPORT_COMPONENTS_VERSION='shoporation.storefront-support-components.v1' as const;

export const STOREFRONT_SUPPORT_COMPONENT_DEFINITIONS:readonly StorefrontRuntimeComponentDefinition[]=[{
  manifest:defineStorefrontBuilderComponent({
    foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
    componentKey:'support.contact-form',
    componentVersion:1,
    schemaSlot:'sections',
    pageTypes:['contact','content'],
    configurable:['eyebrow','title','copy','nameLabel','emailLabel','orderNumberLabel','categoryLabel','subjectLabel','messageLabel','buttonLabel','successLead','tone','style'],
    responsiveMode:'grid',
    capability:{minPlan:'alap',features:['support']},
  }),
  bindingSlots:[],
},{
  manifest:defineStorefrontBuilderComponent({
    foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
    componentKey:'support.location-map',
    componentVersion:1,
    schemaSlot:'sections',
    pageTypes:['contact','content'],
    configurable:['title','address','embedUrl','linkUrl','linkLabel','height','tone','style'],
    responsiveMode:'grid',
    capability:{minPlan:'alap',features:[]},
  }),
  bindingSlots:['title','address','embedUrl','linkUrl'],
}] as const;
