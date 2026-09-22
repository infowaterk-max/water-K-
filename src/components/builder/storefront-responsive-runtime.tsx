'use client';

import {useEffect,useState} from 'react';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {resolveStorefrontViewportForWidth,type StorefrontViewport} from '@/lib/builder/storefront-foundation';
import type {StorefrontPageDocument,StorefrontRuntimeCapabilityContext} from '@/lib/builder/storefront-runtime';

export function StorefrontResponsiveRuntime({page,bindingContext,capability,initialViewport}:{page:StorefrontPageDocument;bindingContext:Record<string,unknown>;capability?:StorefrontRuntimeCapabilityContext;initialViewport:StorefrontViewport}){
  const[viewport,setViewport]=useState<StorefrontViewport>(initialViewport);
  useEffect(()=>{
    const update=()=>setViewport(resolveStorefrontViewportForWidth(window.innerWidth));
    update();
    window.addEventListener('resize',update,{passive:true});
    window.addEventListener('orientationchange',update,{passive:true});
    return()=>{window.removeEventListener('resize',update);window.removeEventListener('orientationchange',update);};
  },[]);
  return <StorefrontRuntimeRenderer
    page={page}
    viewport={viewport}
    bindingContext={bindingContext}
    capability={capability}
    componentRegistry={createStorefrontVisualBuilderComponentRegistry()}
    rendererRegistry={createStorefrontVisualBuilderRendererRegistry()}
  />;
}
