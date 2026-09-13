import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),'utf8');

describe('Visual Builder final UI fidelity contract',()=>{
  const component=read('src/components/admin/storefront-visual-builder.tsx');
  const iconSystem=read('src/components/admin/visual-builder-ui-icon.tsx');
  const legacyCss=read('src/components/admin/storefront-visual-builder.module.css');
  const workspaceCss=read('src/components/admin/storefront-visual-builder-workspace-v2.module.css');
  const finalCss=read('src/components/admin/storefront-visual-builder-final-fix.module.css');
  const presetPanel=read('src/components/admin/storefront-preset-library-panel.tsx');
  const pageTemplates=read('src/components/admin/storefront-page-templates-panel.tsx');
  const savedBlocks=read('src/components/admin/storefront-saved-blocks-panel.tsx');
  const fidelitySettings=read('src/components/admin/storefront-fidelity-settings.tsx');
  const page=read('src/app/admin/tartalom/builder/page.tsx');

  it('stays a dedicated workspace outside the normal Admin chrome',()=>{
    expect(legacyCss).toContain(':global(.adminGrid):has(.builderShell)>:global(.adminSide){display:none!important}');
    expect(legacyCss).toContain(':global(.adminContentShell):has(.builderShell)>:global(.adminRouteContext){display:none!important}');
    expect(component).toContain('Vissza az Admin felületre');
    expect(component).toContain('Shoperation</strong><small>Visual Builder');
  });

  it('keeps the accepted Shoperation three-zone workspace and canonical left navigation',()=>{
    expect(component).toContain("type PanelMode='pages'|'add'|'structure'|'templates'|'presets'|'saved'|'globals'");
    expect(component).toContain('ui.workspaceV2');
    expect(component).toContain('ui.leftWorkspace');
    expect(component).toContain('ui.inspector');
    expect(workspaceCss).toContain('grid-template-columns:var(--vb2-left) minmax(0,1fr) var(--vb2-inspector)');
    for(const label of ['Oldalak','Hozzáadás','Rétegek','Sablonok','Presetek','Saját blokkok','Globális elemek'])expect(component).toContain(label);
  });

  it('keeps the live canvas and all existing Builder mutation authority wired',()=>{
    for(const token of ["type:'move'","type:'add'","type:'duplicate'","type:'remove'","type:'config'","type:'responsive'",'undoStorefrontBuilderHistory','redoStorefrontBuilderHistory','saveVisualBuilderDraftAction','createVisualBuilderPreviewAction','publishVisualBuilderPageAction','rollbackVisualBuilderPageAction','StorefrontRuntimeRenderer'])expect(component).toContain(token);
    expect(component).toContain('componentRegistry={componentRegistry}');
    expect(component).toContain('rendererRegistry={rendererRegistry}');
  });

  it('uses exactly one canonical contextual Inspector navigation',()=>{
    expect(component).toContain("type EditorTab='content'|'appearance'|'responsive'|'advanced'");
    expect(component).toContain('aria-label="Inspector navigáció"');
    expect(component).not.toContain('aria-label="Gyors szerkesztés"');
    for(const label of ['Tartalom','Megjelenés','Elrendezés','Haladó'])expect(component).toContain(label);
    expect(component).toContain("editorTab==='responsive'");
    expect(component).toContain("type:'responsive'");
    expect(component).toContain('Örökölt / 12');
    expect(component).toContain('Öröklés visszaállítása');
    expect(component).toContain('Desktop → Tablet → Mobil');
  });

  it('keeps Presets, Page Templates, Saved Blocks and Fidelity controls on canonical authorities',()=>{
    expect(component).toContain('StorefrontPageTemplatesPanel');
    expect(component).toContain('StorefrontPresetLibraryPanel');
    expect(component).toContain('StorefrontSavedBlocksPanel');
    expect(component).toContain('StorefrontFidelitySettings');
    expect(presetPanel).toContain('listVisualBuilderPresetLibraryAction');
    expect(presetPanel).toContain('insertStorefrontSectionPreset');
    expect(presetPanel).toContain('applyStorefrontComponentPresetAppearance');
  });

  it('uses existing Fidelity diagnostics for publish readiness and includes the canonical groups',()=>{
    expect(component).toContain('inspectStorefrontFidelityBuilder');
    expect(component).toContain('Közzététel előtti ellenőrzés');
    for(const label of ['Desktop nézet','Tablet nézet','Mobil nézet','Akadálymentesség','Képek','Linkek','Kötelező tartalmak','Teljesítmény','Optimalizálás','Design Guard'])expect(component).toContain(label);
    expect(component).toContain('fidelity.accessibility.issues.filter');
    expect(component).toContain('meglévő Fidelity / Page Schema / performance diagnosztikát');
    expect(component).toContain('publishVisualBuilderPageAction');
  });

  it('keeps Desktop Tablet Mobile in one Page Schema with one active selector and clear inheritance',()=>{
    expect(component).toContain("{key:'desktop',label:'Desktop',width:1200");
    expect(component).toContain("{key:'tablet',label:'Tablet',width:768");
    expect(component).toContain("{key:'mobile',label:'Mobil',width:390");
    expect(component).toContain('aria-pressed={viewport===item.key}');
    expect(component).toContain('Egyedi override');
    expect(component).toContain("'Örökölt'");
    expect(component).toContain('mobil-specifikus módosítások csak ezen a breakpointon érvényesülnek');
  });

  it('uses merchant-facing Hungarian page names and inspector labels',()=>{
    for(const label of ['Fiókom','Blogbejegyzés','Blog','Kosár','Katalógus','Pénztár','Kapcsolat','Tartalmi oldal','GYIK','Főoldal','Jogi oldal','404 oldal','Keresés'])expect(component).toContain(label);
    for(const label of ['Márkanév','Márka hivatkozása','Rögzített fejléc','Viselkedés','Megjelenési mód','Belső méret'])expect(component).toContain(label);
    expect(component).toContain('TECHNICAL_NORMAL_KEYS');
  });

  it('adds smart quick settings only through existing config mutations',()=>{
    expect(component).toContain('Gyors beállítások');
    expect(component).toContain("setConfig(spacingKey,'l')");
    expect(component).toContain("setConfig(alignKey,'center')");
    expect(component).toContain("setConfig(widthKey,'full')");
    expect(component).toContain('Biztonságos, meglévő Builder-műveletek.');
  });

  it('makes Layers hierarchical and keeps linked protected and hidden cues',()=>{
    expect(component).toContain('Oldal → Szekció → Konténer → Komponens → Gyermek.');
    expect(component).toContain('aria-expanded={!collapsed.has(entry.node.id)}');
    expect(component).toContain('data-linked={Boolean(linked)}');
    expect(component).toContain('data-protected={protectedNode}');
    expect(component).toContain('data-hidden={hidden}');
  });

  it('uses a light premium floating toolbar and transient toast feedback',()=>{
    expect(component).toContain('finalUi.nodeToolbar');
    expect(finalCss).toContain('background:rgba(255,255,255,.97)!important');
    expect(finalCss).toContain('z-index:120!important');
    expect(component).toContain('window.setTimeout(()=>setNotice(null),3200)');
    expect(component).toContain('finalUi.toast');
    expect(finalCss).toContain('@keyframes toastIn');
  });

  it('uses one lightweight SVG stroke icon language across the workspace and embedded libraries',()=>{
    expect(component).toContain("import {VisualBuilderIcon,type VisualBuilderIconName} from './visual-builder-ui-icon'");
    for(const surface of [component,presetPanel,pageTemplates,savedBlocks,fidelitySettings])expect(surface).toContain('VisualBuilderIcon');
    expect(iconSystem).toContain('viewBox="0 0 24 24"');
    expect(iconSystem).toContain('stroke="currentColor"');
    expect(iconSystem).toContain('strokeWidth="1.8"');
    expect(iconSystem).toContain("'chevron-right'");
  });

  it('keeps smaller viewports resilient with collapsible panels and accessibility motion handling',()=>{
    expect(component).toContain('aria-expanded={!leftCollapsed}');
    expect(component).toContain('aria-expanded={inspectorOpen}');
    expect(workspaceCss).toContain('[data-left-collapsed=true]');
    expect(workspaceCss).toContain('[data-inspector-open=false]');
    expect(finalCss).toContain('@media(max-width:680px)');
    expect(finalCss).toContain('@media(prefers-reduced-motion:reduce)');
    expect(workspaceCss).toContain('focus-visible');
  });

  it('keeps AI generation dark-launched and absent from merchant Builder UI',()=>{
    expect(component).not.toContain('StorefrontAiGeneratorPanel');
    expect(component).not.toContain('AI Builder');
    expect(page).not.toContain('<StorefrontAiGeneratorPanel/>');
  });

  it('keeps the permanent route to the full template library',()=>{
    expect(component).toContain("router.push('/admin/tartalom/builder?view=templates')");
    expect(component).toContain('Teljes sablonkönyvtár megnyitása');
    expect(page).toContain("params.view==='templates'");
  });
});
