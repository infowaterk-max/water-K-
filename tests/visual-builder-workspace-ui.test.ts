import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),'utf8');

describe('Visual Builder accepted workspace UI contract',()=>{
  const component=read('src/components/admin/storefront-visual-builder.tsx');
  const css=read('src/components/admin/storefront-visual-builder.module.css');
  const page=read('src/app/admin/tartalom/builder/page.tsx');

  it('separates Builder chrome from the normal Admin workspace',()=>{
    expect(css).toContain(':global(.adminGrid):has(.builderShell)>:global(.adminSide){display:none!important}');
    expect(css).toContain(':global(.adminContentShell):has(.builderShell)>:global(.adminRouteContext){display:none!important}');
    expect(component).toContain('Vissza az Admin felületre');
    expect(component).toContain('Shoperation</strong><small>Visual Builder');
  });

  it('uses one contextual left controller instead of a permanent three-column inspector',()=>{
    expect(css).toContain('grid-template-columns:304px minmax(0,1fr)');
    expect(component).toContain("type PanelMode='pages'|'add'|'structure'|'settings'");
    expect(component).toContain('Oldalak');
    expect(component).toContain('Hozzáadás');
    expect(component).toContain('Szerkezet');
    expect(component).toContain('Beállítások');
    expect(component).not.toContain('className={styles.inspector}');
    expect(component).not.toContain('grid-template-areas');
  });

  it('keeps the live canvas and Block 22 editing controls wired',()=>{
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
  });

  it('keeps shared schema visual style fields in the Appearance inspector instead of content',()=>{
    expect(component).toContain("const isAppearanceKey=(key:string)=>APPEARANCE_KEYS.has(key)||key==='style'||key.endsWith('Style')");
    expect(component).toContain('filter(key=>!isAppearanceKey(key))');
    expect(component).toContain('filter(key=>isAppearanceKey(key))');
    expect(component).toContain("editorTab==='appearance'");
    expect(component).toContain('StructuredEditor key={key} label={key} value={selected.config[key]}');
  });

  it('keeps responsive editing and history inside the Builder while AI generation stays hidden from merchant UI',()=>{
    expect(component).toContain("{key:'desktop',label:'Desktop',width:1200");
    expect(component).toContain("{key:'tablet',label:'Tablet',width:768");
    expect(component).toContain("{key:'mobile',label:'Mobil',width:390");
    expect(component).toContain('Előzmények');
    expect(component).not.toContain('StorefrontAiGeneratorPanel');
    expect(page).not.toContain('<StorefrontAiGeneratorPanel/>');
  });

  it('provides page switching, insertable components and a permanent route back to the template library without a second runtime',()=>{
    expect(component).toContain('listStorefrontBuilderInsertableComponents');
    expect(component).toContain("router.push('/admin/tartalom/builder?view=templates')");
    expect(component).toContain('Sablonkönyvtár megnyitása');
    expect(component).toContain('router.push(`/admin/tartalom/builder?page=');
    expect(component).toContain('componentRegistry={componentRegistry}');
    expect(component).toContain('rendererRegistry={rendererRegistry}');
    expect(page).toContain("params.view==='templates'");
  });
});
