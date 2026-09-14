import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {PLAYROOM_REFERENCE_V2_POLISHED_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-reference-v2-desktop-polish';

export const PLAYROOM_REFERENCE_V2_FIDELITY_V13_VERSION='shoporation.playroom.reference-v2.fidelity.v13' as const;

type JsonRecord=Record<string,unknown>;
const rec=(value:unknown):JsonRecord=>value&&typeof value==='object'&&!Array.isArray(value)?value as JsonRecord:{};
const style=(config:JsonRecord,patch:JsonRecord):JsonRecord=>({...config,style:{...rec(config.style),...patch}});
const button=(id:string,label:string,href:string,stylePatch:JsonRecord):StorefrontComponentNode=>({
  id,
  componentKey:'content.button',
  componentVersion:1,
  config:{label,href,variant:'primary',size:'s',ariaLabel:label,style:stylePatch},
});
const text=(id:string,value:string,stylePatch:JsonRecord,as:'p'|'small'|'strong'='p'):StorefrontComponentNode=>({
  id,
  componentKey:'content.text',
  componentVersion:1,
  config:{text:value,as,align:'left',tone:'text',style:stylePatch},
});

function insertBefore(children:StorefrontComponentNode[]|undefined,beforeId:string,node:StorefrontComponentNode){
  const list=[...(children??[])];
  if(list.some(child=>child.id===node.id))return list;
  const index=list.findIndex(child=>child.id===beforeId);
  if(index<0)list.push(node);else list.splice(index,0,node);
  return list;
}

function refineNode(node:StorefrontComponentNode):StorefrontComponentNode{
  let next:StorefrontComponentNode={...node,config:{...node.config},...(node.children?{children:node.children.map(refineNode)}:{})};
  const config=next.config as JsonRecord;

  switch(next.id){
    case 'playroom-home-header':
      next={...next,config:{...config,innerStyle:{...rec(config.innerStyle),padding:'.45rem 2.35rem .32rem'},brandStyle:{...rec(config.brandStyle),fontSize:'1.08rem',letterSpacing:'-.02em'},logoStyle:{...rec(config.logoStyle),width:'3rem',height:'3rem'},styleSlots:{...rec(config.styleSlots),topRow:{base:{minHeight:'3rem'}},navigationFrame:{base:{paddingTop:'.27rem',minHeight:'1.95rem'}}}}};
      break;
    case 'playroom-hero':
      next={...next,config:style(config,{minHeight:'14.65rem',boxShadow:'0 24px 72px rgba(0,0,0,.58),0 0 54px rgba(47,221,255,.12)'})};
      break;
    case 'playroom-hero-art':
      next={...next,config:style(config,{filter:'saturate(1.38) contrast(1.12) brightness(1.08) drop-shadow(0 14px 28px rgba(0,0,0,.2))',transform:'scale(1.045)',objectPosition:'center 47%'})};
      break;
    case 'playroom-hero-copy':
      next={...next,config:style(config,{width:'47%',padding:'.76rem 1.35rem 3.05rem',background:'linear-gradient(90deg,rgba(2,8,22,.83),rgba(2,8,22,.48) 58%,rgba(2,8,22,.06) 90%,transparent)'})};
      break;
    case 'playroom-hero-support':
      next={...next,config:style(config,{fontSize:'.8rem',fontWeight:690,color:'#eff8ff',textShadow:'0 2px 10px rgba(0,0,0,.75)'})};
      break;
    case 'playroom-setup-copy':{
      const price=text('playroom-setup-price','189 990 Ft',{fontSize:'1.02rem',fontWeight:950,lineHeight:1,color:'#ffffff',marginTop:'.08rem',textShadow:'0 3px 14px rgba(0,0,0,.45)'},'strong');
      next={...next,config:style(config,{width:'50%',padding:'.66rem .82rem'}),children:insertBefore(next.children,'playroom-setup-cta',price)};
      break;
    }
    case 'playroom-setup-title':
      next={...next,config:style(config,{fontSize:'1.28rem',textShadow:'0 0 20px rgba(255,68,206,.24)'})};
      break;
    case 'playroom-player-two':{
      const cta=button('playroom-player-two-cta','Nézd meg a multiplayer ajánlatokat  →','/webaruhaz?play=coop',{position:'absolute',right:'.62rem',top:'.58rem',zIndex:4,width:'fit-content',padding:'.38rem .52rem',fontSize:'.48rem',fontWeight:850,background:'rgba(5,23,44,.9)',color:'#f5fbff',border:'1px solid rgba(64,220,255,.38)',borderRadius:'.3rem',boxShadow:'0 7px 20px rgba(0,0,0,.18)'});
      next={...next,config:style(config,{position:'relative',paddingTop:'.72rem'}),children:[...(next.children??[]),...((next.children??[]).some(child=>child.id===cta.id)?[]:[cta])]};
      break;
    }
    case 'playroom-upgrade':{
      const cta=button('playroom-upgrade-cta','→','/webaruhaz?collection=setup',{position:'absolute',right:'.58rem',top:'.54rem',zIndex:4,width:'1.8rem',height:'1.8rem',padding:'0',display:'grid',placeItems:'center',fontSize:'1rem',fontWeight:950,background:'#f8fbff',color:'#0a1730',border:'0',borderRadius:'.34rem',boxShadow:'0 8px 20px rgba(0,0,0,.24)'});
      next={...next,config:style(config,{position:'relative'}),children:[...(next.children??[]),...((next.children??[]).some(child=>child.id===cta.id)?[]:[cta])]};
      break;
    }
    case 'playroom-featured-games':{
      const cta=button('playroom-featured-all','Összes újdonság megtekintése  →','/webaruhaz?sort=new',{position:'absolute',right:'.66rem',top:'.5rem',zIndex:3,width:'fit-content',padding:'.34rem .52rem',fontSize:'.47rem',fontWeight:830,background:'rgba(5,25,45,.9)',color:'#f5fbff',border:'1px solid rgba(69,211,255,.34)',borderRadius:'.28rem'});
      next={...next,config:style(config,{position:'relative',paddingTop:'.58rem'}),children:[...(next.children??[]),...((next.children??[]).some(child=>child.id===cta.id)?[]:[cta])]};
      break;
    }
    case 'playroom-featured-subtitle':
      next={...next,config:{...config,text:'A legfrissebb megjelenések, amik lazán tartják a gaming világot.',style:{...rec(config.style),fontSize:'.56rem',color:'#b7c9dc'}}};
      break;
    case 'playroom-compatibility-platform-list':
      next={...next,config:{...config,text:'PlaySphere-szerű   ✓   ✓\nBox-szerű          ✓   ✓\nNintari-szerű      ✓\nPC                  ✓\nMobile              ✓',style:{...rec(config.style),fontSize:'.55rem',lineHeight:1.28,color:'#e8f7ff',fontWeight:720,whiteSpace:'pre-line'}}};
      break;
    case 'playroom-compatibility-check':
      next={...next,config:{...config,label:'Kompatibilis termékek  →',ariaLabel:'Kompatibilis termékek megtekintése',style:{...rec(config.style),padding:'.36rem .55rem',fontSize:'.49rem',background:'#ffc45b',color:'#071326',boxShadow:'0 7px 18px rgba(255,196,91,.19)'}}};
      break;
    case 'playroom-community-stage':
      next={...next,config:style(config,{minHeight:'4.9rem',padding:'.46rem .72rem',background:'linear-gradient(90deg,rgba(17,18,72,.98),rgba(45,15,96,.94))'})};
      break;
    case 'playroom-community-art':
      next={...next,config:style(config,{opacity:.92,filter:'saturate(1.38) contrast(1.08) brightness(1.04)',objectPosition:'right center'})};
      break;
    case 'playroom-community-benefit-text':
      next={...next,config:{...config,text:'⬡  10.000+ termék    ◇  Hivatalos disztribútorok    ▱  Gyors szállítás    ⊕  14 napos elállás    ♧  Játékos közösség',style:{...rec(config.style),fontSize:'.53rem',fontWeight:790,letterSpacing:'.005em',color:'#edf6ff',textShadow:'0 2px 8px rgba(0,0,0,.4)'}}};
      break;
    case 'playroom-community-button':
      next={...next,config:style(config,{fontSize:'.57rem',padding:'.54rem .7rem',background:'linear-gradient(90deg,#1688ff,#20bfff)',boxShadow:'0 8px 24px rgba(19,143,255,.22)'})};
      break;
    case 'playroom-footer-social-icons':
      next={...next,config:style(config,{fontSize:'1.02rem',letterSpacing:'.16em',color:'#ffffff'})};
      break;
  }
  return next;
}

function refinePage(page:StorefrontPageDocument):StorefrontPageDocument{
  if(page.pageType!=='home')return page;
  return{
    ...page,
    metadata:{...(page.metadata??{}),fidelityPolishVersion:PLAYROOM_REFERENCE_V2_FIDELITY_V13_VERSION},
    sections:page.sections.map(refineNode),
  };
}

export const PLAYROOM_REFERENCE_V2_FIDELITY_V13_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...PLAYROOM_REFERENCE_V2_POLISHED_TEMPLATE_PACKAGE,
  pages:PLAYROOM_REFERENCE_V2_POLISHED_TEMPLATE_PACKAGE.pages.map(refinePage),
};
