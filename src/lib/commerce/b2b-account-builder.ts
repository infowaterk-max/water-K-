import { defineStorefrontBuilderComponent } from '@/lib/builder/storefront-foundation';

export const B2B_ACCOUNT_BUILDER_MANIFEST=defineStorefrontBuilderComponent({
  foundationVersion:'shoporation.storefront-builder-foundation.v1',
  componentKey:'account.b2b-organization',
  componentVersion:1,
  schemaSlot:'account.b2bOrganization',
  pageTypes:['account'],
  configurable:['title','status','members','orders'],
  responsiveMode:'stack',
  capability:{minPlan:'alap',features:['customers','orders']},
} as const);
