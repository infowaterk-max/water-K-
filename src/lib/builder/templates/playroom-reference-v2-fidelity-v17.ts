import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {PLAYROOM_REFERENCE_V2_FIDELITY_V16_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-reference-v2-fidelity-v16';

export const PLAYROOM_REFERENCE_V2_FIDELITY_V17_VERSION='shoporation.playroom.reference-v2.fidelity.v17' as const;

type JsonRecord=Record<string,unknown>;
const rec=(value:unknown):JsonRecord=>value&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:{};
const withStyle=(config:JsonRecord,patch:JsonRecord):JsonRecord=>({...config,style:{...rec(config.style),...patch}});

function refineNode(node:StorefrontComponentNode):StorefrontComponentNode{
  let next:StorefrontComponentNode={...node,config:{...node.config},...(node.children?{children:node.children.map(refineNode)}:{})};
  const config=next.config as JsonRecord;
  switch(next.id){
    case 'playroom-setup-image':
      next={...next,config:withStyle(config,{width:'64%',right:'-1.2%',bottom:'-1.5%',height:'104%',objectFit:'contain',objectPosition:'right bottom',filter:'saturate(1.14) contrast(1.06) brightness(1.04)',transform:'scale(1.035)',transformOrigin:'right bottom'})};
      break;
    case 'playroom-setup-copy':
      next={...next,config:withStyle(config,{width:'48%',padding:'.62rem .78rem'})};
      break;
    case 'playroom-setup':
      next={...next,config:withStyle(config,{background:'radial-gradient(circle at 78% 58%,rgba(36,191,255,.22),transparent 34%),radial-gradient(circle at 96% 35%,rgba(255,64,203,.22),transparent 30%),linear-gradient(135deg,#071936,#151147)',boxShadow:'inset 0 0 34px rgba(40,213,255,.035)'})};
      break;
  }
  return next;
}

function refinePage(page:StorefrontPageDocument):StorefrontPageDocument{
  if(page.pageType!=='home')return page;
  return{...page,metadata:{...(page.metadata??{}),fidelityPolishVersion:PLAYROOM_REFERENCE_V2_FIDELITY_V17_VERSION,setupArtwork:'premium-original-v2'},sections:page.sections.map(refineNode)};
}

export const PLAYROOM_REFERENCE_V2_FIDELITY_V17_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...PLAYROOM_REFERENCE_V2_FIDELITY_V16_TEMPLATE_PACKAGE,
  pages:PLAYROOM_REFERENCE_V2_FIDELITY_V16_TEMPLATE_PACKAGE.pages.map(refinePage),
};
