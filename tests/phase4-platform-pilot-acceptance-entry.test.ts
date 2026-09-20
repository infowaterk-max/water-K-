import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('Phase 4 platform pilot acceptance entry',()=>{
  const page=read('src/app/admin/platform/acceptance/[instanceId]/page.tsx');
  const action=read('src/app/admin/platform/acceptance/[instanceId]/actions.ts');
  const builder=read('src/app/admin/tartalom/builder/page.tsx');
  const b2bDirect=read('src/app/admin/platform/acceptance/[instanceId]/b2b-rfq/route.ts');

  it('is preview-only and requires an authenticated platform operator',()=>{
    expect(page).toContain("process.env.VERCEL_ENV!=='preview'");
    expect(page).toContain('requirePlatformOperator()');
    expect(action).toContain("process.env.VERCEL_ENV!=='preview'");
    expect(action).toContain('requirePlatformOperator()');
  });

  it('fails closed to a concrete pilot tenant with an active owner/admin binding',()=>{
    expect(action).toContain(".eq('status','pilot')");
    expect(action).toContain(".from('role_bindings')");
    expect(action).toContain(".eq('user_id',actor.id)");
    expect(action).toContain(".is('revoked_at',null)");
    expect(action).toContain(".lte('valid_from',now)");
    expect(action).toContain("binding.role_code==='owner'||binding.role_code==='admin'");
    expect(action).toContain('binding.valid_until>now');
  });

  it('reuses the signed short-lived acceptance token and secure cookie contract',()=>{
    expect(action).toContain('createPilotAcceptanceToken(instanceId)');
    expect(action).toContain('PILOT_ACCEPTANCE_COOKIE');
    expect(action).toContain('PILOT_ACCEPTANCE_MAX_AGE_SECONDS');
    expect(action).toContain('httpOnly:true');
    expect(action).toContain("sameSite:'lax'");
    expect(action).toContain("path:'/'");
  });

  it('enters the Playroom home Builder without mutating tenant data',()=>{
    expect(action).toContain("redirect('/admin/tartalom/builder?page=home&acceptance=platform')");
    expect(action).not.toContain('page=playroom.home');
    for(const forbidden of['.insert(','.update(','.delete(','.upsert('])expect(action).not.toContain(forbidden);
    expect(page).toContain('Playroom Builder megnyitása');
  });

  it('provides a stable direct B2B acceptance entry that refreshes the pilot cookie and lands on the RFQ account page',()=>{
    expect(b2bDirect).toContain("process.env.VERCEL_ENV!=='preview'");
    expect(b2bDirect).toContain("getAdminRequestUser('store.read')");
    expect(b2bDirect).toContain('createPilotAcceptanceToken(instanceId)');
    expect(b2bDirect).toContain('PILOT_ACCEPTANCE_COOKIE');
    expect(b2bDirect).toContain("new URL('/fiokom/ajanlatkeresek',request.url)");
    expect(b2bDirect).toContain("sameSite:'lax'");
  });

  it('bypasses only the Builder route-level Pro gate during an exact preview pilot acceptance session',()=>{
    expect(builder).toContain("process.env.VERCEL_ENV==='preview'");
    expect(builder).toContain('getPilotAcceptanceInstanceId()');
    expect(builder).toContain('getPlatformRole()');
    expect(builder).toContain('acceptanceInstanceId===context.instanceId');
    expect(builder).toContain("requireCurrentStoreContext('store.manage')");
    expect(builder).toContain("requirePlanFeature('contentMarketing')");
    expect(builder).toContain('if(!isPlatformPilotAcceptance)await requirePlanFeature');
  });
});
