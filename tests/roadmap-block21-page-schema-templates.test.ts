import {describe,expect,it} from 'vitest';
import {
  STOREFRONT_PAGE_SCHEMA_BLOCK21_CONTRACT,
  STOREFRONT_BREAKPOINT_CONTRACT,
  resolveStorefrontViewportForWidth,
  storefrontBuilderEditabilityMetadata,
} from '@/lib/builder/storefront-page-schema';
import {createStorefrontPrimitiveComponentRegistry} from '@/lib/builder/storefront-primitives';
import {
  STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES,
  STOREFRONT_TEMPLATE_CATALOG,
  STOREFRONT_TEMPLATE_LAUNCH_TARGET,
  STOREFRONT_TEMPLATE_PORTFOLIO_STATUS,
  getStorefrontTemplatePackage,
} from '@/lib/builder/storefront-template-catalog';
import {STOREFRONT_PAGE_TYPES} from '@/lib/builder/storefront-foundation';

const identities=(items:readonly{templateKey:string;templateVersion:number}[])=>items.map(item=>`${item.templateKey}@${item.templateVersion}`);

describe('Roadmap Block 21 — Page Schema / Templates',()=>{
  it('keeps Block 22 interaction engines explicitly disabled',()=>{
    expect(STOREFRONT_PAGE_SCHEMA_BLOCK21_CONTRACT.visualBuilder).toEqual({
      dragDrop:false,
      canvas:false,
      inspector:false,
      resizeHandles:false,
      inlineEditing:false,
    });
    expect(STOREFRONT_PAGE_SCHEMA_BLOCK21_CONTRACT.pageSchema.dragDropRuntime).toBe(false);
    expect(STOREFRONT_PAGE_SCHEMA_BLOCK21_CONTRACT.pageSchema.inlineEditingRuntime).toBe(false);
    expect(STOREFRONT_PAGE_SCHEMA_BLOCK21_CONTRACT.templateInstallPublishes).toBe(false);
  });

  it('locks one shared responsive schema and 12-column grid across desktop/tablet/mobile',()=>{
    expect(STOREFRONT_PAGE_SCHEMA_BLOCK21_CONTRACT.grid.columns).toBe(12);
    expect(STOREFRONT_PAGE_SCHEMA_BLOCK21_CONTRACT.previewAndPublishedUseSameSchema).toBe(true);
    expect(STOREFRONT_BREAKPOINT_CONTRACT.separatePageDocuments).toBe(false);
    expect(resolveStorefrontViewportForWidth(390)).toBe('mobile');
    expect(resolveStorefrontViewportForWidth(768)).toBe('tablet');
    expect(resolveStorefrontViewportForWidth(1199)).toBe('tablet');
    expect(resolveStorefrontViewportForWidth(1200)).toBe('desktop');
    expect(()=>resolveStorefrontViewportForWidth(-1)).toThrow('STOREFRONT_VIEWPORT_WIDTH_INVALID');
  });

  it('derives future-builder metadata from component authority without enabling editing interactions',()=>{
    const registry=createStorefrontPrimitiveComponentRegistry();
    const header=registry.get('system.header',1);
    expect(header).toBeDefined();
    const metadata=storefrontBuilderEditabilityMetadata(header!);
    expect(metadata.protectedSystem).toBe(true);
    expect(metadata.allowedChildren).toEqual(['system.navigation']);
    expect(metadata.interactions).toEqual({dragDrop:false,inlineEditing:false,resizeHandles:false,canvas:false});
    expect(metadata.capability.minPlan).toBe('alap');
  });

  it('registers only concrete source-controlled packages and tracks the 42-template launch target separately',()=>{
    expect(STOREFRONT_TEMPLATE_LAUNCH_TARGET).toBe(42);
    expect(STOREFRONT_TEMPLATE_PORTFOLIO_STATUS.implemented).toBe(STOREFRONT_TEMPLATE_CATALOG.length);
    expect(STOREFRONT_TEMPLATE_PORTFOLIO_STATUS.remaining).toBe(STOREFRONT_TEMPLATE_LAUNCH_TARGET-STOREFRONT_TEMPLATE_CATALOG.length);
    expect(STOREFRONT_TEMPLATE_PORTFOLIO_STATUS.fabricatedEntriesAllowed).toBe(false);
    expect(STOREFRONT_TEMPLATE_CATALOG.length).toBe(STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES.length);
    expect(new Set(identities(STOREFRONT_TEMPLATE_CATALOG)).size).toBe(STOREFRONT_TEMPLATE_CATALOG.length);
  });

  it('keeps every catalog package versioned, responsive and fully covered by declared page presets',()=>{
    for(const template of STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES){
      expect(template.manifest.templateVersion).toBeGreaterThan(0);
      expect(template.manifest.responsive).toEqual({desktop:true,tablet:true,mobile:true});
      expect(template.pages.length).toBe(template.manifest.pageTypes.length);
      const types=new Set(template.pages.map(page=>page.pageType));
      for(const pageType of template.manifest.pageTypes)expect(types.has(pageType)).toBe(true);
      for(const page of template.pages){
        expect(STOREFRONT_PAGE_TYPES).toContain(page.pageType);
        expect(page.templateKey).toBe(template.manifest.templateKey);
        expect(page.templateVersion).toBe(template.manifest.templateVersion);
      }
    }
  });

  it('resolves latest or exact package identity without tenant activation side effects',()=>{
    const first=STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES[0]!;
    expect(getStorefrontTemplatePackage(first.manifest.templateKey,first.manifest.templateVersion)).toBe(first);
    expect(getStorefrontTemplatePackage(first.manifest.templateKey)).toBeDefined();
    expect(getStorefrontTemplatePackage('does-not-exist')).toBeUndefined();
  });
});
