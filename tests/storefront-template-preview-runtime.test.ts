import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_TEMPLATE_CATALOG,getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';

describe('storefront template preview runtime',()=>{
  it('separates protected Product Owner preview share access from shopper authentication',()=>{
    const page=fs.readFileSync('src/app/storefront-template-preview/page.tsx','utf8');
    expect(page).toContain("process.env.VERCEL_ENV==='preview'");
    expect(page).toContain("query._vercel_share?.trim()");
    expect(page).toContain('if(!protectedProductOwnerShare)');
    expect(page).toContain('requireAdmin');
    expect(page).toContain("requirePlanFeature('contentMarketing')");
    expect(page).not.toContain('requireCurrentStoreContext');
    expect(page).not.toContain("key!=='_vercel_share'&&typeof value==='string'&&value)returnParams.set(key,value);\n  await requireAdmin");
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
