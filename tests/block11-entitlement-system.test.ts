import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { addonCapabilityCode, capabilityReleaseState, isCapabilityReleased } from '../src/lib/entitlements/catalog';
import { ENTITLEMENT_SOURCE_PRIORITY, resolveEntitlementCandidate, type EntitlementCandidate } from '../src/lib/entitlements/policy';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');
const migration=read('supabase/migrations/20260910124500_block11_entitlement_contract_v1.sql');
const planAccess=read('src/lib/plans/access.ts');
const entitlementAccess=read('src/lib/entitlements/access.ts');
const layout=read('src/app/admin/layout.tsx');

const now=new Date('2026-09-10T12:00:00.000Z');
const row=(source:string,enabled:boolean,instance_id:string|null='store-1',updated='2026-09-10T11:00:00.000Z',valid_until:string|null=null):EntitlementCandidate=>({
  id:`${source}-${enabled}-${instance_id}-${updated}`,
  source,enabled,instance_id,updated_at:updated,
  valid_from:'2026-09-01T00:00:00.000Z',valid_until,
});

describe('Roadmap Block 11 effective entitlement contract',()=>{
  it('uses the accepted deterministic source precedence',()=>{
    expect(ENTITLEMENT_SOURCE_PRIORITY).toEqual({platform:500,manual:400,trial:300,addon:200,plan:100});
    const winner=resolveEntitlementCandidate([
      row('plan',true),row('addon',true),row('trial',true),row('manual',true),row('platform',false),
    ],'store-1',now);
    expect(winner?.source).toBe('platform');
    expect(winner?.enabled).toBe(false);
  });

  it('prefers instance scope only inside the same source and lets expiry reveal the lower grant',()=>{
    const orgManual=row('manual',true,null,'2026-09-10T10:00:00.000Z');
    const instanceManual=row('manual',false,'store-1','2026-09-10T09:00:00.000Z');
    expect(resolveEntitlementCandidate([orgManual,instanceManual,row('plan',true)],'store-1',now)?.enabled).toBe(false);
    const expiredPlatform=row('platform',false,'store-1','2026-09-10T11:00:00.000Z','2026-09-10T11:30:00.000Z');
    expect(resolveEntitlementCandidate([expiredPlatform,row('plan',true)],'store-1',now)?.source).toBe('plan');
  });

  it('keeps reserved and unknown capabilities absolute fail-closed',()=>{
    expect(capabilityReleaseState('teamChatSecureAttachments')).toBe('reserved');
    expect(capabilityReleaseState('apiAccess')).toBe('reserved');
    expect(isCapabilityReleased('teamChatSecureAttachments')).toBe(false);
    expect(isCapabilityReleased('apiAccess')).toBe(false);
    expect(capabilityReleaseState('futureSecretFeature')).toBe('unknown');
    expect(isCapabilityReleased('futureSecretFeature')).toBe(false);
    expect(entitlementAccess).not.toContain('getPlatformRole');
  });

  it('models current add-ons as separate namespaced entitlements instead of Pro inheritance',()=>{
    expect(addonCapabilityCode('ai-assistant')).toBe('addon:ai-assistant');
    expect(addonCapabilityCode('advanced-export')).toBe('addon:advanced-export');
    expect(isCapabilityReleased(addonCapabilityCode('priority-support'))).toBe(true);
    expect(planAccess).toContain('getFeatureEntitlementDecisions(instance.id,capabilityCodes)');
    expect(planAccess).toContain('ADDONS[addon].compatiblePlans.includes(plan)');
  });

  it('makes plan and add-on grants data-driven and preserves configuration on downgrade',()=>{
    for(const marker of[
      'public.entitlement_capabilities','public.subscription_plan_catalog','public.plan_capability_grants',
      'public.addon_entitlement_catalog','public.addon_plan_compatibility','public.addon_capability_grants',
      'public.entitlement_source_precedence',
    ])expect(migration).toContain(marker);
    expect(migration).toContain("where instance_id=p_instance_id and source='plan'");
    expect(migration).toContain("where instance_id=p_instance_id and source='addon'");
    expect(migration).not.toContain('delete from public.webshop_instance_addons');
    expect(migration).toContain('join public.addon_plan_compatibility');
    expect(migration).toContain('perform private.sync_webshop_addon_entitlements(new.id)');
  });

  it('keeps reserved capabilities outside plan, trial, add-on and platform override grants',()=>{
    const planGrantSection=migration.slice(migration.indexOf('insert into public.plan_capability_grants'),migration.indexOf('insert into public.addon_entitlement_catalog'));
    expect(planGrantSection).not.toContain("('pro','teamChatSecureAttachments')");
    expect(planGrantSection).not.toContain("('pro','apiAccess')");
    expect(migration).toContain("if v_release_state<>'released' then raise exception 'FEATURE_OVERRIDE_CAPABILITY_NOT_RELEASED'");
    expect(migration).toContain("if v_release_state<>'released' then\n    return query select false,'reserved'::text,'not-released'::text");
  });

  it('enforces tenant-safe, least-privilege resolution and service-only override mutation',()=>{
    expect(migration).toContain('e.organization_id=v_organization_id');
    expect(migration).toContain('(e.instance_id is null or e.instance_id=p_instance_id)');
    expect(migration).toContain("coalesce(auth.jwt()->>'role','')<>'service_role'");
    expect(migration).toContain('private.has_store_role_current');
    expect(migration).toContain('revoke all on function public.service_set_feature_override_v1');
    expect(migration).toContain('grant execute on function public.service_set_feature_override_v1');
    expect(migration).toContain('to service_role;');
    expect(migration).toContain("'platform.feature_entitlement_override_set'");
  });

  it('uses effective entitlements for admin discovery instead of treating operators as implicit Pro',()=>{
    expect(layout).toContain('getFeatureEntitlementDecisions(instance.id,featureCodes)');
    expect(layout).toContain('resolveEntitledMerchantNavigation(hasFeature,can,instance?.status,canCapability)');
    expect(layout).not.toContain("platformRole||trialPro?'pro':plan");
    expect(planAccess).not.toContain('platformHasFullAccess');
  });

  it('does not alter launch-protected systems in the Block 11 migration',()=>{
    const lower=migration.toLowerCase();
    for(const forbidden of['water-k','khpos','vpos','team_chat_secure_attachments_released','dns/mx','resend receiving','storage.objects']){
      expect(lower).not.toContain(forbidden);
    }
  });
});
