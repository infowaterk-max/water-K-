import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const workspace=fs.readFileSync(path.join(root,'src/components/admin/storefront-visual-builder-95.tsx'),'utf8');
const workspaceCss=fs.readFileSync(path.join(root,'src/components/admin/storefront-visual-builder-95.module.css'),'utf8');
const primitives=fs.readFileSync(path.join(root,'src/lib/builder/storefront-primitives.ts'),'utf8');
const primitiveRenderers=fs.readFileSync(path.join(root,'src/components/builder/storefront-primitives.tsx'),'utf8');
const route=fs.readFileSync(path.join(root,'src/app/admin/tartalom/builder/page.tsx'),'utf8');
const fidelity=fs.readFileSync(path.join(root,'src/components/admin/storefront-fidelity-settings.tsx'),'utf8');

describe('Visual Builder final 95% fidelity workspace',()=>{
  it('keeps the accepted light three-zone design-tool workspace and merchant navigation',()=>{
    for(const label of ['Oldalak','Hozzáadás','Rétegek','Sablonok','Presetek','Saját blokkok','Globális elemek'])expect(workspace).toContain(label);
    for(const selector of ['.topbar{','.workspace{','.left,','.stage{','.inspector{','.floating{','.sectionCard{','.responsiveRail{'])expect(workspaceCss).toContain(selector);
    expect(workspace).toContain('StorefrontRuntimeRenderer');
    expect(workspace).toContain('decorateNode={canvasDecorator}');
  });

  it('uses the existing Builder and publication authorities rather than creating parallel state engines',()=>{
    for(const authority of ['applyStorefrontBuilderMutation','createStorefrontBuilderHistory','saveVisualBuilderDraftAction','createVisualBuilderPreviewAction','publishVisualBuilderPageAction','rollbackVisualBuilderPageAction'])expect(workspace).toContain(authority);
    expect(workspace).toContain('StorefrontPresetLibraryPanel');
    expect(workspace).toContain('StorefrontSavedBlocksPanel');
    expect(workspace).toContain('StorefrontFidelitySettings');
    expect(workspace).not.toContain('AI Builder');
  });

  it('exposes a complete merchant-facing header contract on the canonical system.header component',()=>{
    const required=['brandLogoSrc','brandLogoAlt','showBrandText','showNavigation','showUtilities','showSearch','searchHref','showAccount','accountHref','showCart','cartHref','mobileMenu','spacing','width','gap','align','justify','size','backgroundColor','color'];
    for(const key of required)expect(primitives).toContain(`'${key}'`);
    expect(primitives).toContain("componentKey:'system.header'");
    expect(primitives).toContain("protectedSystem:true");
  });

  it('renders those header controls in the shared runtime including functional mobile navigation',()=>{
    for(const key of ['config.brandLogoSrc','config.showBrandText','config.showNavigation','config.showUtilities','config.showSearch','config.showAccount','config.showCart','config.mobileMenu','config.spacing','config.width','config.gap','config.align','config.justify','config.size','config.backgroundColor','config.color'])expect(primitiveRenderers).toContain(key);
    expect(primitiveRenderers).toContain('<details');
    expect(primitiveRenderers).toContain('<summary aria-label="Mobil navigáció"');
    expect(primitiveRenderers).toContain('StorefrontStickyHeaderState');
  });

  it('materializes backward-compatible boolean defaults so new header controls render as actual toggles',()=>{
    for(const assignment of ['config.showBrandText=true','config.showNavigation=true','config.showUtilities=editorial','config.showSearch=false','config.showAccount=false','config.showCart=false','config.mobileMenu=editorial'])expect(route).toContain(assignment);
    expect(route).toContain('withMerchantEditorDefaults');
  });

  it('keeps technical fidelity and raw node controls behind Advanced or Expert mode',()=>{
    expect(fidelity).toContain("const advanced=inspector.editMode==='advanced'||inspector.editMode==='expert'");
    expect(fidelity).toContain('{advanced?<>');
    expect(fidelity).toContain('StorefrontResponsiveLayoutDepthControls');
    expect(fidelity).toContain('StorefrontFidelityNodeControls');
    expect(fidelity).toContain('StorefrontFidelityStateControls');
  });

  it('keeps one unambiguous Desktop Tablet Mobile state across toolbar, canvas and responsive inspector',()=>{
    expect(workspace).toContain("{key:'desktop',label:'Desktop',width:1200");
    expect(workspace).toContain("{key:'tablet',label:'Tablet',width:768");
    expect(workspace).toContain("{key:'mobile',label:'Mobil',width:390");
    expect(workspace).toContain('data-active={viewport===item.key}');
    expect(workspace).toContain('viewport={viewport}');
    expect(workspace).toContain("selected.responsive?.[viewport]");
  });
});
