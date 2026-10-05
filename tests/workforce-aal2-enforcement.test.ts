import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';
import {
  combineWorkforceSensitiveBoundaries,
  parseWorkforceSensitiveBoundary,
  requiredWorkforceTotpFactors,
  sensitiveBoundaryForWorkforcePermission,
  sensitiveBoundaryForWorkforceStoreRoles,
} from '@/lib/auth/workforce-assurance-policy';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('Stage 1 workforce AAL2 authorization enforcement',()=>{
  const requireAdmin=read('src/lib/auth/require-admin.ts');
  const adminApi=read('src/lib/auth/admin-api.ts');
  const assurance=read('src/lib/auth/workforce-assurance.ts');
  const contextRoute=read('src/app/api/auth/workforce-context/route.ts');
  const loginPage=read('src/app/api/auth/workforce-login/page.tsx');
  const middleware=read('src/middleware.ts');
  const customerAuth=read('src/components/auth/auth-form.tsx');
  const refundRoute=read('src/app/api/admin/orders/[id]/refund/route.ts');
  const teamActions=read('src/app/admin/csapat/actions.ts');
  const integrationRoute=read('src/app/api/admin/integrations/[id]/run/route.ts');

  it('keeps the accepted owner and admin factor counts canonical',()=>{
    expect(requiredWorkforceTotpFactors({platformRole:'owner'})).toBe(2);
    expect(requiredWorkforceTotpFactors({platformRole:'admin'})).toBe(1);
    expect(requiredWorkforceTotpFactors({storeRoles:['owner']})).toBe(1);
    expect(requiredWorkforceTotpFactors({storeRoles:['admin']})).toBe(1);
  });

  it('derives refund sensitivity from an order-manager role while preserving low-risk roles',()=>{
    expect(sensitiveBoundaryForWorkforceStoreRoles(['order_manager'])).toBe('refund');
    expect(requiredWorkforceTotpFactors({
      storeRoles:['order_manager'],
      sensitiveBoundary:sensitiveBoundaryForWorkforceStoreRoles(['order_manager']),
    })).toBe(1);
    expect(sensitiveBoundaryForWorkforceStoreRoles(['support'])).toBe('none');
    expect(sensitiveBoundaryForWorkforceStoreRoles(['viewer'])).toBe('none');
    expect(requiredWorkforceTotpFactors({storeRoles:['support']})).toBe(0);
  });

  it('classifies sensitive admin permissions centrally',()=>{
    expect(sensitiveBoundaryForWorkforcePermission('store.manage')).toBe('security');
    expect(sensitiveBoundaryForWorkforcePermission('integrations.manage')).toBe('integration-api');
    expect(sensitiveBoundaryForWorkforcePermission('orders.manage')).toBe('refund');
    expect(sensitiveBoundaryForWorkforcePermission('support.manage')).toBe('none');
    expect(sensitiveBoundaryForWorkforcePermission('catalog.manage')).toBe('none');
  });

  it('combines requested and role-derived boundaries monotonically and rejects unknown boundary names',()=>{
    expect(combineWorkforceSensitiveBoundaries('refund','none')).toBe('refund');
    expect(combineWorkforceSensitiveBoundaries('none','security')).toBe('security');
    expect(parseWorkforceSensitiveBoundary('integration-api')).toBe('integration-api');
    expect(parseWorkforceSensitiveBoundary('none')).toBe('none');
    expect(parseWorkforceSensitiveBoundary('weaken-me')).toBeNull();
  });

  it('enforces assurance in requireAdmin before returning an authorized user',()=>{
    expect(requireAdmin).toContain('requiredWorkforceTotpFactors');
    expect(requireAdmin).toContain('getWorkforceAssuranceSnapshot');
    expect(requireAdmin).toContain('workforceAssuranceSatisfied');
    expect(requireAdmin).toContain("redirect(workforceLoginHref(next,sensitiveBoundary))");
    expect(requireAdmin.indexOf('workforceAssuranceSatisfied')).toBeLessThan(requireAdmin.lastIndexOf('return authData.user'));
  });

  it('enforces the same policy in direct admin API and Server Action authorization',()=>{
    expect(adminApi).toContain('export async function getAdminRequestAccess');
    expect(adminApi).toContain('sensitiveBoundaryForWorkforcePermission(permission)');
    expect(adminApi).toContain('getWorkforceAssuranceSnapshot');
    expect(adminApi).toContain('workforceAssuranceSatisfied(snapshot,requiredFactors)');
    expect(adminApi).toContain("status:'assurance-required'");
    expect(adminApi).toContain("return access.status==='authorized'?access.user:null");
  });

  it('covers existing sensitive call sites through their canonical permission',()=>{
    expect(refundRoute).toContain("getAdminRequestUser('orders.manage')");
    expect(teamActions).toContain("getAdminRequestUser('store.manage')");
    expect(integrationRoute).toContain("getAdminRequestUser('integrations.manage')");
  });

  it('requires owner/admin assurance for platform APIs without globally forcing the operator role',()=>{
    expect(adminApi).toContain('export async function getPlatformRequestUser');
    expect(adminApi).toContain('platformRole:identity.platformRole');
    expect(adminApi).toContain('sensitiveBoundary:requestedBoundary');
    expect(requiredWorkforceTotpFactors({platformRole:'operator'})).toBe(0);
    expect(requiredWorkforceTotpFactors({platformRole:'operator',sensitiveBoundary:'security'})).toBe(1);
  });

  it('keeps server assurance fail-closed when positive evidence cannot be loaded',()=>{
    expect(assurance).toContain('available:false');
    expect(assurance).toContain("snapshot.available&&snapshot.currentLevel==='aal2'");
    expect(assurance).toContain('verifiedTotpFactorIds.length>=requiredFactors');
    expect(adminApi).toContain('if(requiredFactors===0)return true');
    expect(adminApi).toContain('return workforceAssuranceSatisfied(snapshot,requiredFactors)');
  });

  it('reuses the verified MFA UX for canonical step-up context',()=>{
    expect(contextRoute).toContain('parseWorkforceSensitiveBoundary(rawBoundary)');
    expect(contextRoute).toContain('getWorkforceRequestContext(requestedBoundary)');
    expect(contextRoute).toContain('sensitiveBoundary:context.sensitiveBoundary');
    expect(loginPage).toContain('parseWorkforceSensitiveBoundary(rawBoundary)');
    expect(loginPage).toContain('boundary={boundary}');
  });

  it('does not turn middleware, customer auth or browser persistence into MFA authority',()=>{
    expect(middleware).not.toContain('getWorkforceAssuranceSnapshot');
    expect(middleware).not.toContain('workforceAssuranceSatisfied');
    expect(middleware).not.toContain('requiredWorkforceTotpFactors');
    expect(customerAuth).not.toContain('WorkforceAuthForm');
    expect(customerAuth).not.toContain('workforce-assurance');
    const form=read('src/lib/auth/workforce-auth-form.tsx');
    expect(form).not.toContain('localStorage');
    expect(form).not.toContain('sessionStorage');
  });
});
