import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {listStorefrontTemplateLibraryEntries} from '@/lib/builder/storefront-template-library';
import {STOREFRONT_TEMPLATE_CATALOG,getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {createStorefrontTemplatePreviewBindingContext,getStorefrontTemplatePreviewTheme} from '@/lib/builder/storefront-template-preview-demo';
import {resolveStorefrontBinding,type StorefrontComponentNode} from '@/lib/builder/storefront-runtime';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('storefront template library UX',()=>{
  it('enriches every concrete template with merchant-facing discovery metadata',()=>{
    const entries=listStorefrontTemplateLibraryEntries();
    expect(entries.length).toBeGreaterThan(0);
    for(const entry of entries){
      expect(entry.displayName.length).toBeGreaterThan(2);
      expect(entry.categoryLabel.length).toBeGreaterThan(2);
      expect(entry.description.length).toBeGreaterThan(20);
      expect(entry.audience.length).toBeGreaterThan(10);
      expect(entry.highlights.length).toBeGreaterThan(0);
      expect(entry.previewPageKey).toBeTruthy();
      expect(entry.proComparison.summary.length).toBeGreaterThan(20);
      expect(entry.proComparison.highlights.length).toBeGreaterThanOrEqual(3);
      expect(entry.proComparison.status).toBe(entry.minPlan==='pro'?'available':'planned');
    }
  });

  it('keeps Pro differentiation functional and explicitly non-deceptive while concrete Pro variants are absent',()=>{
    const entries=listStorefrontTemplateLibraryEntries();
    const currentAlap=entries.filter(entry=>entry.minPlan==='alap');
    expect(currentAlap.length).toBeGreaterThan(0);
    expect(currentAlap.every(entry=>entry.proComparison.status==='planned')).toBe(true);
    const source=read('src/components/admin/storefront-template-library.tsx');
    expect(source).toContain('A Pro nem „szebb skin”');
    expect(source).toContain('Tervezett Pro többlet');
    expect(source).toContain('A konkrét Pro sablonvariáns még nincs publikálva a katalógusban');
  });

  it('provides category filtering, search, live preview and no merchant-facing AI generator',()=>{
    const library=read('src/components/admin/storefront-template-library.tsx');
    const builder=read('src/components/admin/storefront-visual-builder.tsx');
    const page=read('src/app/admin/tartalom/builder/page.tsx');
    expect(library).toContain('Kategóriák');
    expect(library).toContain('Keresés a sablonok között');
    expect(library).toContain('Élő előnézet');
    expect(library).toContain('/storefront-template-preview?template=');
    expect(page).toContain('<StorefrontTemplateLibrary');
    expect(library).not.toContain('StorefrontAiGeneratorPanel');
    expect(builder).not.toContain('StorefrontAiGeneratorPanel');
  });

  it('keeps the library reachable after a template was selected and marks the current template',()=>{
    const library=read('src/components/admin/storefront-template-library.tsx');
    const builder=read('src/components/admin/storefront-visual-builder.tsx');
    const page=read('src/app/admin/tartalom/builder/page.tsx');
    expect(page).toContain("params.view==='templates'");
    expect(page).toContain('hasExistingStorefront={Boolean(document)}');
    expect(library).toContain('Vissza a szerkesztőhöz');
    expect(library).toContain('Jelenlegi sablon');
    expect(builder).toContain('▦ Sablonok');
    expect(builder).toContain("router.push('/admin/tartalom/builder?view=templates')");
  });

  it('requires an explicit safe confirmation before switching an existing storefront template',()=>{
    const library=read('src/components/admin/storefront-template-library.tsx');
    expect(library).toContain('SABLONVÁLTÁS');
    expect(library).toContain('A most publikált webshop');
    expect(library).toContain('Termékek, készlet és árak nem változnak');
    expect(library).toContain('Rendelések és ügyféladatok nem változnak');
    expect(library).toContain('A jelenlegi draft oldalak szerkesztéseit a sablonváltás felülírhatja');
    expect(library).toContain('Igen, váltok erre a sablonra');
  });

  it('renders template live preview through the shared Storefront runtime without installing a draft',()=>{
    const preview=read('src/app/storefront-template-preview/page.tsx');
    expect(preview).toContain('getStorefrontTemplatePackage');
    expect(preview).toContain('<StorefrontRuntimeRenderer');
    expect(preview).toContain('createStorefrontVisualBuilderComponentRegistry');
    expect(preview).toContain('createStorefrontVisualBuilderRendererRegistry');
    expect(preview).toContain('createStorefrontTemplatePreviewBindingContext');
    expect(preview).toContain('getStorefrontTemplatePreviewTheme');
    expect(preview).toContain('representative-demo');
    expect(preview).not.toContain('installVisualBuilderTemplateAction');
  });

  it('gives every concrete template a non-white canonical theme and populated preview list bindings',()=>{
    for(const entry of STOREFRONT_TEMPLATE_CATALOG){
      const template=getStorefrontTemplatePackage(entry.templateKey,entry.templateVersion);
      expect(template).toBeTruthy();
      if(!template)continue;
      const page=template.pages.find(candidate=>candidate.pageType==='home')??template.pages[0];
      expect(page).toBeTruthy();
      if(!page)continue;
      const theme=getStorefrontTemplatePreviewTheme(entry.templateKey);
      expect(theme['--shoporation-color-background']).toBeTruthy();
      expect(theme['--shoporation-color-text']).toBeTruthy();
      const context=createStorefrontTemplatePreviewBindingContext({template,page});
      const check=(node:StorefrontComponentNode)=>{
        for(const[slot,binding]of Object.entries(node.bindings??{})){
          if(!['products','items','options','reviews'].includes(slot))continue;
          const value=resolveStorefrontBinding(binding.path,context);
          if(Array.isArray(binding.fallback)&&binding.fallback.length===0)expect(Array.isArray(value)&&value.length>0,`${entry.templateKey}:${node.componentKey}:${binding.path}`).toBe(true);
        }
        for(const child of node.children??[])check(child);
      };
      for(const node of page.sections)check(node);
    }
  });
});