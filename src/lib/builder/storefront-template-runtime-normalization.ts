import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const clone=<T>(value:T):T=>structuredClone(value);

const PLAYROOM_V20_CHECKOUT_COPY=new Map<string,string>([
  ['SECURE CHECKOUT','BIZTONSÁGOS PÉNZTÁR'],
  ['SECURE','BIZTONSÁG'],
  ['SUMMARY','ÖSSZESÍTÉS'],
  ['GUIDED ACCORDION','VEZETETT PÉNZTÁR'],
  ['SHIPPING','SZÁLLÍTÁS'],
  ['PAYMENT','FIZETÉS'],
  ['Provider-neutral','Szolgáltatófüggetlen'],
  ['Nincs template-local fizetési logika.','Nincs sablonba épített fizetési logika.'],
  ['Desktop order summary.','Asztali rendelési összesítő.'],
  ['Aktív fizetési provider.','Aktív fizetési szolgáltató.'],
  ['Semantic slot','Integrációs pont'],
  ['checkout.shipping.methods','A választható szállítási módok helye.'],
  ['checkout.payment.methods','A választható fizetési módok helye.'],
  ['A működő accordion a közös E13 checkout runtime feladata; a sablon a vizuális nyelvet adja.','A működő, lépésenkénti pénztár a közös rendszer része; a sablon a vizuális megjelenést adja.'],
  ['A Szállítás és Fizetés lépés a saját provider/add-on lehetőségeit ugyanebben a folyamban jeleníti meg.','A Szállítás és Fizetés lépés a saját szolgáltatói és kiegészítő lehetőségeit ugyanebben a folyamatban jeleníti meg.'],
]);

function localizePlayroomV20CheckoutValue(value:unknown):unknown{
  if(typeof value==='string')return PLAYROOM_V20_CHECKOUT_COPY.get(value)??value;
  if(Array.isArray(value))return value.map(localizePlayroomV20CheckoutValue);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value as Record<string,unknown>).map(([key,item])=>[key,localizePlayroomV20CheckoutValue(item)]));
  return value;
}

function playroomFooterTextValues(node:StorefrontComponentNode):string[]{
  const values=Object.values(node.config).flatMap(value=>{
    if(typeof value==='string')return[value];
    if(Array.isArray(value))return value.filter((item):item is string=>typeof item==='string');
    return[];
  });
  return[...values,...((node.children??[]).flatMap(playroomFooterTextValues))];
}

function isPlayroomFooterSection(node:StorefrontComponentNode):boolean{
  if(node.componentKey!=='layout.section')return false;
  const values=new Set(playroomFooterTextValues(node));
  return values.has('Vásárlási információk')&&values.has('Kövess minket')&&(values.has('PLAYROOM')||values.has('SHOPORATION'));
}

function normalizePlayroomV20FooterNode(node:StorefrontComponentNode,isFooterRoot=false):StorefrontComponentNode{
  const next=clone(node);
  const config={...next.config};
  if(isFooterRoot){
    const style=(config.style&&typeof config.style==='object'&&!Array.isArray(config.style)?config.style:{}) as Record<string,unknown>;
    config.style={...style,padding:'1.05rem 2.35rem 1.2rem',minHeight:'9rem'};
  }
  if(node.componentKey==='layout.grid'){
    config.gap='s';
  }
  if(node.componentKey==='layout.stack'){
    const style=(config.style&&typeof config.style==='object'&&!Array.isArray(config.style)?config.style:{}) as Record<string,unknown>;
    config.style={...style,gap:'.3rem'};
  }
  if(node.componentKey==='system.navigation'){
    const style=(config.style&&typeof config.style==='object'&&!Array.isArray(config.style)?config.style:{}) as Record<string,unknown>;
    const slots=(config.styleSlots&&typeof config.styleSlots==='object'&&!Array.isArray(config.styleSlots)?config.styleSlots:{}) as Record<string,unknown>;
    const item=(slots.item&&typeof slots.item==='object'&&!Array.isArray(slots.item)?slots.item:{}) as Record<string,unknown>;
    const base=(item.base&&typeof item.base==='object'&&!Array.isArray(item.base)?item.base:{}) as Record<string,unknown>;
    config.style={...style,gap:'.18rem',lineHeight:1.35};
    config.styleSlots={...slots,item:{...item,base:{...base,minHeight:'1rem',display:'flex',alignItems:'center'}}};
  }
  return{
    ...next,
    config,
    ...(next.children?{children:next.children.map(child=>normalizePlayroomV20FooterNode(child,false))}:{}),
  };
}

function normalizePlayroomV20SharedShell(document:StorefrontPageDocument):StorefrontPageDocument{
  const sections=document.sections.map(section=>isPlayroomFooterSection(section)?normalizePlayroomV20FooterNode(section,true):clone(section));
  return{...clone(document),sections};
}

function normalizePlayroomV20Checkout(document:StorefrontPageDocument):StorefrontPageDocument{
  const visit=(node:StorefrontComponentNode):StorefrontComponentNode=>({
    ...clone(node),
    config:localizePlayroomV20CheckoutValue(node.config) as StorefrontComponentNode['config'],
    ...(node.bindings?{bindings:localizePlayroomV20CheckoutValue(node.bindings) as StorefrontComponentNode['bindings']}:{}),
    ...(node.children?{children:node.children.map(visit)}:{}),
  });
  return{...clone(document),sections:document.sections.map(visit)};
}

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
  const playroomV20=document.templateKey==='gaming.playroom'&&document.templateVersion===20;
  const normalized=playroomV20?normalizePlayroomV20SharedShell(document):clone(document);
  if(playroomV20&&normalized.pageType==='checkout')return normalizePlayroomV20Checkout(normalized);
  if(normalized.pageType!=='cart')return normalized;
  if(playroomV20)return normalizePlayroomCart(normalized);
  return normalizeGenericCart(normalized);
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
