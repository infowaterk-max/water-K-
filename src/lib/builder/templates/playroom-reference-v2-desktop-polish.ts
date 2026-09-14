import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-reference-v2';

export const PLAYROOM_REFERENCE_V2_DESKTOP_POLISH_VERSION='shoporation.playroom.reference-v2.desktop-polish.v1' as const;

type JsonRecord=Record<string,unknown>;
const rec=(value:unknown):JsonRecord=>value&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:{};
const withStyle=(config:JsonRecord,patch:JsonRecord):JsonRecord=>({...config,style:{...rec(config.style),...patch}});
const withSlots=(config:JsonRecord,patch:Record<string,JsonRecord>):JsonRecord=>{
  const existing=rec(config.styleSlots);
  return{
    ...config,
    styleSlots:Object.fromEntries(Object.entries({...existing,...patch}).map(([slot,value])=>{
      const current=rec(existing[slot]);
      const incoming=rec(value);
      return[slot,{...current,base:{...rec(current.base),...rec(incoming.base)}}];
    })),
  };
};

const footerNavigation=(id:string,label:string,items:{label:string;href:string}[]):StorefrontComponentNode=>({
  id,
  componentKey:'system.navigation',
  componentVersion:1,
  config:{
    ariaLabel:label,
    layout:'vertical',
    items,
    style:{gap:'.18rem',fontSize:'.59rem',fontWeight:600,color:'#aec0d3',lineHeight:1.15},
    styleSlots:{item:{base:{padding:'0',minHeight:'0'}}},
  },
});

function polishNode(node:StorefrontComponentNode):StorefrontComponentNode{
  let next:StorefrontComponentNode={...node,config:{...node.config},...(node.children?{children:node.children.map(polishNode)}:{})};
  const config=next.config as JsonRecord;

  switch(next.id){
    case 'playroom-home-header':
      next={...next,config:withSlots({...config,innerStyle:{...rec(config.innerStyle),padding:'.34rem 2.35rem .24rem',gap:'.28rem'},logoStyle:{...rec(config.logoStyle),width:'2.3rem',height:'2.3rem'}},{topRow:{base:{minHeight:'2.45rem'}},navigationFrame:{base:{paddingTop:'.22rem',minHeight:'1.72rem'}},utilityLabel:{base:{fontSize:'.68rem'}}})};
      break;
    case 'playroom-home-search':
      next={...next,config:{...config,style:{...rec(config.style),height:'2.12rem'},inputStyle:{...rec(config.inputStyle),fontSize:'.71rem',padding:'.55rem .8rem'},buttonStyle:{...rec(config.buttonStyle),padding:'.32rem .66rem'}}};
      break;
    case 'playroom-home-nav':
      next={...next,config:withStyle(config,{gap:'1.55rem',fontSize:'.69rem'})};
      break;
    case 'playroom-hero':
      next={...next,config:withStyle(config,{minHeight:'15.35rem'})};
      break;
    case 'playroom-hero-copy':
      next={...next,config:withStyle(config,{minHeight:'11.4rem',padding:'.78rem 1.18rem 3.7rem',width:'50%',justifyContent:'center'})};
      break;
    case 'playroom-hero-title':
      next={...next,config:withStyle(config,{fontSize:'clamp(2.7rem,4.2vw,4.45rem)',lineHeight:.86})};
      break;
    case 'playroom-hero-support':
      next={...next,config:withStyle(config,{fontSize:'.75rem',lineHeight:1.15,maxWidth:'32ch'})};
      break;
    case 'playroom-hero-primary':
      next={...next,config:withStyle(config,{padding:'.5rem .82rem',fontSize:'.65rem'})};
      break;
    case 'playroom-trust-grid':
      next={...next,config:withStyle(config,{left:'.48rem',right:'.48rem',bottom:'.35rem'})};
      break;
    case 'playroom-style-card':
    case 'playroom-platform-card':
      next={...next,config:withStyle(config,{padding:'.48rem .58rem'})};
      break;
    case 'playroom-game-finder':
      next={...next,config:withSlots(config,{options:{base:{gap:'.3rem'}},option:{base:{minHeight:'3.72rem',padding:'.28rem .1rem'}},optionMedia:{base:{fontSize:'1.12rem'}},optionLabel:{base:{fontSize:'.55rem'}}})};
      break;
    case 'playroom-platform-navigation':
      next={...next,config:withSlots(config,{grid:{base:{gap:'.3rem'}},card:{base:{minHeight:'3.56rem',padding:'.24rem .08rem',fontSize:'.51rem'}}})};
      break;
    case 'playroomFeaturedGames':
      next={...next,config:withSlots({...config,showCta:false,imageRatio:'16 / 7'},{root:{base:{gap:'.24rem'}},grid:{base:{gap:'.3rem'}},card:{base:{gap:'.24rem',padding:'.28rem'}},body:{base:{gap:'.08rem'}},name:{base:{fontSize:'.66rem',lineHeight:1.05}},price:{base:{fontSize:'.64rem'}},comparePrice:{base:{fontSize:'.5rem'}},stock:{base:{fontSize:'.51rem',lineHeight:1.05}},badge:{base:{top:'.3rem',left:'.3rem',fontSize:'.46rem',padding:'.15rem .28rem'}}})};
      break;
    case 'playroom-featured-games':
      next={...next,config:withStyle(config,{padding:'.48rem .58rem',minHeight:'9rem'})};
      break;
    case 'playroom-compatibility-card':
      next={...next,config:withStyle(config,{padding:'.46rem',minHeight:'9rem'})};
      break;
    case 'playroom-compatibility-art':
      next={...next,config:withStyle(config,{height:'4.5rem'})};
      break;
    case 'playroom-gift-card':
      next={...next,config:withStyle(config,{padding:'.42rem',minHeight:'9rem',gap:'.28rem'})};
      break;
    case 'playroom-gift-image':
      next={...next,config:withStyle(config,{height:'4.25rem'})};
      break;
    case 'playroom-gift-title':
      next={...next,config:withStyle(config,{fontSize:'.82rem'})};
      break;
    case 'playroom-gift-cta':
      next={...next,config:withStyle(config,{padding:'.3rem .42rem',fontSize:'.5rem'})};
      break;
    case 'playroom-community-stage':
      next={...next,config:withStyle(config,{minHeight:'3.35rem',padding:'.3rem .6rem'})};
      break;
    case 'playroom-community-title':
      next={...next,config:withStyle(config,{fontSize:'1.15rem'})};
      break;
    case 'playroom-home-footer':
      next={...next,config:withStyle(config,{padding:'.62rem 2.35rem .68rem'})};
      break;
    case 'playroom-footer-brand':
      next={...next,config:withStyle(config,{gap:'.18rem'})};
      break;
    case 'playroom-footer-logo':
      next={...next,config:withStyle(config,{width:'2rem',height:'2rem'})};
      break;
    case 'playroom-footer-shop':
      next={...next,config:withStyle(config,{gap:'.24rem'}),children:[
        next.children?.[0]??{id:'playroom-footer-shop-title',componentKey:'content.text',componentVersion:1,config:{text:'Vásárlási információk',as:'strong',align:'left',tone:'text'}},
        footerNavigation('playroom-footer-shop-nav','Vásárlási információk',[{label:'Szállítás',href:'/oldal/szallitas'},{label:'Fizetés',href:'/oldal/fizetes'},{label:'Visszaküldés',href:'/oldal/visszakuldes'},{label:'GYIK',href:'/gyik'}]),
      ]};
      break;
    case 'playroom-footer-world':
      next={...next,config:withStyle(config,{gap:'.24rem'}),children:[
        next.children?.[0]??{id:'playroom-footer-world-title',componentKey:'content.text',componentVersion:1,config:{text:'Gaming világ',as:'strong',align:'left',tone:'text'}},
        footerNavigation('playroom-footer-world-nav','Gaming világ',[{label:'Újdonságok',href:'/webaruhaz?sort=new'},{label:'Playroom Magazin',href:'/blog'},{label:'Játékajánlók',href:'/blog'},{label:'Események',href:'/blog'}]),
      ]};
      break;
    case 'playroom-footer-about':
      next={...next,config:withStyle(config,{gap:'.24rem'}),children:[
        next.children?.[0]??{id:'playroom-footer-about-title',componentKey:'content.text',componentVersion:1,config:{text:'Rólunk',as:'strong',align:'left',tone:'text'}},
        footerNavigation('playroom-footer-about-nav','Rólunk',[{label:'Történetünk',href:'/oldal/rolunk'},{label:'Fenntarthatóság',href:'/oldal/fenntarthatosag'},{label:'Karrier',href:'/oldal/karrier'},{label:'Kapcsolat',href:'/kapcsolat'}]),
      ]};
      break;
    case 'playroom-footer-social':
      next={...next,config:withStyle(config,{gap:'.22rem',paddingLeft:'.9rem'})};
      break;
  }
  return next;
}

function polishPage(page:StorefrontPageDocument):StorefrontPageDocument{
  if(page.pageType!=='home')return page;
  return{
    ...page,
    metadata:{...(page.metadata??{}),desktopPolishVersion:PLAYROOM_REFERENCE_V2_DESKTOP_POLISH_VERSION},
    sections:page.sections.map(polishNode),
  };
}

export const PLAYROOM_REFERENCE_V2_POLISHED_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE,
  pages:PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE.pages.map(polishPage),
};