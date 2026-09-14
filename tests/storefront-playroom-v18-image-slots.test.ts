import {describe,expect,it} from 'vitest';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import {PLAYROOM_REFERENCE_V2_FIDELITY_V18_TEMPLATE_PACKAGE,PLAYROOM_REFERENCE_V2_FIDELITY_V18_VERSION} from '@/lib/builder/templates/playroom-reference-v2-fidelity-v18';

const home=PLAYROOM_REFERENCE_V2_FIDELITY_V18_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='home');
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const byId=(id:string)=>home?walk(home.sections).find(node=>node.id===id):undefined;

describe('Playroom v18 pragmatic visual-fill contract',()=>{
  it('freezes the accepted desktop structure while switching fidelity strategy',()=>{
    expect(home).toBeDefined();
    expect(home?.sections.map(section=>section.id)).toEqual([
      'playroom-home-header','playroom-hero-composition','playroom-merchandising','playroom-commerce','playroom-play-together','playroom-home-footer',
    ]);
    expect(home?.metadata).toMatchObject({
      fidelityPolishVersion:PLAYROOM_REFERENCE_V2_FIDELITY_V18_VERSION,
      visualFillMode:'merchant-editable-image-slots',
      assetStrategy:'photo-first-no-bespoke-artwork',
      desktopLayout:'frozen',
      heroVisual:'reference-like-led-living-room-gaming-photo',
      platformVisualMode:'large-image-icon-tiles',
    });
    expect(byId('playroom-hero')?.responsive?.desktop?.gridSpan).toBe(8);
    expect(byId('playroom-selectors')?.responsive?.desktop?.gridSpan).toBe(4);
    expect(byId('playroom-setup')?.responsive?.desktop?.gridSpan).toBe(5);
    expect(byId('playroom-player-two')?.responsive?.desktop?.gridSpan).toBe(4);
    expect(byId('playroom-upgrade')?.responsive?.desktop?.gridSpan).toBe(3);
  });

  it('uses ordinary merchant-editable content.image slots with focal-point and art-direction config',()=>{
    for(const id of [
      'playroom-hero-art','playroom-setup-image','playroom-player-controller-image','playroom-player-headset-image','playroom-player-family-image','playroom-player-couch-image','playroom-upgrade-monitor-image','playroom-upgrade-audio-image','playroom-upgrade-light-image','playroom-upgrade-chair-image','playroom-compatibility-art','playroom-gift-image','playroom-community-art',
    ]){
      const node=byId(id);
      expect(node?.componentKey,id).toBe('content.image');
      expect(node?.config.src,id).toMatch(/^https:\/\/images\.pexels\.com\/photos\//);
      expect(node?.config.fit,id).toBe('cover');
      expect(node?.config.objectPosition,id).toEqual(expect.any(String));
      expect(node?.config.artDirection,id).toMatchObject({desktop:{objectFit:'cover'},tablet:{objectFit:'cover'},mobile:{objectFit:'cover'}});
    }
    expect(byId('playroom-hero-art')?.config.src).toContain('/9069213/');
  });

  it('keeps hero copy and CTA separate from the image and removes the bespoke overlay asset from the active composition',()=>{
    expect(byId('playroom-hero-title')?.componentKey).toBe('content.heading');
    expect(byId('playroom-hero-support')?.componentKey).toBe('content.text');
    expect(byId('playroom-hero-primary')?.componentKey).toBe('content.button');
    expect(byId('playroom-hero-neon-overlay')).toBeUndefined();
    expect(JSON.stringify(home)).not.toContain('hero-photo-overlay.svg');
  });

  it('keeps commerce authority dynamic while polishing card hierarchy',()=>{
    expect(byId('playroomFeaturedGames')?.componentKey).toBe('commerce.product-grid');
    expect(byId('playroomFeaturedGames')?.bindings?.products?.path).toBe('catalog.existingCommerceProducts');
    expect(byId('playroom-platform-match-status')?.bindings?.status?.path).toBe('compatibility.status');
  });

  it('uses large image-backed platform icons instead of dot symbols',()=>{
    const platform=byId('playroom-platform-navigation');
    expect(platform?.componentKey).toBe('guided.attribute-navigation');
    expect(platform?.config.presentation).toBe('media-navigation');
    expect(platform?.config.columns).toBe(3);
    expect(platform?.config.items).toEqual(expect.arrayContaining([
      expect.objectContaining({id:'playstation',label:'PlayStation',image:expect.stringContaining('simpleicons.org/playstation')}),
      expect.objectContaining({id:'xbox',label:'Xbox',image:expect.stringContaining('simpleicons.org/xbox')}),
      expect.objectContaining({id:'nintendo',label:'Nintendo',image:expect.stringContaining('simpleicons.org/nintendoswitch')}),
      expect.objectContaining({id:'pc',label:'PC',image:expect.stringContaining('simpleicons.org/windows11')}),
      expect.objectContaining({id:'handheld',label:'Handheld',image:expect.stringContaining('simpleicons.org/steamdeck')}),
      expect.objectContaining({id:'mobile',label:'Mobile',image:expect.stringContaining('simpleicons.org/android')}),
    ]));
    for(const item of platform?.config.items as Array<Record<string,unknown>>){
      expect(item).not.toHaveProperty('symbol');
    }
  });
});
