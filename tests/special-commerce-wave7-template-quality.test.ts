import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {createStorefrontVisualBuilderRendererRegistry} from '@/components/builder/storefront-builder-renderer-registry';
import {STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES,STOREFRONT_TEMPLATE_LAUNCH_TARGET} from '@/lib/builder/storefront-template-catalog';
import {
  STOREFRONT_SPECIAL_COMMERCE_CAPABILITIES,
  STOREFRONT_SPECIAL_COMMERCE_CAPABILITY_COMPONENT_KEYS,
  STOREFRONT_TEMPLATE2_WAVE7_CAPABILITY_MATRIX,
  STOREFRONT_TEMPLATE2_WAVE7_PORTFOLIO,
} from '@/lib/builder/storefront-special-commerce-template2-adoption';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
const CANONICAL_PAGE_TYPES=['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'] as const;
const walk=(nodes:readonly {componentKey:string;children?:readonly any[]}[],out:string[]=[])=>{for(const node of nodes){out.push(node.componentKey);walk(node.children??[],out);}return out;};

describe('Special Commerce Wave 7 template quality gate',()=>{
  it('reviews only the 24 concrete packages and keeps the formal 42-template closure blocked',()=>{
    expect(STOREFRONT_TEMPLATE_LAUNCH_TARGET).toBe(42);
    expect(STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES).toHaveLength(24);
    expect(STOREFRONT_TEMPLATE2_WAVE7_PORTFOLIO.actualTemplateCount).toBe(24);
    expect(STOREFRONT_TEMPLATE2_WAVE7_PORTFOLIO.remainingTemplateGap).toBe(18);
    expect(STOREFRONT_TEMPLATE2_WAVE7_PORTFOLIO.full42ClosurePossible).toBe(false);
  });

  it('keeps every concrete template on the canonical 14-page D/T/M Builder contract',()=>{
    const components=createStorefrontVisualBuilderComponentRegistry();
    for(const template of STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES){
      expect([...template.manifest.pageTypes],`${template.manifest.templateKey}:page-types`).toEqual(CANONICAL_PAGE_TYPES);
      expect(template.manifest.responsive,`${template.manifest.templateKey}:responsive`).toEqual({desktop:true,tablet:true,mobile:true});
      expect(template.pages,`${template.manifest.templateKey}:page-count`).toHaveLength(CANONICAL_PAGE_TYPES.length);
      for(const page of template.pages){
        for(const key of walk(page.sections))expect(components.get(key,1),`${template.manifest.templateKey}:${page.pageType}:${key}`).toBeDefined();
      }
    }
  });

  it('retains a concrete, non-reskin visual identity signal for every reviewed template',()=>{
    const identities=STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES.map(template=>{
      const home=template.pages.find(page=>page.pageType==='home');
      const visualDNA=String(home?.metadata?.visualDNA??'').trim();
      expect(visualDNA,`${template.manifest.templateKey}:visualDNA`).not.toBe('');
      return visualDNA;
    });
    expect(new Set(identities).size).toBe(STOREFRONT_IMPLEMENTED_TEMPLATE_PACKAGES.length);
  });

  it('keeps every adopted Special Commerce capability on shared production Builder and renderer registries',()=>{
    const components=createStorefrontVisualBuilderComponentRegistry();
    const renderers=createStorefrontVisualBuilderRendererRegistry();
    expect(STOREFRONT_TEMPLATE2_WAVE7_CAPABILITY_MATRIX).toHaveLength(24);
    for(const row of STOREFRONT_TEMPLATE2_WAVE7_CAPABILITY_MATRIX){
      for(const capability of STOREFRONT_SPECIAL_COMMERCE_CAPABILITIES){
        if(row.capabilities[capability]==='not applicable')continue;
        for(const key of STOREFRONT_SPECIAL_COMMERCE_CAPABILITY_COMPONENT_KEYS[capability]){
          expect(components.get(key,1),`${row.templateKey}:${capability}:${key}:component`).toBeDefined();
          expect(renderers.get(key,1),`${row.templateKey}:${capability}:${key}:renderer`).toBeDefined();
        }
      }
    }
  });

  it('hardens dense Scene hotspots on mobile without creating a separate mobile commerce engine',()=>{
    const source=read('src/components/builder/storefront-interactive-scene.tsx');
    expect(source).toContain("data-hotspot-label-mode={viewport==='mobile'?'summary':'inline'}");
    expect(source).toContain("gridTemplateColumns:viewport==='mobile'?'2.5rem':'2.5rem minmax(0,auto)'");
    expect(source).toContain("{viewport!=='mobile'?<span");
    expect(source).toContain('aria-label={`${hotspot.label}');
    expect(source).toContain('resolveInteractiveScene');
    expect(source).not.toContain('mobileCommerceEngine');
  });

  it('hardens Configurator long labels and slot rows for mobile through the shared renderer',()=>{
    const source=read('src/components/builder/storefront-configurator.tsx');
    expect(source).toContain("data-slot-layout={viewport==='mobile'?'stacked':'columns'}");
    expect(source).toContain("gridTemplateColumns:viewport==='mobile'?'minmax(0,1fr)':'minmax(8rem,1fr) minmax(0,2fr) auto'");
    expect(source).toContain("overflowWrap:'anywhere'");
    expect(source).toContain("flexWrap:'wrap'");
    expect(source).toContain("text(config.unknownLabel,'Ismeretlen')");
  });

  it('removes the stale Market Pantry Recipe contradiction while preserving shared Recipe authority',()=>{
    const source=read('src/lib/builder/templates/market-pantry.ts');
    expect(source).not.toContain('A Recipe-to-Cart nem a launch signature és ebben a Wave-ben nem kerül bevezetésre.');
    expect(source).toContain('A dedikált Recipe Commerce blokk a közös Builder registryből adható hozzá');
    expect(source).toContain('Recipe Commerce blokk csak explicit strukturált mappinggel');
    expect(source).not.toContain("componentKey:'market-pantry.recipe'");
  });

  it('keeps accessibility-critical Special Commerce semantics in shared production renderers',()=>{
    const scene=read('src/components/builder/storefront-interactive-scene.tsx');
    const recipe=read('src/components/builder/storefront-recipe-commerce-experience.tsx');
    const release=read('src/components/builder/storefront-release-commerce-experience.tsx');
    const configurator=read('src/components/builder/storefront-configurator.tsx');
    expect(scene).toContain('aria-label={`${hotspot.label}');
    expect(recipe).toContain('aria-label="Adagok száma"');
    expect(recipe).toContain('<select');
    expect(recipe).toContain('role="status"');
    expect(release).toContain('<time');
    expect(release).toContain('aria-label={`Indulás:');
    expect(configurator).toContain("status==='unknown'");
  });
});
