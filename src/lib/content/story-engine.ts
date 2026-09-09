export const STORY_ENGINE_VERSION='shoporation.editorial-story-engine.v1' as const;

export type StoryTypeKey='lookbook'|'maker'|'journal'|'origin'|'process'|'before-after';
export type StoryStatus='draft'|'published'|'archived';
export type StoryRelationType='product'|'collection'|'maker'|'story'|'origin';
export type StoryBlockType='heading'|'prose'|'quote'|'image'|'image-text'|'facts'|'timeline'|'relation-grid'|'provenance';

export type StoryTypeDefinition={
  key:StoryTypeKey;
  label:string;
  allowedBlocks:readonly StoryBlockType[];
  requiredRelations?:readonly StoryRelationType[];
};

export type StoryAuthor={id:string;name:string;role?:string};
export type StoryTaxonomy={categories?:readonly string[];tags?:readonly string[]};
export type StoryRelation={
  id:string;
  type:StoryRelationType;
  entityId:string;
  label?:string;
  href?:string;
  verified?:boolean;
};

export type StoryHeadingBlock={id:string;type:'heading';level?:2|3;title:string;eyebrow?:string};
export type StoryProseBlock={id:string;type:'prose';text:string};
export type StoryQuoteBlock={id:string;type:'quote';quote:string;attribution?:string};
export type StoryImageBlock={id:string;type:'image';src:string;alt:string;caption?:string};
export type StoryImageTextBlock={id:string;type:'image-text';title:string;text:string;src:string;alt:string;imagePosition?:'left'|'right'};
export type StoryFactsBlock={id:string;type:'facts';title?:string;items:readonly {label:string;value:string}[]};
export type StoryTimelineBlock={id:string;type:'timeline';title?:string;items:readonly {date:string;title:string;text?:string}[]};
export type StoryRelationGridBlock={id:string;type:'relation-grid';title?:string;relationIds:readonly string[]};
export type StoryProvenanceBlock={id:string;type:'provenance';title?:string;claims:readonly {label:string;value:string;originRelationId:string}[]};
export type StoryBlock=StoryHeadingBlock|StoryProseBlock|StoryQuoteBlock|StoryImageBlock|StoryImageTextBlock|StoryFactsBlock|StoryTimelineBlock|StoryRelationGridBlock|StoryProvenanceBlock;

export type StoryDocument={
  version:1;
  id:string;
  slug:string;
  storyType:StoryTypeKey;
  status:StoryStatus;
  title:string;
  excerpt?:string;
  author:StoryAuthor;
  taxonomy?:StoryTaxonomy;
  publishedAt?:string;
  updatedAt?:string;
  heroImage?:{src:string;alt:string};
  relations:readonly StoryRelation[];
  blocks:readonly StoryBlock[];
};

export type StoryValidationViolation={code:string;path:string;message:string};
export type StoryValidationResult={ok:boolean;violations:StoryValidationViolation[]};
export type StoryReadModel={
  id:string;
  slug:string;
  storyType:StoryTypeKey;
  title:string;
  excerpt:string;
  author:StoryAuthor;
  taxonomy:{categories:string[];tags:string[]};
  publishedAt:string|null;
  heroImage:{src:string;alt:string}|null;
  relations:StoryRelation[];
  blocks:StoryBlock[];
};

const ID_PATTERN=/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const SLUG_PATTERN=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE_PATTERN=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const SAFE_RELATION_KEYS=new Set(['id','type','entityId','label','href','verified']);
const FORBIDDEN_RELATION_AUTHORITY_KEYS=new Set(['price','stock','inventory','sku','variants','compareAtPrice','customerPrice','order']);

const STORY_TYPES:readonly StoryTypeDefinition[]=[
  {key:'lookbook',label:'Lookbook',allowedBlocks:['heading','prose','quote','image','image-text','facts','relation-grid']},
  {key:'maker',label:'Maker / Atelier',allowedBlocks:['heading','prose','quote','image','image-text','facts','timeline','relation-grid'],requiredRelations:['maker']},
  {key:'journal',label:'Journal',allowedBlocks:['heading','prose','quote','image','image-text','facts','timeline','relation-grid']},
  {key:'origin',label:'Origin / Provenance',allowedBlocks:['heading','prose','quote','image','image-text','facts','timeline','relation-grid','provenance'],requiredRelations:['origin']},
  {key:'process',label:'Process',allowedBlocks:['heading','prose','quote','image','image-text','facts','timeline','relation-grid'],requiredRelations:['maker']},
  {key:'before-after',label:'Before / After',allowedBlocks:['heading','prose','image','image-text','facts','timeline','relation-grid']},
] as const;

const clean=(value:string)=>value.trim();
const isSafeHref=(value:string)=>value.startsWith('/')||value.startsWith('#')||value.startsWith('https://')||value.startsWith('mailto:')||value.startsWith('tel:');
const isSafeImage=(value:string)=>value.startsWith('/')||value.startsWith('https://');
const hasUnsafeMarkup=(value:string)=>/<\/?(?:script|iframe|object|embed|style)|javascript:|onerror\s*=|onclick\s*=/i.test(value);
const uniq=(values:readonly string[])=>[...new Set(values.map(clean).filter(Boolean))];

export class StoryTypeRegistry{
  private readonly definitions=new Map<StoryTypeKey,Readonly<StoryTypeDefinition>>();
  constructor(definitions:readonly StoryTypeDefinition[]=STORY_TYPES){for(const definition of definitions)this.register(definition);}
  private register(definition:StoryTypeDefinition){
    if(this.definitions.has(definition.key))throw new Error('STORY_TYPE_DUPLICATE');
    if(!definition.label.trim()||!definition.allowedBlocks.length)throw new Error('STORY_TYPE_INVALID');
    this.definitions.set(definition.key,Object.freeze({...definition,allowedBlocks:[...definition.allowedBlocks],requiredRelations:definition.requiredRelations?[...definition.requiredRelations]:undefined}));
  }
  get(key:StoryTypeKey){return this.definitions.get(key);}
  list(){return[...this.definitions.values()];}
}

export const DEFAULT_STORY_TYPE_REGISTRY=new StoryTypeRegistry();

function push(violations:StoryValidationViolation[],code:string,path:string,message:string){violations.push({code,path,message});}
function validateText(value:string,path:string,violations:StoryValidationViolation[]){if(!clean(value))push(violations,'STORY_TEXT_REQUIRED',path,'Text is required.');else if(hasUnsafeMarkup(value))push(violations,'STORY_UNSAFE_MARKUP',path,'Raw HTML/script-like content is not allowed.');}

export function validateStoryDocument(document:StoryDocument,registry:StoryTypeRegistry=DEFAULT_STORY_TYPE_REGISTRY):StoryValidationResult{
  const violations:StoryValidationViolation[]=[];
  if(document.version!==1)push(violations,'STORY_VERSION_UNSUPPORTED','version','Only Story Document v1 is supported.');
  if(!ID_PATTERN.test(document.id))push(violations,'STORY_ID_INVALID','id','Story id must be stable and key-safe.');
  if(!SLUG_PATTERN.test(document.slug))push(violations,'STORY_SLUG_INVALID','slug','Story slug is invalid.');
  validateText(document.title,'title',violations);
  if(!ID_PATTERN.test(document.author.id)||!clean(document.author.name))push(violations,'STORY_AUTHOR_INVALID','author','A stable author id and name are required.');
  if(document.excerpt)validateText(document.excerpt,'excerpt',violations);
  if(document.status==='published'&&(!document.publishedAt||!ISO_DATE_PATTERN.test(document.publishedAt)))push(violations,'STORY_PUBLISHED_AT_REQUIRED','publishedAt','Published stories require an ISO UTC publishedAt timestamp.');
  if(document.publishedAt&&!ISO_DATE_PATTERN.test(document.publishedAt))push(violations,'STORY_PUBLISHED_AT_INVALID','publishedAt','publishedAt must be ISO UTC.');
  if(document.updatedAt&&!ISO_DATE_PATTERN.test(document.updatedAt))push(violations,'STORY_UPDATED_AT_INVALID','updatedAt','updatedAt must be ISO UTC.');
  if(document.heroImage){if(!isSafeImage(document.heroImage.src))push(violations,'STORY_IMAGE_URL_UNSAFE','heroImage.src','Story images must be relative or HTTPS.');validateText(document.heroImage.alt,'heroImage.alt',violations);}

  const type=registry.get(document.storyType);
  if(!type)push(violations,'STORY_TYPE_UNKNOWN','storyType','Story type is not registered.');
  const relationIds=new Set<string>();
  const relationsById=new Map<string,StoryRelation>();
  document.relations.forEach((relation,index)=>{
    const path=`relations.${index}`;
    if(!ID_PATTERN.test(relation.id)||!clean(relation.entityId))push(violations,'STORY_RELATION_INVALID',path,'Relation id and entity id are required.');
    if(relationIds.has(relation.id))push(violations,'STORY_RELATION_DUPLICATE',`${path}.id`,'Relation ids must be unique.');
    relationIds.add(relation.id);relationsById.set(relation.id,relation);
    if(relation.href&&!isSafeHref(relation.href))push(violations,'STORY_RELATION_URL_UNSAFE',`${path}.href`,'Relation href must be relative, HTTPS, mailto or tel.');
    const keys=Object.keys(relation as unknown as Record<string,unknown>);
    if(keys.some(key=>FORBIDDEN_RELATION_AUTHORITY_KEYS.has(key)))push(violations,'STORY_PRODUCT_AUTHORITY_DUPLICATED',path,'Story relations must not duplicate product/pricing/inventory authority.');
    if(keys.some(key=>!SAFE_RELATION_KEYS.has(key)))push(violations,'STORY_RELATION_FIELD_UNSUPPORTED',path,'Story relation contains unsupported fields.');
  });
  for(const required of type?.requiredRelations??[]){if(!document.relations.some(relation=>relation.type===required))push(violations,'STORY_RELATION_REQUIRED','relations',`Story type requires relation: ${required}.`);}

  const blockIds=new Set<string>();
  document.blocks.forEach((block,index)=>{
    const path=`blocks.${index}`;
    if(!ID_PATTERN.test(block.id))push(violations,'STORY_BLOCK_ID_INVALID',`${path}.id`,'Block id must be stable and key-safe.');
    if(blockIds.has(block.id))push(violations,'STORY_BLOCK_ID_DUPLICATE',`${path}.id`,'Block ids must be unique.');
    blockIds.add(block.id);
    if(type&&!type.allowedBlocks.includes(block.type))push(violations,'STORY_BLOCK_NOT_ALLOWED',`${path}.type`,`Block ${block.type} is not allowed for ${document.storyType}.`);
    switch(block.type){
      case'heading':validateText(block.title,`${path}.title`,violations);break;
      case'prose':validateText(block.text,`${path}.text`,violations);break;
      case'quote':validateText(block.quote,`${path}.quote`,violations);if(block.attribution)validateText(block.attribution,`${path}.attribution`,violations);break;
      case'image':if(!isSafeImage(block.src))push(violations,'STORY_IMAGE_URL_UNSAFE',`${path}.src`,'Story images must be relative or HTTPS.');validateText(block.alt,`${path}.alt`,violations);if(block.caption)validateText(block.caption,`${path}.caption`,violations);break;
      case'image-text':if(!isSafeImage(block.src))push(violations,'STORY_IMAGE_URL_UNSAFE',`${path}.src`,'Story images must be relative or HTTPS.');validateText(block.alt,`${path}.alt`,violations);validateText(block.title,`${path}.title`,violations);validateText(block.text,`${path}.text`,violations);break;
      case'facts':block.items.forEach((item,itemIndex)=>{validateText(item.label,`${path}.items.${itemIndex}.label`,violations);validateText(item.value,`${path}.items.${itemIndex}.value`,violations);});break;
      case'timeline':block.items.forEach((item,itemIndex)=>{validateText(item.date,`${path}.items.${itemIndex}.date`,violations);validateText(item.title,`${path}.items.${itemIndex}.title`,violations);if(item.text)validateText(item.text,`${path}.items.${itemIndex}.text`,violations);});break;
      case'relation-grid':block.relationIds.forEach((id,itemIndex)=>{if(!relationsById.has(id))push(violations,'STORY_RELATION_REFERENCE_MISSING',`${path}.relationIds.${itemIndex}`,'Relation-grid references an unknown relation.');});break;
      case'provenance':block.claims.forEach((claim,itemIndex)=>{validateText(claim.label,`${path}.claims.${itemIndex}.label`,violations);validateText(claim.value,`${path}.claims.${itemIndex}.value`,violations);const relation=relationsById.get(claim.originRelationId);if(!relation||relation.type!=='origin'||relation.verified!==true)push(violations,'STORY_PROVENANCE_UNVERIFIED',`${path}.claims.${itemIndex}.originRelationId`,'Provenance claims require an explicit verified origin relation.');});break;
    }
  });
  return{ok:violations.length===0,violations};
}

export function canRenderStory(document:StoryDocument,input:{preview?:boolean;now?:Date}={}):boolean{
  if(document.status==='archived')return input.preview===true;
  if(document.status==='draft')return input.preview===true;
  if(document.status!=='published'||!document.publishedAt)return false;
  const publishedAt=Date.parse(document.publishedAt);if(!Number.isFinite(publishedAt))return false;
  return publishedAt<=(input.now??new Date()).getTime();
}

export function buildStoryReadModel(document:StoryDocument,input:{preview?:boolean;now?:Date}={}):StoryReadModel|null{
  const validation=validateStoryDocument(document);if(!validation.ok||!canRenderStory(document,input))return null;
  return{
    id:document.id,slug:document.slug,storyType:document.storyType,title:clean(document.title),excerpt:clean(document.excerpt??''),author:{...document.author,name:clean(document.author.name)},taxonomy:{categories:uniq(document.taxonomy?.categories??[]),tags:uniq(document.taxonomy?.tags??[])},publishedAt:document.publishedAt??null,heroImage:document.heroImage?{src:document.heroImage.src,alt:clean(document.heroImage.alt)}:null,relations:document.relations.map(relation=>({...relation,label:relation.label?clean(relation.label):undefined})),blocks:document.blocks.map(block=>({...block})) as StoryBlock[],
  };
}

export const STORY_TEMPLATE_SWITCH_MUTATION_BOUNDARY=Object.freeze({
  storyDocuments:false,
  products:false,
  collections:false,
  makers:false,
  orders:false,
  customers:false,
  storefrontPageDrafts:true,
} as const);

export function preserveStoryDocumentsAcrossTemplateSwitch(documents:readonly StoryDocument[]):readonly StoryDocument[]{return Object.freeze([...documents]);}
