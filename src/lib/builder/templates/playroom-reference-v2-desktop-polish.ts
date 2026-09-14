import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-reference-v2';

export const PLAYROOM_REFERENCE_V2_DESKTOP_POLISH_VERSION='shoporation.playroom.reference-v2.desktop-polish.v2' as const;

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
    style:{gap:'.12rem',fontSize:'.56rem',fontWeight:600,color:'#aec0d3',lineHeight:1.08},
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
      next={...next,config:withStyle(config,{minHeight:'13.4rem'})};
      break;
    case 'playroom-hero-copy':
      next={...next,config:withStyle(config,{minHeight:'9.45rem',padding:'.56rem 1.18rem 3.25rem',width:'49%',justifyContent:'center',background:'linear-gradient(90deg,rgba(2,8,22,.91),rgba(2,8,22,.62) 62%,rgba(2,8,22,.06))'})};
      break;
    case 'playroom-hero-title':
      next={...next,config:withStyle(config,{fontSize:'clamp(2.75rem,4.15vw,4.4rem)',lineHeight:.86})};
      break;
    case 'playroom-hero-support':
      next={...next,config:withStyle(config,{fontSize:'.74rem',lineHeight:1.12,maxWidth:'32ch'})};
      break;
    case 'playroom-hero-primary':
      next={...next,config:withStyle(config,{padding:'.48rem .8rem',fontSize:'.64rem'})};
      break;
    case 'playroom-trust-grid':
      next={...next,config:withStyle(config,{left:'.48rem',right:'.48rem',bottom:'.3rem'})};
      break;
    case 'playroom-style-card':
    case 'playroom-platform-card':
      next={...next,config:withStyle(config,{padding:'.5rem .58rem'})};
      break;
    case 'playroom-game-finder':
      next={...next,config:withSlots(config,{options:{base:{gap:'.34rem'}},option:{base:{minHeight:'4.16rem',padding:'.34rem .1rem'}},optionMedia:{base:{fontSize:'1.42rem'}},optionLabel:{base:{fontSize:'.57rem'}}})};
      break;
    case 'playroom-platform-navigation':
      next={...next,config:withSlots(config,{grid:{base:{gap:'.34rem'}},card:{base:{minHeight:'3.95rem',padding:'.28rem .08rem',fontSize:'.52rem'}}})};
      break;
    case 'playroom-setup':
    case 'playroom-player-two':
    case 'playroom-upgrade':
      next={...next,config:withStyle(config,{minHeight:'13rem'})};
      break;
    case 'playroomFeaturedGames':
      next={...next,config:withSlots({...config,showCta:false,imageRatio:'16 / 9'},{root:{base:{gap:'.22rem'}},grid:{base:{gap:'.28rem'}},card:{base:{gap:'.2rem',padding:'.27rem'}},body:{base:{gap:'.07rem'}},name:{base:{fontSize:'.64rem',lineHeight:1.03}},price:{base:{fontSize:'.63rem'}},comparePrice:{base:{fontSize:'.49rem'}},stock:{base:{fontSize:'.5rem',lineHeight:1.02}},badge:{base:{top:'.26rem',left:'.26rem',fontSize:'.45rem',padding:'.13rem .26rem'}}})};
      break;
    case 'playroom-featured-games':
      next={...next,config:withStyle(config,{padding:'.46rem .56rem',minHeight:'9rem'})};
      break;
    case 'playroom-compatibility-card':
      next={...next,config:withStyle(config,{padding:'.44rem',minHeight:'9rem'})};
      break;
    case 'playroom-compatibility-art':
      next={...next,config:withStyle(config,{height:'4.75rem'})};
      break;
    case 'playroom-gift-card':
      next={...next,config:withStyle(config,{padding:'.4rem',minHeight:'9rem',gap:'.24rem'})};
      break;
    case 'playroom-gift-image':
      next={...next,config:withStyle(config,{height:'4.4rem'})};
      break;
    case 'playroom-gift-title':
      next={...next,config:withStyle(config,{fontSize:'.82rem'})};
      break;
    case 'playroom-gift-cta':
      next={...next,config:withStyle(config,{padding:'.3rem .42rem',fontSize:'.5rem'})};
      break;
    case 'playroom-community-stage':
      next={...next,config:withStyle(config,{minHeight:'3.25rem',padding:'.28rem .58rem'})};
      break;
    case 'playroom-community-title':
      next={...next,config:withStyle(config,{fontSize:'1.12rem'})};
      break;
    case 'playroom-home-footer':
      next={...next,config:withStyle(config,{padding:'.36rem 2.35rem .4rem'})};
      break;
    case 'playroom-footer-brand':
      next={...next,config:withStyle(config,{gap:'.1rem'})};
      break;
    case 'playroom-footer-logo':
      next={...next,config:withStyle(config,{width:'1.8rem',height:'1.8rem'})};
      break;
    case 'playroom-footer-shop':
      next={...next,config:withStyle(config,{gap:'.18rem'}),children:[
        next.children?.[0]??{id:'playroom-footer-shop-title',componentKey:'content.text',componentVersion:1,config:{text:'Vásárlási információk',as:'strong',align:'left',tone:'text'}},
        footerNavigation('playroom-footer-shop-nav','Vásárlási információk',[{label:'Szállítás',href:'/oldal/szallitas'},{label:'Fizetés',href:'/oldal/fizetes'},{label:'Visszaküldés',href:'/oldal/visszakuldes'},{label:'GYIK',href:'/gyik'}]),
      ]};
      break;
    case 'playroom-footer-world':
      next={...next,config:withStyle(config,{gap:'.18rem'}),children:[
        next.children?.[0]??{id:'playroom-footer-world-title',componentKey:'content.text',componentVersion:1,config:{text:'Gaming világ',as:'strong',align:'left',tone:'text'}},
        footerNavigation('playroom-footer-world-nav','Gaming világ',[{label:'Újdonságok',href:'/webaruhaz?sort=new'},{label:'Playroom Magazin',href:'/blog'},{label:'Játékajánlók',href:'/blog'},{label:'Események',href:'/blog'}]),
      ]};
      break;
    case 'playroom-footer-about':
      next={...next,config:withStyle(config,{gap:'.18rem'}),children:[
        next.children?.[0]??{id:'playroom-footer-about-title',componentKey:'content.text',componentVersion:1,config:{text:'Rólunk',as:'strong',align:'left',tone:'text'}},
        footerNavigation('playroom-footer-about-nav','Rólunk',[{label:'Történetünk',href:'/oldal/rolunk'},{label:'Fenntarthatóság',href:'/oldal/fenntarthatosag'},{label:'Karrier',href:'/oldal/karrier'},{label:'Kapcsolat',href:'/kapcsolat'}]),
      ]};
      break;
    case 'playroom-footer-social':
      next={...next,config:withStyle(config,{gap:'.12rem',paddingLeft:'.8rem'})};
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
