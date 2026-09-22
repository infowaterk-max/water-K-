import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {
  STOREFRONT_PRESET_APPLICATION_VERSION,
  applyStorefrontComponentPresetAppearance,
  createStorefrontBuilderPresetLibrary,
  insertStorefrontSectionPreset,
} from '@/lib/builder/storefront-preset-application';
import {STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES} from '@/lib/builder/storefront-template-catalog';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const registry=createStorefrontVisualBuilderComponentRegistry();
const template=STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES[0]!;
const sourcePage=template.pages[0]!;
const read=(file:string)=>readFileSync(resolve(process.cwd(),file),'utf8');
const panelSource=read('src/components/admin/storefront-saved-blocks-panel.tsx');
const actionSource=read('src/app/admin/tartalom/builder/preset-actions.ts');
const applicationSource=read('src/lib/builder/storefront-preset-application.ts');

function findNode(document:StorefrontPageDocument,id:string):StorefrontComponentNode|undefined{
  const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode|undefined=>{for(const node of nodes){if(node.id===id)return node;const nested=walk(node.children??[]);if(nested)return nested;}return undefined;};
  return walk(document.sections);
}

describe('storefront preset library / application v1',()=>{
  it('builds the Builder library from the existing canonical preset bundle and excludes protected system sources',()=>{
    const library=createStorefrontBuilderPresetLibrary(template,structuredClone(sourcePage));
    expect(library.version).toBe(STOREFRONT_PRESET_APPLICATION_VERSION);
    expect(library.templateKey).toBe(template.manifest.templateKey);
    expect(library.templateVersion).toBe(template.manifest.templateVersion);
    expect(library.sourcePageKey).toBe(sourcePage.pageKey);
    expect(library.sectionPresets.length).toBeGreaterThan(0);
    expect(library.sectionPresets.every(preset=>preset.componentKey!=='system.header')).toBe(true);
    expect(library.componentPresets.every(preset=>preset.componentKey!=='system.header'&&preset.componentKey!=='system.navigation')).toBe(true);
    expect(applicationSource).toContain('createStorefrontPresetBundle');
    expect(applicationSource).toContain('materializeStorefrontSectionPreset');
    expect(applicationSource).toContain('materializeStorefrontComponentPreset');
  });

  it('inserts section presets as detached canonical sections with fresh recursive identity',()=>{
    const page=structuredClone(sourcePage) as StorefrontPageDocument;
    const library=createStorefrontBuilderPresetLibrary(template,page);
    const preset=library.sectionPresets[0]!;
    const sourceRootId=preset.fragment.id;
    const beforeIds=new Set<string>();
    const collect=(nodes:readonly StorefrontComponentNode[])=>nodes.forEach(node=>{beforeIds.add(node.id);collect(node.children??[]);});
    collect(page.sections);
    const inserted=insertStorefrontSectionPreset(page,preset,registry);
    expect(inserted.document.sections).toHaveLength(page.sections.length+1);
    expect(inserted.insertedNodeId).not.toBe(sourceRootId);
    expect(beforeIds.has(inserted.insertedNodeId)).toBe(false);
    expect(page.sections).toHaveLength(sourcePage.sections.length);
  });

  it('applies only appearance/responsive data to a compatible component and preserves merchant content, bindings and children',()=>{
    const page=structuredClone(sourcePage) as StorefrontPageDocument;
    const library=createStorefrontBuilderPresetLibrary(template,page);
    const choice=library.componentPresets.map(preset=>({preset,node:findNode(page,preset.sourceNodeId)})).find(item=>item.node&&Object.keys(item.node.config).some(key=>!(key in item.preset.visualConfig)&&typeof item.node?.config[key]==='string'));
    expect(choice?.node).toBeTruthy();
    if(!choice?.node)throw new Error('TEST_COMPONENT_PRESET_WITH_CONTENT_NOT_FOUND');
    const contentKey=Object.keys(choice.node.config).find(key=>!(key in choice.preset.visualConfig)&&typeof choice.node?.config[key]==='string')!;
    choice.node.config[contentKey]='MERCHANT-CONTENT-MUST-SURVIVE';
    const bindings=structuredClone(choice.node.bindings);
    const children=structuredClone(choice.node.children);
    const next=applyStorefrontComponentPresetAppearance(page,{nodeId:choice.node.id,preset:choice.preset},registry);
    const applied=findNode(next,choice.node.id)!;
    expect(applied.config[contentKey]).toBe('MERCHANT-CONTENT-MUST-SURVIVE');
    expect(applied.bindings).toEqual(bindings);
    expect(applied.children).toEqual(children);
  });

  it('fails closed for mismatched or unsafe component preset payloads',()=>{
    const page=structuredClone(sourcePage) as StorefrontPageDocument;
    const library=createStorefrontBuilderPresetLibrary(template,page);
    const preset=library.componentPresets[0]!;
    const target=findNode(page,preset.sourceNodeId)!;
    expect(()=>applyStorefrontComponentPresetAppearance(page,{nodeId:target.id,preset:{...preset,componentKey:'content.__mismatch'}},registry)).toThrow('STOREFRONT_PRESET_COMPONENT_MISMATCH');
    expect(()=>applyStorefrontComponentPresetAppearance(page,{nodeId:target.id,preset:{...preset,visualConfig:{...preset.visualConfig,text:'unsafe overwrite'}}},registry)).toThrow('STOREFRONT_PRESET_VISUAL_CONFIG_INVALID');
  });

  it('loads presets through a tenant-scoped server action bound to the current stored page rather than a client-selected template',()=>{
    expect(actionSource).toContain("requireCurrentStoreContext('store.manage')");
    expect(actionSource).toContain('getCurrentStorefrontPageState(pageKey)');
    expect(actionSource).toContain('getStorefrontTemplatePackage(document.templateKey,document.templateVersion)');
    expect(actionSource).not.toContain('input.templateKey');
    expect(actionSource).not.toContain('input.templateVersion');
  });

  it('wires the library into the existing Add panel working-copy path without regressing Saved Blocks operation keys',()=>{
    expect(panelSource).toContain('data-storefront-preset-library-v1');
    expect(panelSource).toContain('listVisualBuilderPresetLibraryAction');
    expect(panelSource).toContain('insertStorefrontSectionPreset');
    expect(panelSource).toContain('applyStorefrontComponentPresetAppearance');
    expect(panelSource).toContain("operationKey('create')");
    expect(panelSource).toContain("operationKey('update')");
    expect(panelSource).toContain("operationKey('delete')");
    expect(panelSource).not.toContain('materializeStorefrontPagePreset');
    expect(panelSource).not.toContain('materializeStorefrontTemplatePreset');
  });
});
