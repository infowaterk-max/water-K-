import{readFileSync}from'node:fs';
import{resolve}from'node:path';
import{describe,expect,it}from'vitest';
import{requiredWorkforceTotpFactors,resolveWorkforceMfaActivationMode,resolveWorkforceMfaRequirement}from'@/lib/auth/workforce-assurance-policy';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('Stage 1 workforce MFA activation control',()=>{
  it('keeps the Market Ready target policy separate from current activation timing',()=>{
    expect(requiredWorkforceTotpFactors({platformRole:'owner'})).toBe(2);
    expect(requiredWorkforceTotpFactors({platformRole:'admin'})).toBe(1);
    expect(resolveWorkforceMfaActivationMode(undefined)).toBe('prepared');
    expect(resolveWorkforceMfaActivationMode('')).toBe('prepared');
    expect(resolveWorkforceMfaActivationMode(' enforced ')).toBe('enforced');
    expect(resolveWorkforceMfaActivationMode('ENFORCED')).toBe('prepared');
  });

  it('parks interactive TOTP by default without erasing the target requirement',()=>{
    const owner=resolveWorkforceMfaRequirement({platformRole:'owner'},undefined);
    expect(owner).toEqual({mfaMode:'prepared',policyRequiredFactors:2,requiredFactors:0});
    const admin=resolveWorkforceMfaRequirement({platformRole:'admin'},'prepared');
    expect(admin).toEqual({mfaMode:'prepared',policyRequiredFactors:1,requiredFactors:0});
  });

  it('makes final activation explicit and deterministic',()=>{
    expect(resolveWorkforceMfaRequirement({platformRole:'owner'},'enforced')).toEqual({
      mfaMode:'enforced',
      policyRequiredFactors:2,
      requiredFactors:2,
    });
    expect(resolveWorkforceMfaRequirement({storeRoles:['admin']},'enforced')).toEqual({
      mfaMode:'enforced',
      policyRequiredFactors:1,
      requiredFactors:1,
    });
  });

  it('keeps activation server-owned and observable through workforce context',()=>{
    const route=read('src/app/api/auth/workforce-context/route.ts');
    expect(route).toContain('process.env.WORKFORCE_MFA_MODE');
    expect(route).toContain('resolveWorkforceMfaRequirement(');
    expect(route).toContain('policyRequiredFactors:assurance.policyRequiredFactors');
    expect(route).toContain('requiredFactors:assurance.requiredFactors');
    expect(route).toContain('mfaMode:assurance.mfaMode');
    expect(route).not.toContain('NEXT_PUBLIC_WORKFORCE_MFA');
  });

  it('does not activate parked server-side AAL2 authorization enforcement',()=>{
    const requireAdmin=read('src/lib/auth/require-admin.ts');
    const middleware=read('src/middleware.ts');
    expect(requireAdmin).not.toContain('workforceAssuranceSatisfied');
    expect(requireAdmin).not.toContain('getAuthenticatorAssuranceLevel');
    expect(middleware).not.toContain('workforceAssuranceSatisfied');
    expect(middleware).not.toContain('getAuthenticatorAssuranceLevel');
  });
});
