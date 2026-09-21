import fs from 'node:fs';
import {describe,expect,it} from 'vitest';

const auth=fs.readFileSync('src/components/auth/auth-form.tsx','utf8');
const shell=fs.readFileSync('src/components/account/storefront-account-shell.tsx','utf8');
const source=fs.readFileSync('src/lib/builder/storefront-runtime-source.ts','utf8');
const accountPage=fs.readFileSync('src/app/fiokom/page.tsx','utf8');
const playroom=fs.readFileSync('src/lib/builder/templates/playroom-v20.ts','utf8');
const primitives=fs.readFileSync('src/components/builder/storefront-primitives.tsx','utf8');
const commerceHeader=fs.readFileSync('src/components/builder/storefront-commerce-header.tsx','utf8');
const accountCss=fs.readFileSync('src/app/account-workflow.css','utf8');

describe('template-aware storefront auth surface',()=>{
  it('exposes the shared auth surface and inherits storefront design tokens',()=>{
    expect(auth).toMatch(/data-storefront-auth-surface="true"/);
    expect(auth).toMatch(/--shoporation-color-primary/);
    expect(auth).toMatch(/min-height:44px/);
  });

  it('keeps signed-out customer auth inside the active storefront template shell',()=>{
    expect(shell).toMatch(/resolveCurrentStorefrontAccountRuntimePage\(customerId\)/);
    expect(shell).not.toMatch(/if\(!customerId\)return <>{children}<\/>/);
    expect(shell).toMatch(/data-storefront-template={runtime\.page\.templateKey}/);
  });

  it('requires template-owned signed-out composition instead of generic account chrome',()=>{
    expect(shell).toMatch(/publicAuthSections/);
    expect(shell).toMatch(/authPublic===true/);
    expect(shell).toMatch(/!customerId&&publicAuthSections\.length\?render\(publicAuthSections\):null/);
    expect(shell).toMatch(/data-authenticated="false"/);
    expect(accountPage).toMatch(/storefrontSignedOutAccount/);
    expect(accountPage).not.toMatch(/if\(!user\)[^;]+Belépés vagy regisztráció/);
    expect(playroom).toMatch(/playroom-account-auth-public/);
    expect(playroom).toMatch(/authPublic:true/);
    expect(playroom).toMatch(/authComposition:'template-owned-v1'/);
    expect(playroom).toMatch(/authPreset:'playroom-v20-command-center'/);
  });

  it('locks mobile width and overflow geometry for signed-out auth',()=>{
    expect(primitives).toMatch(/width:'100%',maxWidth:'100%',minWidth:0,boxSizing:'border-box'/);
    expect(commerceHeader).toMatch(/width:'100%',maxWidth:'100%',minWidth:0,boxSizing:'border-box'/);
    expect(accountCss).toMatch(/\.storefrontAccountShell\{width:100%;max-width:100%;min-width:0;/);
    expect(playroom).toMatch(/mobile:\{display:'none',padding:'0'\}/);
  });

  it('resolves anonymous account pages without requesting customer-only commerce data',()=>{
    expect(source).toMatch(/customerId:string\|null/);
    expect(source).toMatch(/const instance=await getCurrentWebshopInstance\(\);if\(!instance\)return null;/);
    expect(source).toMatch(/getPreviewStorefrontDraftPage\(instance\.id,'account'\)/);
    expect(source).toMatch(/applyTemplateAuthComposition/);
    expect(source).not.toMatch(/resolveCurrentStorefrontAccountRuntimePage[\s\S]{0,220}requireStorefrontAccess\(\)/);
    expect(source).toMatch(/request\?getStorefrontDigitalCommerceRuntimeModel/);
  });
});
