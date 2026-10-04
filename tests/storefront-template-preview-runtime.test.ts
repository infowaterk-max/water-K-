import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
import {PLANS} from '@/lib/plans/catalog';
import {STOREFRONT_TEMPLATE_CATALOG,getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {validateStorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {preserveStorefrontQualityCandidatePreviewAuthority,resolveStorefrontTemplateAccountPreviewRuntimePage,resolveStorefrontTemplatePreviewPackage} from '@/lib/builder/storefront-template-preview-auth';

describe('storefront template preview runtime',()=>{
  it('keeps accepted catalog resolution unchanged while factory resolution is explicit and fail-closed',()=>{
    const entry=STOREFRONT_TEMPLATE_CATALOG[0]!;
    const accepted=getStorefrontTemplatePackage(entry.templateKey,entry.templateVersion);
    const resolved=resolveStorefrontTemplatePreviewPackage(entry.templateKey,entry.templateVersion,false);
    expect(resolved?.manifest.templateKey).toBe(accepted?.manifest.templateKey);
    expect(resolved?.manifest.templateVersion).toBe(accepted?.manifest.templateVersion);
    expect(resolveStorefrontTemplatePreviewPackage('missing.factory-template',1,true)).toBeNull();
  });

  it('resolves SPORT HUB quality candidate only through explicit owner-preview authority without activating the catalog',()=>{
    expect(getStorefrontTemplatePackage('sport.sport-hub',1)).toBeUndefined();
    expect(resolveStorefrontTemplatePreviewPackage('sport.sport-hub',1,false,false)).toBeNull();
    const candidate=resolveStorefrontTemplatePreviewPackage('sport.sport-hub',1,false,true);
    expect(candidate?.manifest.templateKey).toBe('sport.sport-hub');
    expect(candidate?.manifest.templateVersion).toBe(1);
    expect(candidate?.pages).toHaveLength(14);
    expect(resolveStorefrontTemplatePreviewPackage('sport.sport-hub',1,true,true)).toBeNull();
    const account=resolveStorefrontTemplateAccountPreviewRuntimePage('sport.sport-hub',1,false,true);
    expect(account?.page.pageType).toBe('account');
    expect(account?.page.templateKey).toBe('sport.sport-hub');
  });

  it('preserves quality-candidate authority only on owner-preview URLs without rewriting unrelated links',()=>{
    const marked=preserveStorefrontQualityCandidatePreviewAuthority({
      faqHref:'/storefront-template-preview?template=sport.sport-hub&version=1&page=faq&viewport=mobile',
      shippingHref:'/storefront-template-preview?template=sport.sport-hub&version=1&page=legal&viewport=mobile&demoContent=szallitas',
      externalHref:'https://example.com',
    },true);
    expect(marked.faqHref).toContain('qualityCandidate=1');
    expect(marked.shippingHref).toContain('demoContent=szallitas');
    expect(marked.shippingHref).toContain('qualityCandidate=1');
    expect(marked.externalHref).toBe('https://example.com');
    expect(preserveStorefrontQualityCandidatePreviewAuthority({href:'/storefront-template-preview?template=x'},false)).toEqual({href:'/storefront-template-preview?template=x'});
  });

  it('routes factory=1 through Factory candidate authority in both owner preview and Visual Fidelity QA',()=>{
    const preview=fs.readFileSync('src/app/storefront-template-preview/page.tsx','utf8');
    const fidelity=fs.readFileSync('src/app/visual-fidelity-qa/page.tsx','utf8');
    expect(preview).toContain("const factoryCandidate=query.factory==='1'");
    expect(preview).toContain("const qualityCandidate=query.qualityCandidate==='1'");
    expect(preview).toContain('resolveStorefrontTemplatePreviewPackage(templateKey,version,factoryCandidate,qualityCandidate)');
    expect(fidelity).toContain("const factoryCandidate=query.factory==='1'");
    expect(fidelity).toContain('buildRegisteredStorefrontTemplateFactoryCandidate(templateKey)');
  });
  it('uses a template-aware login route and stamps exact preview provenance without duplicating auth authority',()=>{
    const preview=fs.readFileSync('src/app/storefront-template-preview/page.tsx','utf8');
    const login=fs.readFileSync('src/app/storefront-template-preview-login/page.tsx','utf8');
    const shell=fs.readFileSync('src/components/account/storefront-account-shell.tsx','utf8');
    expect(preview).toContain("redirect(\`/storefront-template-preview-login?");
    expect(preview).toContain('data-template-recipe={recipeIdentity}');
    expect(preview).toContain('data-compile-source={compileSource}');
    expect(preview).toContain('data-foundation-template={foundationTemplate}');
    expect(preview).toContain('data-source-commit={sourceCommit}');
    expect(login).toContain("import{AuthForm}from'@/components/auth/auth-form'");
    expect(login).toContain('previewTemplate={{templateKey:template.manifest.templateKey');
    expect(login).toContain("if(input.factoryCandidate)params.set('factory','1')");
    expect(login).toContain("if(input.qualityCandidate)params.set('qualityCandidate','1')");
    expect(shell).toContain('resolveStorefrontTemplateAccountPreviewRuntimePage');
    expect(shell).toContain('data-storefront-account-shell={runtime.source}');
  });

  it('resolves tenant-free template-aware account presentation for every accepted previewable template',()=>{
    const failures:string[]=[];
    for(const entry of STOREFRONT_TEMPLATE_CATALOG){
      const template=getStorefrontTemplatePackage(entry.templateKey,entry.templateVersion);
      if(!template?.pages.some(page=>page.pageType==='account'))continue;
      const runtime=resolveStorefrontTemplateAccountPreviewRuntimePage(entry.templateKey,entry.templateVersion,false);
      if(!runtime||runtime.source!=='preview'||runtime.page.pageType!=='account'||runtime.page.templateKey!==entry.templateKey)failures.push(entry.templateKey);
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
