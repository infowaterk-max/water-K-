import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const source=fs.readFileSync(path.join(root,'src/components/admin/storefront-visual-builder-v3.tsx'),'utf8');
const routeSource=fs.readFileSync(path.join(root,'src/app/admin/tartalom/builder/page.tsx'),'utf8');
const css=fs.readFileSync(path.join(root,'src/components/admin/storefront-visual-builder-v3.module.css'),'utf8');
const foundation=fs.readFileSync(path.join(root,'src/lib/builder/storefront-foundation.ts'),'utf8');

describe('Visual Builder v3 product completion',()=>{
  it('routes the authenticated Builder to the completed v3 workspace',()=>{
    expect(routeSource).toContain('StorefrontVisualBuilderV3');
    expect(routeSource).toContain("@/components/admin/storefront-visual-builder-v3");
  });

  it('keeps canonical mutation, runtime, persistence and binding authorities',()=>{
    expect(source).toContain('applyStorefrontBuilderMutation');
    expect(source).toContain('StorefrontRuntimeRenderer');
    expect(source).toContain('saveVisualBuilderDraftAction');
    expect(source).toContain('publishVisualBuilderPageAction');
    expect(source).toContain('applyStorefrontBindings');
    expect(source).toContain('resolveStorefrontBinding');
    expect(source).toContain("type:'binding',nodeId:selected.id,slot:key,path:reference.path,fallback:value");
  });

  it('provides one coherent desktop/tablet/mobile authority for toolbar, canvas and inspector',()=>{
    expect(source).toContain('aria-pressed={viewport===item.key}');
    expect(source).toContain('viewport={viewport}');
    expect(source).toContain('setViewport(item.key)');
    expect(source).toContain('StorefrontResponsiveLayoutDepthControls');
    expect(source).toContain("'Alap + '+item.label");
    expect(foundation).toContain("responsiveAuthority:'base+exact-viewport'");
    expect(foundation).toContain('siblingViewportInheritance:false');
  });

  it('exposes the complete merchant-facing workspace without developer noise in Normal mode',()=>{
    for(const label of ['Oldalak','Hozzáadás','Rétegek','Sablonok','Presetek','Saját blokkok','Globális elemek'])expect(source).toContain(label);
    for(const tab of ['Tartalom','Megjelenés','Elrendezés','Állapotok','Haladó'])expect(source).toContain(tab);
    expect(source).toContain("'system.header':'Fejléc'");
    expect(source).toContain('Webshop adat');
    expect(source).toContain('HIDDEN_NORMAL_KEYS');
    expect(source).not.toContain('AI Builder');
  });

  it('surfaces existing high-fidelity controls contextually instead of a parallel editor authority',()=>{
    expect(source).toContain('StorefrontFidelityNodeControls');
    expect(source).toContain('StorefrontFidelityStateControls');
    expect(source).toContain('StorefrontResponsiveLayoutDepthControls');
    expect(source).toContain('listStorefrontComponentVariants');
    expect(source).toContain('applyStorefrontComponentVariant');
    expect(source).toContain('setStorefrontFidelityEditMode');
    expect(source).toContain('Nincs párhuzamos JSON-szerkesztő');
  });

  it('has a visual block library, premium canvas interaction layer and small viewport fallback',()=>{
    expect(source).toContain('componentGrid');
    expect(source).toContain('floatingTools');
    expect(source).toContain('setZoom');
    expect(css).toContain('.componentGrid');
    expect(css).toContain('.pageFrame');
    expect(css).toContain('.floatingTools');
    expect(css).toContain('@media(max-width:820px)');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
  });

  it('retains canonical preset, saved-block, global-style, fidelity and publish-readiness surfaces',()=>{
    expect(source).toContain('StorefrontPageTemplatesPanel');
    expect(source).toContain('StorefrontPresetLibraryPanel');
    expect(source).toContain('StorefrontSavedBlocksPanel');
    expect(source).toContain('StorefrontFidelitySettings');
    expect(source).toContain('Közzététel előtti ellenőrzés');
    for(const check of ['Akadálymentesség','Képek','Linkek','Kötelező tartalmak','Teljesítmény','Design Guard'])expect(source).toContain(check);
  });
});
