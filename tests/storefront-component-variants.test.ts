import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {
  STOREFRONT_COMPONENT_VARIANT_SAFE_CONFIG_KEYS,
  STOREFRONT_COMPONENT_VARIANTS_VERSION,
  applyStorefrontComponentVariant,
  detectStorefrontComponentVariant,
  listStorefrontComponentVariants,
  listStorefrontVariantCapableNodes,
} from '@/lib/builder/storefront-component-variants';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {STOREFRONT_NEUTRAL_REFERENCE_PAGE} from '@/lib/builder/storefront-primitives';
import {validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const registry=createStorefrontVisualBuilderComponentRegistry();
const read=(file:string)=>readFileSync(resolve(process.cwd(),file),'utf8');
const controlsSource=read('src/components/admin/storefront-component-variant-controls.tsx');
const settingsSource=read('src/components/admin/storefront-fidelity-settings.tsx');
const clonePage=()=>structuredClone(STOREFRONT_NEUTRAL_REFERENCE_PAGE) as StorefrontPageDocument;

function findNode(document:StorefrontPageDocument,id:string):StorefrontComponentNode{
  const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode|undefined=>{
    for(const node of nodes){if(node.id===id)return node;const nested=walk(node.children??[]);if(nested)return nested;}
    return undefined;
  };
  const found=walk(document.sections);
  if(!found)throw new Error(`TEST_NODE_NOT_FOUND:${id}`);
  return found;
}

describe('storefront component variants v1',()=>{
  it('uses the canonical component registry and exposes presentation-only variants',()=>{
    expect(STOREFRONT_COMPONENT_VARIANTS_VERSION).toBe('shoporation.storefront-component-variants.v1');
    expect(STOREFRONT_COMPONENT_VARIANT_SAFE_CONFIG_KEYS).not.toContain('text');
    expect(STOREFRONT_COMPONENT_VARIANT_SAFE_CONFIG_KEYS).not.toContain('label');
    expect(STOREFRONT_COMPONENT_VARIANT_SAFE_CONFIG_KEYS).not.toContain('href');
    expect(STOREFRONT_COMPONENT_VARIANT_SAFE_CONFIG_KEYS).not.toContain('src');
    expect(STOREFRONT_COMPONENT_VARIANT_SAFE_CONFIG_KEYS).not.toContain('items');
    const page=clonePage();
    const button=findNode(page,'reference-cta');
    const variants=listStorefrontComponentVariants(registry,button);
    expect(variants.map(item=>item.variantId)).toEqual(expect.arrayContaining(['primary','secondary','ghost','editorial']));
    const configurable=new Set(registry.get(button.componentKey,button.componentVersion)?.manifest.configurable??[]);
    for(const variant of variants)for(const key of Object.keys(variant.config))expect(configurable.has(key)).toBe(true);
  });

  it('applies a variant without mutating content, bindings, children or responsive state',()=>{
    const page=clonePage();
    const before=findNode(page,'reference-cta');
    const snapshot=structuredClone(before);
    const next=applyStorefrontComponentVariant(page,{nodeId:'reference-cta',variantId:'secondary'},registry);
    const after=findNode(next,'reference-cta');
    expect(after.config.variant).toBe('secondary');
    expect(after.config.size).toBe('m');
    expect(after.config.label).toBe(snapshot.config.label);
    expect(after.config.href).toBe(snapshot.config.href);
    expect(after.bindings).toEqual(snapshot.bindings);
    expect(after.children).toEqual(snapshot.children);
    expect(after.responsive).toEqual(snapshot.responsive);
    expect(findNode(page,'reference-cta').config.variant).toBe('primary');
    expect(validateStorefrontPageDocument(next,registry).ok).toBe(true);
  });

  it('detects exact presentation variants and falls back to custom after manual presentation edits',()=>{
    const page=clonePage();
    const next=applyStorefrontComponentVariant(page,{nodeId:'reference-cta',variantId:'secondary'},registry);
    const button=findNode(next,'reference-cta');
    expect(detectStorefrontComponentVariant(registry,button)?.variantId).toBe('secondary');
    button.config.size='l';
    expect(detectStorefrontComponentVariant(registry,button)).toBeNull();
  });

  it('keeps variant identity out of Page Schema and preserves section structure',()=>{
    const page=clonePage();
    const originalSection=findNode(page,'reference-hero');
    const childIds=originalSection.children?.map(child=>child.id);
    const next=applyStorefrontComponentVariant(page,{nodeId:'reference-hero',variantId:'flush'},registry);
    const section=findNode(next,'reference-hero');
    expect(section.config.presentation).toBe('flush');
    expect(section.children?.map(child=>child.id)).toEqual(childIds);
    expect(section).not.toHaveProperty('variantId');
    expect(JSON.stringify(next.metadata??{})).not.toContain('componentVariant');
  });

  it('lists only nodes with registry-compatible variants and fails closed for unknown targets',()=>{
    const page=clonePage();
    const candidates=listStorefrontVariantCapableNodes(page,registry);
    expect(candidates.some(node=>node.id==='reference-cta')).toBe(true);
    expect(candidates.some(node=>node.id==='reference-title')).toBe(true);
    expect(()=>applyStorefrontComponentVariant(page,{nodeId:'missing',variantId:'primary'},registry)).toThrow('STOREFRONT_COMPONENT_VARIANT_NODE_NOT_FOUND');
    expect(()=>applyStorefrontComponentVariant(page,{nodeId:'reference-cta',variantId:'missing'},registry)).toThrow('STOREFRONT_COMPONENT_VARIANT_NOT_FOUND');
  });

  it('wires the intent-based control into the existing Fidelity Settings without a new publication authority',()=>{
    expect(controlsSource).toContain('data-storefront-component-variants-v1');
    expect(controlsSource).toContain('applyStorefrontComponentVariant');
    expect(controlsSource).toContain('Egyedi');
    expect(controlsSource).toContain('nem ír át tartalmat, bindingot, termékadatot vagy oldalszerkezetet');
    expect(settingsSource).toContain('StorefrontComponentVariantControls');
    expect(settingsSource).toContain('<StorefrontComponentVariantControls document={document} onApply={onApply}/>');
    expect(controlsSource).not.toContain('saveVisualBuilderDraftAction');
    expect(controlsSource).not.toContain('publishVisualBuilderPageAction');
  });
});
