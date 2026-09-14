import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {PLAYROOM_REFERENCE_V2_FIDELITY_V15_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-reference-v2-fidelity-v15';

export const PLAYROOM_REFERENCE_V2_FIDELITY_V16_VERSION='shoporation.playroom.reference-v2.fidelity.v16' as const;

type JsonRecord=Record<string,unknown>;
const rec=(value:unknown):JsonRecord=>value&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:{};
const withStyle=(config:JsonRecord,patch:JsonRecord):JsonRecord=>({...config,style:{...rec(config.style),...patch}});

function refineNode(node:StorefrontComponentNode):StorefrontComponentNode{
  let next:StorefrontComponentNode={...node,config:{...node.config},...(node.children?{children:node.children.map(refineNode)}:{})};
  const config=next.config as JsonRecord;

  switch(next.id){
    case 'playroom-home-header':
      next={...next,config:{...config,innerStyle:{...rec(config.innerStyle),padding:'.34rem 2.35rem .24rem'},logoStyle:{...rec(config.logoStyle),width:'2.65rem',height:'2.65rem'},styleSlots:{...rec(config.styleSlots),topRow:{base:{minHeight:'2.62rem'}},navigationFrame:{base:{borderTop:'1px solid rgba(69,194,255,.16)',paddingTop:'.22rem',minHeight:'1.72rem'}}}}};
      break;
    case 'playroom-setup':
    case 'playroom-player-two':
    case 'playroom-upgrade':
      next={...next,config:withStyle(config,{minHeight:'10.75rem'})};
      break;
    case 'playroom-community-stage':
      next={...next,config:withStyle(config,{minHeight:'3.45rem',padding:'.24rem .62rem'})};
      break;
    case 'playroom-home-footer':
      next={...next,config:withStyle(config,{padding:'.34rem 2.35rem .42rem',background:'radial-gradient(circle at 0% 100%,rgba(22,215,255,.23),transparent 18%),radial-gradient(circle at 100% 100%,rgba(255,42,211,.28),transparent 20%),linear-gradient(180deg,#03101e,#020914)',borderTop:'1px solid rgba(50,196,255,.2)'})};
      break;
    case 'playroom-footer-brand':
    case 'playroom-footer-shop':
    case 'playroom-footer-world':
    case 'playroom-footer-about':
    case 'playroom-footer-social':
      next={...next,config:{...config,gap:'none'}};
      break;
    case 'playroom-footer-logo':
      next={...next,config:withStyle(config,{width:'1.9rem',height:'1.9rem'})};
      break;
    case 'playroom-footer-brand-title':
      next={...next,config:withStyle(config,{fontSize:'.76rem'})};
      break;
    case 'playroom-footer-brand-copy':
      next={...next,config:withStyle(config,{fontSize:'.46rem'})};
      break;
    case 'playroom-footer-social-copy':
      next={...next,config:withStyle(config,{fontSize:'.49rem',lineHeight:1.25})};
      break;
  }
  return next;
}

function refinePage(page:StorefrontPageDocument):StorefrontPageDocument{
  if(page.pageType!=='home')return page;
  return{
    ...page,
    metadata:{...(page.metadata??{}),fidelityPolishVersion:PLAYROOM_REFERENCE_V2_FIDELITY_V16_VERSION,desktopRhythm:'reference-density-pass'},
    sections:page.sections.map(refineNode),
  };
}

export const PLAYROOM_REFERENCE_V2_FIDELITY_V16_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...PLAYROOM_REFERENCE_V2_FIDELITY_V15_TEMPLATE_PACKAGE,
  pages:PLAYROOM_REFERENCE_V2_FIDELITY_V15_TEMPLATE_PACKAGE.pages.map(refinePage),
};
