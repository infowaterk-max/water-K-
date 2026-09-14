import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {PLAYROOM_REFERENCE_V2_FIDELITY_V13_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-reference-v2-fidelity-v13';

export const PLAYROOM_REFERENCE_V2_FIDELITY_V14_VERSION='shoporation.playroom.reference-v2.fidelity.v14' as const;

type JsonRecord=Record<string,unknown>;
const rec=(value:unknown):JsonRecord=>value&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:{};
const withStyle=(config:JsonRecord,patch:JsonRecord):JsonRecord=>({...config,style:{...rec(config.style),...patch}});

// Decorative stock photography only. Sources are free-to-use Pexels assets; no UI,
// pricing, product truth, compatibility state or other storefront authority is baked in.
const PHOTO={
  hero:'https://images.pexels.com/photos/9069213/pexels-photo-9069213.jpeg?auto=compress&cs=tinysrgb&w=1800',
  community:'https://images.pexels.com/photos/8762792/pexels-photo-8762792.jpeg?auto=compress&cs=tinysrgb&w=1400',
  controllers:'https://images.pexels.com/photos/7776882/pexels-photo-7776882.jpeg?auto=compress&cs=tinysrgb&w=1000',
  headset:'https://images.pexels.com/photos/7858756/pexels-photo-7858756.jpeg?auto=compress&cs=tinysrgb&w=1000',
  setup:'https://images.pexels.com/photos/4317157/pexels-photo-4317157.jpeg?auto=compress&cs=tinysrgb&w=1200',
} as const;

const playStyleOptions=[
  {id:'solo',label:'Solo',copy:'Egyedül',href:'/webaruhaz?play=solo',symbol:'●',selected:true},
  {id:'coop',label:'Co-op',copy:'Együtt jobb',href:'/webaruhaz?play=coop',symbol:'∞'},
  {id:'party',label:'Party',copy:'Barátokkal',href:'/webaruhaz?play=party',symbol:'✦'},
  {id:'racing',label:'Racing',copy:'Sebesség',href:'/webaruhaz?genre=racing',symbol:'◉'},
  {id:'adventure',label:'Adventure',copy:'Felfedezés',href:'/webaruhaz?genre=adventure',symbol:'▲'},
  {id:'family',label:'Family',copy:'Az egész családnak',href:'/webaruhaz?play=family',symbol:'♧'},
];

const platformItems=[
  {id:'playsphere',label:'PlaySphere',copy:'Konzol',href:'/webaruhaz?platform=playsphere',symbol:'🎮'},
  {id:'boxone',label:'BoxOne',copy:'Konzol',href:'/webaruhaz?platform=boxone',symbol:'◉'},
  {id:'nintari',label:'Nintari',copy:'Hibrid',href:'/webaruhaz?platform=nintari',symbol:'▣'},
  {id:'pc',label:'PC',copy:'Asztali',href:'/webaruhaz?platform=pc',symbol:'▰'},
  {id:'handheld',label:'Handheld',copy:'Kézi',href:'/webaruhaz?platform=handheld',symbol:'▱'},
  {id:'mobile',label:'Mobile',copy:'Mobil',href:'/webaruhaz?platform=mobile',symbol:'▯'},
];

function refineNode(node:StorefrontComponentNode):StorefrontComponentNode{
  let next:StorefrontComponentNode={...node,config:{...node.config},...(node.children?{children:node.children.map(refineNode)}:{})};
  const config=next.config as JsonRecord;

  switch(next.id){
    case 'playroom-hero-art':
      next={...next,config:{...withStyle(config,{objectFit:'cover',objectPosition:'center 55%',filter:'saturate(1.22) contrast(1.12) brightness(.78)',transform:'scale(1.02)'}),src:PHOTO.hero,alt:'Barátok közös gaming esten, neonfényes nappaliban'}};
      break;
    case 'playroom-hero-copy':
      next={...next,config:withStyle(config,{width:'43%',padding:'.82rem 1.2rem 3.05rem',background:'linear-gradient(90deg,rgba(1,7,20,.91),rgba(2,9,24,.69) 58%,rgba(2,9,24,.18) 88%,transparent)'})};
      break;
    case 'playroom-hero-title':
      next={...next,config:withStyle(config,{fontSize:'clamp(2.8rem,4vw,4.25rem)',maxWidth:'7.8ch',textShadow:'0 5px 24px rgba(0,0,0,.62)'})};
      break;
    case 'playroom-game-finder':
      next={...next,config:{...config,options:playStyleOptions,styleSlots:{...rec(config.styleSlots),option:{base:{minHeight:'4.45rem',padding:'.38rem .12rem',borderRadius:'.42rem',background:'linear-gradient(180deg,#0b2742,#07192d)',border:'1px solid rgba(76,208,255,.25)',boxShadow:'inset 0 0 18px rgba(49,222,255,.035)'}},optionActive:{base:{background:'linear-gradient(180deg,#164fb5,#11347c)',border:'1px solid #50b6ff',boxShadow:'0 0 20px rgba(40,134,255,.2)'}},optionMedia:{base:{fontSize:'1.5rem',color:'#53e8ff',textShadow:'0 0 14px rgba(55,230,255,.28)'}},optionLabel:{base:{fontSize:'.58rem',fontWeight:850}},optionCopy:{base:{fontSize:'.47rem',color:'#a8bdd2'}}}}};
      break;
    case 'playroom-platform-navigation':
      next={...next,config:{...config,items:platformItems,columns:6,styleSlots:{...rec(config.styleSlots),grid:{base:{display:'grid',gridTemplateColumns:'repeat(6,minmax(0,1fr))',gap:'.38rem'}},card:{base:{display:'grid',placeItems:'center',minHeight:'4.3rem',padding:'.32rem .1rem',borderRadius:'.42rem',background:'linear-gradient(180deg,#0a2946,#06182d)',border:'1px solid rgba(76,208,255,.24)',fontSize:'.54rem',fontWeight:800,textAlign:'center',lineHeight:1.2,boxShadow:'inset 0 0 16px rgba(61,223,255,.025)'}},symbol:{base:{fontSize:'1.46rem',lineHeight:1,color:'#f3f7ff'}},label:{base:{fontSize:'.57rem',fontWeight:850}},itemCopy:{base:{fontSize:'.46rem',color:'#9fb6cc'}}}}};
      break;
    case 'playroom-player-controller-image':
      next={...next,config:{...withStyle(config,{objectFit:'cover',objectPosition:'center 58%',filter:'saturate(1.18) contrast(1.06)'}),src:PHOTO.controllers,alt:'Két kontroller hangulatos game night környezetben'}};
      break;
    case 'playroom-player-headset-image':
    case 'playroom-upgrade-audio-image':
      next={...next,config:{...withStyle(config,{objectFit:'cover',objectPosition:'center 72%',filter:'saturate(1.12) contrast(1.08)'}),src:PHOTO.headset,alt:'Gaming headset RGB megvilágításban'}};
      break;
    case 'playroom-player-family-image':
      next={...next,config:{...withStyle(config,{objectFit:'cover',objectPosition:'center 36%',filter:'saturate(1.15) contrast(1.04) brightness(.92)'}),src:PHOTO.community,alt:'Barátok közös játék közben'}};
      break;
    case 'playroom-player-couch-image':
      next={...next,config:{...withStyle(config,{objectFit:'cover',objectPosition:'center 55%',filter:'saturate(1.15) contrast(1.05) brightness(.86)'}),src:PHOTO.hero,alt:'Kanapés közös videojáték neonfényes szobában'}};
      break;
    case 'playroom-upgrade-monitor-image':
    case 'playroom-upgrade-chair-image':
      next={...next,config:{...withStyle(config,{objectFit:'cover',objectPosition:next.id==='playroom-upgrade-chair-image'?'84% center':'22% center',filter:'saturate(1.2) contrast(1.08)'}),src:PHOTO.setup,alt:next.id==='playroom-upgrade-chair-image'?'Gaming szék RGB setup mellett':'RGB gaming monitor és asztali setup'}};
      break;
    case 'playroom-community-art':
      next={...next,config:{...withStyle(config,{opacity:.98,objectFit:'cover',objectPosition:'center 43%',filter:'saturate(1.22) contrast(1.08) brightness(.82)'}),src:PHOTO.community,alt:'Gaming közösség együtt játszik neonfényben'}};
      break;
  }

  return next;
}

function refinePage(page:StorefrontPageDocument):StorefrontPageDocument{
  if(page.pageType!=='home')return page;
  return{
    ...page,
    metadata:{...(page.metadata??{}),fidelityPolishVersion:PLAYROOM_REFERENCE_V2_FIDELITY_V14_VERSION,decorativePhotographyProvider:'Pexels'},
    sections:page.sections.map(refineNode),
  };
}

export const PLAYROOM_REFERENCE_V2_FIDELITY_V14_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...PLAYROOM_REFERENCE_V2_FIDELITY_V13_TEMPLATE_PACKAGE,
  pages:PLAYROOM_REFERENCE_V2_FIDELITY_V13_TEMPLATE_PACKAGE.pages.map(refinePage),
};
