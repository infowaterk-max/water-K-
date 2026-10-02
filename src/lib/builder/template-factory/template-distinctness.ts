import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontTemplateGenome} from '@/lib/builder/template-factory/template-genome';

export const STOREFRONT_TEMPLATE_DISTINCTNESS_VERSION='shoporation.template-distinctness.v1' as const;
export const STOREFRONT_TEMPLATE_DISTINCTNESS_AXES=Object.freeze([
  'composition','sectionRhythm','typography','spacing','density','shape','mediaLanguage','interaction',
] as const);
export type StorefrontTemplateDistinctnessAxis=(typeof STOREFRONT_TEMPLATE_DISTINCTNESS_AXES)[number];

export type StorefrontTemplateDistinctnessProfile={
  contract:typeof STOREFRONT_TEMPLATE_DISTINCTNESS_VERSION;
  identity:{templateKey:string;templateVersion:number};
  axes:Readonly<Record<StorefrontTemplateDistinctnessAxis,readonly string[]>>;
};
export type StorefrontTemplateDistinctnessComparison={
  reference:{templateKey:string;templateVersion:number};
  axisSimilarity:Readonly<Record<StorefrontTemplateDistinctnessAxis,number>>;
  overallSimilarity:number;
  criticalAxisHits:readonly StorefrontTemplateDistinctnessAxis[];
  exclusionHits:readonly string[];
  blocked:boolean;
  reasons:readonly string[];
};
export type StorefrontTemplateDistinctnessIssue={code:string;path:string;message:string;severity:'error'};
export type StorefrontTemplateDistinctnessResult={
  contract:typeof STOREFRONT_TEMPLATE_DISTINCTNESS_VERSION;
  valid:boolean;
  candidate:StorefrontTemplateDistinctnessProfile;
  corpusSize:number;
  comparisons:readonly StorefrontTemplateDistinctnessComparison[];
  nearest:readonly StorefrontTemplateDistinctnessComparison[];
  issues:readonly StorefrontTemplateDistinctnessIssue[];
};

const failure=(code:string,path:string,message:string):StorefrontTemplateDistinctnessIssue=>({code,path,message,severity:'error'});
const WEIGHTS:Readonly<Record<StorefrontTemplateDistinctnessAxis,number>>=Object.freeze({
  composition:0.20,sectionRhythm:0.18,typography:0.10,spacing:0.12,density:0.10,shape:0.12,mediaLanguage:0.10,interaction:0.08,
});
const CRITICAL_AXES=Object.freeze([
  'composition','sectionRhythm','spacing','shape','mediaLanguage','interaction',
] as const satisfies readonly StorefrontTemplateDistinctnessAxis[]);
const OVERALL_BLOCK_THRESHOLD=76;
const CRITICAL_AXIS_THRESHOLD=78;
const CRITICAL_AXIS_HIT_BLOCK_COUNT=4;
const EXCLUSION_AXIS_THRESHOLD=70;

function clean(value:unknown):string{
  return String(value??'').trim().toLowerCase()
    .replace(/https?:\/\/[^\s"'()]+/g,'')
    .replace(/\/?[a-z0-9._-]+\.(?:png|jpe?g|webp|svg|gif|avif)(?:[?#][^\s"'()]*)?/g,'')
    .replace(/[^a-z0-9áéíóöőúüű]+/gi,'-').replace(/^-+|-+$/g,'');
}
function primitiveToken(key:string,value:unknown):string|null{
  if(value===null||value===undefined)return null;
  if(typeof value==='string'||typeof value==='number'||typeof value==='boolean'){
    const normalized=clean(value);
    return normalized?clean(key)+':'+normalized:null;
  }
  return null;
}
function sortedUnique(values:Iterable<string>):readonly string[]{
  return Object.freeze([...new Set([...values].filter(Boolean))].sort());
}
function deepFreeze<T>(value:T):T{
  if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
  Object.freeze(value);
  for(const child of Object.values(value as Record<string,unknown>))deepFreeze(child);
  return value;
}
function walk(nodes:readonly StorefrontComponentNode[],visitor:(node:StorefrontComponentNode,path:string)=>void,path='root'):void{
  nodes.forEach((node,index)=>{
    const next=path+'.'+index+'.'+node.componentKey;
    visitor(node,next);
    if(node.children?.length)walk(node.children,visitor,next);
  });
}
function valuesByKey(value:unknown,keyPattern:RegExp,out:Set<string>):void{
  if(Array.isArray(value)){
    value.forEach(child=>valuesByKey(child,keyPattern,out));
    return;
  }
  if(!value||typeof value!=='object')return;
  for(const key of Object.keys(value as Record<string,unknown>).sort()){
    const child=(value as Record<string,unknown>)[key];
    if(keyPattern.test(key)){
      if(Array.isArray(child)){
        for(const item of child){const token=primitiveToken(key,item);if(token)out.add(token);}
      }else{
        const token=primitiveToken(key,child);if(token)out.add(token);
      }
    }
    valuesByKey(child,keyPattern,out);
  }
}
function firstVisualDescendant(node:StorefrontComponentNode):string{
  const generic=new Set(['layout.section','layout.container','layout.grid','layout.stack']);
  if(!generic.has(node.componentKey))return node.componentKey;
  for(const child of node.children??[]){
    const found=firstVisualDescendant(child);
    if(found)return found;
  }
  return node.componentKey;
}
function countNodes(page:StorefrontPageDocument):number{
  let count=0;walk(page.sections,()=>{count+=1;});return count;
}
function bucket(value:number):string{
  if(value<=3)return'xs';if(value<=6)return's';if(value<=10)return'm';if(value<=18)return'l';return'xl';
}
function packageAxes(pkg:StorefrontInstallableTemplatePackage):Record<StorefrontTemplateDistinctnessAxis,Set<string>>{
  const axes=Object.fromEntries(STOREFRONT_TEMPLATE_DISTINCTNESS_AXES.map(axis=>[axis,new Set<string>()])) as Record<StorefrontTemplateDistinctnessAxis,Set<string>>;
  const home=pkg.pages.find(page=>page.pageType==='home')??pkg.pages[0];
  for(const page of pkg.pages){
    axes.density.add('page:'+page.pageType+':sections:'+bucket(page.sections.length));
    axes.density.add('page:'+page.pageType+':nodes:'+bucket(countNodes(page)));
    walk(page.sections,(node,path)=>{
      const component=node.componentKey;
      const generic=/^(?:layout\.(?:section|container|grid|stack)|system\.(?:header|commerce-header)|editorial\.footer)$/;
      if(!generic.test(component)){
        axes.composition.add('component:'+component);
        if(page.pageType==='home')axes.composition.add('home-path:'+clean(path.replace(/\d+/g,'#')));
      }
      if(/(?:image|hero|story|gallery|media|product-grid|collection-navigation|recommendation)/i.test(component))axes.mediaLanguage.add('component:'+component);
      if(/(?:search|navigation|selector|finder|filter|accordion|button|cart|checkout|wishlist|compare|compatibility|recommendation)/i.test(component))axes.interaction.add('component:'+component);
      valuesByKey(node.config,/^(?:font|fontFamily|fontSize|fontWeight|typography|letterSpacing|lineHeight|textTransform)/i,axes.typography);
      valuesByKey(node.config,/^(?:spacing|gap|padding|paddingTop|paddingBottom|paddingLeft|paddingRight|margin|marginTop|marginBottom)/i,axes.spacing);
      valuesByKey(node.config,/^(?:border|borderRadius|radius|boxShadow|presentation|tone)$/i,axes.shape);
      valuesByKey(node.config,/^(?:imageRatio|aspectRatio|fit|objectFit|objectPosition|presentation)$/i,axes.mediaLanguage);
      valuesByKey(node.config,/^(?:sticky|layout|showCta|showPurchaseActions|showCompareAt|showBadges|columns)$/i,axes.interaction);
      valuesByKey(node.config,/^(?:columns)$/i,axes.density);
    });
  }
  if(home){
    home.sections.forEach((section,index)=>{
      const key=firstVisualDescendant(section);
      if(!/^(?:system\.(?:header|commerce-header)|editorial\.footer)$/.test(key))axes.sectionRhythm.add('slot:'+index+':'+key);
    });
    axes.sectionRhythm.add('home-sections:'+bucket(home.sections.length));
  }
  return axes;
}
function addGenomeEvidence(axes:Record<StorefrontTemplateDistinctnessAxis,Set<string>>,genome:StorefrontTemplateGenome|undefined|null):void{
  if(!genome)return;const d=genome.dimensions;
  for(const value of [d.composition.grammar,...d.composition.archetypes,...d.componentGrammar.preferred]){const token=clean(value);if(token)axes.composition.add('genome:'+token);}
  for(const value of [d.composition.sectionRhythm,...d.composition.rules]){const token=clean(value);if(token)axes.sectionRhythm.add('genome:'+token);}
  for(const value of [d.typography.display,d.typography.body,d.typography.data,d.typography.scale,...d.typography.rules]){const token=clean(value);if(token)axes.typography.add('genome:'+token);}
  for(const value of [d.spacing.rhythm,d.spacing.density,...d.spacing.rules]){const token=clean(value);if(token)axes.spacing.add('genome:'+token);}
  for(const value of [d.spacing.density,d.composition.density]){const token=clean(value);if(token)axes.density.add('genome:'+token);}
  for(const value of [d.shape.language,d.shape.radius,d.shape.border,...d.shape.rules]){const token=clean(value);if(token)axes.shape.add('genome:'+token);}
  for(const value of [d.image.language,...d.image.roles,...d.image.rules]){const token=clean(value);if(token)axes.mediaLanguage.add('genome:'+token);}
  for(const value of [d.motion.character,d.motion.intensity,...d.motion.rules,d.commerce.character]){const token=clean(value);if(token)axes.interaction.add('genome:'+token);}
}
export function createStorefrontTemplateDistinctnessProfile(input:{package:StorefrontInstallableTemplatePackage;genome?:StorefrontTemplateGenome|null}):StorefrontTemplateDistinctnessProfile{
  const axes=packageAxes(input.package);addGenomeEvidence(axes,input.genome);
  return deepFreeze({
    contract:STOREFRONT_TEMPLATE_DISTINCTNESS_VERSION,
    identity:{templateKey:input.package.manifest.templateKey,templateVersion:input.package.manifest.templateVersion},
    axes:Object.fromEntries(STOREFRONT_TEMPLATE_DISTINCTNESS_AXES.map(axis=>[axis,sortedUnique(axes[axis])])) as Record<StorefrontTemplateDistinctnessAxis,readonly string[]>,
  });
}
function jaccard(left:readonly string[],right:readonly string[]):number{
  const a=new Set(left),b=new Set(right);if(!a.size&&!b.size)return 100;
  const union=new Set([...a,...b]);let intersection=0;for(const item of a)if(b.has(item))intersection+=1;
  return Math.round((intersection/Math.max(1,union.size))*100);
}
function referenceSlug(templateKey:string):string{return clean(templateKey.split('.').at(-1)??templateKey);}
function exclusionHits(genome:StorefrontTemplateGenome|undefined|null,templateKey:string):string[]{
  if(!genome)return[];const slug=referenceSlug(templateKey);if(!slug)return[];
  return [...genome.dimensions.exclusion.identities,...genome.dimensions.exclusion.similarities].filter(value=>clean(value).includes(slug));
}
function compare(candidate:StorefrontTemplateDistinctnessProfile,reference:StorefrontTemplateDistinctnessProfile,genome?:StorefrontTemplateGenome|null):StorefrontTemplateDistinctnessComparison{
  const axisSimilarity=Object.fromEntries(STOREFRONT_TEMPLATE_DISTINCTNESS_AXES.map(axis=>[axis,jaccard(candidate.axes[axis],reference.axes[axis])])) as Record<StorefrontTemplateDistinctnessAxis,number>;
  const overallSimilarity=Math.round(STOREFRONT_TEMPLATE_DISTINCTNESS_AXES.reduce((sum,axis)=>sum+axisSimilarity[axis]*WEIGHTS[axis],0));
  const criticalAxisHits=CRITICAL_AXES.filter(axis=>axisSimilarity[axis]>=CRITICAL_AXIS_THRESHOLD);
  const exclusions=exclusionHits(genome,reference.identity.templateKey);
  const exclusionAxisHits=exclusions.length?CRITICAL_AXES.filter(axis=>axisSimilarity[axis]>=EXCLUSION_AXIS_THRESHOLD):[];
  const reasons:string[]=[];
  if(overallSimilarity>=OVERALL_BLOCK_THRESHOLD)reasons.push('overall-similarity:'+overallSimilarity);
  if(criticalAxisHits.length>=CRITICAL_AXIS_HIT_BLOCK_COUNT)reasons.push('critical-axis-cluster:'+criticalAxisHits.join(','));
  if(exclusions.length&&exclusionAxisHits.length>=3)reasons.push('genome-exclusion:'+exclusions.join('|')+':'+exclusionAxisHits.join(','));
  return deepFreeze({reference:reference.identity,axisSimilarity,overallSimilarity,criticalAxisHits,exclusionHits:exclusions,blocked:reasons.length>0,reasons});
}
export function evaluateStorefrontTemplateDistinctness(input:{package:StorefrontInstallableTemplatePackage;genome?:StorefrontTemplateGenome|null;references:readonly StorefrontInstallableTemplatePackage[]}):StorefrontTemplateDistinctnessResult{
  const candidate=createStorefrontTemplateDistinctnessProfile({package:input.package,genome:input.genome});
  const references=input.references.filter(ref=>ref.manifest.templateKey!==candidate.identity.templateKey);
  const issues:StorefrontTemplateDistinctnessIssue[]=[];
  if(!references.length)issues.push(failure('DISTINCTNESS_REFERENCE_CORPUS_EMPTY','references','Cross-template distinctness requires at least one foreign canonical template reference.'));
  const comparisons=references.map(reference=>compare(candidate,createStorefrontTemplateDistinctnessProfile({package:reference}),input.genome))
    .sort((a,b)=>b.overallSimilarity-a.overallSimilarity||a.reference.templateKey.localeCompare(b.reference.templateKey));
  for(const row of comparisons.filter(item=>item.blocked)){
    issues.push(failure('DISTINCTNESS_SIMILARITY_BUDGET_EXCEEDED','references.'+row.reference.templateKey+'@'+row.reference.templateVersion,'Cross-template distinctness blocked by '+row.reasons.join('; ')+'.'));
  }
  return deepFreeze({contract:STOREFRONT_TEMPLATE_DISTINCTNESS_VERSION,valid:issues.length===0,candidate,corpusSize:references.length,comparisons,nearest:comparisons.slice(0,5),issues});
}
