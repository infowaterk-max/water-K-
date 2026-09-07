import fs from 'node:fs';
import path from 'node:path';
import {describe,expect,it} from 'vitest';
import {
  STOREFRONT_BUILDER_FOUNDATION_VERSION,
  STOREFRONT_DEMO_CONTENT_POLICY,
  STOREFRONT_DESIGN_TOKEN_CONTRACT,
  STOREFRONT_LAYOUT_GRID_CONTRACT,
  STOREFRONT_PAGE_SCHEMA_CONTRACT,
  STOREFRONT_PAGE_TYPES,
  STOREFRONT_TEMPLATE_MANIFEST_VERSION,
  STOREFRONT_TEMPLATE_MIGRATION_POLICY,
  defineStorefrontTemplateManifest,
  normalizeStorefrontGridSpan,
  resolveStorefrontResponsiveValue,
} from '../src/lib/builder/storefront-foundation';
import {STOREFRONT_NAVIGATION_BUILDER_MANIFEST} from '../src/lib/navigation/storefront-ia';

const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),'utf8');

describe('Roadmap catch-up foundation gate',()=>{
  it('freezes a common Builder-compatible storefront foundation without implementing the visual editor',()=>{
    expect(STOREFRONT_BUILDER_FOUNDATION_VERSION).toBe('shoporation.storefront-builder-foundation.v1');
    expect(STOREFRONT_LAYOUT_GRID_CONTRACT.columns).toBe(12);
    expect(STOREFRONT_LAYOUT_GRID_CONTRACT.gutterPx).toEqual({desktop:32,tablet:24,mobile:16});
    expect(STOREFRONT_DESIGN_TOKEN_CONTRACT.colors).toContain('primary');
    expect(STOREFRONT_PAGE_TYPES).toEqual(expect.arrayContaining(['home','catalog','product','checkout','blog-article']));
    expect(STOREFRONT_PAGE_SCHEMA_CONTRACT.preserveUnknownConfigKeys).toBe(true);
    expect(STOREFRONT_PAGE_SCHEMA_CONTRACT.dragDropRuntime).toBe(false);
    expect(STOREFRONT_TEMPLATE_MIGRATION_POLICY.destructiveResetForbidden).toBe(true);
    expect(STOREFRONT_DEMO_CONTENT_POLICY.customerData).toBe('forbidden');
    expect(resolveStorefrontResponsiveValue({desktop:12,tablet:8},'mobile')).toBe(8);
    expect(normalizeStorefrontGridSpan(6)).toBe(6);
    expect(normalizeStorefrontGridSpan(99)).toBe(12);
  });

  it('provides a versioned template manifest contract with Alap/Pro capability metadata and migration/demo rules',()=>{
    const manifest=defineStorefrontTemplateManifest({
      foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
      manifestVersion:STOREFRONT_TEMPLATE_MANIFEST_VERSION,
      templateKey:'reference.catalog',
      templateVersion:1,
      pageSchemaVersion:1,
      minPlan:'alap',
      requiredFeatures:['catalog'],
      pageTypes:['catalog','product'],
      responsive:{desktop:true,tablet:true,mobile:true},
      migration:STOREFRONT_TEMPLATE_MIGRATION_POLICY,
      demoContent:{namespace:'reference-catalog',policy:STOREFRONT_DEMO_CONTENT_POLICY},
    });
    expect(manifest.minPlan).toBe('alap');
    expect(manifest.requiredFeatures).toEqual(['catalog']);
    expect(()=>defineStorefrontTemplateManifest({...manifest,templateVersion:0})).toThrow('TEMPLATE_VERSION_INVALID');
  });

  it('moves the existing storefront navigation manifest onto the shared foundation contract',()=>{
    expect(STOREFRONT_NAVIGATION_BUILDER_MANIFEST.foundationVersion).toBe(STOREFRONT_BUILDER_FOUNDATION_VERSION);
    expect(STOREFRONT_NAVIGATION_BUILDER_MANIFEST.componentKey).toBe('storefront.navigation.link');
    expect(STOREFRONT_NAVIGATION_BUILDER_MANIFEST.capability).toEqual({minPlan:'alap',features:[]});
    expect(STOREFRONT_NAVIGATION_BUILDER_MANIFEST.responsiveMode).toBe('primary-navigation');
  });

  it('enforces selection-first progressive disclosure for commerce provider setup',()=>{
    const page=read('src/app/admin/beallitasok/fizetes-szallitas/page.tsx');
    expect(page).toContain("provider?:string");
    expect(page).toContain('const selectedProvider=providers.find');
    expect(page).toContain('Válassz szolgáltatót');
    expect(page).toContain('{selectedProvider&&guide&&<article');
    expect((page.match(/getProviderGuide\(/g)??[]).length).toBe(1);
    expect(page).toContain('Szolgáltatóváltás');
  });
});
