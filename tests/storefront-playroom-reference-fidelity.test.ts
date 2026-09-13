import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {PLAYROOM_HOME_PAGE} from '@/lib/builder/templates/playroom';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';

const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const home=(id:string)=>walk(PLAYROOM_HOME_PAGE.sections).find(node=>node.id===id);

describe('Playroom accepted-reference fidelity polish',()=>{
  it('restores the accepted discovery entry points without changing shared authority',()=>{
    const finder=home('playroom-game-finder');
    expect(finder?.config.presentation).toBe('editorial-choice-grid');
    expect(finder?.config.asideImage).toBe('/storefront/playroom/play-style-neon.svg');
    expect((finder?.config.options as Array<{label:string}>).map(item=>item.label)).toEqual(['Solo','Co-op','Party','Racing','Adventure','Family']);

    const platform=home('playroom-platform-navigation');
    expect((platform?.config.items as Array<{label:string}>).map(item=>item.label)).toEqual(['PC','PlayStation','Xbox','Nintendo','Handheld','Mobile']);
    expect(home('playroom-platform-match-status')?.bindings?.status?.path).toBe('compatibility.status');
    expect(PLAYROOM_HOME_PAGE.metadata?.visualAuthority).toBe('Neon Gamer Webáruház Kezdőlap');
  });

  it('ships reference-faithful visual art as normal editable Page Schema content',()=>{
    expect(home('playroom-home-header')?.bindings?.logoUrl?.fallback).toBe('/storefront/playroom/brand-mark.svg');
    for(const id of ['playroom-platform-art','playroom-upgrade-audio-art','playroom-upgrade-control-art','playroom-upgrade-space-art','playroom-compatibility-art','playroom-community-art']){
      expect(home(id)?.componentKey,id).toBe('content.image');
    }
    expect(home('playroom-home-footer')?.config.tone).toBe('background');
    const source=JSON.stringify(PLAYROOM_HOME_PAGE);
    expect(source).toContain('MIT JÁTSZUNK MA?');
    expect(source).toContain('VÁLASZD KI A PLATFORMOD');
    expect(source).toContain("TONIGHT'S SETUP");
    expect(source).toContain('NEW RELEASES / TRENDING NOW');
  });

  it('keeps all Playroom artwork text-free and production-safe',()=>{
    const files=[
      'brand-mark.svg','hero-neon.svg','play-style-neon.svg','platform-neon.svg','setup-neon.svg','player-two.svg',
      'audio-neon.svg','controller-neon.svg','chair-neon.svg','compatibility-neon.svg','gift-neon.svg','community-neon.svg',
    ];
    for(const file of files){
      const svg=readFileSync(`public/storefront/playroom/${file}`,'utf8');
      expect(svg,file).toContain('<svg');
      expect(svg,file).not.toMatch(/<text\b|<foreignObject\b|javascript:/i);
    }
  });

  it('adds no template-owned product or compatibility facts',()=>{
    const homeSource=JSON.stringify(PLAYROOM_HOME_PAGE);
    expect(homeSource).not.toMatch(/releaseDate|reviewScore|platformSupport|countdown|fixedPrice|stockCount/i);
    expect(home('playroom-platform-match-status')?.config.status).toBe('unknown');
  });
});
