import type {StorefrontComponentNode,StorefrontComponentRegistry,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_COMPONENT_VARIANTS_VERSION='shoporation.storefront-component-variants.v1' as const;

export type StorefrontComponentVariantDefinition={
  variantId:string;
  label:string;
  description:string;
  config:Readonly<Record<string,unknown>>;
};

export const STOREFRONT_COMPONENT_VARIANT_SAFE_CONFIG_KEYS=Object.freeze([
  'tone','spacing','width','presentation','gap','align','justify','direction','fit','radius','variant','size','objectPosition','columns','layout','sticky',
] as const);

const SAFE_CONFIG_KEYS=new Set<string>(STOREFRONT_COMPONENT_VARIANT_SAFE_CONFIG_KEYS);
const VARIANT_ID_PATTERN=/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const clone=<T>(value:T):T=>structuredClone(value);

const CATALOG:Readonly<Record<string,readonly StorefrontComponentVariantDefinition[]>>=Object.freeze({
  'layout.section@1':Object.freeze([
    {variantId:'spacious',label:'Tágas',description:'Levegős, teljes szélességű alap szekció.',config:{tone:'background',spacing:'xl',width:'full',presentation:''}},
    {variantId:'surface',label:'Felület',description:'Elkülönülő surface tónus kényelmes térközzel.',config:{tone:'surface',spacing:'l',width:'full',presentation:''}},
    {variantId:'flush',label:'Peremig',description:'Térköz nélküli, teljes szélességű kompozíció.',config:{tone:'background',spacing:'none',width:'full',presentation:'flush'}},
  ]),
  'layout.container@1':Object.freeze([
    {variantId:'content',label:'Tartalmi',description:'Normál tartalomszélesség és belső térköz.',config:{width:'content',spacing:'m',presentation:''}},
    {variantId:'narrow',label:'Keskeny',description:'Fókuszált, keskeny tartalomoszlop.',config:{width:'narrow',spacing:'m',presentation:''}},
    {variantId:'edge',label:'Széltől szélig',description:'Peremig futó konténer extra belső térköz nélkül.',config:{width:'full',spacing:'none',presentation:'edge'}},
  ]),
  'layout.stack@1':Object.freeze([
    {variantId:'vertical',label:'Függőleges',description:'Egymás alatti elemek normál térközzel.',config:{direction:'vertical',gap:'m',align:'stretch',justify:'start',presentation:''}},
    {variantId:'centered',label:'Középre rendezett',description:'Középre igazított függőleges kompozíció.',config:{direction:'vertical',gap:'m',align:'center',justify:'center',presentation:''}},
    {variantId:'inline',label:'Vízszintes',description:'Egymás mellé rendezett, kompakt elemek.',config:{direction:'horizontal',gap:'s',align:'center',justify:'start',presentation:''}},
  ]),
  'content.heading@1':Object.freeze([
    {variantId:'standard',label:'Alap',description:'Normál, balra igazított címsor.',config:{align:'left',tone:'text',presentation:''}},
    {variantId:'centered',label:'Középre',description:'Középre rendezett címsor.',config:{align:'center',tone:'text',presentation:''}},
    {variantId:'editorial',label:'Editorial',description:'Erős, magazinos display megjelenés.',config:{align:'left',tone:'text',presentation:'display-editorial'}},
  ]),
  'content.text@1':Object.freeze([
    {variantId:'body',label:'Törzsszöveg',description:'Normál olvasási stílus.',config:{align:'left',tone:'text',presentation:''}},
    {variantId:'muted',label:'Visszafogott',description:'Másodlagos, halkabb szöveg.',config:{align:'left',tone:'muted',presentation:''}},
    {variantId:'eyebrow',label:'Kicker',description:'Rövid, kiemelő editorial felirat.',config:{align:'left',tone:'text',presentation:'eyebrow-editorial'}},
  ]),
  'content.image@1':Object.freeze([
    {variantId:'cover',label:'Kitöltő',description:'Kitöltő képkivágás éles sarkokkal.',config:{fit:'cover',radius:'none',presentation:'',objectPosition:'center'}},
    {variantId:'rounded',label:'Lekerekített',description:'Kitöltő kép lágyabb, lekerekített sarkokkal.',config:{fit:'cover',radius:'l',presentation:'',objectPosition:'center'}},
    {variantId:'fill',label:'Teljes magasság',description:'A rendelkezésre álló vizuális teret teljesen kitölti.',config:{fit:'cover',radius:'none',presentation:'fill',objectPosition:'center'}},
  ]),
  'content.button@1':Object.freeze([
    {variantId:'primary',label:'Elsődleges',description:'Erős elsődleges CTA.',config:{variant:'primary',size:'m',presentation:''}},
    {variantId:'secondary',label:'Másodlagos',description:'Visszafogottabb, keretezett CTA.',config:{variant:'secondary',size:'m',presentation:''}},
    {variantId:'ghost',label:'Szöveges',description:'Minimális ghost CTA.',config:{variant:'ghost',size:'m',presentation:''}},
    {variantId:'editorial',label:'Editorial',description:'Szögletesebb, magazinos CTA.',config:{variant:'primary',size:'m',presentation:'editorial-square'}},
  ]),
  'system.header@1':Object.freeze([
    {variantId:'standard',label:'Alap fejléc',description:'Normál, nem sticky fejléc.',config:{tone:'background',sticky:false,presentation:''}},
    {variantId:'sticky',label:'Sticky fejléc',description:'Görgetés közben felül maradó fejléc.',config:{tone:'surface',sticky:true,presentation:''}},
    {variantId:'editorial',label:'Editorial fejléc',description:'Magazinos navigációs és utility megjelenés.',config:{tone:'background',sticky:true,presentation:'editorial-lab'}},
  ]),
  'system.navigation@1':Object.freeze([
    {variantId:'horizontal',label:'Vízszintes',description:'Klasszikus vízszintes navigáció.',config:{layout:'horizontal',presentation:''}},
    {variantId:'vertical',label:'Függőleges',description:'Egymás alatti navigációs elemek.',config:{layout:'vertical',presentation:''}},
    {variantId:'editorial',label:'Editorial',description:'Kompakt, nagybetűs magazinos navigáció.',config:{layout:'horizontal',presentation:'editorial-lab'}},
  ]),
});

function equal(a:unknown,b:unknown):boolean{
  if(Object.is(a,b))return true;
  if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((item,index)=>equal(item,b[index]));
  if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){
    const left=Object.keys(a as Record<string,unknown>).sort();
    const right=Object.keys(b as Record<string,unknown>).sort();
    return left.length===right.length&&left.every((key,index)=>key===right[index]&&equal((a as Record<string,unknown>)[key],(b as Record<string,unknown>)[key]));
  }
  return false;
}

function catalogKey(node:Pick<StorefrontComponentNode,'componentKey'|'componentVersion'>){return `${node.componentKey}@${node.componentVersion}`;}

function validatedVariants(registry:StorefrontComponentRegistry,node:StorefrontComponentNode):readonly StorefrontComponentVariantDefinition[]{
  const definition=registry.get(node.componentKey,node.componentVersion);
  if(!definition)return[];
  const variants=CATALOG[catalogKey(node)]??[];
  const seen=new Set<string>();
  for(const variant of variants){
    if(!VARIANT_ID_PATTERN.test(variant.variantId)||seen.has(variant.variantId))throw new Error('STOREFRONT_COMPONENT_VARIANT_ID_INVALID');
    seen.add(variant.variantId);
    if(!variant.label.trim()||!variant.description.trim()||!Object.keys(variant.config).length)throw new Error('STOREFRONT_COMPONENT_VARIANT_DEFINITION_INVALID');
    for(const key of Object.keys(variant.config)){
      if(!SAFE_CONFIG_KEYS.has(key))throw new Error('STOREFRONT_COMPONENT_VARIANT_CONFIG_NOT_PRESENTATION_SAFE');
      if(!definition.manifest.configurable.includes(key))throw new Error('STOREFRONT_COMPONENT_VARIANT_CONFIG_NOT_CONFIGURABLE');
    }
  }
  return variants;
}

function findNode(document:StorefrontPageDocument,nodeId:string):StorefrontComponentNode|undefined{
  const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode|undefined=>{
    for(const node of nodes){if(node.id===nodeId)return node;const nested=walk(node.children??[]);if(nested)return nested;}
    return undefined;
  };
  return walk(document.sections);
}

export function listStorefrontComponentVariants(registry:StorefrontComponentRegistry,node:StorefrontComponentNode):readonly StorefrontComponentVariantDefinition[]{
  return validatedVariants(registry,node).map(variant=>clone(variant));
}

export function detectStorefrontComponentVariant(registry:StorefrontComponentRegistry,node:StorefrontComponentNode):StorefrontComponentVariantDefinition|null{
  const matching=validatedVariants(registry,node).filter(variant=>Object.entries(variant.config).every(([key,value])=>equal(node.config[key],value)));
  matching.sort((a,b)=>Object.keys(b.config).length-Object.keys(a.config).length);
  return matching[0]?clone(matching[0]):null;
}

export function listStorefrontVariantCapableNodes(document:StorefrontPageDocument,registry:StorefrontComponentRegistry):StorefrontComponentNode[]{
  const result:StorefrontComponentNode[]=[];
  const walk=(nodes:readonly StorefrontComponentNode[])=>{
    for(const node of nodes){if(validatedVariants(registry,node).length)result.push(node);walk(node.children??[]);}
  };
  walk(document.sections);
  return result;
}

export function applyStorefrontComponentVariant(
  document:StorefrontPageDocument,
  input:{nodeId:string;variantId:string},
  registry:StorefrontComponentRegistry,
):StorefrontPageDocument{
  const next=clone(document);
  const node=findNode(next,input.nodeId);
  if(!node)throw new Error('STOREFRONT_COMPONENT_VARIANT_NODE_NOT_FOUND');
  const variant=validatedVariants(registry,node).find(candidate=>candidate.variantId===input.variantId);
  if(!variant)throw new Error('STOREFRONT_COMPONENT_VARIANT_NOT_FOUND');
  node.config={...node.config,...clone(variant.config)};
  return next;
}
