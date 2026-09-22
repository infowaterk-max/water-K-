import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {PLAYROOM_V20_TEMPLATE_PACKAGE,PLAYROOM_V20_TEMPLATE_VERSION} from '@/lib/builder/templates/playroom-v20';
import {getStorefrontTemplatePackage,STOREFRONT_TEMPLATE_CATALOG} from '@/lib/builder/storefront-template-catalog';
import {resolveStorefrontVisualStyle} from '@/lib/builder/storefront-visual-style';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';

const source=readFileSync('src/lib/builder/templates/playroom-v20.ts','utf8');
const catalogSource=readFileSync('src/lib/builder/storefront-template-catalog.ts','utf8');

function find(nodes:readonly StorefrontComponentNode[],id:string):StorefrontComponentNode{
  for(const node of nodes){
    if(node.id===id)return node;
    if(node.children){
      try{return find(node.children,id);}catch{}
    }
  }
  throw new Error(`NODE_MISSING:${id}`);
}

describe('Playroom v20 canonical authority',()=>{
  it('is a complete self-contained package instead of a runtime upgrade chain',()=>{
    expect(PLAYROOM_V20_TEMPLATE_VERSION).toBe(20);
    expect(PLAYROOM_V20_TEMPLATE_PACKAGE.manifest.templateKey).toBe('gaming.playroom');
    expect(PLAYROOM_V20_TEMPLATE_PACKAGE.manifest.templateVersion).toBe(20);
    expect(PLAYROOM_V20_TEMPLATE_PACKAGE.pages).toHaveLength(14);
    expect(source).toContain('playroom-v20-canonical-package.json');
    expect(source).not.toMatch(/playroom-v19|playroom-v18|playroom-reference|upgradePage|desktop-polish|fidelity-v/i);
  });

  it('exposes only v20 through the active template resolver',()=>{
    const catalog=STOREFRONT_TEMPLATE_CATALOG.filter(item=>item.templateKey==='gaming.playroom');
    expect(catalog).toHaveLength(1);
    expect(catalog[0]?.templateVersion).toBe(20);
    expect(getStorefrontTemplatePackage('gaming.playroom')?.manifest.templateVersion).toBe(20);
    expect(getStorefrontTemplatePackage('gaming.playroom',20)?.manifest.templateVersion).toBe(20);
    for(const historical of [2,18,19])expect(getStorefrontTemplatePackage('gaming.playroom',historical)).toBeUndefined();
    expect(catalogSource).not.toMatch(/PLAYROOM_V19_CANONICAL_TEMPLATE_PACKAGE|PLAYROOM_V18_TEMPLATE_PACKAGE|PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE|PLAYROOM_TEMPLATE_PACKAGE/);
  });

  it('persists explicit viewport authorities so desktop edits cannot implicitly redefine mobile',()=>{
    const home=PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='home');
    expect(home).toBeTruthy();
    const hero=find(home!.sections,'playroom-hero');
    const selectors=find(home!.sections,'playroom-selectors');
    const gift=find(home!.sections,'playroom-gift-card');
    expect(resolveStorefrontVisualStyle(hero.config.style,'desktop').minHeight).toBe('22rem');
    expect(resolveStorefrontVisualStyle(hero.config.style,'mobile').minHeight).toBe('13.75rem');
    expect(resolveStorefrontVisualStyle(selectors.config.style,'desktop').minHeight).toBe('22rem');
    expect(resolveStorefrontVisualStyle(selectors.config.style,'mobile').minHeight).toBe('auto');
    expect(resolveStorefrontVisualStyle(gift.config.style,'desktop').minHeight).toBe('19.25rem');
    expect(resolveStorefrontVisualStyle(gift.config.style,'mobile').minHeight).toBe('11.3rem');
  });
});
