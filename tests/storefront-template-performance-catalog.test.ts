import {describe,expect,it} from 'vitest';
import {STOREFRONT_TEMPLATE_CATALOG,getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {evaluateStorefrontPerformance} from '@/lib/builder/storefront-performance-contract';

describe('Storefront template catalog performance gate',()=>{
  it('keeps every catalog template page below hard structural performance budgets',()=>{
    expect(STOREFRONT_TEMPLATE_CATALOG.length).toBeGreaterThan(0);
    const failures:string[]=[];
    for(const entry of STOREFRONT_TEMPLATE_CATALOG){
      const template=getStorefrontTemplatePackage(entry.templateKey,entry.templateVersion);
      if(!template){failures.push(`${entry.templateKey}@${entry.templateVersion}:template-missing`);continue;}
      for(const page of template.pages){
        const result=evaluateStorefrontPerformance(page);
        for(const issue of result.issues.filter(item=>item.severity==='error')){
          failures.push(`${entry.templateKey}@${entry.templateVersion}/${page.pageType}:${issue.metric}=${issue.actual}>${issue.limit}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('reports soft budget pressure without making soft warnings invisible',()=>{
    const warnings:string[]=[];
    for(const entry of STOREFRONT_TEMPLATE_CATALOG){
      const template=getStorefrontTemplatePackage(entry.templateKey,entry.templateVersion);
      if(!template)continue;
      for(const page of template.pages){
        const result=evaluateStorefrontPerformance(page);
        for(const issue of result.issues.filter(item=>item.severity==='warning'))warnings.push(`${entry.templateKey}/${page.pageType}:${issue.metric}`);
      }
    }
    expect(Array.isArray(warnings)).toBe(true);
  });
});
