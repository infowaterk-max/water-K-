import {
  STOREFRONT_PAGE_TYPES,
  STOREFRONT_VIEWPORTS,
  type StorefrontBuilderPageType,
  type StorefrontViewport,
} from '@/lib/builder/storefront-foundation';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';

export const STOREFRONT_TEMPLATE_QUALITY_GATE_VERSION='shoporation.template-factory-quality-gate.v2' as const;

export type StorefrontTemplateQualityStatus='candidate'|'accepted';
export type StorefrontTemplateMobileNavigationContract='hamburger'|'shared-responsive';
export type StorefrontTemplateQualityManifest={
  gateVersion:typeof STOREFRONT_TEMPLATE_QUALITY_GATE_VERSION;
  templateKey:string;
  minTemplateVersion:number;
  status:StorefrontTemplateQualityStatus;
  sourcePrefixes:readonly string[];
  pageTypes:readonly StorefrontBuilderPageType[];
  viewports:readonly StorefrontViewport[];
  shell:{
    canonical:true;
    allowedHeaderComponentKeys:readonly string[];
    mobileNavigation:StorefrontTemplateMobileNavigationContract;
  };
  content:{
    informationPageRequired:boolean;
  };
  browser:{
    maxHorizontalOverflowPx:number;
    minimumTouchTargetPx:number;
    recommendedTouchTargetPx:number;
    requireMobileMenu:boolean;
    requireFooter:boolean;
  };
  golden:{
    required:boolean;
    baselineDirectory:string;
    maxPixelMismatchRatio:number;
  };
};

export type StorefrontTemplateQualityIssue={
  code:string;
  path:string;
  message:string;
  severity:'error'|'warning';
  metadata?:Record<string,unknown>;
};

export const PLAYROOM_V20_QUALITY_MANIFEST:StorefrontTemplateQualityManifest=Object.freeze({
  gateVersion:STOREFRONT_TEMPLATE_QUALITY_GATE_VERSION,
  templateKey:'gaming.playroom',
  minTemplateVersion:20,
  status:'candidate',
  sourcePrefixes:Object.freeze([
    'src/lib/builder/templates/playroom-',
  ]),
  pageTypes:Object.freeze([...STOREFRONT_PAGE_TYPES]),
  viewports:Object.freeze([...STOREFRONT_VIEWPORTS]),
  shell:Object.freeze({
    canonical:true,
    allowedHeaderComponentKeys:Object.freeze(['system.commerce-header']),
    mobileNavigation:'hamburger',
  }),
  content:Object.freeze({
    informationPageRequired:true,
  }),
  browser:Object.freeze({
    maxHorizontalOverflowPx:2,
    minimumTouchTargetPx:36,
    recommendedTouchTargetPx:44,
    requireMobileMenu:true,
    requireFooter:true,
  }),
  golden:Object.freeze({
    required:false,
    baselineDirectory:'tests/visual-baselines/gaming.playroom/v20',
    maxPixelMismatchRatio:.005,
  }),
});

export const STOREFRONT_TEMPLATE_QUALITY_MANIFESTS:readonly StorefrontTemplateQualityManifest[]=Object.freeze([
  PLAYROOM_V20_QUALITY_MANIFEST,
]);

export function getStorefrontTemplateQualityManifest(templateKey:string){
  return STOREFRONT_TEMPLATE_QUALITY_MANIFESTS.find(item=>item.templateKey===templateKey)??null;
}

const issue=(code:string,path:string,message:string,metadata?:Record<string,unknown>):StorefrontTemplateQualityIssue=>({
  code,path,message,severity:'error',metadata,
});

export function evaluateStorefrontTemplateQualityGate(input:{
  template:StorefrontInstallableTemplatePackage;
  manifest:StorefrontTemplateQualityManifest;
}):{ok:boolean;issues:StorefrontTemplateQualityIssue[]}{
  const{template,manifest}=input;
  const issues:StorefrontTemplateQualityIssue[]=[];

  if(template.manifest.templateKey!==manifest.templateKey){
    issues.push(issue('QUALITY_TEMPLATE_KEY_MISMATCH','manifest.templateKey','Quality manifest does not target this template package.'));
  }
  if(template.manifest.templateVersion<manifest.minTemplateVersion){
    issues.push(issue('QUALITY_TEMPLATE_VERSION_TOO_OLD','manifest.templateVersion','Template version is older than the quality manifest contract.',{minimum:manifest.minTemplateVersion,current:template.manifest.templateVersion}));
  }

  const expected=new Set(manifest.pageTypes);
  const actual=new Map<StorefrontBuilderPageType,number>();
  for(const page of template.pages)actual.set(page.pageType,(actual.get(page.pageType)??0)+1);
  for(const pageType of expected){
    const count=actual.get(pageType)??0;
    if(count!==1)issues.push(issue('QUALITY_PAGE_TYPE_CARDINALITY','pages',`Strict template must contain exactly one ${pageType} page.`,{pageType,count}));
  }
  for(const[pageType,count]of actual){
    if(!expected.has(pageType))issues.push(issue('QUALITY_UNDECLARED_PAGE_TYPE','pages','Strict template contains a page type outside its quality manifest.',{pageType,count}));
  }

  if(manifest.shell.canonical&&template.pages.length){
    const reference=template.pages.find(page=>page.pageType==='account')??template.pages[0]!;
    const header=reference.sections[0];
    const footer=reference.sections.at(-1);
    if(!header||!manifest.shell.allowedHeaderComponentKeys.includes(header.componentKey)){
      issues.push(issue('QUALITY_CANONICAL_HEADER_INVALID',`pages.${reference.pageType}.sections[0]`,'Canonical shell header does not satisfy the manifest.',{componentKey:header?.componentKey??null}));
    }
    if(!footer)issues.push(issue('QUALITY_CANONICAL_FOOTER_MISSING',`pages.${reference.pageType}.sections`,'Canonical shell footer is missing.'));
    const headerSignature=header?JSON.stringify(header):null;
    const footerSignature=footer?JSON.stringify(footer):null;
    for(const page of template.pages){
      if(JSON.stringify(page.sections[0]??null)!==headerSignature){
        issues.push(issue('QUALITY_HEADER_DRIFT',`pages.${page.pageType}.sections[0]`,'Page forked away from the canonical template header.',{pageType:page.pageType}));
      }
      if(JSON.stringify(page.sections.at(-1)??null)!==footerSignature){
        issues.push(issue('QUALITY_FOOTER_DRIFT',`pages.${page.pageType}.sections[-1]`,'Page forked away from the canonical template footer.',{pageType:page.pageType}));
      }
    }
  }

  if(manifest.content.informationPageRequired){
    const page=template.pages.find(item=>item.pageType==='content');
    const serialized=page?JSON.stringify(page):'';
    if(!page||!serialized.includes('content.page.title')||!serialized.includes('content.page.summary')||!serialized.includes('content.page.body')){
      issues.push(issue('QUALITY_INFORMATION_CONTENT_BINDINGS','pages.content','Content page must expose title, summary and body bindings for factual/information pages.'));
    }
    if(!serialized.includes('whiteSpace')||!serialized.includes('pre-line')){
      issues.push(issue('QUALITY_INFORMATION_CONTENT_READABILITY','pages.content','Content page must preserve readable paragraph/line structure.'));
    }
  }

  if(manifest.status==='accepted'&&!manifest.golden.required){
    issues.push(issue('QUALITY_ACCEPTED_GOLDEN_REQUIRED','quality.golden.required','Accepted templates must require their golden screenshot baseline.'));
  }

  return{ok:!issues.some(item=>item.severity==='error'),issues};
}

export function assertStorefrontTemplateQualityGate(input:{
  template:StorefrontInstallableTemplatePackage;
  manifest:StorefrontTemplateQualityManifest;
}):void{
  const result=evaluateStorefrontTemplateQualityGate(input);
  if(!result.ok){
    const first=result.issues.find(item=>item.severity==='error')!;
    throw new Error(`STOREFRONT_TEMPLATE_QUALITY_GATE_FAILED:${input.template.manifest.templateKey}@${input.template.manifest.templateVersion}:${first.code}:${first.path}`);
  }
}
