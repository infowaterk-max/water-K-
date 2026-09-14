import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {PLAYROOM_REFERENCE_V2_POLISHED_TEMPLATE_PACKAGE as V11_PACKAGE} from '@/lib/builder/templates/playroom-reference-v2-desktop-polish-v11';

export const PLAYROOM_REFERENCE_V2_DESKTOP_POLISH_VERSION='shoporation.playroom.reference-v2.desktop-polish.v12' as const;
type JsonRecord=Record<string,unknown>;
const rec=(value:unknown):JsonRecord=>value&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:{};
const withStyle=(config:JsonRecord,patch:JsonRecord):JsonRecord=>({...config,style:{...rec(config.style),...patch}});
const withSlots=(config:JsonRecord,patch:Record<string,JsonRecord>):JsonRecord=>{
  const existing=rec(config.styleSlots);
  return{...config,styleSlots:Object.fromEntries(Object.entries({...existing,...patch}).map(([slot,value])=>{
    const current=rec(existing[slot]);const incoming=rec(value);
    return[slot,{...current,base:{...rec(current.base),...rec(incoming.base)}}];
  }))};
};

function polishNode(node:StorefrontComponentNode):StorefrontComponentNode{
  const children=node.children?.map(polishNode);
  let next:StorefrontComponentNode={...node,...(children?{children}:{})};
  const config=rec(next.config);
  switch(next.id){
    case 'playroom-hero-art':
      next={...next,config:withStyle(config,{filter:'saturate(1.28) contrast(1.12) brightness(1.04)',objectPosition:'center 48%'})};
      break;
    case 'playroom-setup-image':
      next={...next,config:withStyle(config,{width:'64%',filter:'saturate(1.27) contrast(1.1) brightness(1.06) drop-shadow(0 18px 26px rgba(0,0,0,.34))',transform:'scale(1.045)',transformOrigin:'right bottom'})};
      break;
    case 'playroom-player-controller-image':
    case 'playroom-player-headset-image':
    case 'playroom-player-family-image':
    case 'playroom-upgrade-monitor-image':
    case 'playroom-upgrade-audio-image':
    case 'playroom-upgrade-light-image':
    case 'playroom-upgrade-chair-image':
      next={...next,config:withStyle(config,{height:'6.45rem',filter:'saturate(1.25) contrast(1.1) brightness(1.04)',borderRadius:'.38rem',boxShadow:'0 9px 20px rgba(0,0,0,.25)'})};
      break;
    case 'playroom-player-couch-image':
      next={...next,config:{...config,src:'/storefront/playroom/community-neon.svg',style:{...rec(config.style),height:'6.45rem',objectFit:'cover',objectPosition:'76% center',filter:'saturate(1.28) contrast(1.1) brightness(1.04)',borderRadius:'.38rem',boxShadow:'0 9px 20px rgba(0,0,0,.25)'}}};
      break;
    case 'playroomFeaturedGames':
      next={...next,config:withSlots({...config,imageRatio:'16 / 10'},{card:{base:{padding:'.3rem',background:'linear-gradient(180deg,#0c2a46,#06182b)',border:'1px solid rgba(79,216,255,.27)',boxShadow:'0 11px 26px rgba(0,0,0,.24)'}},media:{base:{borderRadius:'.4rem',overflow:'hidden',boxShadow:'inset 0 0 0 1px rgba(255,255,255,.04)'}},name:{base:{fontSize:'.61rem',fontWeight:820}},price:{base:{fontSize:'.64rem',fontWeight:900}},badge:{base:{fontSize:'.43rem'}}})};
      break;
    case 'playroom-compatibility-art':
      next={...next,config:withStyle(config,{height:'6.8rem',filter:'saturate(1.23) contrast(1.09) brightness(1.04) drop-shadow(0 12px 22px rgba(0,0,0,.28))'})};
      break;
    case 'playroom-gift-image':
      next={...next,config:withStyle(config,{position:'absolute',right:'0',top:'0',width:'58%',height:'100%',objectFit:'cover',objectPosition:'63% center',opacity:1,filter:'saturate(1.28) contrast(1.1) brightness(1.05) drop-shadow(0 14px 26px rgba(0,0,0,.28))'})};
      break;
    case 'playroom-gift-title':
      next={...next,config:withStyle(config,{width:'48%',fontSize:'1.48rem',lineHeight:.88})};
      break;
    case 'playroom-gift-copy':
      next={...next,config:withStyle(config,{width:'44%',fontSize:'.6rem',lineHeight:1.22})};
      break;
    case 'playroom-community-art':
      next={...next,config:withStyle(config,{inset:'auto 0 0 auto',width:'58%',height:'100%',minHeight:'100%',objectFit:'contain',objectPosition:'right center',opacity:.96,filter:'saturate(1.3) contrast(1.08) brightness(1.03)'})};
      break;
    case 'playroom-community-stage':
      next={...next,config:withStyle(config,{minHeight:'4.8rem',background:'linear-gradient(90deg,#0c153c 0%,#171553 45%,#26105f 100%)'})};
      break;
  }
  return next;
}

function polishPage(page:StorefrontPageDocument):StorefrontPageDocument{
  if(page.pageType!=='home')return page;
  return{...page,metadata:{...(page.metadata??{}),desktopPolishVersion:PLAYROOM_REFERENCE_V2_DESKTOP_POLISH_VERSION},sections:page.sections.map(polishNode)};
}

export const PLAYROOM_REFERENCE_V2_POLISHED_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...V11_PACKAGE,
  pages:V11_PACKAGE.pages.map(polishPage),
};
