import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import type {StorefrontBuilderSectionPreset} from '@/lib/builder/storefront-preset-application';
import type {StorefrontBuilderPageTemplate} from '@/lib/builder/storefront-page-templates';

export const VX_BUILDER_LIBRARY_VERSION='vision.vx-builder-library.v2' as const;
export const VX_LIBRARY_PREVIEW_NODE_BUDGET=48 as const;

export type VxLibraryPreviewKind=
  |'hero'|'split'|'grid'|'media'|'commerce'|'navigation'|'form'|'review'|'faq'|'text'|'generic';
export type VxLibraryCategory=
  |'featured'|'content'|'media'|'commerce'|'navigation'|'forms'|'social'|'utility';

export const VX_LIBRARY_CATEGORY_LABELS:Record<VxLibraryCategory,string>={
  featured:'Kiemelt',
  content:'Tartalom',
  media:'Média',
  commerce:'Kereskedelem',
  navigation:'Navigáció',
  forms:'Űrlapok',
  social:'Bizalom',
  utility:'Egyéb',
};

export type VxLibraryDescriptor={
  kind:VxLibraryPreviewKind;
  category:VxLibraryCategory;
  categoryLabel:string;
  componentKeys:readonly string[];
  nodeCount:number;
  truncated:boolean;
  searchText:string;
};

const normalize=(value:string)=>value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g,' ')
  .trim();

function inspectTree(root:StorefrontComponentNode,budget=VX_LIBRARY_PREVIEW_NODE_BUDGET){
  const safeBudget=Math.max(1,Math.min(VX_LIBRARY_PREVIEW_NODE_BUDGET,Math.floor(budget)||VX_LIBRARY_PREVIEW_NODE_BUDGET));
  const stack:StorefrontComponentNode[]=[root];
  const keys:string[]=[];
  let count=0;
  while(stack.length&&count<safeBudget){
    const node=stack.shift()!;
    keys.push(node.componentKey);
    count+=1;
    for(const child of node.children??[]){
      if(stack.length+count>=safeBudget){stack.push(child);break;}
      stack.push(child);
    }
  }
  return{keys:[...new Set(keys)],nodeCount:count,truncated:stack.length>0};
}

const has=(keys:readonly string[],needle:string)=>keys.some(key=>key.includes(needle));
const hasAny=(keys:readonly string[],needles:readonly string[])=>needles.some(needle=>has(keys,needle));

function categoryFor(keys:readonly string[],label=''):VxLibraryCategory{
  const text=normalize(label);
  if(hasAny(keys,['commerce.','product','collection','cart','checkout','recommend'])||/termek|product|shop|commerce|katalog/.test(text))return'commerce';
  if(hasAny(keys,['navigation','system.header','editorial.footer','menu'])||/navig|fejlec|lablec|menu/.test(text))return'navigation';
  if(hasAny(keys,['form','contact','newsletter','guided.finder'])||/kapcsolat|urlap|form|hirlevel|kereso/.test(text))return'forms';
  if(hasAny(keys,['review','testimonial','social'])||/velemeny|ertekeles|review|testimonial|bizalom/.test(text))return'social';
  if(hasAny(keys,['image','gallery','video','media','visual.'])||/galeria|kep|video|media/.test(text))return'media';
  if(hasAny(keys,['heading','text','story','editorial','blog'])||/tartalom|szoveg|blog|sztori/.test(text))return'content';
  if(/hero|kiemelt|banner|nyito/.test(text))return'featured';
  return'utility';
}

function kindFor(keys:readonly string[],label='',fallback:VxLibraryPreviewKind='generic'):VxLibraryPreviewKind{
  const text=normalize(label);
  if(/hero|kiemelt|banner|nyito/.test(text))return'hero';
  if(hasAny(keys,['commerce.product-grid','collection','recommendation-row','cart-summary','checkout-summary']))return'commerce';
  if(hasAny(keys,['system.header','navigation','editorial.footer'])||/navig|fejlec|lablec|menu/.test(text))return'navigation';
  if(hasAny(keys,['form','contact','newsletter','guided.finder']))return'form';
  if(hasAny(keys,['review','testimonial']))return'review';
  if(hasAny(keys,['faq','accordion'])||/gyik|faq/.test(text))return'faq';
  if(hasAny(keys,['gallery','video','visual.layered-canvas']))return'media';
  if(has(keys,'editorial.split-feature')||(hasAny(keys,['content.image','image'])&&hasAny(keys,['content.heading','heading'])&&hasAny(keys,['content.text','text'])))return'split';
  if(hasAny(keys,['layout.grid','product-grid'])||keys.filter(key=>key.includes('card')).length>1)return'grid';
  if(hasAny(keys,['content.heading','content.text','heading','text','blog','story']))return'text';
  return fallback;
}

function descriptor(keys:readonly string[],label:string,nodeCount:number,truncated:boolean,fallback:VxLibraryPreviewKind='generic'):VxLibraryDescriptor{
  const category=categoryFor(keys,label);
  const kind=kindFor(keys,label,fallback);
  return{
    kind,
    category,
    categoryLabel:VX_LIBRARY_CATEGORY_LABELS[category],
    componentKeys:keys,
    nodeCount,
    truncated,
    searchText:normalize([label,...keys,VX_LIBRARY_CATEGORY_LABELS[category]].join(' ')),
  };
}

export function describeVxComponent(componentKey:string,label=''):VxLibraryDescriptor{
  return descriptor([componentKey],label||componentKey,1,false,componentKey.startsWith('layout.')?'grid':'generic');
}

export function describeVxSectionPreset(preset:StorefrontBuilderSectionPreset):VxLibraryDescriptor{
  const inspected=inspectTree(preset.fragment);
  return descriptor(inspected.keys,preset.label,inspected.nodeCount,inspected.truncated,'split');
}

export function describeVxPageTemplate(template:StorefrontBuilderPageTemplate):VxLibraryDescriptor{
  const pageType=template.pageType.toLowerCase();
  const keys=[\`page.\${pageType}\`];
  let fallback:VxLibraryPreviewKind='generic';
  if(['home','not-found'].includes(pageType))fallback='hero';
  else if(['catalog','product','cart','checkout','search','account'].includes(pageType))fallback='commerce';
  else if(['contact'].includes(pageType))fallback='form';
  else if(['faq'].includes(pageType))fallback='faq';
  else if(['blog-index','blog-article','content','legal'].includes(pageType))fallback='text';
  return descriptor(keys,\`\${template.label} \${template.pageType}\`,1,false,fallback);
}

export function vxLibraryMatchesSearch(descriptorValue:VxLibraryDescriptor,label:string,query:string){
  const normalized=normalize(query);
  if(!normalized)return true;
  return \`\${normalize(label)} \${descriptorValue.searchText}\`.includes(normalized);
}

export function vxLibraryCategories(descriptors:readonly VxLibraryDescriptor[]){
  const order:readonly VxLibraryCategory[]=['featured','content','media','commerce','navigation','forms','social','utility'];
  const active=new Set(descriptors.map(item=>item.category));
  return order.filter(category=>active.has(category));
}

export function filterVxLibraryItems<T>(items:readonly T[],input:{
  describe:(item:T)=>VxLibraryDescriptor;
  label:(item:T)=>string;
  query?:string;
  category?:VxLibraryCategory|'all';
}){
  const query=input.query??'';
  const category=input.category??'all';
  return items.filter(item=>{
    const itemDescriptor=input.describe(item);
    return(category==='all'||itemDescriptor.category===category)&&vxLibraryMatchesSearch(itemDescriptor,input.label(item),query);
  });
}
