export const STOREFRONT_TEMPLATE_GENOME_VERSION='shoporation.template-genome.v1' as const;

export const STOREFRONT_TEMPLATE_GENOME_DIMENSIONS=Object.freeze([
  'identity','color','typography','spacing','shape','motion','composition','image',
  'commerce','content','shell','responsive','componentGrammar','exclusion',
] as const);

export type StorefrontTemplateGenomeDimension=(typeof STOREFRONT_TEMPLATE_GENOME_DIMENSIONS)[number];
export type StorefrontTemplateGenomeHash=`fnv1a32:${string}`;

type StringRecord=Readonly<Record<string,string>>;

export type StorefrontTemplateGenome={
  contract:typeof STOREFRONT_TEMPLATE_GENOME_VERSION;
  identity:{
    category:string;
    templateKey:string;
    displayName:string;
    templateVersion:number;
    genomeVersion:number;
  };
  lineage:{
    parentHash:StorefrontTemplateGenomeHash|null;
    evolution:'origin'|'compatible-evolution'|'breaking-evolution';
    note:string;
  };
  dimensions:{
    identity:{character:string;position:string;rules:readonly string[]};
    color:{strategy:string;tokens:StringRecord;rules:readonly string[]};
    typography:{display:string;body:string;data:string;scale:string;rules:readonly string[]};
    spacing:{rhythm:string;density:string;rules:readonly string[]};
    shape:{language:string;radius:string;border:string;rules:readonly string[]};
    motion:{character:string;intensity:'none'|'subtle'|'moderate'|'expressive';rules:readonly string[]};
    composition:{grammar:string;sectionRhythm:string;density:string;archetypes:readonly string[];rules:readonly string[]};
    image:{language:string;roles:readonly string[];rules:readonly string[];forbidConcreteSources:true};
    commerce:{character:string;rules:readonly string[]};
    content:{voice:string;hierarchy:string;rules:readonly string[]};
    shell:{navigation:string;header:string;footer:string;rules:readonly string[]};
    responsive:{desktopAuthority:true;tabletStrategy:string;mobileStrategy:string;rules:readonly string[]};
    componentGrammar:{preferred:readonly string[];discouraged:readonly string[];rules:readonly string[]};
    exclusion:{identities:readonly string[];similarities:readonly string[];rules:readonly string[]};
  };
  hash:StorefrontTemplateGenomeHash;
};

export type StorefrontTemplateGenomeInput=Omit<StorefrontTemplateGenome,'hash'>;
export type StorefrontTemplateGenomeIssue={code:string;path:string;message:string;severity:'error'};
export type StorefrontTemplateGenomeValidation={
  valid:boolean;
  expectedHash:StorefrontTemplateGenomeHash|null;
  issues:readonly StorefrontTemplateGenomeIssue[];
};

const failure=(code:string,path:string,message:string):StorefrontTemplateGenomeIssue=>({code,path,message,severity:'error'});

function canonical(value:unknown):string{
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object'){
    return '{'+Object.keys(value as Record<string,unknown>).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}';
  }
  return JSON.stringify(value);
}

function digest(value:unknown):StorefrontTemplateGenomeHash{
  let hash=2166136261;
  const text=canonical(value);
  for(let index=0;index<text.length;index+=1){
    hash^=text.charCodeAt(index);
    hash=Math.imul(hash,16777619);
  }
  return `fnv1a32:${(hash>>>0).toString(16).padStart(8,'0')}`;
}

function withoutHash(genome:StorefrontTemplateGenome):StorefrontTemplateGenomeInput{
  const copy=structuredClone(genome) as StorefrontTemplateGenome;
  const {hash:_hash,...input}=copy;
  return input;
}

function deepFreeze<T>(value:T):T{
  if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
  Object.freeze(value);
  for(const child of Object.values(value as Record<string,unknown>))deepFreeze(child);
  return value;
}

function strings(value:unknown):readonly string[]{
  return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'):[];
}

function nonEmptyList(value:unknown):boolean{
  const list=strings(value);
  return list.length>0&&list.every(item=>item.trim().length>0);
}

function containsConcreteMediaSource(value:unknown):boolean{
  if(typeof value==='string'){
    const text=value.trim();
    return /^(?:https?:|data:|\/|\.\/|\.\.\/)/i.test(text)||/\.(?:png|jpe?g|webp|svg|gif|avif)(?:$|[?#])/i.test(text);
  }
  if(Array.isArray(value))return value.some(containsConcreteMediaSource);
  if(value&&typeof value==='object')return Object.values(value as Record<string,unknown>).some(containsConcreteMediaSource);
  return false;
}

export function hashStorefrontTemplateGenome(input:StorefrontTemplateGenomeInput):StorefrontTemplateGenomeHash{
  return digest(input);
}

export function validateStorefrontTemplateGenome(
  genome:StorefrontTemplateGenome|undefined|null,
  expected?:{category:string;templateKey:string;displayName?:string;templateVersion:number},
):StorefrontTemplateGenomeValidation{
  const issues:StorefrontTemplateGenomeIssue[]=[];
  if(!genome){
    return Object.freeze({valid:false,expectedHash:null,issues:Object.freeze([
      failure('TEMPLATE_GENOME_REQUIRED','genome','Generator-ready template production requires a canonical Template Genome.'),
    ])});
  }
  if(genome.contract!==STOREFRONT_TEMPLATE_GENOME_VERSION)issues.push(failure('TEMPLATE_GENOME_CONTRACT_INVALID','genome.contract','Template Genome contract version is unsupported.'));
  if(!Number.isInteger(genome.identity.genomeVersion)||genome.identity.genomeVersion<1)issues.push(failure('TEMPLATE_GENOME_VERSION_INVALID','genome.identity.genomeVersion','Genome version must be a positive integer.'));
  if(!Number.isInteger(genome.identity.templateVersion)||genome.identity.templateVersion<1)issues.push(failure('TEMPLATE_GENOME_TEMPLATE_VERSION_INVALID','genome.identity.templateVersion','Template version must be a positive integer.'));
  for(const field of ['category','templateKey','displayName'] as const){
    if(!genome.identity[field]?.trim())issues.push(failure('TEMPLATE_GENOME_IDENTITY_REQUIRED',`genome.identity.${field}`,`Genome identity ${field} is required.`));
  }
  if(genome.lineage.evolution==='origin'&&genome.lineage.parentHash!==null)issues.push(failure('TEMPLATE_GENOME_ORIGIN_PARENT_FORBIDDEN','genome.lineage.parentHash','Origin Genome cannot declare a parent hash.'));
  if(genome.lineage.evolution!=='origin'&&!genome.lineage.parentHash)issues.push(failure('TEMPLATE_GENOME_EVOLUTION_PARENT_REQUIRED','genome.lineage.parentHash','Evolved Genome must bind to its parent hash.'));
  if(!genome.lineage.note.trim())issues.push(failure('TEMPLATE_GENOME_LINEAGE_NOTE_REQUIRED','genome.lineage.note','Genome lineage must explain the origin or controlled evolution.'));

  const d=genome.dimensions;
  const scalarChecks:[string,unknown][]=[
    ['dimensions.identity.character',d.identity.character],['dimensions.identity.position',d.identity.position],
    ['dimensions.color.strategy',d.color.strategy],['dimensions.typography.display',d.typography.display],
    ['dimensions.typography.body',d.typography.body],['dimensions.typography.data',d.typography.data],
    ['dimensions.typography.scale',d.typography.scale],['dimensions.spacing.rhythm',d.spacing.rhythm],
    ['dimensions.spacing.density',d.spacing.density],['dimensions.shape.language',d.shape.language],
    ['dimensions.shape.radius',d.shape.radius],['dimensions.shape.border',d.shape.border],
    ['dimensions.motion.character',d.motion.character],['dimensions.composition.grammar',d.composition.grammar],
    ['dimensions.composition.sectionRhythm',d.composition.sectionRhythm],['dimensions.composition.density',d.composition.density],
    ['dimensions.image.language',d.image.language],['dimensions.commerce.character',d.commerce.character],
    ['dimensions.content.voice',d.content.voice],['dimensions.content.hierarchy',d.content.hierarchy],
    ['dimensions.shell.navigation',d.shell.navigation],['dimensions.shell.header',d.shell.header],
    ['dimensions.shell.footer',d.shell.footer],['dimensions.responsive.tabletStrategy',d.responsive.tabletStrategy],
    ['dimensions.responsive.mobileStrategy',d.responsive.mobileStrategy],
  ];
  for(const [path,value] of scalarChecks)if(typeof value!=='string'||!value.trim())issues.push(failure('TEMPLATE_GENOME_DIMENSION_REQUIRED',`genome.${path}`,`${path} must be explicit.`));

  const listChecks:[string,unknown][]=[
    ['dimensions.identity.rules',d.identity.rules],['dimensions.color.rules',d.color.rules],
    ['dimensions.typography.rules',d.typography.rules],['dimensions.spacing.rules',d.spacing.rules],
    ['dimensions.shape.rules',d.shape.rules],['dimensions.motion.rules',d.motion.rules],
    ['dimensions.composition.archetypes',d.composition.archetypes],['dimensions.composition.rules',d.composition.rules],
    ['dimensions.image.roles',d.image.roles],['dimensions.image.rules',d.image.rules],
    ['dimensions.commerce.rules',d.commerce.rules],['dimensions.content.rules',d.content.rules],
    ['dimensions.shell.rules',d.shell.rules],['dimensions.responsive.rules',d.responsive.rules],
    ['dimensions.componentGrammar.preferred',d.componentGrammar.preferred],['dimensions.componentGrammar.rules',d.componentGrammar.rules],
    ['dimensions.exclusion.identities',d.exclusion.identities],['dimensions.exclusion.similarities',d.exclusion.similarities],
    ['dimensions.exclusion.rules',d.exclusion.rules],
  ];
  for(const [path,value] of listChecks)if(!nonEmptyList(value))issues.push(failure('TEMPLATE_GENOME_DIMENSION_LIST_REQUIRED',`genome.${path}`,`${path} requires at least one explicit rule/value.`));
  if(!Object.keys(d.color.tokens).length||Object.entries(d.color.tokens).some(([key,value])=>!key.trim()||!value.trim()))issues.push(failure('TEMPLATE_GENOME_COLOR_TOKENS_REQUIRED','genome.dimensions.color.tokens','Genome color grammar requires non-empty semantic tokens.'));
  if(d.image.forbidConcreteSources!==true)issues.push(failure('TEMPLATE_GENOME_MEDIA_BOUNDARY_REQUIRED','genome.dimensions.image.forbidConcreteSources','Genome must explicitly forbid concrete media sources.'));
  if(containsConcreteMediaSource(d.image))issues.push(failure('TEMPLATE_GENOME_CONCRETE_MEDIA_FORBIDDEN','genome.dimensions.image','Genome may describe semantic media language and roles, but cannot embed concrete media paths or URLs.'));
  if(d.responsive.desktopAuthority!==true)issues.push(failure('TEMPLATE_GENOME_DESKTOP_AUTHORITY_REQUIRED','genome.dimensions.responsive.desktopAuthority','Desktop must remain the primary responsive authority.'));

  if(expected){
    if(genome.identity.category!==expected.category)issues.push(failure('TEMPLATE_GENOME_CATEGORY_DRIFT','genome.identity.category','Genome category must match the Factory recipe/Blueprint.'));
    if(genome.identity.templateKey!==expected.templateKey)issues.push(failure('TEMPLATE_GENOME_TEMPLATE_KEY_DRIFT','genome.identity.templateKey','Genome templateKey must match the Factory recipe/Blueprint.'));
    if(genome.identity.templateVersion!==expected.templateVersion)issues.push(failure('TEMPLATE_GENOME_TEMPLATE_VERSION_DRIFT','genome.identity.templateVersion','Genome templateVersion must match the Factory recipe/Blueprint.'));
    if(expected.displayName!==undefined&&genome.identity.displayName!==expected.displayName)issues.push(failure('TEMPLATE_GENOME_DISPLAY_NAME_DRIFT','genome.identity.displayName','Genome displayName must match the Factory recipe/Blueprint.'));
  }

  const expectedHash=hashStorefrontTemplateGenome(withoutHash(genome));
  if(genome.hash!==expectedHash)issues.push(failure('TEMPLATE_GENOME_HASH_MISMATCH','genome.hash','Stored Genome hash does not match canonical content.'));
  return Object.freeze({valid:issues.length===0,expectedHash,issues:Object.freeze(issues)});
}

export function defineStorefrontTemplateGenome(input:StorefrontTemplateGenomeInput):StorefrontTemplateGenome{
  const cloned=structuredClone(input);
  const genome={...cloned,hash:hashStorefrontTemplateGenome(cloned)} as StorefrontTemplateGenome;
  const validation=validateStorefrontTemplateGenome(genome);
  if(!validation.valid){
    const first=validation.issues[0];
    throw new Error(`${first?.code??'TEMPLATE_GENOME_INVALID'}:${first?.path??'genome'}`);
  }
  return deepFreeze(genome);
}
