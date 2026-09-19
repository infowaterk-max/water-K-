import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const clone=<T>(value:T):T=>structuredClone(value);

function normalizeNode(
  node:StorefrontComponentNode,
  removeIds:Set<string>,
  span12Ids:Set<string>,
):StorefrontComponentNode|null{
  if(removeIds.has(node.id))return null;
  const children=(node.children??[])
    .map(child=>normalizeNode(child,removeIds,span12Ids))
    .filter((child):child is StorefrontComponentNode=>Boolean(child));
  const next:StorefrontComponentNode={...clone(node),...(node.children?{children}:{})};
  if(span12Ids.has(next.id)){
    next.responsive={
      ...(next.responsive??{}),
      desktop:{...(next.responsive?.desktop??{}),gridSpan:12},
      tablet:{...(next.responsive?.tablet??{}),gridSpan:12},
      mobile:{...(next.responsive?.mobile??{}),gridSpan:12},
    };
  }
  return next;
}

function normalizePlayroomCart(document:StorefrontPageDocument):StorefrontPageDocument{
  const removeIds=new Set([
    'playroom-cart-intro-status',
    'playroom-cart-next-shell',
    'playroom-cart-trust-preset',
    'playroom-cart-digital-commerce',
  ]);
  const span12Ids=new Set([
    'playroom-cart-intro-copy',
    'playroom-cart-summary-shell',
  ]);
  const sections=document.sections
    .map(section=>normalizeNode(section,removeIds,span12Ids))
    .filter((section):section is StorefrontComponentNode=>Boolean(section));
  return{
    ...clone(document),
    sections,
    metadata:{
      ...(document.metadata??{}),
      cartPresentation:'customer-task-focused-v1',
    },
  };
}

/**
 * Preview/editor compatibility normalization for persisted drafts.
 * This does not mutate published pages or commerce authority.
 */
export function normalizeStorefrontTemplateRuntimeComposition(document:StorefrontPageDocument):StorefrontPageDocument{
  if(document.templateKey==='gaming.playroom'&&document.templateVersion===20&&document.pageType==='cart'){
    return normalizePlayroomCart(document);
  }
  return clone(document);
}
