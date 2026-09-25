import {describe,expect,it} from 'vitest';
import {STOREFRONT_PAGE_TYPES} from '@/lib/builder/storefront-foundation';
import {buildRegisteredStorefrontTemplateFactoryCandidate} from '@/lib/builder/template-factory/recipe-registry';
import {applyStorefrontTemplateDemoNotice,applyStorefrontTemplateOwnerShowroomNavigation,evaluateStorefrontTemplateRouteIntegrity,rewriteStorefrontTemplatePreviewLinks} from '@/lib/builder/storefront-template-route-integrity';

describe('Template Factory storefront contract boundary',()=>{
  it('evaluates current Factory packages with explicit route-integrity issue codes',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const issues=evaluateStorefrontTemplateRouteIntegrity(build.package);
    for(const issue of issues){
      expect(['DEMO_CONTENT_TARGET_MISSING','STORE_ROUTE_UNKNOWN','CATALOG_QUERY_UNSUPPORTED']).toContain(issue.code);
      expect(issue.severity).toBe('error');
      expect(issue.href.length).toBeGreaterThan(0);
    }
  });

  it('detects an injected unknown shopper route instead of silently accepting it',()=>{
    const build=structuredClone(buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault'));
    const page=build.package.pages[0]!;
    page.sections=[...page.sections,{id:'quality-route-probe',componentKey:'content.text',componentVersion:1,config:{text:'Probe',href:'/definitely-unknown-shopper-route'},responsive:{desktop:{gridSpan:12},tablet:{gridSpan:12},mobile:{gridSpan:12}}}];
    const issues=evaluateStorefrontTemplateRouteIntegrity(build.package);
    expect(issues.some(issue=>issue.code==='STORE_ROUTE_UNKNOWN'&&issue.href==='/definitely-unknown-shopper-route')).toBe(true);
  });

  it('keeps internal shopper links inside the selected Factory preview authority',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const page=structuredClone(build.package.pages[0]!);
    page.sections=[{id:'quality-preview-link-probe',componentKey:'content.text',componentVersion:1,config:{text:'Kosár',href:'/kosar'},responsive:{desktop:{gridSpan:12},tablet:{gridSpan:12},mobile:{gridSpan:12}}},...page.sections];
    const rewritten=rewriteStorefrontTemplatePreviewLinks(page,{templateKey:'gaming.loot-vault',templateVersion:2,viewport:'desktop'});
    expect(JSON.stringify(rewritten)).toContain('/storefront-template-preview?template=gaming.loot-vault&version=2&page=cart&viewport=desktop');
  });

  it('marks demo-content previews explicitly instead of presenting them as live merchant content',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const page=applyStorefrontTemplateDemoNotice(build.package.pages[0]!);
    expect(page.metadata?.demoContentPreview).toBe(true);
    expect(JSON.stringify(page)).toContain('MINTA TARTALOM');
  });

  it('gives the Product Owner exactly the 14 canonical pages in showroom main navigation without mutating shopper header or footer',()=>{
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    const source=structuredClone(build.package.pages.find(page=>page.pageType==='home')!);
    const originalHeader=JSON.stringify(source.sections[0]);
    const originalFooter=JSON.stringify(source.sections.at(-1));
    const showroom=applyStorefrontTemplateOwnerShowroomNavigation(source,{
      templateKey:'gaming.loot-vault',
      templateVersion:2,
      viewport:'desktop',
      factory:true,
    });
    expect(JSON.stringify(source.sections[0])).toBe(originalHeader);
    expect(JSON.stringify(showroom.sections.at(-1))).toBe(originalFooter);

    const header=showroom.sections.find(section=>section.componentKey==='system.header'||section.componentKey==='system.commerce-header')!;
    const findNavigation=(nodes:typeof header.children):NonNullable<typeof header.children>[number]|null=>{
      for(const node of nodes??[]){
        if(node.componentKey==='system.navigation')return node;
        const nested=findNavigation(node.children);
        if(nested)return nested;
      }
      return null;
    };
    const navigation=findNavigation(header.children);
    expect(navigation).toBeTruthy();
    const items=navigation?.config.items as Array<{label:string;href:string}>;
    expect(items).toHaveLength(14);
    const pageTypes=items.map(item=>new URL(item.href,'https://shoporation.local').searchParams.get('page'));
    expect(pageTypes).toEqual([...STOREFRONT_PAGE_TYPES]);
    expect(new Set(pageTypes).size).toBe(14);
    expect(items.every(item=>new URL(item.href,'https://shoporation.local').searchParams.get('factory')==='1')).toBe(true);
  });

});
