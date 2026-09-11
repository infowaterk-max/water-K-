import type {StorefrontComponentNode,StorefrontComponentRegistry,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_BUILDER_SCHEMA_POLICY_VERSION='shoporation.storefront-builder-schema-policy.block22.v1' as const;

const protectedSlot=(slot:string)=>slot==='protected.header'||slot==='protected.navigation';

/**
 * Enforces the Page Schema hierarchy independently from the client Builder.
 * This guard is intentionally run again on the server immediately before the
 * canonical draft persistence authority.
 */
export function validateStorefrontBuilderSchemaStructure(input:{
  document:StorefrontPageDocument;
  registry:StorefrontComponentRegistry;
}){
  const walk=(node:StorefrontComponentNode,parent:StorefrontComponentNode|null,path:string)=>{
    const definition=input.registry.get(node.componentKey,node.componentVersion);
    if(!definition)throw new Error(`BUILDER_SCHEMA_COMPONENT_NOT_REGISTERED:${path}`);
    const slot=definition.manifest.schemaSlot;
    if(parent===null){
      if(slot!=='sections'&&!protectedSlot(slot))throw new Error(`BUILDER_SCHEMA_TOP_LEVEL_SLOT_FORBIDDEN:${path}`);
      if(protectedSlot(slot)&&!definition.protectedSystem)throw new Error(`BUILDER_SCHEMA_PROTECTED_SLOT_INVALID:${path}`);
    }else{
      const parentDefinition=input.registry.get(parent.componentKey,parent.componentVersion);
      if(!parentDefinition?.allowsChildren)throw new Error(`BUILDER_SCHEMA_PARENT_CHILDREN_FORBIDDEN:${path}`);
      if(slot==='sections')throw new Error(`BUILDER_SCHEMA_SECTION_NESTING_FORBIDDEN:${path}`);
      if(protectedSlot(slot)){
        const canonicalProtectedChild=
          slot==='protected.navigation'&&
          definition.protectedSystem===true&&
          parentDefinition.protectedSystem===true&&
          parentDefinition.manifest.schemaSlot==='protected.header'&&
          parentDefinition.allowedChildren?.includes(node.componentKey)===true;
        if(!canonicalProtectedChild)throw new Error(`BUILDER_SCHEMA_PROTECTED_NESTING_FORBIDDEN:${path}`);
      }
      if(parentDefinition.allowedChildren&&!parentDefinition.allowedChildren.includes(node.componentKey))throw new Error(`BUILDER_SCHEMA_CHILD_NOT_ALLOWED:${path}`);
    }
    (node.children??[]).forEach((child,index)=>walk(child,node,`${path}.children[${index}]`));
  };
  input.document.sections.forEach((section,index)=>walk(section,null,`sections[${index}]`));
  return true;
}
