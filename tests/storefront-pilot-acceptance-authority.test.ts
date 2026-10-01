import {existsSync,readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>readFileSync(path,'utf8');

describe('Pilot acceptance authority direction',()=>{
  const sharedPath='src/lib/builder/storefront-pilot-acceptance-action.ts';
  const oldAdminActionPath=['src/app/admin/platform/acceptance','[instanceId]','actions.ts'].join('/');
  const adminPagePath='src/app/admin/platform/acceptance/[instanceId]/page.tsx';
  const proofPath='src/app/storefront-template-preview/engine-proof/checkout/page.tsx';

  it('cleanly replaces the Admin action module with one shared action authority',()=>{
    expect(existsSync(oldAdminActionPath)).toBe(false);
    const shared=read(sharedPath);
    expect(shared).toContain('export async function startPlatformPilotAcceptanceAction');
    expect(read(adminPagePath)).toContain("from '@/lib/builder/storefront-pilot-acceptance-action'");
    expect(read(proofPath)).toContain("from '@/lib/builder/storefront-pilot-acceptance-action'");
  });

  it('keeps the E13 Builder proof independent from Admin action modules',()=>{
    const proof=read(proofPath);
    expect(proof).toContain('action={startPlatformPilotAcceptanceAction}');
    expect(proof).not.toMatch(/from ['"]@\/app\/admin\//);
  });

  it('preserves the fail-closed authorization and canonical session transition in the moved action',()=>{
    const shared=read(sharedPath);
    for(const required of [
      "'use server'",
      "process.env.VERCEL_ENV!=='preview'",
      'requirePlatformOperator()',
      "from('webshop_instances')",
      ".eq('status','pilot')",
      "from('role_bindings')",
      ".is('revoked_at',null)",
      ".lte('valid_from',now)",
      "binding.role_code==='owner'||binding.role_code==='admin'",
      'createPilotAcceptanceToken(instanceId)',
      'PILOT_ACCEPTANCE_COOKIE',
      'PILOT_ACCEPTANCE_MAX_AGE_SECONDS',
      "if(flow==='checkout')",
      "if(flow==='b2b-rfq')",
      "redirect('/admin/tartalom/builder?page=home&acceptance=platform')",
    ])expect(shared,required).toContain(required);
    expect((shared.match(/createPilotAcceptanceToken\(/g)??[])).toHaveLength(1);
  });

  it('retains the exact source body identity required for a Git-detectable clean move',()=>{
    const shared=read(sharedPath);
    expect(shared).not.toContain('startStorefrontPilotAcceptanceAction');
    expect(shared).not.toContain('compatibility delegate');
  });
});
