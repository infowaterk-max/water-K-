import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const source=fs.readFileSync(path.join(root,'src/components/admin/storefront-visual-builder-v3.tsx'),'utf8');
const routeSource=fs.readFileSync(path.join(root,'src/app/admin/tartalom/builder/page.tsx'),'utf8');
const css=fs.readFileSync(path.join(root,'src/components/admin/storefront-visual-builder-v3.module.css'),'utf8');
const foundation=fs.readFileSync(path.join(root,'src/lib/builder/storefront-foundation.ts'),'utf8');
const vxCore=fs.readFileSync(path.join(root,'src/lib/builder/vx-builder-core.ts'),'utf8');

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
    for(const label of ['Oldalak','Elemek','Rétegek','Sablonok','Presetek','Mentett','Globális elemek'])expect(source).toContain(label);
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

  it('adapts the canonical workspace to the shared VX Core without creating a second editor authority',()=>{
    expect(source).toContain("@/lib/builder/vx-builder-core");
    expect(source).toContain('VX_SHOP_BUILDER_PROFILE');
    expect(source).toContain('data-vx-builder-core={VX_BUILDER_CORE_VERSION}');
    expect(source).toContain('data-vx-builder-product={builderProfile.productKey}');
    expect(source).toContain('data-vx-library="true"');
    expect(vxCore).toContain("productName:'VX Shop Builder'");
    expect(vxCore).toContain("productName:'VX Site Builder'");
    expect(vxCore).toContain('arbitraryAbsolutePositioning:false');
    expect((source.match(/StorefrontRuntimeRenderer/g)??[]).length).toBeGreaterThan(0);
  });

  it('implements guarded contextual insertion and 12-column direct resize through canonical mutations',()=>{
    expect(source).toContain('listStorefrontBuilderInsertableComponents');
    expect(source).toContain('insertContext');
    expect(source).toContain('Kontextusos beszúrás');
    expect(source).toContain('const contextualAffordance=active||hoveredId===node.id');
    expect(source).toContain('canInsertAfter=Boolean(contextualAffordance&&entry&&listStorefrontBuilderInsertableComponents');
    expect(source).toContain('canInsertInside=Boolean(contextualAffordance&&!protectedNode&&nodeDefinition?.allowsChildren');
    expect(source).toContain('data-hovered={hoveredId===node.id}');
    expect(source).toContain('resolveVxResizeSpan');
    expect(source).toContain("type:'responsive',nodeId:node.id,viewport,gridSpan:span");
    expect(source).toContain('data-vx-grid-resizable');
    expect(css).toContain('.resizeHandle');
    expect(css).toContain(':not(.insideInsertHandle):not(.resizeHandle)');
    expect(css).toContain('.resizeHandle{position:absolute;right:4px;');
    expect(css).toContain('cursor:ew-resize');
    expect(vxCore).toContain('gridColumns:12');
  });

  it('matches the PO-approved Library / canvas / Inspector visual shell and warm Shoperation family palette',()=>{
    expect(source).toContain('aria-label="VX Builder könyvtár"');
    expect(source).toContain("['presets','presets','Presetek']");
    expect(source).toContain("['add','plus','Elemek']");
    expect(source).toContain("['templates','templates','Sablonok']");
    expect(source).toContain("['saved','saved','Mentett']");
    expect(css).toContain('--vb-accent:#f5b31b');
    expect(css).toContain('--vb-graphite:#17212b');
    expect(css).not.toContain('rgba(15,155,125,.1)');
    expect(css).not.toContain('#edf6f3');
    expect(css).not.toContain('#3e7368');
    expect(css).toContain('.node[data-hovered="true"]>.insertHandle');
    expect(css).toContain('.primaryNav{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))');
    expect(css).toContain('.floatingTools{position:absolute;right:8px;top:8px');
    expect(source).not.toContain('<span className={v3.brandMark}>S</span>');
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
