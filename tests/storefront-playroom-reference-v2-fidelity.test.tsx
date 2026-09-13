import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {StorefrontRuntimeRenderer} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {createStorefrontTemplatePreviewBindingContext} from '@/lib/builder/storefront-template-preview-demo';
import {PLANS} from '@/lib/plans/catalog';
import {validateStorefrontPageDocument,type StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import {PLAYROOM_REFERENCE_V2_HOME_PAGE,PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-reference-v2';

const capability={plan:'alap' as const,features:PLANS.alap.features};
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const byId=(id:string)=>walk(PLAYROOM_REFERENCE_V2_HOME_PAGE.sections).find(item=>item.id===id);

describe('Playroom reference v2 desktop fidelity contract',()=>{
  it('rebuilds the home silhouette around the accepted reference instead of inheriting the old vertical stack',()=>{
    expect(PLAYROOM_REFERENCE_V2_HOME_PAGE.sections.map(section=>section.id)).toEqual([
      'playroom-home-header','playroom-hero-composition','playroom-merchandising','playroom-commerce','playroom-play-together','playroom-home-footer',
    ]);
    expect(byId('playroom-hero')?.responsive?.desktop?.gridSpan).toBe(8);
    expect(byId('playroom-selectors')?.responsive?.desktop?.gridSpan).toBe(4);
    expect(byId('playroom-setup')?.responsive?.desktop?.gridSpan).toBe(5);
    expect(byId('playroom-player-two')?.responsive?.desktop?.gridSpan).toBe(4);
    expect(byId('playroom-upgrade')?.responsive?.desktop?.gridSpan).toBe(3);
    expect(byId('playroom-featured-games')?.responsive?.desktop?.gridSpan).toBe(7);
    expect(byId('playroom-platform-match')?.responsive?.desktop?.gridSpan).toBe(5);
  });

  it('keeps the shared commerce/discovery authorities wired while changing presentation',()=>{
    expect(byId('playroom-game-finder')?.componentKey).toBe('guided.finder');
    expect(byId('playroom-game-finder')?.bindings).toMatchObject({question:{path:'finder.currentQuestion.label'},options:{path:'finder.currentQuestion.options'},actionHref:{path:'finder.resultHref'}});
    expect(byId('playroomFeaturedGames')?.bindings?.products?.path).toBe('catalog.existingCommerceProducts');
    expect(byId('playroom-platform-match-status')?.bindings?.status?.path).toBe('compatibility.status');
    expect(JSON.stringify(PLAYROOM_REFERENCE_V2_HOME_PAGE)).not.toMatch(/fixedPrice|stockCount|reviewScore|releaseDate|platformSupport|compatible.?true|merchantId|payment_secret/i);
  });

  it('uses the two-tier commerce header with reference-density navigation and reusable utility-label controls',()=>{
    const header=byId('playroom-home-header');
    expect(header?.componentKey).toBe('system.commerce-header');
    expect(header?.config).toMatchObject({showUtilityLabels:true,categoryTriggerSymbol:'☰',navTagline:'JÁTÉK. KÖZÖSSÉG. ÉLMÉNY.'});
    const nav=byId('playroom-home-nav');
    expect(nav?.config.items).toEqual(expect.arrayContaining([
      expect.objectContaining({label:'Játékok'}),expect.objectContaining({label:'Konzolok'}),expect.objectContaining({label:'Gaming setup'}),expect.objectContaining({label:'Merchandise'}),expect.objectContaining({label:'Playroom Magazin'}),
    ]));
  });

  it('keeps all v2 pages valid for the canonical Alap capability',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    for(const page of PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE.pages){
      const result=validateStorefrontPageDocument(page,registry,capability);
      expect(result.ok,`${page.pageType}: ${JSON.stringify(result.violations)}`).toBe(true);
    }
  });

  it('renders the actual v2 Page Schema through the shared runtime at desktop without a template-only renderer',()=>{
    const bindingContext=createStorefrontTemplatePreviewBindingContext({template:PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE,page:PLAYROOM_REFERENCE_V2_HOME_PAGE});
    const html=renderToStaticMarkup(<StorefrontRuntimeRenderer page={PLAYROOM_REFERENCE_V2_HOME_PAGE} viewport="desktop" bindingContext={bindingContext} componentRegistry={createStorefrontVisualBuilderComponentRegistry()} rendererRegistry={createStorefrontVisualBuilderRendererRegistry()} capability={capability}/>);
    expect(html).toContain('MIT');
    expect(html).toContain('JÁTSZUNK');
    expect(html).toContain('MA?');
    expect(html).toContain('Válaszd ki a játékstílusod');
    expect(html).toContain('Válaszd ki a platformod');
    expect(html).toContain('GAMER SETUP CSOMAG');
    expect(html).toContain('PLAYER 2 READY?');
    expect(html).toContain('UPGRADE YOUR GAME NIGHT');
    expect(html).toContain('Újdonságok &amp; Kiemelt játékok');
    expect(html).toContain('PLAY TOGETHER');
    expect(html).toContain('data-storefront-component="system.commerce-header"');
    expect(html).not.toMatch(/PlayroomOnly|template-local-renderer/i);
  });

  it('uses original production assets for the concrete hero and merchandising roles',()=>{
    for(const asset of ['hero-room-v2.svg','monitor-v2.svg','lighting-v2.svg']){
      const svg=readFileSync(`public/storefront/playroom/${asset}`,'utf8');
      expect(svg).toContain('<svg');
      expect(svg).not.toMatch(/<text\b|<foreignObject\b|javascript:/i);
    }
    const source=JSON.stringify(PLAYROOM_REFERENCE_V2_HOME_PAGE);
    expect(source).toContain('/storefront/playroom/hero-room-v2.svg');
    expect(source).toContain('/storefront/playroom/monitor-v2.svg');
    expect(source).toContain('/storefront/playroom/lighting-v2.svg');
  });
});
