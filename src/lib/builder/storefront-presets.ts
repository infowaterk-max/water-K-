import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';

export const STOREFRONT_PRESET_SYSTEM_VERSION='shoporation.storefront-presets.v1' as const;

export type StorefrontComponentPreset={
  presetId:string;
  label:string;
  pageKey:string;
  nodeId:string;
  componentKey:string;
  componentVersion:number;
};

export type StorefrontSectionPreset={
  presetId:string;
  label:string;
  pageKey:string;
  nodeId:string;
};

export type StorefrontPagePreset={
  presetId:string;
  label:string;
  pageKey:string;
  pageType:StorefrontPageDocument['pageType'];
};

export type StorefrontTemplatePresetBundle={
  version:typeof STOREFRONT_PRESET_SYSTEM_VERSION;
  templateKey:string;
  templateVersion:number;
  templatePreset:{presetId:string;label:string;pagePresetIds:readonly string[]};
  pagePresets:readonly StorefrontPagePreset[];
  sectionPresets:readonly StorefrontSectionPreset[];
  componentPresets:readonly StorefrontComponentPreset[];
};

const clone=<T>(value:T):T=>structuredClone(value);
const humanize=(value:string)=>value
  .replace(/([a-z0-9])([A-Z])/g,'$1 $2')
  .replace(/[._:-]+/g,' ')
  .replace(/\b\w/g,letter=>letter.toUpperCase());

function walk(nodes:readonly StorefrontComponentNode[],visit:(node:StorefrontComponentNode)=>void){
  for(const node of nodes){visit(node);walk(node.children??[],visit);}
}

export function createStorefrontPresetBundle(template:StorefrontInstallableTemplatePackage):StorefrontTemplatePresetBundle{
  const pagePresets:StorefrontPagePreset[]=template.pages.map(page=>({
    presetId:`${template.manifest.templateKey}@${template.manifest.templateVersion}:page:${page.pageKey}`,
    label:humanize(page.pageKey),
    pageKey:page.pageKey,
    pageType:page.pageType,
  }));
  const sectionPresets:StorefrontSectionPreset[]=[];
  const componentPresets:StorefrontComponentPreset[]=[];
  for(const page of template.pages){
    for(const section of page.sections){
      sectionPresets.push({presetId:`${template.manifest.templateKey}@${template.manifest.templateVersion}:section:${page.pageKey}:${section.id}`,label:humanize(section.id),pageKey:page.pageKey,nodeId:section.id});
    }
    walk(page.sections,node=>componentPresets.push({presetId:`${template.manifest.templateKey}@${template.manifest.templateVersion}:component:${page.pageKey}:${node.id}`,label:humanize(node.id),pageKey:page.pageKey,nodeId:node.id,componentKey:node.componentKey,componentVersion:node.componentVersion}));
  }
  return Object.freeze({
    version:STOREFRONT_PRESET_SYSTEM_VERSION,
    templateKey:template.manifest.templateKey,
    templateVersion:template.manifest.templateVersion,
    templatePreset:Object.freeze({presetId:`${template.manifest.templateKey}@${template.manifest.templateVersion}:template`,label:humanize(template.manifest.templateKey),pagePresetIds:Object.freeze(pagePresets.map(item=>item.presetId))}),
    pagePresets:Object.freeze(pagePresets),
    sectionPresets:Object.freeze(sectionPresets),
    componentPresets:Object.freeze(componentPresets),
  });
}

const pageFor=(template:StorefrontInstallableTemplatePackage,pageKey:string)=>{
  const page=template.pages.find(candidate=>candidate.pageKey===pageKey);
  if(!page)throw new Error('STOREFRONT_PRESET_PAGE_NOT_FOUND');
  return page;
};

const nodeFor=(page:StorefrontPageDocument,nodeId:string)=>{
  let found:StorefrontComponentNode|undefined;
  walk(page.sections,node=>{if(node.id===nodeId)found=node;});
  if(!found)throw new Error('STOREFRONT_PRESET_NODE_NOT_FOUND');
  return found;
};

/** Materializes the existing canonical Page Schema. It never creates a second page authority. */
export function materializeStorefrontPagePreset(template:StorefrontInstallableTemplatePackage,preset:StorefrontPagePreset):StorefrontPageDocument{
  if(template.manifest.templateKey!==preset.presetId.split('@')[0])throw new Error('STOREFRONT_PRESET_TEMPLATE_MISMATCH');
  return clone(pageFor(template,preset.pageKey));
}

/** Section presets are deep clones of canonical top-level Page Schema nodes. */
export function materializeStorefrontSectionPreset(template:StorefrontInstallableTemplatePackage,preset:StorefrontSectionPreset):StorefrontComponentNode{
  const page=pageFor(template,preset.pageKey);
  const section=page.sections.find(candidate=>candidate.id===preset.nodeId);
  if(!section)throw new Error('STOREFRONT_PRESET_SECTION_NOT_FOUND');
  return clone(section);
}

/** Component presets are deep clones of canonical Page Schema component nodes. */
export function materializeStorefrontComponentPreset(template:StorefrontInstallableTemplatePackage,preset:StorefrontComponentPreset):StorefrontComponentNode{
  return clone(nodeFor(pageFor(template,preset.pageKey),preset.nodeId));
}

export function materializeStorefrontTemplatePreset(template:StorefrontInstallableTemplatePackage,bundle:StorefrontTemplatePresetBundle):readonly StorefrontPageDocument[]{
  if(bundle.templateKey!==template.manifest.templateKey||bundle.templateVersion!==template.manifest.templateVersion)throw new Error('STOREFRONT_PRESET_TEMPLATE_MISMATCH');
  return Object.freeze(bundle.pagePresets.map(preset=>materializeStorefrontPagePreset(template,preset)));
}
