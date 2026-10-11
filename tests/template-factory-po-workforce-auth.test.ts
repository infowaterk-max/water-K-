import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {normalizeWorkforceReturnTarget,workforceLoginHref} from '@/lib/auth/workforce-return-target';
const read=(path:string)=>readFileSync(path,'utf8');
describe('F34 Product Owner workforce journey is real and template-bound',()=>{
  it('preserves the exact versioned Factory candidate in canonical workforce next URL',()=>{
    const target='/storefront-template-preview?template=gaming.loot-vault&version=2&page=home&viewport=desktop&factory=1';
    expect(normalizeWorkforceReturnTarget(target)).toBe(target);
    const url=new URL(workforceLoginHref(target),'https://shoporation.example');
    expect(url.pathname).toBe('/api/auth/workforce-login');
    expect(url.searchParams.get('next')).toBe(target);
  });
  it('uses the one canonical Workforce form and never a preview-only password form',()=>{
    const runner=read('scripts/template-factory-product-owner-handoff.mjs');
    const login=read('src/app/storefront-template-preview-login/page.tsx');
    expect(login).toContain('workforceLoginHref(target)');
    expect(runner).toContain("url.pathname==='/api/auth/workforce-login'");
    expect(runner).toContain('WORKFORCE_PREVIEW_RETURN_TARGET_MISMATCH');
    expect(runner).toContain('candidatePageIdentity(new URL(next,current.origin).toString()');
    expect(runner).toContain("page.locator('[data-workforce-auth=\"true\"]:visible')");
    expect(runner).toContain('authenticatedWorkforceReturn');
    expect(runner).toContain("page.locator('[data-storefront-account-shell=\"preview\"]')");
    expect(runner).toContain('PARALLEL_TEMPLATE_ACCOUNT_AUTH_SHELL_PRESENT');
    expect(runner).toContain('PREVIEW_VERSIONED_GLOBAL_STYLE_IDENTITY_MISSING');
    expect(runner).toContain('data-storefront-global-styles-v1');
    expect(runner).toContain('data-storefront-template-version');
    expect(runner).toContain("new Error('WORKFORCE_AUTH_OR_MFA_RETURN_NOT_PROVEN:");
    expect(runner).toContain("getByRole('button',{name:'Tovább a biztonsági ellenőrzéshez',exact:true})");
    expect(runner).not.toContain("page.locator('[data-storefront-auth-surface=\"true\"]')");
    expect(runner).not.toContain("waitForURL(url=>url.pathname==='/storefront-template-preview-login'");
  });
  it('keeps all incumbent source, storefront, account and checkout proof checks',()=>{
    const runner=read('scripts/template-factory-product-owner-handoff.mjs');
    for(const preserved of ['PREVIEW_SOURCE_COMMIT_MISMATCH','CANDIDATE_ROUTE_SOURCE_COMMIT_MISMATCH','MULTI_ENTRY_ROUTE_CONVERGENCE_NOT_PROVEN','CANONICAL_ACCOUNT_SURFACES_NOT_PROVEN','SHARED_ENGINE_DEMO_INTEGRATION_NOT_PROVEN','FACTORY_PLACEHOLDER_CONTENT_VISIBLE','ENGINE_FUNCTIONAL_PROOF_E13_NOT_PROVEN']){
      expect(runner).toContain(preserved);
    }
    expect(runner).toContain('accepted:false');
  });
});
