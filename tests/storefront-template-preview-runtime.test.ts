import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_TEMPLATE_CATALOG,getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {resolveStorefrontTemplatePreviewPackage} from '@/lib/builder/storefront-template-preview-auth';

describe('storefront template preview runtime',()=>{
  it('keeps accepted catalog resolution unchanged while factory resolution is explicit and fail-closed',()=>{
    const entry=STOREFRONT_TEMPLATE_CATALOG[0]!;
    const accepted=getStorefrontTemplatePackage(entry.templateKey,entry.templateVersion);
    const resolved=resolveStorefrontTemplatePreviewPackage(entry.templateKey,entry.templateVersion,false);
    expect(resolved?.manifest.templateKey).toBe(accepted?.manifest.templateKey);
    expect(resolved?.manifest.templateVersion).toBe(accepted?.manifest.templateVersion);
    expect(resolveStorefrontTemplatePreviewPackage('missing.factory-template',1,true)).toBeNull();
  });

  it('routes factory=1 through Factory candidate authority in both owner preview and Visual Fidelity QA',()=>{
    const preview=fs.readFileSync('src/app/storefront-template-preview/page.tsx','utf8');
    const fidelity=fs.readFileSync('src/app/visual-fidelity-qa/page.tsx','utf8');
    expect(preview).toContain("const factoryCandidate=query.factory==='1'");
    expect(preview).toContain('resolveStorefrontTemplatePreviewPackage(templateKey,version,factoryCandidate)');
    expect(fidelity).toContain("const factoryCandidate=query.factory==='1'");
    expect(fidelity).toContain('buildRegisteredStorefrontTemplateFactoryCandidate(templateKey)');
  });
  it('validates every catalog template page with preview capabilities',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    const capability={plan:'pro' as const,features:[...PLANS.pro.features]};
    const failures:Array<{templateKey:string;pageKey?:string;violations?:unknown[];missing?:string}>=[];
    for(const entry of STOREFRONT_TEMPLATE_CATALOG){
      const template=getStorefrontTemplatePackage(entry.templateKey,entry.templateVersion);
      if(!template){failures.push({templateKey:entry.templateKey,missing:'template'});continue;}
      if(!template.pages.length){failures.push({templateKey:entry.templateKey,missing:'pages'});continue;}
      for(const page of template.pages){
        const result=validateStorefrontPageDocument(page,registry,capability);
        if(!result.ok)failures.push({templateKey:entry.templateKey,pageKey:page.pageKey,violations:result.violations});
      }
    }
    expect(failures,JSON.stringify(failures)).toEqual([]);
  });
});
