import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const productionSource=fs.readFileSync(path.join(root,'src/components/admin/storefront-visual-builder-production.tsx'),'utf8');
const routeSource=fs.readFileSync(path.join(root,'src/app/admin/tartalom/builder/page.tsx'),'utf8');
const productionCss=fs.readFileSync(path.join(root,'src/components/admin/storefront-visual-builder-production.module.css'),'utf8');

describe('Visual Builder production completion',()=>{
  it('routes the authenticated Builder to the completed production workspace',()=>{
    expect(routeSource).toContain("StorefrontVisualBuilderProduction");
    expect(routeSource).toContain("@/components/admin/storefront-visual-builder-production");
  });

  it('keeps exactly one explicit viewport state and the canvas on the same viewport authority',()=>{
    expect(productionSource).toContain("data-active={active?'true':'false'}");
    expect(productionSource).toContain('aria-pressed={active}');
    expect(productionSource).toContain('viewport={viewport}');
    expect(productionSource).toContain('data-viewport={viewport}');
    expect(productionCss).toContain('button[data-active="true"]');
    expect(productionCss).toContain('button[data-active="false"]');
  });

  it('renders externally bound merchant data read-only instead of showing stale template config',()=>{
    expect(productionSource).toContain('applyStorefrontBindings(selected,editorBindingContext)');
    expect(productionSource).toContain('resolveStorefrontBinding(reference.path,editorBindingContext)');
    expect(productionSource).toContain('Webshop adat');
    expect(productionSource).toContain('csak olvasható');
  });

  it('keeps editable binding fallbacks in sync through existing Builder mutation authority',()=>{
    expect(productionSource).toContain("type:'config',nodeId:selected.id,key,value");
    expect(productionSource).toContain("type:'binding',nodeId:selected.id,slot:key,path:reference.path,fallback:value");
    expect(productionSource).toContain('applyStorefrontBuilderMutation');
  });

  it('removes developer identifiers from Normal merchant surfaces',()=>{
    expect(productionSource).toContain("pageStatus(page)");
    expect(productionSource).toContain("definition.protectedSystem?'Védett rendszer elem':componentGroup(selected.componentKey)");
    expect(productionSource).toContain("'system.header':'Fejléc'");
    expect(productionSource).toContain("utilityitems:'Gyorsműveletek'");
    expect(productionSource).toContain("behavior:'Viselkedés'");
    expect(productionSource).toContain("'behavior'");
  });

  it('retains all canonical Builder libraries and dark-launches AI',()=>{
    for(const label of ['Oldalak','Hozzáadás','Rétegek','Sablonok','Presetek','Saját blokkok','Globális elemek'])expect(productionSource).toContain(label);
    expect(productionSource).toContain('StorefrontPageTemplatesPanel');
    expect(productionSource).toContain('StorefrontPresetLibraryPanel');
    expect(productionSource).toContain('StorefrontSavedBlocksPanel');
    expect(productionSource).toContain('StorefrontFidelitySettings');
    expect(productionSource).not.toContain('AI Builder');
  });
});
