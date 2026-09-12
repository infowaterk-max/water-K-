import {
  STOREFRONT_BUILDER_FOUNDATION_VERSION,
  STOREFRONT_DEMO_CONTENT_POLICY,
  STOREFRONT_PAGE_SCHEMA_VERSION,
  STOREFRONT_PAGE_TYPES,
  STOREFRONT_TEMPLATE_MANIFEST_VERSION,
  STOREFRONT_TEMPLATE_MIGRATION_POLICY,
  defineStorefrontBuilderComponent,
  defineStorefrontTemplateManifest,
  type StorefrontBuilderComponentManifest,
} from '@/lib/builder/storefront-foundation';
import {
  StorefrontComponentRegistry,
  StorefrontTemplateRegistry,
  type StorefrontComponentNode,
  type StorefrontPageDocument,
  type StorefrontRuntimeComponentDefinition,
  type StorefrontTemplatePackage,
} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_PRIMITIVES_VERSION='shoporation.storefront-primitives.v1' as const;
const ALL_PAGE_TYPES=[...STOREFRONT_PAGE_TYPES] as const;
const NO_FEATURES=[] as const;
function manifest(input:{componentKey:string;schemaSlot:string;configurable:readonly string[];responsiveMode:StorefrontBuilderComponentManifest['responsiveMode']}){return defineStorefrontBuilderComponent({foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,componentKey:input.componentKey,componentVersion:1,schemaSlot:input.schemaSlot,pageTypes:ALL_PAGE_TYPES,configurable:input.configurable,responsiveMode:input.responsiveMode,capability:{minPlan:'alap',features:NO_FEATURES}});}

export const STOREFRONT_PRIMITIVE_DEFINITIONS:readonly StorefrontRuntimeComponentDefinition[]=[
  {manifest:manifest({componentKey:'layout.section',schemaSlot:'sections',configurable:['tone','spacing','width','presentation','style','styleSlots','innerStyle','deferOffscreen','intrinsicSize'],responsiveMode:'container'}),allowsChildren:true},
  {manifest:manifest({componentKey:'layout.container',schemaSlot:'children',configurable:['width','spacing','presentation','style','styleSlots'],responsiveMode:'container'}),allowsChildren:true},
  {manifest:manifest({componentKey:'layout.grid',schemaSlot:'children',configurable:['columns','gap','align','presentation','style','styleSlots'],responsiveMode:'grid'}),allowsChildren:true},
  {manifest:manifest({componentKey:'layout.stack',schemaSlot:'children',configurable:['direction','gap','align','justify','presentation','style','styleSlots'],responsiveMode:'stack'}),allowsChildren:true},
  {manifest:manifest({componentKey:'content.heading',schemaSlot:'children',configurable:['text','level','align','tone','presentation','accentText','typography','style','accentStyle','styleSlots'],responsiveMode:'fixed'}),bindingSlots:['text']},
  {manifest:manifest({componentKey:'content.text',schemaSlot:'children',configurable:['text','as','align','tone','presentation','typography','style','styleSlots'],responsiveMode:'fixed'}),bindingSlots:['text']},
  {manifest:manifest({componentKey:'content.image',schemaSlot:'children',configurable:['src','alt','width','height','fit','loading','radius','presentation','objectPosition','style','styleSlots','artDirection'],responsiveMode:'fixed'}),bindingSlots:['src','alt']},
  {manifest:manifest({componentKey:'content.button',schemaSlot:'children',configurable:['label','href','variant','size','ariaLabel','presentation','typography','style','styleSlots'],responsiveMode:'fixed'}),bindingSlots:['label','href']},
  {manifest:manifest({componentKey:'system.header',schemaSlot:'protected.header',configurable:['brandLabel','brandHref','tone','sticky','presentation','tagline','utilityItems','style','styleSlots','innerStyle','brandStyle','taglineStyle','utilityStyle','mobileToggleStyle'],responsiveMode:'primary-navigation'}),bindingSlots:['brandLabel','brandHref'],allowsChildren:true,allowedChildren:['system.navigation'],protectedSystem:true},
  {manifest:manifest({componentKey:'system.navigation',schemaSlot:'protected.navigation',configurable:['items','ariaLabel','layout','presentation','style','styleSlots'],responsiveMode:'primary-navigation'}),bindingSlots:['items'],protectedSystem:true},
] as const;

export function createStorefrontPrimitiveComponentRegistry(){const registry=new StorefrontComponentRegistry();for(const definition of STOREFRONT_PRIMITIVE_DEFINITIONS)registry.register(definition);return registry;}
const node=(input:StorefrontComponentNode):StorefrontComponentNode=>input;
export const STOREFRONT_NEUTRAL_REFERENCE_PAGE:StorefrontPageDocument={schemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,pageKey:'reference.home',pageType:'home',templateKey:'reference.neutral',templateVersion:1,metadata:{purpose:'runtime-reference',production:false},sections:[
  node({id:'reference-header',componentKey:'system.header',componentVersion:1,config:{brandLabel:'Shoporation',brandHref:'/',tone:'surface',sticky:false},bindings:{brandLabel:{path:'brand.name',fallback:'Shoporation'}},children:[node({id:'reference-navigation',componentKey:'system.navigation',componentVersion:1,config:{ariaLabel:'Fő navigáció',items:[],layout:'horizontal'},bindings:{items:{path:'navigation.primary',fallback:[]}}})]}),
  node({id:'reference-hero',componentKey:'layout.section',componentVersion:1,config:{tone:'background',spacing:'xl',width:'full'},children:[node({id:'reference-hero-container',componentKey:'layout.container',componentVersion:1,config:{width:'content',spacing:'none'},children:[node({id:'reference-hero-stack',componentKey:'layout.stack',componentVersion:1,config:{direction:'vertical',gap:'m',align:'start',justify:'start'},children:[node({id:'reference-title',componentKey:'content.heading',componentVersion:1,config:{text:'Semleges storefront referencia',level:1,align:'left',tone:'text'}}),node({id:'reference-copy',componentKey:'content.text',componentVersion:1,config:{text:'Ez az oldal kizárólag a közös Page Schema, registry, binding és renderer működését bizonyítja.',as:'p',align:'left',tone:'muted'}}),node({id:'reference-cta',componentKey:'content.button',componentVersion:1,config:{label:'Katalógus megnyitása',href:'/webaruhaz',variant:'primary',size:'m',ariaLabel:'Katalógus megnyitása'}})]})]})]}),
  node({id:'reference-grid-section',componentKey:'layout.section',componentVersion:1,config:{tone:'surface',spacing:'l',width:'full'},children:[node({id:'reference-grid-container',componentKey:'layout.container',componentVersion:1,config:{width:'content',spacing:'none'},children:[node({id:'reference-grid',componentKey:'layout.grid',componentVersion:1,config:{columns:12,gap:'m',align:'stretch'},children:[node({id:'reference-grid-left',componentKey:'layout.stack',componentVersion:1,config:{direction:'vertical',gap:'s',align:'start',justify:'start'},responsive:{desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}},children:[node({id:'reference-grid-heading',componentKey:'content.heading',componentVersion:1,config:{text:'Közös primitive-ek',level:2,align:'left',tone:'text'}}),node({id:'reference-grid-copy',componentKey:'content.text',componentVersion:1,config:{text:'Section, Container, Grid, Stack, Heading, Text, Image és Button ugyanazt a runtime contractot használja minden sablonban.',as:'p',align:'left',tone:'text'}})]}),node({id:'reference-grid-right',componentKey:'layout.stack',componentVersion:1,config:{direction:'vertical',gap:'s',align:'start',justify:'center'},responsive:{desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}},children:[node({id:'reference-brand',componentKey:'content.text',componentVersion:1,config:{text:'Merchant brand binding',as:'strong',align:'left',tone:'muted'},bindings:{text:{path:'brand.name',fallback:'Merchant brand'}}})]})]})]})]})]})
]};
export const STOREFRONT_NEUTRAL_REFERENCE_TEMPLATE=defineStorefrontTemplateManifest({foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,manifestVersion:STOREFRONT_TEMPLATE_MANIFEST_VERSION,templateKey:'reference.neutral',templateVersion:1,pageSchemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,minPlan:'alap',requiredFeatures:NO_FEATURES,pageTypes:['home'],responsive:{desktop:true,tablet:true,mobile:true},migration:STOREFRONT_TEMPLATE_MIGRATION_POLICY,demoContent:{namespace:'reference-neutral',policy:STOREFRONT_DEMO_CONTENT_POLICY}});
export const STOREFRONT_NEUTRAL_REFERENCE_PACKAGE:StorefrontTemplatePackage={manifest:STOREFRONT_NEUTRAL_REFERENCE_TEMPLATE,pages:[STOREFRONT_NEUTRAL_REFERENCE_PAGE]};
export function createNeutralStorefrontTemplateRegistry(){return new StorefrontTemplateRegistry().register(STOREFRONT_NEUTRAL_REFERENCE_PACKAGE);}
