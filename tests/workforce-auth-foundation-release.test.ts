import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {normalizeWorkforceReturnTarget,workforceLoginHref} from '@/lib/auth/workforce-return-target';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('Stage 1 workforce auth authority foundation',()=>{
  it('fails closed to the canonical local workforce continuation set',()=>{
    expect(normalizeWorkforceReturnTarget('/admin')).toBe('/admin');
    expect(normalizeWorkforceReturnTarget('/admin/platform?tenant=x')).toBe('/admin/platform?tenant=x');
    expect(normalizeWorkforceReturnTarget('/storefront-template-preview?template=loot-vault')).toBe('/storefront-template-preview?template=loot-vault');
    for(const target of['/fiokom','/storefront-template-preview-login?next=/admin','//evil.example','https://evil.example']){
      expect(normalizeWorkforceReturnTarget(target)).toBeNull();
    }
    expect(workforceLoginHref('//evil.example')).toBe('/api/auth/workforce-login?next=%2Fadmin');
  });

  it('keeps recovery and credential completion owned by workforce auth',()=>{
    const form=read('src/lib/auth/workforce-auth-form.tsx');
    const credential=read('src/lib/auth/workforce-credential-form.tsx');
    const credentialPage=read('src/app/api/auth/workforce-credential/page.tsx');
    expect(form).toContain('resetPasswordForEmail');
    expect(form).toContain('/api/auth/workforce-credential?flow=recovery&next=');
    expect(credentialPage).toContain("flow!=='invite'&&flow!=='recovery'");
    expect(credential).toContain('hasLinkEvidence');
    expect(credential).toContain("hashType===flow");
    expect(credential).toContain("search.get('code')");
    expect(credential).toContain('supabase.auth.updateUser({password})');
    expect(credential).toContain('window.location.replace(workforceLoginHref(target))');
  });

  it('does not let a pre-existing session alone authorize credential mutation',()=>{
    const credential=read('src/lib/auth/workforce-credential-form.tsx');
    const evidence=credential.indexOf('if(!hasLinkEvidence)');
    const session=credential.indexOf('supabase.auth.getSession()');
    expect(evidence).toBeGreaterThan(-1);
    expect(session).toBeGreaterThan(evidence);
  });

  it('keeps first-owner activation auth-owned without alternate existing-user password login',()=>{
    const activation=read('src/lib/auth/platform-activation-form.tsx');
    expect(activation).toContain("fetch('/api/platform/activation'");
    expect(activation).toContain('supabase.auth.signUp');
    expect(activation).not.toContain('signInWithPassword');
    expect(activation).toContain('workforceLoginHref(PLATFORM_TARGET)');
  });

  it('does not activate parked server-side AAL2 authorization enforcement',()=>{
    expect(read('src/lib/auth/require-admin.ts')).not.toContain('workforceAssuranceSatisfied');
    expect(read('src/middleware.ts')).not.toContain('workforceAssuranceSatisfied');
  });
});
