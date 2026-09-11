import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_TEMPLATE_CATALOG,getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';

describe('storefront template preview runtime',()=>{
  it('validates every catalog template home page with preview capabilities',()=>{
    const registry=createStorefrontVisualBuilderComponentRegistry();
    const capability={plan:'pro' as const,features:[...PLANS.pro.features]};
    const failures:Array<{templateKey:string;violations:unknown[]}|{templateKey:string;missing:string}>=[];
    for(const entry of STOREFRONT_TEMPLATE_CATALOG){
      const template=getStorefrontTemplatePackage(entry.templateKey,entry.templateVersion);
      if(!template){failures.push({templateKey:entry.templateKey,missing:'template'});continue;}
      const page=template.pages.find(candidate=>candidate.pageType==='home')??template.pages[0];
      if(!page){failures.push({templateKey:entry.templateKey,missing:'page'});continue;}
      const result=validateStorefrontPageDocument(page,registry,capability);
      if(!result.ok)failures.push({templateKey:entry.templateKey,violations:result.violations});
    }
    expect(failures,JSON.stringify(failures)).toEqual([]);
  });
});
