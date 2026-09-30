export const VX_BUILDER_CORE_VERSION='vision.vx-builder-core.v1' as const;

export type VxBuilderProductKey='shop'|'site';
export type VxBuilderViewport='desktop'|'tablet'|'mobile';
export type VxBuilderLibraryGroup='basic'|'content'|'media'|'navigation'|'commerce'|'interactive'|'forms';
export type VxBuilderGridSpan=1|2|3|4|5|6|7|8|9|10|11|12;

export type VxBuilderProductProfile={
  productKey:VxBuilderProductKey;
  productName:string;
  hostProductName:string;
  surfaceNoun:string;
  libraryGroups:readonly VxBuilderLibraryGroup[];
  commerce:boolean;
};

export const VX_BUILDER_CORE_CONTRACT={
  hierarchy:['page','section','container','component'] as const,
  gridColumns:12,
  viewports:['desktop','tablet','mobile'] as const,
  directManipulationFirst:true,
  inspectorSecond:true,
  guardedFreedom:{
    contextualInsertion:true,
    gridSnapping:true,
    boundedResize:true,
    viewportScopedOverrides:true,
    arbitraryAbsolutePositioning:false,
    rawHtmlComposition:false,
    rawJavascriptComposition:false,
    unrestrictedStyleProliferation:false,
  },
  authority:{
    pageDocument:'existing-canonical-page-document',
    renderer:'existing-shared-runtime',
    mutations:'existing-builder-mutation-authority',
    publication:'existing-draft-preview-publish-rollback-authority',
  },
} as const;

export const VX_SHOP_BUILDER_PROFILE:VxBuilderProductProfile={
  productKey:'shop',
  productName:'VX Shop Builder',
  hostProductName:'Shoperation',
  surfaceNoun:'webshop',
  libraryGroups:['basic','content','media','navigation','commerce','interactive','forms'],
  commerce:true,
};

export const VX_SITE_BUILDER_PROFILE:VxBuilderProductProfile={
  productKey:'site',
  productName:'VX Site Builder',
  hostProductName:'VISION',
  surfaceNoun:'weboldal',
  libraryGroups:['basic','content','media','navigation','interactive','forms'],
  commerce:false,
};

const asGridSpan=(value:number)=>value as VxBuilderGridSpan;

export function clampVxGridSpan(value:number,fallback:VxBuilderGridSpan=12):VxBuilderGridSpan{
  if(!Number.isFinite(value))return fallback;
  return asGridSpan(Math.min(VX_BUILDER_CORE_CONTRACT.gridColumns,Math.max(1,Math.round(value))));
}

export function resolveVxResizeSpan(input:{
  startSpan:number;
  startX:number;
  currentX:number;
  pixelsPerColumn:number;
}):VxBuilderGridSpan{
  const start=clampVxGridSpan(input.startSpan);
  if(!Number.isFinite(input.pixelsPerColumn)||input.pixelsPerColumn<=0)return start;
  const deltaColumns=Math.round((input.currentX-input.startX)/input.pixelsPerColumn);
  return clampVxGridSpan(start+deltaColumns,start);
}

export function isVxBuilderLibraryGroupAllowed(profile:VxBuilderProductProfile,group:VxBuilderLibraryGroup){
  return profile.libraryGroups.includes(group);
}

export function assertVxBuilderProfile(profile:VxBuilderProductProfile){
  if(profile.productKey==='site'&&profile.commerce)throw new Error('VX_BUILDER_SITE_COMMERCE_PROFILE_FORBIDDEN');
  if(profile.commerce&&!profile.libraryGroups.includes('commerce'))throw new Error('VX_BUILDER_COMMERCE_GROUP_REQUIRED');
  if(!profile.libraryGroups.includes('basic'))throw new Error('VX_BUILDER_BASIC_GROUP_REQUIRED');
  return profile;
}
