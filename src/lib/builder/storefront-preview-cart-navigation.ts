import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';

/**
 * Representative Preview-only navigation overlay; never modifies the
 * canonical template package, published storefront routes, or route authority.
 * The shared cart engine and confirmation stay unchanged.
 */
export function attachStorefrontPreviewCartNavigation(
  page:StorefrontPageDocument,
  input:{templateKey:string;templateVersion:number;viewport:StorefrontViewport;factoryCandidate:boolean},
):StorefrontPageDocument{
  const params=new URLSearchParams({
    template:input.templateKey,
    version:String(input.templateVersion),
    page:'cart',
    viewport:input.viewport,
  });
  if(input.factoryCandidate)params.set('factory','1');
  const cartHref=`/storefront-template-preview?${params.toString()}`;
  const visit=(node:StorefrontComponentNode):StorefrontComponentNode=>({
    ...node,
    config:node.componentKey==='commerce.product-grid'||node.componentKey==='commerce.purchase-controls'
      ?{...node.config,cartHref}
      :node.config,
    ...(node.children?{children:node.children.map(visit)}:{}),
  });
  return {...page,sections:page.sections.map(visit)};
}
