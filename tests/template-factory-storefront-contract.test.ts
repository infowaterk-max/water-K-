import {describe,expect,it} from 'vitest';
import {buildRegisteredStorefrontTemplateFactoryCandidate} from '@/lib/builder/template-factory/recipe-registry';
import {applyStorefrontTemplateDemoNotice,evaluateStorefrontTemplateRouteIntegrity,rewriteStorefrontTemplatePreviewLinks} from '@/lib/builder/storefront-template-route-integrity';

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
});
