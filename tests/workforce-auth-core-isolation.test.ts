import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {normalizeWorkforceReturnTarget,workforceLoginHref} from '@/lib/auth/workforce-return-target';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('Stage 1 workforce Auth Core isolation',()=>{
  it('allowlists only canonical workforce return targets',()=>{
    expect(normalizeWorkforceReturnTarget('/admin')).toBe('/admin');
    expect(normalizeWorkforceReturnTarget('/admin/rendelesek?status=open')).toBe('/admin/rendelesek?status=open');
    expect(normalizeWorkforceReturnTarget('/storefront-template-preview?template=sport-hub&page=home')).toBe('/storefront-template-preview?template=sport-hub&page=home');
    for(const value of['/fiokom','/storefront-template-preview-login?next=/admin','/storefront-template-preview/extra','//evil.example','https://evil.example']){
      expect(normalizeWorkforceReturnTarget(value)).toBeNull();
    }
    expect(workforceLoginHref('//evil.example')).toBe('/api/auth/workforce-login?next=%2Fadmin');
  });

  it('keeps workforce recovery inside auth-owned credential completion',()=>{
    const form=read('src/lib/auth/workforce-auth-form.tsx');
    expect(form).toContain('resetPasswordForEmail');
    expect(form).toContain('/api/auth/workforce-credential?flow=recovery&next=');
    expect(form).toContain('workforceLoginHref(target)');
    expect(form).toContain('Elfelejtett jelszó');
  });

  it('requires callback evidence before workforce credential changes',()=>{
    const form=read('src/lib/auth/workforce-credential-form.tsx');
    expect(form).toContain('hasLinkEvidence');
    expect(form).toContain('hashType===flow');
    expect(form).toContain("search.get('code')");
    expect(form).toContain("search.get('token_hash')");
    expect(form).toContain("setStatus('invalid')");
    expect(form).toContain('supabase.auth.updateUser({password})');
    expect(form).toContain('window.location.replace(workforceLoginHref(target))');
    expect(form).not.toContain("from '@/components/auth/auth-form'");
  });

  it('keeps owner activation gated and delegates authenticated continuation to workforce login',()=>{
    const activation=read('src/lib/auth/platform-activation-form.tsx');
    expect(activation).toContain("fetch('/api/platform/activation'");
    expect(activation).toContain("eligibility.data?.eligible!==true");
    expect(activation).toContain('supabase.auth.signUp');
    expect(activation).not.toContain('signInWithPassword');
    expect(activation).toContain('window.location.replace(workforceLoginHref(PLATFORM_TARGET))');
  });

  it('keeps parked AAL2 server enforcement outside this auth-core release',()=>{
    const requireAdmin=read('src/lib/auth/require-admin.ts');
    const middleware=read('src/middleware.ts');
    expect(requireAdmin).not.toContain('workforceAssuranceSatisfied');
    expect(middleware).not.toContain('workforceAssuranceSatisfied');
  });
});
