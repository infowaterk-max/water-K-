import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {PLAYROOM_REFERENCE_V2_FIDELITY_V17_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-reference-v2-fidelity-v17';

export const PLAYROOM_REFERENCE_V2_FIDELITY_V18_VERSION='shoporation.playroom.reference-v2.fidelity.v18' as const;

type JsonRecord=Record<string,unknown>;
const rec=(value:unknown):JsonRecord=>value&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:{};
const withStyle=(config:JsonRecord,patch:JsonRecord):JsonRecord=>({...config,style:{...rec(config.style),...patch}});
const withSlots=(config:JsonRecord,patch:Record<string,JsonRecord>):JsonRecord=>{
  const existing=rec(config.styleSlots);
  return{
    ...config,
    styleSlots:{
      ...existing,
      ...Object.fromEntries(Object.entries(patch).map(([slot,value])=>{
        const current=rec(existing[slot]);
        return[slot,{...current,base:{...rec(current.base),...rec(value.base)}}];
      })),
    },
  };
};

// Photo-first visual fill. These remain normal content.image nodes, so merchants can
// replace sources, alt text, crop/focal point and responsive art direction in Builder.
const PHOTO={
  hero:'https://images.pexels.com/photos/7862349/pexels-photo-7862349.jpeg?auto=compress&cs=tinysrgb&w=1800',
  setup:'https://images.pexels.com/photos/33888375/pexels-photo-33888375.jpeg?auto=compress&cs=tinysrgb&w=1600',
  controller:'https://images.pexels.com/photos/7987293/pexels-photo-7987293.jpeg?auto=compress&cs=tinysrgb&w=1100',
  player:'https://images.pexels.com/photos/9071471/pexels-photo-9071471.jpeg?auto=compress&cs=tinysrgb&w=1200',
  community:'https://images.pexels.com/photos/7862405/pexels-photo-7862405.jpeg?auto=compress&cs=tinysrgb&w=1500',
  headset:'https://images.pexels.com/photos/7858756/pexels-photo-7858756.jpeg?auto=compress&cs=tinysrgb&w=1100',
  monitor:'https://images.pexels.com/photos/17784701/pexels-photo-17784701.jpeg?auto=compress&cs=tinysrgb&w=1200',
  lighting:'https://images.pexels.com/photos/31018745/pexels-photo-31018745.jpeg?auto=compress&cs=tinysrgb&w=1200',
  compatibility:'https://images.pexels.com/photos/7987293/pexels-photo-7987293.jpeg?auto=compress&cs=tinysrgb&w=1200',
  gift:'https://images.pexels.com/photos/6045528/pexels-photo-6045528.jpeg?auto=compress&cs=tinysrgb&w=1200',
} as const;

const platformItems=[
  {id:'playsphere',label:'PlaySphere',copy:'Konzol',href:'/webaruhaz?platform=playsphere',symbol:'🔵'},
  {id:'boxone',label:'BoxOne',copy:'Konzol',href:'/webaruhaz?platform=boxone',symbol:'🟢'},
  {id:'nintari',label:'Nintari',copy:'Hibrid',href:'/webaruhaz?platform=nintari',symbol:'🔴'},
  {id:'pc',label:'PC',copy:'Asztali',href:'/webaruhaz?platform=pc',symbol:'🟣'},
  {id:'handheld',label:'Handheld',copy:'Kézi',href:'/webaruhaz?platform=handheld',symbol:'🟡'},
  {id:'mobile',label:'Mobile',copy:'Mobil',href:'/webaruhaz?platform=mobile',symbol:'⚪'},
];

function photo(config:JsonRecord,src:string,alt:string,objectPosition:string,stylePatch:JsonRecord={}):JsonRecord{
  return{
    ...config,
    src,
    alt,
    fit:'cover',
    objectPosition,
    artDirection:{
      ...rec(config.artDirection),
      desktop:{...rec(rec(config.artDirection).desktop),src,objectPosition,objectFit:'cover'},
      tablet:{...rec(rec(config.artDirection).tablet),src,objectPosition,objectFit:'cover'},
      mobile:{...rec(rec(config.artDirection).mobile),src,objectPosition:'center center',objectFit:'cover'},
    },
    style:{...rec(config.style),objectFit:'cover',objectPosition,...stylePatch},
  };
}

function refineNode(node:StorefrontComponentNode):StorefrontComponentNode{
  let next:StorefrontComponentNode={...node,config:{...node.config},...(node.children?{children:node.children.map(refineNode)}:{})};
  const config=next.config as JsonRecord;

  switch(next.id){
    case 'playroom-hero':
      next={
        ...next,
        config:withStyle(config,{background:'#030b18'}),
        children:(next.children??[]).filter(child=>child.id!=='playroom-hero-neon-overlay'),
      };
      break;
    case 'playroom-hero-art':
      next={...next,config:photo(config,PHOTO.hero,'Barátok közös gaming esten nagy képernyő és neonfények előtt','center 48%',{filter:'saturate(1.22) contrast(1.1) brightness(.7)',transform:'scale(1.01)'})};
      break;
    case 'playroom-hero-copy':
      next={...next,config:withStyle(config,{background:'linear-gradient(90deg,rgba(1,7,20,.97),rgba(2,9,24,.76) 56%,rgba(2,9,24,.18) 88%,transparent)'})};
      break;
    case 'playroom-game-finder':
      next={...next,config:withSlots(config,{
        option:{base:{minHeight:'3.58rem',padding:'.28rem .12rem'}},
        optionMedia:{base:{fontSize:'1.24rem'}},
        optionLabel:{base:{fontSize:'.55rem'}},
        optionCopy:{base:{fontSize:'.43rem'}},
      })};
      break;
    case 'playroom-platform-navigation':
      next={...next,config:withSlots({...config,items:platformItems,columns:6},{
        card:{base:{minHeight:'3.58rem',padding:'.26rem .1rem',background:'linear-gradient(180deg,#0b2b49,#07182c)',border:'1px solid rgba(82,219,255,.34)',boxShadow:'inset 0 0 18px rgba(51,220,255,.05),0 8px 18px rgba(0,0,0,.18)'}},
        symbol:{base:{fontSize:'1.2rem',filter:'drop-shadow(0 0 10px rgba(77,221,255,.34))'}},
        label:{base:{fontSize:'.55rem',fontWeight:900}},
        itemCopy:{base:{fontSize:'.43rem',color:'#9fb8cf'}},
      })};
      break;
    case 'playroom-setup-image':
      next={...next,config:photo(config,PHOTO.setup,'RGB gaming setup monitorokkal és gamer perifériákkal','center 50%',{width:'62%',right:'0',bottom:'0',height:'100%',minHeight:'100%',filter:'saturate(1.18) contrast(1.07) brightness(.88)',transform:'none'})};
      break;
    case 'playroom-setup':
      next={...next,config:withStyle(config,{minHeight:'10.2rem',background:'linear-gradient(105deg,#071936 0%,#111344 48%,#161041 100%)'})};
      break;
    case 'playroom-player-two':
    case 'playroom-upgrade':
      next={...next,config:withStyle(config,{minHeight:'10.2rem',padding:'.52rem'})};
      break;
    case 'playroom-player-controller-image':
      next={...next,config:photo(config,PHOTO.controller,'Gaming kontroller közeli képe','center 58%',{height:'4.15rem',filter:'saturate(1.13) contrast(1.06)'})};
      break;
    case 'playroom-player-headset-image':
      next={...next,config:photo(config,PHOTO.headset,'Gaming headset RGB megvilágításban','center 72%',{height:'4.15rem',filter:'saturate(1.12) contrast(1.06)'})};
      break;
    case 'playroom-player-family-image':
      next={...next,config:photo(config,PHOTO.community,'Barátok közös videojáték közben','center 48%',{height:'4.15rem',filter:'saturate(1.16) contrast(1.06) brightness(.92)'})};
      break;
    case 'playroom-player-couch-image':
      next={...next,config:photo(config,PHOTO.player,'Kanapés multiplayer gaming este','center 46%',{height:'4.15rem',filter:'saturate(1.16) contrast(1.06) brightness(.86)'})};
      break;
    case 'playroom-upgrade-monitor-image':
      next={...next,config:photo(config,PHOTO.monitor,'Neonfényes gaming monitor és asztali setup','center 48%',{height:'4.15rem',filter:'saturate(1.15) contrast(1.07)'})};
      break;
    case 'playroom-upgrade-audio-image':
      next={...next,config:photo(config,PHOTO.headset,'Gaming audio és headset részlet','center 70%',{height:'4.15rem',filter:'saturate(1.13) contrast(1.07)'})};
      break;
    case 'playroom-upgrade-light-image':
      next={...next,config:photo(config,PHOTO.lighting,'RGB megvilágítású gaming asztal és perifériák','center 52%',{height:'4.15rem',filter:'saturate(1.15) contrast(1.07)'})};
      break;
    case 'playroom-upgrade-chair-image':
      next={...next,config:photo(config,PHOTO.setup,'Gaming szék és RGB setup','82% center',{height:'4.15rem',filter:'saturate(1.15) contrast(1.06)'})};
      break;
    case 'playroomFeaturedGames':
      next={...next,config:withSlots({...config,imageRatio:'16 / 10'},{
        card:{base:{background:'linear-gradient(180deg,#0b2946,#06172b)',border:'1px solid rgba(79,216,255,.3)',boxShadow:'0 10px 24px rgba(0,0,0,.25)'}},
        media:{base:{borderRadius:'.38rem',overflow:'hidden'}},
        badge:{base:{fontSize:'.43rem',fontWeight:850}},
        cta:{base:{fontSize:'.5rem',fontWeight:850}},
      })};
      break;
    case 'playroom-compatibility-art':
      next={...next,config:photo(config,PHOTO.compatibility,'Gaming kontroller kompatibilitási blokkhoz','center 60%',{height:'6rem',borderRadius:'.36rem',filter:'saturate(1.13) contrast(1.06) brightness(.9)'})};
      break;
    case 'playroom-gift-image':
      next={...next,config:photo(config,PHOTO.gift,'Ajándékdoboz neon rózsaszín fényben','center 52%',{position:'absolute',right:'0',top:'0',width:'54%',height:'100%',opacity:.94,filter:'saturate(1.16) contrast(1.06) brightness(.9)'})};
      break;
    case 'playroom-community-art':
      next={...next,config:photo(config,PHOTO.community,'Gaming közösség együtt játszik','center 48%',{inset:'auto 0 0 auto',width:'56%',height:'100%',minHeight:'100%',opacity:.92,filter:'saturate(1.16) contrast(1.06) brightness(.84)'})};
      break;
  }

  return next;
}

function refinePage(page:StorefrontPageDocument):StorefrontPageDocument{
  if(page.pageType!=='home')return page;
  return{
    ...page,
    metadata:{
      ...(page.metadata??{}),
      fidelityPolishVersion:PLAYROOM_REFERENCE_V2_FIDELITY_V18_VERSION,
      visualFillMode:'merchant-editable-image-slots',
      assetStrategy:'photo-first-no-bespoke-artwork',
      desktopLayout:'frozen',
      visualQa:'exact-head-desktop-capture',
    },
    sections:page.sections.map(refineNode),
  };
}

export const PLAYROOM_REFERENCE_V2_FIDELITY_V18_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...PLAYROOM_REFERENCE_V2_FIDELITY_V17_TEMPLATE_PACKAGE,
  pages:PLAYROOM_REFERENCE_V2_FIDELITY_V17_TEMPLATE_PACKAGE.pages.map(refinePage),
};
