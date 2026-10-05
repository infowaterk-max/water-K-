import{describe,expect,it}from'vitest';
import{requiredWorkforceTotpFactors,resolveWorkforceMfaStep}from'@/lib/auth/workforce-assurance-policy';
import{readFileSync}from'node:fs';
import{resolve}from'node:path';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('workforce identity AAL2 primitives',()=>{
  it('requires two verified TOTP factors for the platform owner',()=>{
    expect(requiredWorkforceTotpFactors({platformRole:'owner'})).toBe(2);
  });

  it('requires AAL2 for platform admin and merchant owner/admin',()=>{
    expect(requiredWorkforceTotpFactors({platformRole:'admin'})).toBe(1);
    expect(requiredWorkforceTotpFactors({storeRoles:['owner']})).toBe(1);
    expect(requiredWorkforceTotpFactors({storeRoles:['admin']})).toBe(1);
  });

  it('does not globally force MFA on low-risk workforce roles',()=>{
    expect(requiredWorkforceTotpFactors({platformRole:'operator'})).toBe(0);
    expect(requiredWorkforceTotpFactors({storeRoles:['viewer']})).toBe(0);
    expect(requiredWorkforceTotpFactors({storeRoles:['support']})).toBe(0);
  });

  it('raises low-risk staff to AAL2 at an explicitly sensitive boundary',()=>{
    expect(requiredWorkforceTotpFactors({storeRoles:['support'],sensitiveBoundary:'security'})).toBe(1);
    expect(requiredWorkforceTotpFactors({platformRole:'operator',sensitiveBoundary:'integration-api'})).toBe(1);
  });

  it('models enroll, challenge and ready without weakening the factor-count rule',()=>{
    expect(resolveWorkforceMfaStep({requiredFactors:1,verifiedFactorCount:0,currentLevel:'aal1'})).toBe('enroll');
    expect(resolveWorkforceMfaStep({requiredFactors:1,verifiedFactorCount:1,currentLevel:'aal1'})).toBe('challenge');
    expect(resolveWorkforceMfaStep({requiredFactors:1,verifiedFactorCount:1,currentLevel:'aal2'})).toBe('ready');
    expect(resolveWorkforceMfaStep({requiredFactors:2,verifiedFactorCount:1,currentLevel:'aal2'})).toBe('enroll');
    expect(resolveWorkforceMfaStep({requiredFactors:2,verifiedFactorCount:2,currentLevel:'aal1'})).toBe('challenge');
    expect(resolveWorkforceMfaStep({requiredFactors:2,verifiedFactorCount:2,currentLevel:'aal2'})).toBe('ready');
  });

  it('fails server assurance closed when MFA evidence cannot be loaded',()=>{
    const source=read('src/lib/auth/workforce-assurance.ts');
    expect(source).toContain('available:false');
    expect(source).toContain("currentLevel==='aal2'");
    expect(source).toContain('verifiedTotpFactorIds.length>=requiredFactors');
  });

  it('uses Supabase TOTP enrollment and challenge verification instead of a second OTP authority',()=>{
    const source=read('src/lib/auth/workforce-mfa-client.ts');
    expect(source).toContain("mfa.enroll({factorType:'totp'");
    expect(source).toContain('mfa.challengeAndVerify({factorId,code})');
    expect(source).toContain('mfa.listFactors()');
    expect(source).not.toContain('localStorage');
    expect(source).not.toContain('sessionStorage');
  });
});
