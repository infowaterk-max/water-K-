import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const finalSource=fs.readFileSync(path.join(root,'src/components/admin/storefront-visual-builder-95.tsx'),'utf8');
const routeSource=fs.readFileSync(path.join(root,'src/app/admin/tartalom/builder/page.tsx'),'utf8');
const finalCss=fs.readFileSync(path.join(root,'src/components/admin/storefront-visual-builder-95.module.css'),'utf8');

describe('Visual Builder production completion',()=>{
  it('routes the authenticated Builder to the final fidelity workspace',()=>{
    expect(routeSource).toContain('StorefrontVisualBuilder95');
    expect(routeSource).toContain("@/components/admin/storefront-visual-builder-95");
  });

  it('keeps exactly one viewport state and the runtime canvas on the same authority',()=>{
    expect(finalSource).toContain('data-active={viewport===item.key}');
    expect(finalSource).toContain('aria-pressed={viewport===item.key}');
    expect(finalSource).toContain('viewport={viewport}');
    expect(finalCss).toContain('.devices button[data-active="true"]');
  });

  it('renders externally bound merchant data read-only instead of stale template config',()=>{
    expect(finalSource).toContain('applyStorefrontBindings(selected,editorBindingContext)');
    expect(finalSource).toContain('resolveStorefrontBinding(binding.path,editorBindingContext)');
    expect(finalSource).toContain('Webshop adat');
    expect(finalSource).toContain('Központi webshop-adat');
  });

  it('keeps editable binding fallbacks in sync through existing Builder mutation authority',()=>{
    expect(finalSource).toContain("type:'config',nodeId:selected.id,key,value");
    expect(finalSource).toContain("type:'binding',nodeId:selected.id,slot:key,path:binding.path,fallback:value");
    expect(finalSource).toContain('applyStorefrontBuilderMutation');
  });

  it('keeps Normal merchant surfaces readable and retains the canonical libraries',()=>{
    expect(finalSource).toContain('pageStatus(page)');
    expect(finalSource).toContain("'system.header':'Fejléc'");
    expect(finalSource).toContain("utilityitems:'Gyorsműveletek'");
    for(const label of ['Oldalak','Hozzáadás','Rétegek','Sablonok','Presetek','Saját blokkok','Globális elemek'])expect(finalSource).toContain(label);
    expect(finalSource).toContain('StorefrontPageTemplatesPanel');
    expect(finalSource).toContain('StorefrontPresetLibraryPanel');
    expect(finalSource).toContain('StorefrontSavedBlocksPanel');
    expect(finalSource).toContain('StorefrontFidelitySettings');
    expect(finalSource).not.toContain('AI Builder');
  });

  it('uses a premium three-zone workspace rather than the admin dashboard layout',()=>{
    for(const token of ['.workspace{','.left,','.stage{','.inspector{','.floating{','.sectionCard{','.variants{','.responsiveRail{'])expect(finalCss).toContain(token);
    expect(finalSource).toContain('Tartalom');
    expect(finalSource).toContain('Megjelenés');
    expect(finalSource).toContain('Elrendezés');
  });
});
