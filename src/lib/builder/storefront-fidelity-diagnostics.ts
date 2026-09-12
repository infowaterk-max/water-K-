import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {resolveStorefrontVisualStyle} from '@/lib/builder/storefront-visual-style';

export const STOREFRONT_FIDELITY_DIAGNOSTICS_VERSION='shoporation.visual-builder-fidelity-diagnostics.v1' as const;

export type StorefrontDiagnosticSeverity='warning'|'error';
export type StorefrontAccessibilityDiagnostic={
  code:string;
  severity:StorefrontDiagnosticSeverity;
  nodeId:string;
  componentKey:string;
  message:string;
};
export type StorefrontLayoutDiagnostic={
  code:string;
  severity:StorefrontDiagnosticSeverity;
  nodeId:string;
  componentKey:string;
  viewport:StorefrontViewport;
  message:string;
};

const VIEWPORTS=['desktop','tablet','mobile'] as const satisfies readonly StorefrontViewport[];
const VIEWPORT_WIDTH_PX:Record<StorefrontViewport,number>={desktop:1920,tablet:1024,mobile:480};
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const text=(value:unknown)=>typeof value==='string'?value.trim():'';
const number=(value:unknown,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;

function walkDocument(document:StorefrontPageDocument,visit:(node:StorefrontComponentNode)=>void){
  const walk=(node:StorefrontComponentNode)=>{
    visit(node);
    for(const child of node.children??[])walk(child);
  };
  for(const section of document.sections)walk(section);
}

function px(value:unknown):number|null{
  if(typeof value==='number'&&Number.isFinite(value))return value;
  if(typeof value!=='string')return null;
  const match=value.trim().match(/^(-?\d+(?:\.\d+)?)px$/i);
  return match?Number(match[1]):null;
}

function percent(value:unknown):number|null{
  if(typeof value!=='string')return null;
  const match=value.trim().match(/^(-?\d+(?:\.\d+)?)%$/);
  return match?Number(match[1]):null;
}

function safeHref(value:unknown){
  const href=text(value);
  if(!href)return false;
  return href.startsWith('/')||href.startsWith('#')||href.startsWith('https://')||href.startsWith('mailto:')||href.startsWith('tel:');
}

export function inspectStorefrontAccessibility(document:StorefrontPageDocument){
  const issues:StorefrontAccessibilityDiagnostic[]=[];
  const headings:Array<{id:string;componentKey:string;level:number;text:string}>=[];

  walkDocument(document,node=>{
    if(node.componentKey==='content.image'){
      const decorative=node.config.decorative===true;
      if(!decorative&&!text(node.config.alt))issues.push({
        code:'ACCESSIBILITY_IMAGE_ALT_MISSING',severity:'warning',nodeId:node.id,componentKey:node.componentKey,
        message:'A képhez hiányzik a leíró alt szöveg.',
      });
    }
    if(node.componentKey==='content.heading'){
      const level=Math.max(1,Math.min(6,Math.round(number(node.config.level,2))));
      const headingText=text(node.config.text);
      headings.push({id:node.id,componentKey:node.componentKey,level,text:headingText});
      if(!headingText)issues.push({
        code:'ACCESSIBILITY_HEADING_TEXT_MISSING',severity:'warning',nodeId:node.id,componentKey:node.componentKey,
        message:'A címsor üres; a heading struktúra így nem közvetít értelmes tartalmi hierarchiát.',
      });
    }
    if(node.componentKey==='content.button'){
      const label=text(node.config.label)||text(node.config.ariaLabel);
      if(!label)issues.push({
        code:'ACCESSIBILITY_CONTROL_LABEL_GENERIC',severity:'warning',nodeId:node.id,componentKey:node.componentKey,
        message:'A CTA nem rendelkezik saját felirattal vagy aria-labellel; a runtime csak általános fallbacket tud használni.',
      });
      if(node.config.href!==undefined&&!safeHref(node.config.href))issues.push({
        code:'ACCESSIBILITY_CONTROL_HREF_INVALID',severity:'error',nodeId:node.id,componentKey:node.componentKey,
        message:'A CTA hivatkozása nem felel meg a storefront biztonságos URL-sémáinak.',
      });
    }
  });

  const h1=headings.filter(item=>item.level===1);
  if(h1.length>1){
    for(const item of h1.slice(1))issues.push({
      code:'ACCESSIBILITY_MULTIPLE_PRIMARY_HEADINGS',severity:'warning',nodeId:item.id,componentKey:item.componentKey,
      message:'Az oldalon egynél több elsődleges H1 címsor található.',
    });
  }
  if(headings.length&&headings[0].level>2){
    const item=headings[0];
    issues.push({
      code:'ACCESSIBILITY_HEADING_STARTS_TOO_DEEP',severity:'warning',nodeId:item.id,componentKey:item.componentKey,
      message:`Az első címsor H${item.level}; ellenőrizd a dokumentumhierarchiát.`,
    });
  }
  for(let index=1;index<headings.length;index+=1){
    const previous=headings[index-1];const current=headings[index];
    if(current.level>previous.level+1)issues.push({
      code:'ACCESSIBILITY_HEADING_LEVEL_JUMP',severity:'warning',nodeId:current.id,componentKey:current.componentKey,
      message:`A heading szint H${previous.level}-ről H${current.level}-re ugrik.`,
    });
  }

  return{ok:!issues.some(issue=>issue.severity==='error'),issues} as const;
}

export function inspectStorefrontResponsiveLayout(document:StorefrontPageDocument){
  const issues:StorefrontLayoutDiagnostic[]=[];
  walkDocument(document,node=>{
    for(const viewport of VIEWPORTS){
      const style=resolveStorefrontVisualStyle(node.config.style,viewport);
      const viewportWidth=VIEWPORT_WIDTH_PX[viewport];
      const minWidth=px(style.minWidth);
      const width=px(style.width);
      const maxWidth=px(style.maxWidth);
      const marginLeft=px(style.marginLeft);
      const marginRight=px(style.marginRight);
      const leftPercent=percent(style.left);
      const rightPercent=percent(style.right);

      if(minWidth!==null&&minWidth>viewportWidth)issues.push({
        code:'LAYOUT_MIN_WIDTH_EXCEEDS_VIEWPORT',severity:'error',nodeId:node.id,componentKey:node.componentKey,viewport,
        message:`A minimum szélesség ${minWidth}px, ami nagyobb a ${viewport} diagnosztikai viewportnál (${viewportWidth}px).`,
      });
      if(width!==null&&width>viewportWidth*1.25&&(maxWidth===null||maxWidth>viewportWidth))issues.push({
        code:'LAYOUT_FIXED_WIDTH_OVERFLOW_RISK',severity:'warning',nodeId:node.id,componentKey:node.componentKey,viewport,
        message:`A fix ${width}px szélesség overflow-kockázatot jelent ${viewport} nézetben.`,
      });
      if((marginLeft!==null&&marginLeft<-(viewportWidth*.2))||(marginRight!==null&&marginRight<-(viewportWidth*.2)))issues.push({
        code:'LAYOUT_NEGATIVE_MARGIN_CLIPPING_RISK',severity:'warning',nodeId:node.id,componentKey:node.componentKey,viewport,
        message:`A nagy negatív vízszintes margó clipping/overflow kockázatot jelent ${viewport} nézetben.`,
      });
      if(style.position==='absolute'&&((leftPercent!==null&&Math.abs(leftPercent)>100)||(rightPercent!==null&&Math.abs(rightPercent)>100)))issues.push({
        code:'LAYOUT_ABSOLUTE_OFFSET_OUTSIDE_CANVAS',severity:'warning',nodeId:node.id,componentKey:node.componentKey,viewport,
        message:`Az abszolút elem vízszintes offsetje a saját kompozíciós területén kívülre tolhatja az elemet ${viewport} nézetben.`,
      });
      if(viewport==='mobile'&&style.whiteSpace==='nowrap'&&['content.heading','content.text','system.navigation'].includes(node.componentKey)){
        const content=text(node.config.text)||text(node.config.label);
        if(content.length>32)issues.push({
          code:'LAYOUT_MOBILE_NOWRAP_TEXT_RISK',severity:'warning',nodeId:node.id,componentKey:node.componentKey,viewport,
          message:'Hosszú, sortörést tiltó tartalom mobilon vízszintes túlcsordulást okozhat.',
        });
      }
      if(node.componentKey==='visual.layer'&&style.position==='absolute'){
        const widthPercent=percent(style.width);
        if(widthPercent!==null&&widthPercent>100)issues.push({
          code:'LAYOUT_LAYER_WIDTH_EXCEEDS_CANVAS',severity:'error',nodeId:node.id,componentKey:node.componentKey,viewport,
          message:'A réteg szélessége meghaladja a section-bound Layered Canvas 100%-os szélességét.',
        });
      }
    }
  });

  return{ok:!issues.some(issue=>issue.severity==='error'),issues} as const;
}

export function inspectStorefrontFidelityDiagnostics(document:StorefrontPageDocument){
  const accessibility=inspectStorefrontAccessibility(document);
  const layout=inspectStorefrontResponsiveLayout(document);
  return{
    diagnosticsVersion:STOREFRONT_FIDELITY_DIAGNOSTICS_VERSION,
    accessibility,
    layout,
    ok:accessibility.ok&&layout.ok,
  } as const;
}
