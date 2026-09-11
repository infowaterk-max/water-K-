import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {
  BLOCK24_COMMERCIAL_POLICY_VERSION,
  STOREFRONT_AI_COMMERCIAL_CAPABILITY,
  STOREFRONT_AI_CREDIT_WINDOW_SECONDS,
  resolveStorefrontAiCommercialDecision,
} from '@/lib/commercial/block24-policy';

const read=(path:string)=>readFileSync(path,'utf8');

describe('Roadmap Block 24 Commercial / Security / Maturity Gate',()=>{
  it('keeps AI as a separately entitled paid add-on and fails closed without configured credits',()=>{
    expect(STOREFRONT_AI_COMMERCIAL_CAPABILITY).toBe('addon:ai-assistant');
    expect(BLOCK24_COMMERCIAL_POLICY_VERSION).toBe('block24-v1');
    expect(resolveStorefrontAiCommercialDecision({entitled:false,configuredCredits:'100'})).toEqual({ok:false,reason:'addon-required'});
    expect(resolveStorefrontAiCommercialDecision({entitled:true,configuredCredits:undefined})).toEqual({ok:false,reason:'credit-policy-not-configured'});
    expect(resolveStorefrontAiCommercialDecision({entitled:true,configuredCredits:'0'})).toEqual({ok:false,reason:'credit-policy-not-configured'});
    expect(resolveStorefrontAiCommercialDecision({entitled:true,configuredCredits:'abc'})).toEqual({ok:false,reason:'credit-policy-not-configured'});
    expect(resolveStorefrontAiCommercialDecision({entitled:true,configuredCredits:'40'})).toEqual({
      ok:true,creditLimit:40,windowSeconds:STOREFRONT_AI_CREDIT_WINDOW_SECONDS,creditCost:1,policyVersion:'block24-v1',
    });
  });

  it('enforces entitlement and tenant-scoped commercial metering on the server before calling the model',()=>{
    const source=read('src/lib/builder/storefront-ai-generator-server.ts');
    for(const marker of[
      'getFeatureEntitlementDecision(scope.instanceId,STOREFRONT_AI_COMMERCIAL_CAPABILITY)',
      'process.env[STOREFRONT_AI_CREDIT_LIMIT_ENV]',
      'STOREFRONT_AI_ADDON_REQUIRED',
      'STOREFRONT_AI_COMMERCIAL_POLICY_NOT_CONFIGURED',
      'commercial:storefront-ai-generator:${BLOCK24_COMMERCIAL_POLICY_VERSION}:${scope.instanceId}',
      'STOREFRONT_AI_CREDITS_EXHAUSTED',
    ])expect(source).toContain(marker);
    expect(source.indexOf('getFeatureEntitlementDecision')).toBeLessThan(source.indexOf("fetch('https://ai-gateway.vercel.sh"));
    expect(source).not.toContain('input.instanceId');
    expect(source).not.toContain('rawInput.entitlement');
  });

  it('locks trigger-only storefront SECURITY DEFINER helpers away from direct API execution',()=>{
    const prod=read('supabase/migrations/20260911103500_block24_storefront_trigger_privilege_lockdown.sql');
    const customer=read('supabase/customer-baseline/migrations/0018_block24_storefront_trigger_privilege_lockdown.sql');
    expect(customer).toBe(prod);
    for(const fn of['storefront_revisions_immutable','storefront_events_immutable','storefront_preview_session_guard']){
      expect(prod).toContain(`revoke all on function public.${fn}() from public,anon,authenticated,service_role;`);
    }
  });

  it('reopens Fresh Install proof only because Block 24 changes the sellable schema security contract',()=>{
    const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json')) as {status:string;freshInstallProofRequired:boolean;proofContractSha256:string|null;notes:string};
    expect(manifest.status).toBe('snapshot-reviewed');
    expect(manifest.freshInstallProofRequired).toBe(true);
    expect(manifest.proofContractSha256).toBeNull();
    expect(manifest.notes).toContain('0001-0018');
  });

  it('documents maturity as certification over existing authorities rather than a parallel release system',()=>{
    const doc=read('docs/ROADMAP_BLOCK24_COMMERCIAL_SECURITY_MATURITY_GATE.md');
    expect(doc).toContain('existing V24 rollout evidence and GO/NO-GO authority');
    expect(doc).toContain('must not create another release-governance authority');
    expect(doc).toContain('leaked-password protection is a launch-blocking gate');
    expect(doc).toContain('does not:\n\n- create a third package tier');
    expect(read('src/components/auth/auth-form.tsx')).toContain('supabase.auth.signUp');
  });
});
