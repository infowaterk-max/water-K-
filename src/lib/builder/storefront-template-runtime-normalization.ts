import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const clone=<T>(value:T):T=>structuredClone(value);

const CART_FORBIDDEN_COMPONENT_KEYS=new Set([
  'commerce.fulfillment-summary',
  'commerce.documents-center',
  'commerce.product-documents',
  'commerce.downloads-tile',
  'commerce.post-purchase-guidance',
]);

const CART_INTERNAL_ASSURANCE_PATTERNS=[
  /valós készlet/i,
  /valós elérhetőség/i,
  /valós ár(?:ak)?/i,
  /végső ellenőrzés/i,
  /szerveroldali validáció/i,
  /commerce authority/i,
  /innen már (?:végig )?vezetünk/i,
  /szállítás\s*→\s*fizetés\s*→\s*összesítés/i,
  /server[- ]side validation/i,
  /authoritative (?:price|stock|inventory)/i,
];

const CART_INTERNAL_COPY_KEYS=new Set([
  'revalidationLabel',
  'secureLabel',
]);

function textValues(config:Record<string,unknown>):string[]{
  return Object.values(config).flatMap(value=>{
    if(typeof value==='string')return[value];
    if(Array.isArray(value))return value.filter((item):item is string=>typeof item==='string');
    return[];
  });
}

function containsCartInternalAssurance(node:StorefrontComponentNode):boolean{
  return textValues(node.config).some(value=>CART_INTERNAL_ASSURANCE_PATTERNS.some(pattern=>pattern.test(value)));
}

function hasOnlyRecommendationContent(node:StorefrontComponentNode):boolean{
  let hasRecommendation=false;
  let hasOtherLeaf=false;
  const visit=(current:StorefrontComponentNode)=>{
    if(current.componentKey==='commerce.recommendation-row'){hasRecommendation=true;return;}
    const children=current.children??[];
    if(!children.length){
      if(!['layout.section','layout.container','layout.grid','layout.stack'].includes(current.componentKey))hasOtherLeaf=true;
      return;
    }
    for(const child of children)visit(child);
  };
  visit(node);
  return hasRecommendation&&!hasOtherLeaf;
}

function hasFunctionalCartDescendant(node:StorefrontComponentNode):boolean{
  if(['commerce.cart-summary','commerce.recommendation-row'].includes(node.componentKey))return true;
  return(node.children??[]).some(hasFunctionalCartDescendant);
}

function sanitizeCartConfig(config:Record<string,unknown>):Record<string,unknown>{
  const next={...config};
  for(const key of CART_INTERNAL_COPY_KEYS){
    const value=next[key];
    if(typeof value==='string'&&CART_INTERNAL_ASSURANCE_PATTERNS.some(pattern=>pattern.test(value)))delete next[key];
  }
  return next;
}

function normalizeCartNode(node:StorefrontComponentNode):StorefrontComponentNode|null{
  if(CART_FORBIDDEN_COMPONENT_KEYS.has(node.componentKey))return null;
  if(containsCartInternalAssurance(node)&&!hasFunctionalCartDescendant(node))return null;

  const hadChildren=Boolean(node.children?.length);
  const children=(node.children??[])
    .map(normalizeCartNode)
    .filter((child):child is StorefrontComponentNode=>Boolean(child));

  if(hadChildren&&!children.length&&['layout.section','layout.container','layout.grid','layout.stack'].includes(node.componentKey))return null;

  const config=sanitizeCartConfig(node.config);
  if(node.componentKey==='commerce.cart-summary'){
    config.emptyCtaLabel=typeof config.emptyCtaLabel==='string'&&config.emptyCtaLabel.trim()?config.emptyCtaLabel:'Vásárlás folytatása';
    config.emptyCtaHref=typeof config.emptyCtaHref==='string'&&config.emptyCtaHref.trim()?config.emptyCtaHref:'/webaruhaz';
    config.showQuantityControls=true;
    config.showRemoveControl=true;
    config.showCouponEntry=true;
    config.couponLabel=typeof config.couponLabel==='string'&&config.couponLabel.trim()?config.couponLabel:'Van kuponkódod?';
    config.couponPlaceholder=typeof config.couponPlaceholder==='string'&&config.couponPlaceholder.trim()?config.couponPlaceholder:'Kuponkód';
    config.couponApplyLabel=typeof config.couponApplyLabel==='string'&&config.couponApplyLabel.trim()?config.couponApplyLabel:'Alkalmazás';
  }
  if(node.componentKey==='commerce.recommendation-row')config.hideWhenEmpty=true;
  if(node.componentKey==='layout.section'&&hasOnlyRecommendationContent(node))config.presentation='flush';

  return{
    ...clone(node),
    config,
    ...(node.children?{children}:{}),
  };
}

function normalizeGenericCart(document:StorefrontPageDocument):StorefrontPageDocument{
  const sections=document.sections
    .map(normalizeCartNode)
    .filter((section):section is StorefrontComponentNode=>Boolean(section));
  return{
    ...clone(document),
    sections,
    metadata:{
      ...(document.metadata??{}),
      cartPresentation:'customer-task-focused-v1',
      cartDocumentSurface:'forbidden',
      cartInternalAssurancePanels:'forbidden',
    },
  };
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

  const normalizePlayroomNode=(node:StorefrontComponentNode):StorefrontComponentNode|null=>{
    if(removeIds.has(node.id))return null;
    const children=(node.children??[])
      .map(normalizePlayroomNode)
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
  };

  const playroom={
    ...clone(document),
    sections:document.sections
      .map(normalizePlayroomNode)
      .filter((section):section is StorefrontComponentNode=>Boolean(section)),
  };
  return normalizeGenericCart(playroom);
}

/**
 * Shared storefront presentation normalization.
 *
 * Cart policy is portfolio-wide:
 * - cart content is customer-task focused;
 * - documents/downloads/post-purchase surfaces are forbidden on cart pages;
 * - internal price/stock/validation assurance panels are not customer-facing UI;
 * - engine validation remains mandatory and is not weakened by hiding explanatory chrome.
 *
 * Playroom keeps a small compatibility layer for already-persisted v20 drafts, but
 * the generic cart policy applies to every current and future template.
 */
export function normalizeStorefrontTemplateRuntimeComposition(document:StorefrontPageDocument):StorefrontPageDocument{
  if(document.pageType!=='cart')return clone(document);
  if(document.templateKey==='gaming.playroom'&&document.templateVersion===20)return normalizePlayroomCart(document);
  return normalizeGenericCart(document);
}

export function storefrontCartPresentationViolations(document:StorefrontPageDocument):readonly string[]{
  if(document.pageType!=='cart')return[];
  const violations:string[]=[];
  const walk=(nodes:readonly StorefrontComponentNode[])=>{
    for(const node of nodes){
      if(CART_FORBIDDEN_COMPONENT_KEYS.has(node.componentKey))violations.push(`forbidden-component:${node.componentKey}:${node.id}`);
      if(containsCartInternalAssurance(node)&&!hasFunctionalCartDescendant(node))violations.push(`internal-assurance:${node.id}`);
      walk(node.children??[]);
    }
  };
  walk(document.sections);
  return violations;
}
