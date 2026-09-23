import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_TEMPLATE_CATALOG,getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {resolveStorefrontTemplateAccountPreviewRuntimePage} from '@/lib/builder/storefront-runtime-source';

describe('storefront template preview runtime',()=>{
  it('resolves tenant-free template-aware account auth for every previewable template',()=>{
    const failures:string[]=[];
    for(const entry of STOREFRONT_TEMPLATE_CATALOG){
      const template=getStorefrontTemplatePackage(entry.templateKey,entry.templateVersion);
      if(!template?.pages.some(page=>page.pageType==='account'))continue;
      const runtime=resolveStorefrontTemplateAccountPreviewRuntimePage(entry.templateKey,entry.templateVersion);
      if(!runtime||runtime.page.pageType!=='account'||runtime.page.templateKey!==entry.templateKey)failures.push(entry.templateKey);
    }
    expect(failures).toEqual([]);
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
