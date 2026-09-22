import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {PLAYROOM_REFERENCE_V2_FIDELITY_V14_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-reference-v2-fidelity-v14';

export const PLAYROOM_REFERENCE_V2_FIDELITY_V15_VERSION='shoporation.playroom.reference-v2.fidelity.v15' as const;

type JsonRecord=Record<string,unknown>;
const rec=(value:unknown):JsonRecord=>value&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:{};
const withStyle=(config:JsonRecord,patch:JsonRecord):JsonRecord=>({...config,style:{...rec(config.style),...patch}});

const heroOverlay:StorefrontComponentNode={
  id:'playroom-hero-neon-overlay',
  componentKey:'content.image',
  componentVersion:1,
  config:{
    src:'/storefront/playroom/hero-photo-overlay.svg',
    alt:'',
    width:1600,
    height:430,
    fit:'cover',
    loading:'eager',
    radius:'none',
    style:{position:'absolute',inset:'0',width:'100%',height:'100%',minHeight:'100%',objectFit:'cover',zIndex:2,pointerEvents:'none',opacity:.9},
  },
};

function refineNode(node:StorefrontComponentNode):StorefrontComponentNode{
  let next:StorefrontComponentNode={...node,config:{...node.config},...(node.children?{children:node.children.map(refineNode)}:{})};
  const config=next.config as JsonRecord;

  if(next.id==='playroom-hero'){
    const children=[...(next.children??[])];
    if(!children.some(child=>child.id===heroOverlay.id)){
      const artIndex=children.findIndex(child=>child.id==='playroom-hero-art');
      children.splice(artIndex>=0?artIndex+1:0,0,heroOverlay);
    }
    next={...next,config:withStyle(config,{background:'radial-gradient(circle at 72% 38%,rgba(38,220,255,.18),transparent 33%),radial-gradient(circle at 92% 30%,rgba(255,55,198,.18),transparent 30%),#030b18'}),children};
  }
  if(next.id==='playroom-hero-art'){
    next={...next,config:withStyle(config,{filter:'saturate(1.3) contrast(1.12) brightness(.64)',objectPosition:'center 51%'})};
  }
  if(next.id==='playroom-hero-copy'){
    next={...next,config:withStyle(config,{zIndex:3,background:'linear-gradient(90deg,rgba(1,7,20,.96),rgba(2,9,24,.72) 58%,rgba(2,9,24,.1) 91%,transparent)'})};
  }
  return next;
}

function refinePage(page:StorefrontPageDocument):StorefrontPageDocument{
  if(page.pageType!=='home')return page;
  return{
    ...page,
    metadata:{...(page.metadata??{}),fidelityPolishVersion:PLAYROOM_REFERENCE_V2_FIDELITY_V15_VERSION,heroComposition:'photo-plus-original-neon-overlay'},
    sections:page.sections.map(refineNode),
  };
}

export const PLAYROOM_REFERENCE_V2_FIDELITY_V15_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...PLAYROOM_REFERENCE_V2_FIDELITY_V14_TEMPLATE_PACKAGE,
  pages:PLAYROOM_REFERENCE_V2_FIDELITY_V14_TEMPLATE_PACKAGE.pages.map(refinePage),
};
