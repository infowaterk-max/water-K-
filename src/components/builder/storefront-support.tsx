import {StorefrontRendererRegistry,type StorefrontComponentRenderProps} from '@/components/builder/storefront-runtime-renderer';
import {StorefrontSupportContactFormClient} from '@/components/builder/storefront-support-contact-form-client';

function ContactForm({config,node}:StorefrontComponentRenderProps){
  return <StorefrontSupportContactFormClient config={config} gridSpan={node.resolved.gridSpan}/>;
}

export function createStorefrontSupportRendererRegistry(){return new StorefrontRendererRegistry().register('support.contact-form',1,ContactForm);}
