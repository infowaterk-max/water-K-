import {Fragment,type ReactNode} from 'react';
import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import {materializeStorefrontFidelityPage} from '@/lib/builder/storefront-fidelity-engine';
import {
  StorefrontComponentRegistry,
  type StorefrontPageDocument,
  type StorefrontResolvedComponentNode,
  type StorefrontRuntimeCapabilityContext,
  type StorefrontRuntimeViolation,
  resolveStorefrontPageDocument,
  validateStorefrontPageDocument,
} from '@/lib/builder/storefront-runtime';

export type StorefrontComponentRenderProps={
  node:StorefrontResolvedComponentNode;
  config:Record<string,unknown>;
  children:ReactNode;
  page:StorefrontPageDocument;
  viewport:StorefrontViewport;
};

export type StorefrontComponentRenderer=(props:StorefrontComponentRenderProps)=>ReactNode;

type RendererVersionMap=Map<number,StorefrontComponentRenderer>;

export class StorefrontRendererRegistry{
  private readonly renderers=new Map<string,RendererVersionMap>();

  register(componentKey:string,componentVersion:number,renderer:StorefrontComponentRenderer):this{
    if(!componentKey.trim()||!Number.isInteger(componentVersion)||componentVersion<1)throw new Error('STOREFRONT_RENDERER_ID_INVALID');
    const versions=this.renderers.get(componentKey)??new Map<number,StorefrontComponentRenderer>();
    if(versions.has(componentVersion))throw new Error('STOREFRONT_RENDERER_DUPLICATE');
    versions.set(componentVersion,renderer);
    this.renderers.set(componentKey,versions);
    return this;
  }

  get(componentKey:string,componentVersion:number):StorefrontComponentRenderer|undefined{
    return this.renderers.get(componentKey)?.get(componentVersion);
  }

  /** Read-only composition surface used by Block 22 to combine existing renderer families. */
  list():readonly {componentKey:string;componentVersion:number;renderer:StorefrontComponentRenderer}[]{
    return [...this.renderers.entries()].flatMap(([componentKey,versions])=>[...versions.entries()].map(([componentVersion,renderer])=>({componentKey,componentVersion,renderer})))
      .sort((a,b)=>a.componentKey.localeCompare(b.componentKey)||a.componentVersion-b.componentVersion);
  }
}

export class StorefrontRuntimeRenderError extends Error{
  readonly violations:readonly StorefrontRuntimeViolation[];
  constructor(message:string,violations:readonly StorefrontRuntimeViolation[]=[]){
    super(message);
    this.name='StorefrontRuntimeRenderError';
    this.violations=violations;
  }
}

export function StorefrontRuntimeRenderer({
  page,
  viewport,
  bindingContext,
  componentRegistry,
  rendererRegistry,
  capability,
  decorateNode,
}:{
  page:StorefrontPageDocument;
  viewport:StorefrontViewport;
  bindingContext:Record<string,unknown>;
  componentRegistry:StorefrontComponentRegistry;
  rendererRegistry:StorefrontRendererRegistry;
  capability?:StorefrontRuntimeCapabilityContext;
  decorateNode?:(node:StorefrontResolvedComponentNode,rendered:ReactNode)=>ReactNode;
}){
  const runtimePage=materializeStorefrontFidelityPage(page,viewport);
  const validation=validateStorefrontPageDocument(runtimePage,componentRegistry,capability);
  if(!validation.ok)throw new StorefrontRuntimeRenderError('STOREFRONT_PAGE_VALIDATION_FAILED',validation.violations);
  const sections=resolveStorefrontPageDocument(runtimePage,viewport,bindingContext);

  const renderNode=(node:StorefrontResolvedComponentNode):ReactNode=>{
    if(node.resolved.hidden)return null;
    const renderer=rendererRegistry.get(node.componentKey,node.componentVersion);
    if(!renderer)throw new StorefrontRuntimeRenderError('STOREFRONT_RENDERER_NOT_REGISTERED',[
      {code:'RENDERER_NOT_REGISTERED',path:node.id,message:'No renderer is registered for the component key/version.',severity:'error',metadata:{componentKey:node.componentKey,componentVersion:node.componentVersion}},
    ]);
    const children=node.children.map(child=><Fragment key={child.id}>{renderNode(child)}</Fragment>);
    const rendered=renderer({node,config:node.config,children,page:runtimePage,viewport});
    return decorateNode?decorateNode(node,rendered):rendered;
  };

  return <>{sections.map(section=><Fragment key={section.id}>{renderNode(section)}</Fragment>)}</>;
}
