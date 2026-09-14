import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-reference-v2';

export const PLAYROOM_REFERENCE_V2_DESKTOP_POLISH_VERSION='shoporation.playroom.reference-v2.desktop-polish.v11' as const;

type JsonRecord=Record<string,unknown>;
const rec=(value:unknown):JsonRecord=>value&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:{};
const mapRows=(value:unknown,fn:(row:JsonRecord)=>JsonRecord):unknown=>Array.isArray(value)?value.map(item=>fn(rec(item))):value;
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
    style:{gap:'.1rem',fontSize:'.56rem',fontWeight:620,color:'#aec0d3',lineHeight:1.08},
    styleSlots:{item:{base:{padding:'0',minHeight:'0'}}},
  },
});

const PLAY_STYLE_COPY:Record<string,string>={solo:'Egyedül',coop:'Együtt jobb',party:'Barátokkal',racing:'Sebesség',adventure:'Felfedezés',family:'Az egész családnak'};
const PLATFORM_VISUALS:Record<string,{label:string;symbol:string;copy:string}>={
  playsphere:{label:'PlaySphere',symbol:'🎮',copy:'Konzol'},
  boxone:{label:'BoxOne',symbol:'◉',copy:'Konzol'},
  nintari:{label:'Nintari',symbol:'▣',copy:'Hibrid'},
  pc:{label:'PC',symbol:'▰',copy:'Asztali'},
  handheld:{label:'Handheld',symbol:'▱',copy:'Kézi'},
  mobile:{label:'Mobile',symbol:'▯',copy:'Mobil'},
};

function polishNode(node:StorefrontComponentNode):StorefrontComponentNode{
  let next:StorefrontComponentNode={...node,config:{...node.config},...(node.children?{children:node.children.map(polishNode)}:{})};
  const config=next.config as JsonRecord;

  switch(next.id){
    case 'playroom-home-header':
      next={...next,config:withSlots({...config,innerStyle:{...rec(config.innerStyle),padding:'.42rem 2.35rem .3rem',gap:'.34rem'},logoStyle:{...rec(config.logoStyle),width:'2.65rem',height:'2.65rem'}},{topRow:{base:{minHeight:'2.72rem'}},navigationFrame:{base:{paddingTop:'.28rem',minHeight:'1.9rem'}},utilityLabel:{base:{fontSize:'.7rem'}}})};
      break;
    case 'playroom-home-search':
      next={...next,config:{...config,style:{...rec(config.style),height:'2.24rem',boxShadow:'0 0 0 1px rgba(55,222,255,.08),0 8px 24px rgba(0,0,0,.18)'},inputStyle:{...rec(config.inputStyle),fontSize:'.73rem',padding:'.58rem .84rem'},buttonStyle:{...rec(config.buttonStyle),padding:'.34rem .7rem'}}};
      break;
    case 'playroom-home-nav':
      next={...next,config:withStyle(config,{gap:'1.62rem',fontSize:'.7rem'})};
      break;
    case 'playroom-hero':
      next={...next,config:withStyle(config,{minHeight:'14.2rem',boxShadow:'0 22px 68px rgba(0,0,0,.5),0 0 44px rgba(42,213,255,.1)',border:'1px solid rgba(68,220,255,.34)'})};
      break;
    case 'playroom-hero-art':
      next={...next,config:withStyle(config,{filter:'saturate(1.26) contrast(1.09) brightness(1.04) drop-shadow(0 12px 24px rgba(0,0,0,.18))',objectPosition:'center 46%',transform:'scale(1.035)'})};
      break;
    case 'playroom-hero-copy':
      next={...next,config:withStyle(config,{minHeight:'10.65rem',padding:'.8rem 1.35rem 3.05rem',width:'47%',justifyContent:'center',background:'linear-gradient(90deg,rgba(2,8,22,.96),rgba(2,8,22,.73) 58%,rgba(2,8,22,.08) 88%,transparent)'})};
      break;
    case 'playroom-hero-title':
      next={...next,config:withStyle(config,{fontSize:'clamp(3rem,4.1vw,4.45rem)',lineHeight:.83,letterSpacing:'-.052em',fontStyle:'italic',textShadow:'0 5px 22px rgba(0,0,0,.68),0 0 24px rgba(55,226,255,.12)',transform:'scaleX(1.08)',transformOrigin:'left center'})};
      break;
    case 'playroom-hero-support':
      next={...next,config:withStyle(config,{fontSize:'.77rem',lineHeight:1.16,maxWidth:'34ch',color:'#d7e6f4'})};
      break;
    case 'playroom-hero-primary':
      next={...next,config:withStyle(config,{padding:'.55rem .9rem',fontSize:'.65rem',boxShadow:'0 8px 26px rgba(255,70,174,.28),0 0 20px rgba(255,70,174,.08)'})};
      break;
    case 'playroom-trust-grid':
      next={...next,config:withStyle(config,{left:'.6rem',right:'.6rem',bottom:'.36rem',background:'rgba(2,12,28,.9)',backdropFilter:'blur(16px)',border:'1px solid rgba(89,216,255,.26)',boxShadow:'0 10px 28px rgba(0,0,0,.28)'})};
      break;
    case 'playroom-trust-shipping':
    case 'playroom-trust-warranty':
    case 'playroom-trust-return':
    case 'playroom-trust-community':
      next={...next,config:withStyle(config,{padding:'.26rem .4rem'})};
      break;
    case 'playroom-style-card':
    case 'playroom-platform-card':
      next={...next,config:withStyle(config,{padding:'.62rem .68rem',background:'linear-gradient(180deg,rgba(8,38,66,.98),rgba(5,23,42,.98))',border:'1px solid rgba(67,215,255,.32)',boxShadow:'0 14px 34px rgba(0,0,0,.24),inset 0 0 30px rgba(65,210,255,.035)'})};
      break;
    case 'playroom-style-heading':
    case 'playroom-platform-heading':
      next={...next,config:withStyle(config,{fontSize:'1.04rem',letterSpacing:'-.02em',marginBottom:'.08rem'})};
      break;
    case 'playroom-game-finder':{
      const options=mapRows(config.options,row=>({...row,copy:PLAY_STYLE_COPY[typeof row.id==='string'?row.id:'']??row.copy}));
      const optionsBinding=next.bindings?.options;
      next={...next,...(optionsBinding?{bindings:{...next.bindings,options:{...optionsBinding,fallback:options}}}:{}),config:withSlots({...config,options},{options:{base:{gap:'.4rem'}},option:{base:{minHeight:'6.05rem',padding:'.45rem .1rem',gap:'.14rem',background:'linear-gradient(180deg,#0d304f,#071b31)',border:'1px solid rgba(80,218,255,.3)',boxShadow:'inset 0 0 24px rgba(255,255,255,.025),0 8px 20px rgba(0,0,0,.18)'}},optionActive:{base:{background:'linear-gradient(180deg,#16418d,#123675)',border:'1px solid #43a2ff',boxShadow:'0 0 0 1px rgba(66,162,255,.25),0 10px 28px rgba(16,90,255,.18)'}},optionMedia:{base:{fontSize:'2.05rem',lineHeight:1,color:'#54efff',filter:'drop-shadow(0 0 12px rgba(79,234,255,.3))'}},optionLabel:{base:{fontSize:'.64rem',lineHeight:1.08}},optionCopy:{base:{fontSize:'.48rem',color:'#a8bdd1',lineHeight:1.06}}})};
      break;
    }
    case 'playroom-platform-navigation':{
      const items=mapRows(config.items,row=>{
        const visual=PLATFORM_VISUALS[typeof row.id==='string'?row.id:''];
        return visual?{...row,...visual}:row;
      });
      next={...next,config:withSlots({...config,columns:6,presentation:'cards',items},{root:{base:{gap:'0'}},header:{base:{display:'none'}},grid:{base:{display:'grid',gridTemplateColumns:'repeat(6,minmax(0,1fr))',gap:'.4rem'}},card:{base:{minHeight:'5.9rem',padding:'.42rem .1rem',borderRadius:'.46rem',background:'linear-gradient(180deg,#0d304f,#071a30)',border:'1px solid rgba(80,218,255,.3)',boxShadow:'inset 0 0 22px rgba(255,255,255,.035),0 9px 22px rgba(0,0,0,.18)'}},symbol:{base:{fontSize:'1.9rem',lineHeight:1,color:'#f7fbff',filter:'drop-shadow(0 0 11px rgba(68,222,255,.3))'}},label:{base:{fontSize:'.62rem',fontWeight:880,lineHeight:1.06}},itemCopy:{base:{fontSize:'.45rem',lineHeight:1.06,color:'#a8bdd1'}}})};
      break;
    }
    case 'playroom-setup':
      next={...next,config:withStyle(config,{minHeight:'14.8rem',background:'radial-gradient(circle at 82% 48%,rgba(45,109,255,.5),transparent 42%),radial-gradient(circle at 70% 92%,rgba(255,43,180,.23),transparent 36%),linear-gradient(135deg,#091c3c,#18134f)',border:'1px solid rgba(76,153,255,.3)',boxShadow:'0 16px 44px rgba(0,0,0,.3),inset 0 0 42px rgba(82,112,255,.035)'})};
      break;
    case 'playroom-setup-image':
      next={...next,config:withStyle(config,{width:'62%',filter:'saturate(1.22) contrast(1.08) brightness(1.06) drop-shadow(0 16px 24px rgba(0,0,0,.32))',transform:'scale(1.035)',transformOrigin:'right bottom'})};
      break;
    case 'playroom-player-two':
      next={...next,config:withStyle(config,{minHeight:'14.8rem',background:'radial-gradient(circle at 14% 2%,rgba(33,233,217,.13),transparent 36%),linear-gradient(155deg,#072943,#071b31)',border:'1px solid rgba(51,220,229,.26)',boxShadow:'0 16px 42px rgba(0,0,0,.28),inset 0 0 34px rgba(51,220,229,.025)'})};
      break;
    case 'playroom-upgrade':
      next={...next,config:withStyle(config,{minHeight:'14.8rem',background:'radial-gradient(circle at 84% 6%,rgba(255,78,198,.16),transparent 38%),linear-gradient(150deg,#111f3f,#1a1233)',border:'1px solid rgba(255,103,214,.24)',boxShadow:'0 16px 42px rgba(0,0,0,.28),inset 0 0 34px rgba(255,78,198,.025)'})};
      break;
    case 'playroom-player-controller':
    case 'playroom-player-headset':
    case 'playroom-player-family':
    case 'playroom-player-couch':
    case 'playroom-upgrade-monitor':
    case 'playroom-upgrade-audio':
    case 'playroom-upgrade-light':
    case 'playroom-upgrade-chair':
      next={...next,config:withStyle(config,{padding:'.42rem',background:'linear-gradient(180deg,#0c2943,#07192c)',border:'1px solid rgba(72,210,255,.24)',borderRadius:'.48rem',boxShadow:'0 10px 24px rgba(0,0,0,.24),inset 0 0 18px rgba(255,255,255,.025)'})};
      break;
    case 'playroom-player-controller-image':
    case 'playroom-player-headset-image':
    case 'playroom-player-family-image':
    case 'playroom-player-couch-image':
    case 'playroom-upgrade-monitor-image':
    case 'playroom-upgrade-audio-image':
    case 'playroom-upgrade-light-image':
    case 'playroom-upgrade-chair-image':
      next={...next,config:withStyle(config,{height:'6.15rem',filter:'saturate(1.2) contrast(1.08) brightness(1.03)',borderRadius:'.38rem',boxShadow:'0 8px 18px rgba(0,0,0,.22)'})};
      break;
    case 'playroomFeaturedGames':
      next={...next,config:withSlots({...config,columns:6,showCta:false,imageRatio:'4 / 3'},{root:{base:{gap:'.28rem'}},grid:{base:{gap:'.32rem'}},card:{base:{gap:'.22rem',padding:'.28rem',background:'linear-gradient(180deg,#0b2842,#06182b)',border:'1px solid rgba(72,210,255,.23)',boxShadow:'0 10px 24px rgba(0,0,0,.22)'}},media:{base:{borderRadius:'.38rem',overflow:'hidden'}},body:{base:{gap:'.08rem'}},name:{base:{fontSize:'.6rem',lineHeight:1.04}},price:{base:{fontSize:'.62rem'}},comparePrice:{base:{fontSize:'.45rem'}},stock:{base:{fontSize:'.46rem',lineHeight:1.02}},badge:{base:{top:'.26rem',left:'.26rem',fontSize:'.42rem',padding:'.14rem .24rem',boxShadow:'0 4px 12px rgba(0,0,0,.28)'}}})};
      break;
    case 'playroom-featured-games':
      next={...next,config:withStyle(config,{padding:'.56rem .66rem',minHeight:'11.3rem',background:'linear-gradient(180deg,#08253d,#061b30)',border:'1px solid rgba(75,211,255,.26)',boxShadow:'0 14px 36px rgba(0,0,0,.24)'})};
      break;
    case 'playroom-compatibility-card':
      next={...next,config:withStyle(config,{padding:'.56rem',minHeight:'11.3rem',background:'linear-gradient(180deg,#0a2943,#071a2d)',border:'1px solid rgba(75,211,255,.25)',boxShadow:'0 14px 36px rgba(0,0,0,.24)'})};
      break;
    case 'playroom-compatibility-art':
      next={...next,config:withStyle(config,{height:'6.4rem',filter:'saturate(1.18) contrast(1.06) drop-shadow(0 10px 20px rgba(0,0,0,.25))'})};
      break;
    case 'playroom-platform-match-status':{
      const copyBinding=next.bindings?.copy;
      next={...next,config:{...config,title:'Kompatibilitás',copy:'Ismeretlen = nem kompatibilis.',presentation:'compact'},...(copyBinding?{bindings:{...next.bindings,copy:{...copyBinding,fallback:'Ismeretlen = nem kompatibilis.'}}}:{})};
      break;
    }
    case 'playroom-compatibility-status-wrap':{
      const original=next.children?.[0];
      next={...next,config:withStyle(config,{gap:'.24rem'}),children:[
        {id:'playroom-compatibility-platform-list',componentKey:'content.text',componentVersion:1,config:{text:'PlaySphere  —\nBoxOne      —\nNintari     —\nPC          —\nMobile      —',as:'small',align:'left',tone:'text',style:{whiteSpace:'pre-line',fontSize:'.48rem',lineHeight:1.18,color:'#c2d3e2',letterSpacing:'.01em'}}},
        ...(original?[original]:[]),
        {id:'playroom-compatibility-check',componentKey:'content.button',componentVersion:1,config:{label:'Ellenőrzöm  →',href:'/webaruhaz',variant:'primary',size:'s',ariaLabel:'Platform kompatibilitás ellenőrzése',style:{width:'fit-content',padding:'.3rem .48rem',fontSize:'.47rem',fontWeight:850,background:'#ffc65a',color:'#071326',border:'0',borderRadius:'.32rem',boxShadow:'0 6px 14px rgba(255,198,90,.16)'}}},
      ]};
      break;
    }
    case 'playroom-gift-card':
      next={...next,config:withStyle(config,{position:'relative',overflow:'hidden',padding:'.8rem',minHeight:'11.3rem',gap:'.28rem',justifyContent:'center',background:'radial-gradient(circle at 86% 52%,rgba(255,75,214,.24),transparent 35%),linear-gradient(90deg,#171047 0%,#25115a 48%,#350d5e 100%)',border:'1px solid rgba(255,99,218,.3)',boxShadow:'0 14px 38px rgba(0,0,0,.26)'})};
      break;
    case 'playroom-gift-image':
      next={...next,config:withStyle(config,{position:'absolute',right:'0',top:'0',width:'62%',height:'100%',objectFit:'cover',objectPosition:'center',opacity:.99,filter:'saturate(1.2) contrast(1.07) brightness(1.04) drop-shadow(0 12px 22px rgba(0,0,0,.22))'})};
      break;
    case 'playroom-gift-title':
      next={...next,config:withStyle(config,{position:'relative',zIndex:2,width:'50%',fontSize:'1.42rem',lineHeight:.9,textShadow:'0 3px 14px rgba(0,0,0,.62)'})};
      break;
    case 'playroom-gift-copy':
      next={...next,config:withStyle(config,{position:'relative',zIndex:2,width:'48%',fontSize:'.58rem',lineHeight:1.18,color:'#e3dff4'})};
      break;
    case 'playroom-gift-cta':
      next={...next,config:withStyle(config,{position:'relative',zIndex:2,width:'fit-content',padding:'.34rem .5rem',fontSize:'.5rem',marginTop:'.14rem',boxShadow:'0 7px 18px rgba(0,0,0,.2)'})};
      break;
    case 'playroom-community-stage':
      next={...next,config:withStyle(config,{minHeight:'4.65rem',padding:'.42rem .72rem',border:'1px solid rgba(134,104,255,.28)',boxShadow:'0 12px 30px rgba(0,0,0,.22)'})};
      break;
    case 'playroom-community-art':
      next={...next,config:withStyle(config,{opacity:.76,filter:'saturate(1.26) contrast(1.06)'})};
      break;
    case 'playroom-community-title':
      next={...next,config:withStyle(config,{fontSize:'1.24rem',letterSpacing:'-.025em'})};
      break;
    case 'playroom-community-benefit-text':
      next={...next,config:withStyle(config,{fontSize:'.56rem',letterSpacing:'.01em',color:'#dbe5f2'})};
      break;
    case 'playroom-home-footer':
      next={...next,config:withStyle(config,{padding:'.46rem 2.35rem .52rem',borderTop:'1px solid rgba(62,210,255,.16)'})};
      break;
    case 'playroom-footer-brand':
      next={...next,config:withStyle(config,{gap:'.1rem'})};
      break;
    case 'playroom-footer-logo':
      next={...next,config:withStyle(config,{width:'1.9rem',height:'1.9rem'})};
      break;
    case 'playroom-footer-shop':
      next={...next,config:withStyle(config,{gap:'.16rem'}),children:[
        next.children?.[0]??{id:'playroom-footer-shop-title',componentKey:'content.text',componentVersion:1,config:{text:'Vásárlási információk',as:'strong',align:'left',tone:'text'}},
        footerNavigation('playroom-footer-shop-nav','Vásárlási információk',[{label:'Szállítás',href:'/oldal/szallitas'},{label:'Fizetés',href:'/oldal/fizetes'},{label:'Visszaküldés',href:'/oldal/visszakuldes'},{label:'GYIK',href:'/gyik'}]),
      ]};
      break;
    case 'playroom-footer-world':
      next={...next,config:withStyle(config,{gap:'.16rem'}),children:[
        next.children?.[0]??{id:'playroom-footer-world-title',componentKey:'content.text',componentVersion:1,config:{text:'Gaming világ',as:'strong',align:'left',tone:'text'}},
        footerNavigation('playroom-footer-world-nav','Gaming világ',[{label:'Újdonságok',href:'/webaruhaz?sort=new'},{label:'Playroom Magazin',href:'/blog'},{label:'Játékajánlók',href:'/blog'},{label:'Események',href:'/blog'}]),
      ]};
      break;
    case 'playroom-footer-about':
      next={...next,config:withStyle(config,{gap:'.16rem'}),children:[
        next.children?.[0]??{id:'playroom-footer-about-title',componentKey:'content.text',componentVersion:1,config:{text:'Rólunk',as:'strong',align:'left',tone:'text'}},
        footerNavigation('playroom-footer-about-nav','Rólunk',[{label:'Történetünk',href:'/oldal/rolunk'},{label:'Fenntarthatóság',href:'/oldal/fenntarthatosag'},{label:'Karrier',href:'/oldal/karrier'},{label:'Kapcsolat',href:'/kapcsolat'}]),
      ]};
      break;
    case 'playroom-footer-social':
      next={...next,config:withStyle(config,{gap:'.12rem',paddingLeft:'.9rem'})};
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