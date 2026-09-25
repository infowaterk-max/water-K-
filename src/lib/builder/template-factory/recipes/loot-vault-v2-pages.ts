import type {StorefrontBuilderPageType} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {
  LOOT_VAULT_HOME_PAGE,
  LOOT_VAULT_CATALOG_PAGE,
  LOOT_VAULT_PRODUCT_PAGE,
  LOOT_VAULT_BLOG_INDEX_PAGE,
  LOOT_VAULT_BLOG_ARTICLE_PAGE,
} from '@/lib/builder/templates/loot-vault';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v20';

export const LOOT_VAULT_V2_MEDIA_PATHS=Object.freeze({
  hero:'/storefront-demo/loot-vault-v2/hero-cinematic.webp',
  categoryGalaxy:'/storefront-demo/loot-vault-v2/category-galaxy.webp',
  categoryHeroes:'/storefront-demo/loot-vault-v2/category-heroes.webp',
  categoryAnime:'/storefront-demo/loot-vault-v2/category-anime.webp',
  categoryFantasy:'/storefront-demo/loot-vault-v2/category-fantasy.webp',
  categoryMiniatures:'/storefront-demo/loot-vault-v2/category-miniatures.webp',
  categoryRetro:'/storefront-demo/loot-vault-v2/category-retro.webp',
  productFigure:'/storefront-demo/loot-vault-v2/product-figure.webp',
  productStatue:'/storefront-demo/loot-vault-v2/product-statue.webp',
  productEdition:'/storefront-demo/loot-vault-v2/product-edition.webp',
  productRelic:'/storefront-demo/loot-vault-v2/product-relic.webp',
  editorialRoom:'/storefront-demo/loot-vault-v2/editorial-collector-room.webp',
  editorialShelf:'/storefront-demo/loot-vault-v2/editorial-vault-shelf.webp',
  backgroundArchive:'/storefront-demo/loot-vault-v2/background-archive.webp',
} as const);

const clone=<T>(value:T):T=>structuredClone(value);

function walk(nodes:StorefrontComponentNode[],visitor:(node:StorefrontComponentNode)=>void){
  for(const node of nodes){
    visitor(node);
    if(node.children?.length)walk(node.children,visitor);
  }
}

function findNode(page:StorefrontPageDocument,id:string){
  let found:StorefrontComponentNode|undefined;
  walk(page.sections,node=>{if(node.id===id)found=node;});
  if(!found)throw new Error(`LOOT_VAULT_V2_REFERENCE_NODE_MISSING:${page.pageType}:${id}`);
  return found;
}

function foundationPage(pageType:StorefrontBuilderPageType){
  const page=PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(candidate=>candidate.pageType===pageType);
  if(!page)throw new Error(`LOOT_VAULT_V2_FOUNDATION_PAGE_MISSING:${pageType}`);
  return page;
}

function withSharedFoundationShell(source:StorefrontPageDocument){
  const next=clone(source);
  const foundation=foundationPage(source.pageType);
  const header=foundation.sections[0];
  const footer=foundation.sections.at(-1);
  if(!header||!footer)throw new Error(`LOOT_VAULT_V2_FOUNDATION_SHELL_MISSING:${source.pageType}`);
  next.sections[0]=clone(header);
  next.sections[next.sections.length-1]=clone(footer);
  next.metadata={...(next.metadata??{}),referenceBuild:'gaming.loot-vault.accepted-reference-2026-09-06'};
  return next;
}

const universeItems=[
  {id:'galaxy',label:'Galaktikus legendák',href:'/webaruhaz?universe=galaxy',image:LOOT_VAULT_V2_MEDIA_PATHS.categoryGalaxy,imageAlt:'Galaktikus gyűjtői világ'},
  {id:'heroes',label:'Hősök és antihősök',href:'/webaruhaz?universe=heroes',image:LOOT_VAULT_V2_MEDIA_PATHS.categoryHeroes,imageAlt:'Hősök és antihősök gyűjtői világa'},
  {id:'anime',label:'Anime világ',href:'/webaruhaz?universe=anime',image:LOOT_VAULT_V2_MEDIA_PATHS.categoryAnime,imageAlt:'Anime ihletésű gyűjtői világ'},
  {id:'fantasy',label:'Fantasy',href:'/webaruhaz?universe=fantasy',image:LOOT_VAULT_V2_MEDIA_PATHS.categoryFantasy,imageAlt:'Fantasy gyűjtői világ'},
  {id:'miniatures',label:'Miniatűrök',href:'/webaruhaz?universe=miniatures',image:LOOT_VAULT_V2_MEDIA_PATHS.categoryMiniatures,imageAlt:'Festett miniatűrök és diorámák'},
  {id:'retro',label:'Retro gaming',href:'/webaruhaz?universe=retro',image:LOOT_VAULT_V2_MEDIA_PATHS.categoryRetro,imageAlt:'Retro gaming gyűjtői világ'},
] as const;

function homePage(){
  const page=withSharedFoundationShell(LOOT_VAULT_HOME_PAGE);
  const hero=findNode(page,'loot-vault-hero');
  hero.config={
    ...hero.config,
    eyebrow:'LOOT VAULT · FANDOM. GYŰJTEMÉNY. TÖRTÉNETEK.',
    title:'A TÖRTÉNETEK\nNEM ÉRNEK VÉGET',
    excerpt:'Fedezd fel a kedvenc univerzumaidat. Gyűjts. Játssz. Légy részese.',
    image:LOOT_VAULT_V2_MEDIA_PATHS.hero,
    imageAlt:'Filmszerű fantasy és sci-fi gyűjtői jelenet meleg bronz fénnyel',
    ctaLabel:'Válaszd ki az univerzumodat →',
    ctaHref:'#loot-universes',
    imagePosition:'right',
    tone:'primary',
  };
  hero.bindings={
    ...hero.bindings,
    image:{path:'content.lootHero.image',fallback:LOOT_VAULT_V2_MEDIA_PATHS.hero},
    imageAlt:{path:'content.lootHero.imageAlt',fallback:'Filmszerű fantasy és sci-fi gyűjtői jelenet meleg bronz fénnyel'},
    title:{path:'content.lootHero.title',fallback:'A TÖRTÉNETEK\nNEM ÉRNEK VÉGET'},
    excerpt:{path:'content.lootHero.copy',fallback:'Fedezd fel a kedvenc univerzumaidat. Gyűjts. Játssz. Légy részese.'},
    ctaLabel:{path:'content.lootHero.ctaLabel',fallback:'Válaszd ki az univerzumodat →'},
    ctaHref:{path:'content.lootHero.ctaHref',fallback:'#loot-universes'},
  };

  const universes=findNode(page,'loot-universe-selector');
  universes.config={...universes.config,title:'Válaszd ki az univerzumodat',items:clone(universeItems),columns:6,imageRatio:'4 / 5',presentation:'media-navigation'};
  universes.bindings={...universes.bindings,items:{path:'collection.navigation',fallback:clone(universeItems)}};

  const drops=findNode(page,'lootDrops');
  drops.config={...drops.config,title:'Limitált kiadások & exkluzív termékek',columns:4,presentation:'editorial',showBadges:true,showCompareAt:true};
  drops.bindings={...drops.bindings,title:{path:'content.lootDrops.title',fallback:'Limitált kiadások & exkluzív termékek'}};

  const selection=findNode(page,'lootCollectorSelection');
  selection.config={...selection.config,title:'Ritka darabok. Valódi gyűjtőknek.',columns:4,presentation:'editorial'};

  const feature=findNode(page,'loot-vault-feature');
  feature.config={
    ...feature.config,
    eyebrow:'GYŰJTŐKNEK. RAJONGÓKNAK. MINDENKINEK.',
    title:'Több mint termékek. Egy közösség.',
    copy:'Figurák, művészeti albumok, relikviák és különleges kiadások egy helyen — olyan tárgyak, amelyekhez történet is tartozik.',
    image:LOOT_VAULT_V2_MEDIA_PATHS.editorialRoom,
    imageAlt:'Hangulatos gyűjtői szoba polcokkal, vitrinnel és relikviákkal',
    ctaLabel:'Fedezd fel a kollekciókat →',
    ctaHref:'/webaruhaz',
    imagePosition:'right',
    tone:'surface',
  };
  feature.bindings={...feature.bindings,image:{path:'content.vaultFeature.image',fallback:LOOT_VAULT_V2_MEDIA_PATHS.editorialRoom}};

  const alertTitle=findNode(page,'loot-drop-alert-title');
  alertTitle.config={...alertTitle.config,text:'Ne maradj le a következő megjelenésről'};
  const alertCopy=findNode(page,'loot-drop-alert-copy');
  alertCopy.config={...alertCopy.config,text:'Valóban publikált előrendelések és megjelenések — mesterséges visszaszámlálás és hamis hiányérzet nélkül.'};
  const alertCta=findNode(page,'loot-drop-alert-cta');
  alertCta.config={...alertCta.config,label:'Kérek értesítést',ariaLabel:'Feliratkozás megjelenési értesítőre'};

  const hunt=findNode(page,'loot-join-hunt');
  hunt.config={
    ...hunt.config,
    eyebrow:'A GYŰJTÉS ÉLMÉNYE',
    title:'Több mint hobbi. Egy történet.',
    copy:'Építs olyan gyűjteményt, amely valódi termékadatokra, történetekre és felfedezésre épül.',
    image:LOOT_VAULT_V2_MEDIA_PATHS.editorialShelf,
    imageAlt:'Prémium gyűjtői polc meleg fényekkel és vitrines tárgyakkal',
    ctaLabel:'Belépek a Vaultba →',
    ctaHref:'/webaruhaz',
    imagePosition:'left',
    tone:'primary',
  };
  hunt.bindings={...hunt.bindings,image:{path:'content.joinHunt.image',fallback:LOOT_VAULT_V2_MEDIA_PATHS.editorialShelf}};
  return page;
}

function catalogPage(){
  const page=withSharedFoundationShell(LOOT_VAULT_CATALOG_PAGE);
  const header=findNode(page,'loot-catalog-collection-header');
  header.config={
    ...header.config,
    eyebrow:'LOOT VAULT KATALÓGUS',
    title:'Találd meg a következő darabot.',
    description:'Univerzum, típus, megjelenés és strukturált gyűjtői adatok szerint.',
    image:LOOT_VAULT_V2_MEDIA_PATHS.backgroundArchive,
    imageAlt:'Sötét gyűjtői archívum meleg bronz megvilágítással',
  };
  header.bindings={...header.bindings,image:{path:'collection.current.image',fallback:LOOT_VAULT_V2_MEDIA_PATHS.backgroundArchive},imageAlt:{path:'collection.current.imageAlt',fallback:'Sötét gyűjtői archívum meleg bronz megvilágítással'}};
  const grid=findNode(page,'lootCatalogGrid');
  grid.config={...grid.config,title:'Gyűjtői válogatás',columns:3,presentation:'editorial',showBadges:true,showCompareAt:true};
  return page;
}

function productPage(){
  const page=withSharedFoundationShell(LOOT_VAULT_PRODUCT_PAGE);
  const info=findNode(page,'loot-product-info');
  info.config={...info.config,eyebrow:'LOOT VAULT',title:'Gyűjtői kiadás',presentation:'editorial'};
  const specs=findNode(page,'loot-product-key-specs');
  specs.config={...specs.config,title:'Gyűjtői adatok'};
  const story=findNode(page,'loot-product-story');
  story.config={
    ...story.config,
    eyebrow:'A DARAB TÖRTÉNETE',
    title:'Nem csak tárgy. Egy történet része.',
    copy:'Kiadás, formátum, eredet és minden gyűjtői adat kizárólag strukturált termékadatból jelenik meg.',
    image:LOOT_VAULT_V2_MEDIA_PATHS.editorialShelf,
    imageAlt:'Prémium gyűjtői polc relikviákkal és meleg bronz fényekkel',
    ctaLabel:'További történetek',
    ctaHref:'/blog',
  };
  story.bindings={...story.bindings,image:{path:'content.productStory.image',fallback:LOOT_VAULT_V2_MEDIA_PATHS.editorialShelf}};
  return page;
}

function blogIndexPage(){
  const page=withSharedFoundationShell(LOOT_VAULT_BLOG_INDEX_PAGE);
  const index=findNode(page,'loot-story-index');
  const items=[
    {id:'collector-room',eyebrow:'GYŰJTŐI TÉR',title:'Így válik a polc történetté',excerpt:'Fény, elrendezés és fókusz a gyűjtemény körül.',href:'/blog/gyujtoi-ter',image:LOOT_VAULT_V2_MEDIA_PATHS.editorialRoom,imageAlt:'Gyűjtői szoba vitrinnel és meleg világítással'},
    {id:'edition-guide',eyebrow:'KIADÁSOK',title:'Mitől különleges egy kiadás?',excerpt:'A címke helyett a strukturált termékadat számít.',href:'/blog/kiadasok',image:LOOT_VAULT_V2_MEDIA_PATHS.editorialShelf,imageAlt:'Gyűjtői polc különleges kiadásokkal'},
    {id:'archive',eyebrow:'ARCHÍVUM',title:'Tárgyak, amelyekhez történet tartozik',excerpt:'Közösség, háttértörténetek és kurált gyűjtés.',href:'/blog/archivum',image:LOOT_VAULT_V2_MEDIA_PATHS.backgroundArchive,imageAlt:'Sötét gyűjtői archívum'},
  ];
  index.config={...index.config,eyebrow:'VAULT MAGAZIN',title:'Történetek a gyűjtemény mögött',items,columns:3,emptyLabel:'Hamarosan új történetek érkeznek.'};
  index.bindings={...index.bindings,items:{path:'content.journalItems',fallback:items}};
  return page;
}

function blogArticlePage(){
  const page=withSharedFoundationShell(LOOT_VAULT_BLOG_ARTICLE_PAGE);
  const body=page.sections[1];
  if(!body)throw new Error('LOOT_VAULT_V2_BLOG_ARTICLE_BODY_MISSING');
  page.sections.splice(2,0,{
    id:'loot-v2-blog-article-feature',
    componentKey:'story.feature',
    componentVersion:1,
    config:{
      eyebrow:'VAULT MAGAZIN',
      title:'Tárgyak, amelyekhez történet tartozik.',
      copy:'A gyűjtés nem csak megszerzés: háttértörténet, eredet, kiadás és személyes jelentés találkozik benne.',
      image:LOOT_VAULT_V2_MEDIA_PATHS.backgroundArchive,
      imageAlt:'Sötét gyűjtői archívum polcokkal és bronz fénnyel',
      ctaLabel:'Vissza a magazinhoz',
      ctaHref:'/blog',
      imagePosition:'right',
      tone:'surface',
    },
  });
  walk([body],node=>{
    if(node.componentKey==='content.heading')node.config={...node.config,text:'Vault Magazin'};
    if(node.componentKey==='content.text')node.config={...node.config,text:'Szerkesztett történetek tárgyakról, kiadásokról, alkotókról és gyűjtői kultúráról.'};
  });
  return page;
}

export const LOOT_VAULT_V2_REFERENCE_PAGE_OVERRIDES=Object.freeze({
  home:homePage(),
  catalog:catalogPage(),
  product:productPage(),
  'blog-index':blogIndexPage(),
  'blog-article':blogArticlePage(),
} satisfies Partial<Record<StorefrontBuilderPageType,StorefrontPageDocument>>);
