import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');
describe('Stage 1 workforce login and MFA UX',()=>{
 const page=read('src/app/api/auth/workforce-login/page.tsx'),form=read('src/lib/auth/workforce-auth-form.tsx'),adminApi=read('src/lib/auth/admin-api.ts'),requireAdmin=read('src/lib/auth/require-admin.ts'),customerAuth=read('src/components/auth/auth-form.tsx'),middleware=read('src/middleware.ts');
 it('uses canonical workforce entry and safe return targets',()=>{expect(page).toContain('normalizeWorkforceReturnTarget(rawNext)');expect(page).toContain('<WorkforceAuthForm returnTo={returnTo}/>');expect(form).toContain("normalizeWorkforceReturnTarget(returnTo)??'/admin'");expect(requireAdmin).toContain('/api/auth/workforce-login?next=')});
 it('keeps workforce password recovery inside the auth-owned credential flow',()=>{expect(form).toContain('resetPasswordForEmail');expect(form).toContain('/api/auth/workforce-credential?flow=recovery&next=');expect(form).toContain('workforceLoginHref(target)');expect(customerAuth).not.toContain('WorkforceCredentialForm')});
 it('preserves canonical role and MFA primitives',()=>{expect(adminApi).toContain('getActiveStoreRoles(instance.id)');expect(adminApi).toContain('hasStoreRoleBindingHistory(instance.id,user.id)');expect(adminApi).not.toContain('user_metadata');expect(form).toContain('getWorkforceMfaClientSnapshot');expect(form).toContain('challengeAndVerifyWorkforceTotp');expect(form).not.toContain('localStorage')});
 it('keeps customer auth and parked server AAL2 enforcement outside this block',()=>{expect(customerAuth).not.toContain('WorkforceAuthForm');expect(requireAdmin).not.toContain('workforceAssuranceSatisfied');expect(middleware).not.toContain('workforceAssuranceSatisfied')});
 it('fails closed when staff context cannot be established',()=>{expect(adminApi).toContain("return{status:'unavailable'}");expect(form).toContain("setPhase('error')");expect(form).toContain('A staff jogosultság most nem ellenőrizhető')});
});
