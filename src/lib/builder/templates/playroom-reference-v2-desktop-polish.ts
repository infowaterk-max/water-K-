import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-reference-v2';

export const PLAYROOM_REFERENCE_V2_DESKTOP_POLISH_VERSION='shoporation.playroom.reference-v2.desktop-polish.v5' as const;

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

const platformButton=(id:string,label:string,href:string,background:string,border:string):StorefrontComponentNode=>({
  id,
  componentKey:'content.button',
  componentVersion:1,
  config:{
    label,
    href,
    variant:'ghost',
    size:'s',
    ariaLabel:label.replace('\n',' '),
    style:{
      minHeight:'5.05rem',
      width:'100%',
      padding:'.38rem .12rem',
      display:'grid',
      placeItems:'center',
      alignContent:'center',
      whiteSpace:'pre-line',
      textAlign:'center',
      fontSize:'.58rem',
      fontWeight:850,
      lineHeight:1.25,
      color:'#f7fbff',
      background,
      border,
      borderRadius:'.42rem',
      boxShadow:'inset 0 0 20px rgba(255,255,255,.035),0 7px 18px rgba(0,0,0,.18)',
    },
  },
  responsive:{desktop:{gridSpan:2},tablet:{gridSpan:4},mobile:{gridSpan:6}},
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
      next={...next,config:withStyle(config,{minHeight:'10.9rem'})};
      break;
    case 'playroom-hero-copy':
      next={...next,config:withStyle(config,{minHeight:'7.7rem',padding:'.42rem 1.18rem 2.75rem',width:'49%',justifyContent:'center',background:'linear-gradient(90deg,rgba(2,8,22,.91),rgba(2,8,22,.62) 62%,rgba(2,8,22,.06))'})};
      break;
    case 'playroom-hero-title':
      next={...next,config:withStyle(config,{fontSize:'clamp(2.55rem,3.55vw,3.75rem)',lineHeight:.84,letterSpacing:'-.045em',transform:'scaleX(1.08)',transformOrigin:'left center'})};
      break;
    case 'playroom-hero-support':
      next={...next,config:withStyle(config,{fontSize:'.72rem',lineHeight:1.08,maxWidth:'33ch'})};
      break;
    case 'playroom-hero-primary':
      next={...next,config:withStyle(config,{padding:'.45rem .78rem',fontSize:'.62rem'})};
      break;
    case 'playroom-trust-grid':
      next={...next,config:withStyle(config,{left:'.48rem',right:'.48rem',bottom:'.24rem'})};
      break;
    case 'playroom-trust-shipping':
    case 'playroom-trust-warranty':
    case 'playroom-trust-return':
    case 'playroom-trust-community':
      next={...next,config:withStyle(config,{padding:'.18rem .34rem'})};
      break;
    case 'playroom-style-card':
    case 'playroom-platform-card':
      next={...next,config:withStyle(config,{padding:'.5rem .58rem'})};
      break;
    case 'playroom-game-finder':
      next={...next,config:withSlots(config,{options:{base:{gap:'.34rem'}},option:{base:{minHeight:'5.25rem',padding:'.38rem .1rem'}},optionMedia:{base:{fontSize:'1.48rem'}},optionLabel:{base:{fontSize:'.57rem'}}})};
      break;
    case 'playroom-platform-navigation':
      next={
        ...next,
        componentKey:'layout.grid',
        config:{columns:12,gap:'xs',align:'stretch',style:{gap:'.34rem'}},
        bindings:undefined,
        children:[
          platformButton('playroom-platform-playsphere','🎮\nPlaySphere','/webaruhaz?platform=playsphere','linear-gradient(180deg,#1767ff,#1547c8)','1px solid #2f88ff'),
          platformButton('playroom-platform-boxone','✕\nBoxOne','/webaruhaz?platform=boxone','linear-gradient(180deg,#118748,#08632f)','1px solid #1ebf65'),
          platformButton('playroom-platform-nintari','▣\nNintari','/webaruhaz?platform=nintari','linear-gradient(180deg,#d91d32,#a10f24)','1px solid #ff4054'),
          platformButton('playroom-platform-pc','▰\nPC','/webaruhaz?platform=pc','linear-gradient(180deg,#0c2d49,#081e34)','1px solid rgba(91,207,255,.34)'),
          platformButton('playroom-platform-handheld','▱\nHandheld','/webaruhaz?platform=handheld','linear-gradient(180deg,#12334d,#0a2138)','1px solid rgba(91,207,255,.32)'),
          platformButton('playroom-platform-mobile','▯\nMobile','/webaruhaz?platform=mobile','linear-gradient(180deg,#12334d,#0a2138)','1px solid rgba(91,207,255,.32)'),
        ],
      };
      break;
    case 'playroom-setup':
    case 'playroom-player-two':
    case 'playroom-upgrade':
      next={...next,config:withStyle(config,{minHeight:'13rem'})};
      break;
    case 'playroomFeaturedGames':
      next={...next,config:withSlots({...config,columns:6,showCta:false,imageRatio:'16 / 8.5'},{root:{base:{gap:'.2rem'}},grid:{base:{gap:'.24rem'}},card:{base:{gap:'.17rem',padding:'.22rem'}},body:{base:{gap:'.05rem'}},name:{base:{fontSize:'.56rem',lineHeight:1.02}},price:{base:{fontSize:'.57rem'}},comparePrice:{base:{fontSize:'.43rem'}},stock:{base:{fontSize:'.44rem',lineHeight:1.01}},badge:{base:{top:'.22rem',left:'.22rem',fontSize:'.41rem',padding:'.12rem .22rem'}}})};
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
      next={...next,config:withStyle(config,{padding:'.4rem',minHeight:'9rem',gap:'.2rem'})};
      break;
    case 'playroom-gift-image':
      next={...next,config:withStyle(config,{height:'5.05rem'})};
      break;
    case 'playroom-gift-title':
      next={...next,config:withStyle(config,{fontSize:'1.08rem',lineHeight:.92})};
      break;
    case 'playroom-gift-copy':
      next={...next,config:withStyle(config,{fontSize:'.58rem',lineHeight:1.15})};
      break;
    case 'playroom-gift-cta':
      next={...next,config:withStyle(config,{padding:'.3rem .42rem',fontSize:'.52rem'})};
      break;
    case 'playroom-community-stage':
      next={...next,config:withStyle(config,{minHeight:'3.25rem',padding:'.28rem .58rem'})};
      break;
    case 'playroom-community-art':
      next={...next,config:withStyle(config,{opacity:.48})};
      break;
    case 'playroom-community-title':
      next={...next,config:withStyle(config,{fontSize:'1.12rem'})};
      break;
    case 'playroom-community-benefit-text':
      next={...next,config:withStyle(config,{fontSize:'.56rem',letterSpacing:'.01em'})};
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