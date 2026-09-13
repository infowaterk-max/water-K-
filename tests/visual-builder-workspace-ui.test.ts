import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),'utf8');

describe('Visual Builder Workspace UI v2 contract',()=>{
  const component=read('src/components/admin/storefront-visual-builder.tsx');
  const legacyCss=read('src/components/admin/storefront-visual-builder.module.css');
  const workspaceCss=read('src/components/admin/storefront-visual-builder-workspace-v2.module.css');
  const presetPanel=read('src/components/admin/storefront-preset-library-panel.tsx');
  const page=read('src/app/admin/tartalom/builder/page.tsx');

  it('stays a dedicated workspace outside the normal Admin chrome',()=>{
    expect(legacyCss).toContain(':global(.adminGrid):has(.builderShell)>:global(.adminSide){display:none!important}');
    expect(legacyCss).toContain(':global(.adminContentShell):has(.builderShell)>:global(.adminRouteContext){display:none!important}');
    expect(component).toContain('Vissza az Admin felületre');
    expect(component).toContain('Shoperation</strong><small>Visual Builder');
  });

  it('uses the accepted Shoperation three-zone workspace',()=>{
    expect(component).toContain("type PanelMode='pages'|'add'|'structure'|'templates'|'presets'|'saved'|'globals'");
    expect(component).toContain('className={ui.workspaceV2}');
    expect(component).toContain('className={ui.leftWorkspace}');
    expect(component).toContain('className={ui.inspector}');
    expect(workspaceCss).toContain('grid-template-columns:var(--vb2-left) minmax(0,1fr) var(--vb2-inspector)');
    for(const label of ['Oldalak','Hozzáadás','Rétegek','Sablonok','Presetek','Saját blokkok','Globális elemek'])expect(component).toContain(label);
  });

  it('keeps the live canvas and all existing Builder mutation authority wired',()=>{
    for(const token of [
      "type:'move'",
      "type:'add'",
      "type:'duplicate'",
      "type:'remove'",
      "type:'config'",
      "type:'responsive'",
      'undoStorefrontBuilderHistory',
      'redoStorefrontBuilderHistory',
      'saveVisualBuilderDraftAction',
      'createVisualBuilderPreviewAction',
      'publishVisualBuilderPageAction',
      'rollbackVisualBuilderPageAction',
      'StorefrontRuntimeRenderer',
    ])expect(component).toContain(token);
    expect(component).toContain('componentRegistry={componentRegistry}');
    expect(component).toContain('rendererRegistry={rendererRegistry}');
  });

  it('moves selected-node editing into the right inspector and exposes responsive editing explicitly',()=>{
    expect(component).toContain("type EditorTab='content'|'appearance'|'responsive'|'advanced'");
    expect(component).toContain('Gyors szerkesztés');
    expect(component).toContain('Mobil / responsive');
    expect(component).toContain("editorTab==='responsive'");
    expect(component).toContain("type:'responsive'");
    expect(component).toContain('Örökölt / 12');
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

  it('uses existing Fidelity diagnostics for publish readiness instead of inventing a second publication authority',()=>{
    expect(component).toContain('inspectStorefrontFidelityBuilder');
    expect(component).toContain('Közzététel előtti ellenőrzés');
    expect(component).toContain('Akadálymentesség');
    expect(component).toContain('Teljesítmény');
    expect(component).toContain('Design Guard');
    expect(component).toContain('A diagnosztika a meglévő Fidelity / Page Schema ellenőrzéseket használja');
    expect(component).toContain('publishVisualBuilderPageAction');
  });

  it('keeps Desktop Tablet Mobile in one Page Schema and makes mobile override context obvious',()=>{
    expect(component).toContain("{key:'desktop',label:'Desktop',width:1200");
    expect(component).toContain("{key:'tablet',label:'Tablet',width:768");
    expect(component).toContain("{key:'mobile',label:'Mobil',width:390");
    expect(component).toContain('Mobil nézet szerkesztése');
    expect(component).toContain('breakpoint-specifikus módosítások csak mobilon érvényesülnek');
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
