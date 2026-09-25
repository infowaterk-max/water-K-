import fs from 'node:fs';
import {describe,expect,it} from 'vitest';

describe('generic Template Factory candidate preview infrastructure',()=>{
  it('resolves Factory candidates through the shared registry without template hardcoding',()=>{
    const resolver=fs.readFileSync('src/lib/builder/storefront-template-preview-auth.ts','utf8');
    expect(resolver).toContain('buildRegisteredStorefrontTemplateFactoryCandidate(templateKey)');
    expect(resolver).toContain('build.report.productOwnerReady');
    expect(resolver).not.toContain('gaming.loot-vault');
  });

  it('keeps Visual Fidelity candidate selection explicit and candidate-only',()=>{
    const api=fs.readFileSync('src/app/api/visual-fidelity/templates/route.ts','utf8');
    const qa=fs.readFileSync('src/app/visual-fidelity-qa/page.tsx','utf8');
    expect(api).toContain("status:'candidate'");
    expect(api).toContain('STOREFRONT_TEMPLATE_FACTORY_RECIPES');
    expect(qa).toContain("query.factory==='1'");
    expect(qa).toContain("data-factory-candidate={factoryCandidate?'true':'false'}");
  });

  it('keeps preview shell composition additive instead of replacing normal account authority',()=>{
    const shell=fs.readFileSync('src/components/account/storefront-account-shell.tsx','utf8');
    const login=fs.readFileSync('src/app/storefront-template-preview-login/page.tsx','utf8');
    expect(shell).toContain('previewTemplate');
    expect(login).toContain('StorefrontAccountShell');
    expect(login).toContain('allowRegistration={false}');
  });
});
