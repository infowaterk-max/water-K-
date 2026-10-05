import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('Stage 1 workforce login and MFA UX',()=>{
  const page=read('src/app/api/auth/workforce-login/page.tsx');
  const form=read('src/lib/auth/workforce-auth-form.tsx');
  const contextRoute=read('src/app/api/auth/workforce-context/route.ts');
  const adminApi=read('src/lib/auth/admin-api.ts');
  const requireAdmin=read('src/lib/auth/require-admin.ts');
  const customerAuth=read('src/components/auth/auth-form.tsx');
  const middleware=read('src/middleware.ts');

  it('provides a dedicated auth-owned workforce entry point with a safe admin-only return target',()=>{
    expect(page).toContain('Staff és admin belépés');
    expect(page).toContain('normalizeStorefrontReturnTarget(rawNext)');
    expect(page).toContain('normalizeWorkforceReturnTarget(normalized)');
    expect(page).toContain('<WorkforceAuthForm returnTo={returnTo}/>');
    expect(requireAdmin).toContain('/api/auth/workforce-login?next=');
    expect(form).toContain('/api/auth/workforce-credential?flow=recovery&next=');
    expect(form).toContain('workforceLoginHref(target)');
  });

  it('derives workforce requirements through the canonical identity-to-tenancy boundary',()=>{
    expect(contextRoute).toContain('getWorkforceRequestContext');
    expect(contextRoute).not.toContain("from '@/lib/instances/access'");
    expect(contextRoute).not.toContain("from '@/lib/auth/store-rbac'");
    expect(adminApi).toContain('export async function getWorkforceRequestContext');
    expect(adminApi).toContain('getCurrentWebshopInstance()');
    expect(adminApi).toContain('getActiveStoreRoles(instance.id)');
    expect(adminApi).toContain('hasStoreRoleBindingHistory(instance.id,user.id)');
    expect(contextRoute).toContain('requiredWorkforceTotpFactors({platformRole:context.platformRole,storeRoles})');
    expect(adminApi).not.toContain('user_metadata');
  });

  it('composes the existing Supabase MFA primitives instead of implementing a second authority',()=>{
    expect(form).toContain('getWorkforceMfaClientSnapshot');
    expect(form).toContain('nextWorkforceMfaStep');
    expect(form).toContain('enrollWorkforceTotp');
    expect(form).toContain('challengeAndVerifyWorkforceTotp');
    expect(form).toContain('unenrollWorkforceTotp');
    expect(form).not.toContain('auth.mfa.enroll');
    expect(form).not.toContain('localStorage');
    expect(form).not.toContain('sessionStorage');
  });

  it('guides a platform owner through the missing second verified TOTP factor',()=>{
    expect(form).toContain('activeContext.requiredFactors===2&&verifiedCount===1');
    expect(form).toContain('még egy második TOTP faktort is fel kell venned');
    expect(form).toContain("if(step==='challenge')");
    expect(form).toContain("if(step==='ready')");
  });

  it('shows QR plus manual secret fallback and cleans interrupted unverified enrollment',()=>{
    expect(form).toContain('src={enrollment.qrCode}');
    expect(form).toContain('{enrollment.secret}');
    expect(form).toContain("current.factors.filter(factor=>factor.status!=='verified')");
    expect(form).toContain('await unenrollWorkforceTotp(enrollment.factorId)');
    expect(form).toContain('Enrollment megszakítása');
  });

  it('keeps customer auth and global admin AAL2 enforcement outside this block',()=>{
    expect(customerAuth).not.toContain('WorkforceAuthForm');
    expect(customerAuth).not.toContain('workforce-mfa-client');
    expect(requireAdmin).not.toContain('getAuthenticatorAssuranceLevel');
    expect(requireAdmin).not.toContain('workforceAssuranceSatisfied');
    expect(middleware).not.toContain('getAuthenticatorAssuranceLevel');
    expect(middleware).not.toContain('workforceAssuranceSatisfied');
    expect(middleware).toContain("if(authError||!user)return accountRedirect(request,'login',pendingCookies)");
  });

  it('contains narrow-screen interaction rules and touch-sized controls',()=>{
    expect(form).toContain('@media(max-width:720px)');
    expect(form).toContain('grid-template-columns:1fr');
    expect(form).toContain('min-height:48px');
    expect(form).toContain('autoComplete="one-time-code"');
  });

  it('fails closed when staff context or MFA state cannot be established',()=>{
    expect(adminApi).toContain("return{status:'unavailable'}");
    expect(contextRoute).toContain("if(context.status!=='authorized')return NextResponse.json({error:'WORKFORCE_CONTEXT_UNAVAILABLE'},{status:503})");
    expect(form).toContain("setPhase('error')");
    expect(form).toContain('A staff jogosultság most nem ellenőrizhető');
    expect(form).toContain("if(!response.ok)throw new Error(payload.error??'WORKFORCE_CONTEXT_UNAVAILABLE')");
  });
});
