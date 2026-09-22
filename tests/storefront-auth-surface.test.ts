import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
import {PLAYROOM_V20_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom-v20';
import {resolveStorefrontVisualStyle} from '@/lib/builder/storefront-visual-style';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';

const auth=fs.readFileSync('src/components/auth/auth-form.tsx','utf8');
const shell=fs.readFileSync('src/components/account/storefront-account-shell.tsx','utf8');
const source=fs.readFileSync('src/lib/builder/storefront-runtime-source.ts','utf8');
const accountPage=fs.readFileSync('src/app/fiokom/page.tsx','utf8');
const primitives=fs.readFileSync('src/components/builder/storefront-primitives.tsx','utf8');
const commerceHeader=fs.readFileSync('src/components/builder/storefront-commerce-header.tsx','utf8');
const accountCss=fs.readFileSync('src/app/account-workflow.css','utf8');
const accountNav=fs.readFileSync('src/components/account/account-subnav.tsx','utf8');

const playroomAccount=PLAYROOM_V20_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='account')!;
const findPlayroomNode=(id:string):StorefrontComponentNode=>{
  const visit=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode|null=>{
    for(const node of nodes){
      if(node.id===id)return node;
      const child=visit(node.children??[]);
      if(child)return child;
    }
    return null;
  };
  const result=visit(playroomAccount.sections);
  if(!result)throw new Error(`PLAYROOM_AUTH_TEST_NODE_MISSING:${id}`);
  return result;
};

describe('template-aware storefront auth surface',()=>{
  it('exposes the shared auth surface and inherits storefront design tokens',()=>{
    expect(auth).toMatch(/data-storefront-auth-surface="true"/);
    expect(auth).toMatch(/--shoporation-color-primary/);
    expect(auth).toMatch(/min-height:44px/);
    expect(auth).toMatch(/width:min\(100%,34rem\);max-width:34rem;margin:2rem auto/);
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
    expect(findPlayroomNode('playroom-account-auth-public').config.authPublic).toBe(true);
    expect(playroomAccount.metadata?.authComposition).toBe('template-owned-v1');
    expect(playroomAccount.metadata?.authPreset).toBe('playroom-v20-command-center');
  });

  it('locks mobile width and overflow geometry for signed-out auth',()=>{
    expect(primitives).toMatch(/width:'100%',maxWidth:'100%',minWidth:0,boxSizing:'border-box'/);
    expect(commerceHeader).toMatch(/width:'100%',maxWidth:'100%',minWidth:0,boxSizing:'border-box'/);
    expect(accountCss).toMatch(/\.storefrontAccountShell\{width:100%;max-width:100%;min-width:0;/);
    expect(resolveStorefrontVisualStyle(findPlayroomNode('playroom-account-auth-public-secondary').config.style,'mobile'))
      .toMatchObject({display:'none',padding:'0'});
  });

  it('keeps authenticated desktop account navigation as one canonical left rail',()=>{
    expect(accountNav).toMatch(/className="accountCapabilityRail"/);
    expect(accountNav).not.toMatch(/className="accountSubnav"/);
    expect(accountCss).toMatch(/\.storefrontAccountWorkspace\{[^}]*grid-template-columns:minmax\(15rem,17rem\)/);
    expect(accountCss).toMatch(/\.storefrontAccountSidebar \.accountCapabilityRail\{display:flex;flex-direction:column/);
    expect(accountCss).not.toMatch(/\.storefrontAccountSidebar \.accountCapabilityRail\{[^}]*flex-direction:row/);
  });

  it('resolves anonymous account pages without requesting customer-only commerce data',()=>{
    expect(source).toMatch(/customerId:string\|null/);
    expect(source).toMatch(/const instance=await getCurrentWebshopInstance\(\);if\(!instance\)return null;/);
    expect(source).toMatch(/getPreviewStorefrontDraftPage\(instance\.id,'account'\)/);
    expect(source).not.toMatch(/previewDraft=!customerId/);
    expect(source).toMatch(/const previewDraft=process\.env\.VERCEL_ENV==='preview'/);
    expect(source).toMatch(/applyTemplateAuthComposition/);
    expect(source).not.toMatch(/resolveCurrentStorefrontAccountRuntimePage[\s\S]{0,220}requireStorefrontAccess\(\)/);
    expect(source).toMatch(/request\?getStorefrontDigitalCommerceRuntimeModel/);
  });
});
