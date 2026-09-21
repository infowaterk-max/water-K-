import fs from 'node:fs';
import {describe,expect,it} from 'vitest';

const auth=fs.readFileSync('src/components/auth/auth-form.tsx','utf8');
const shell=fs.readFileSync('src/components/account/storefront-account-shell.tsx','utf8');
const source=fs.readFileSync('src/lib/builder/storefront-runtime-source.ts','utf8');

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

  it('resolves anonymous account pages without requesting customer-only commerce data',()=>{
    expect(source).toMatch(/customerId:string\|null/);
    expect(source).toMatch(/const instance=await getCurrentWebshopInstance\(\);if\(!instance\)return null;/);
    expect(source).not.toMatch(/resolveCurrentStorefrontAccountRuntimePage[\s\S]{0,220}requireStorefrontAccess\(\)/);
    expect(source).toMatch(/request\?getStorefrontDigitalCommerceRuntimeModel/);
  });
});
