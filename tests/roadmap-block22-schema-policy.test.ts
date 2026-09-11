import {describe,expect,it} from 'vitest';
import {STOREFRONT_NEUTRAL_REFERENCE_PAGE} from '@/lib/builder/storefront-primitives';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {validateStorefrontBuilderSchemaStructure} from '@/lib/builder/storefront-builder-schema-policy';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const registry=createStorefrontVisualBuilderComponentRegistry();
const fresh=()=>structuredClone(STOREFRONT_NEUTRAL_REFERENCE_PAGE) as StorefrontPageDocument;
const find=(document:StorefrontPageDocument,id:string)=>{
  let result:StorefrontComponentNode|undefined;
  const walk=(nodes:StorefrontComponentNode[])=>nodes.forEach(node=>{if(node.id===id)result=node;walk(node.children??[])});
  walk(document.sections);
  return result;
};

describe('Roadmap Block 22 schema-slot persistence policy',()=>{
  it('accepts the canonical reference Page Schema',()=>{
    expect(validateStorefrontBuilderSchemaStructure({document:fresh(),registry})).toBe(true);
  });

  it('rejects a top-level section injected into a child slot',()=>{
    const document=fresh();
    const nested=find(document,'reference-hero-stack');
    const section=document.sections.find(node=>node.componentKey==='layout.section');
    expect(nested).toBeTruthy();
    expect(section).toBeTruthy();
    nested!.children=[...(nested!.children??[]),structuredClone(section!)];
    document.sections=document.sections.filter(node=>node.id!==section!.id);
    expect(()=>validateStorefrontBuilderSchemaStructure({document,registry})).toThrow('BUILDER_SCHEMA_SECTION_NESTING_FORBIDDEN');
  });

  it('rejects protected system nodes nested below the page root',()=>{
    const document=fresh();
    const nested=find(document,'reference-hero-stack');
    const protectedNode=document.sections.find(node=>node.id==='reference-navigation');
    expect(nested).toBeTruthy();
    expect(protectedNode).toBeTruthy();
    nested!.children=[...(nested!.children??[]),structuredClone(protectedNode!)];
    document.sections=document.sections.filter(node=>node.id!==protectedNode!.id);
    expect(()=>validateStorefrontBuilderSchemaStructure({document,registry})).toThrow('BUILDER_SCHEMA_PROTECTED_NESTING_FORBIDDEN');
  });
});
