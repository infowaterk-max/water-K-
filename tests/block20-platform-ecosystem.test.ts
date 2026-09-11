import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {boundedExtensionEvidence,normalizeExtensionScopes,normalizeWebhookEndpoint,parseExtensionApiToken,webhookRetryDelayMinutes} from '../src/lib/platform/ecosystem-contract';
import {capabilityReleaseState,isCapabilityReleased} from '../src/lib/entitlements/catalog';
import {hasPlanFeature,PLANNED_PRO_FEATURES} from '../src/lib/plans/catalog';

const root=process.cwd(),read=(path:string)=>readFileSync(join(root,path),'utf8');
const migration=read('supabase/migrations/20260911074000_block20_platform_ecosystem.sql');
const baseline=read('supabase/customer-baseline/migrations/0017_block20_platform_ecosystem.sql');
const runtime=read('src/lib/platform/ecosystem.ts');
const adminRoute=read('src/app/api/admin/platform-ecosystem/route.ts');
const catalogRoute=read('src/app/api/platform/v1/catalog/products/route.ts');
const eventRoute=read('src/app/api/platform/v1/events/route.ts');
const cron=read('src/app/api/cron/integrations/route.ts');
const manifest=read('supabase/customer-baseline/manifest.json');
const doc=read('docs/ROADMAP_BLOCK20_PLATFORM_ECOSYSTEM_ENTERPRISE_EXTENSIBILITY.md');

describe('Roadmap Block 20 – Platform Ecosystem & Enterprise Extensibility',()=>{
  it('restores canonical Block 11 authority byte-identically before Block 20 on Fresh Install',()=>{
    expect(read('supabase/customer-baseline/migrations/0014_block11_entitlement_contract_v1.sql')).toBe(read('supabase/migrations/20260910124500_block11_entitlement_contract_v1.sql'));
    expect(read('supabase/customer-baseline/migrations/0015_block11_entitlement_uniqueness_fix_v1.sql')).toBe(read('supabase/migrations/20260910124600_block11_entitlement_uniqueness_fix_v1.sql'));
    expect(read('supabase/customer-baseline/migrations/0016_block11_addon_mutation_authority_v1.sql')).toBe(read('supabase/migrations/20260910124700_block11_addon_mutation_authority_v1.sql'));
    expect(baseline).toContain('update public.entitlement_capabilities');
  });

  it('explicitly releases apiAccess only for Pro through the existing entitlement authority',()=>{
    expect(capabilityReleaseState('apiAccess')).toBe('released');
    expect(isCapabilityReleased('apiAccess')).toBe(true);
    expect(hasPlanFeature('alap','apiAccess')).toBe(false);
    expect(hasPlanFeature('pro','apiAccess')).toBe(true);
    expect(PLANNED_PRO_FEATURES).not.toContain('apiAccess');
    expect(migration).toContain("where capability_code='apiAccess'");
    expect(migration).toContain("values ('pro','apiAccess')");
    expect(migration).toContain('perform private.sync_webshop_plan_entitlements(r.id)');
  });

  it('creates tenant-bound install, credential, subscription and idempotent delivery evidence',()=>{
    for(const table of['extension_app_catalog','extension_installations','extension_api_credentials','extension_webhook_subscriptions','extension_webhook_deliveries'])expect(migration).toContain(`public.${table}`);
    expect(migration).toContain('unique(instance_id,app_key)');
    expect(migration).toContain('foreign key(instance_id,installation_id)');
    expect(migration).toContain('foreign key(instance_id,subscription_id)');
    expect(migration).toContain('unique(subscription_id,event_key)');
    expect(baseline).toContain('automation_processing_runs_extension_webhook_v1');
  });

  it('keeps browser/database roles fail-closed and private trigger execution revoked',()=>{
    for(const table of['extension_app_catalog','extension_installations','extension_api_credentials','extension_webhook_subscriptions','extension_webhook_deliveries']){
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`revoke all on public.${table} from public,anon,authenticated`);
    }
    expect(migration).toContain("security definer\nset search_path=''\nas $$");
    expect(migration).toContain('revoke all on function private.enqueue_extension_webhook_from_workflow_v1() from public,anon,authenticated,service_role');
    expect(migration).not.toContain('grant execute on function private.enqueue_extension_webhook_from_workflow_v1');
  });

  it('stores credential hashes, never plaintext secrets, and authenticates tenant from the credential',()=>{
    expect(migration).toContain('secret_hash text not null unique');
    expect(runtime).toContain("secret_hash:sha256(token)");
    expect(runtime).toContain('timingSafeEqual');
    expect(runtime).toContain("hasFeatureEntitlement(row.instance_id,'apiAccess')");
    expect(runtime).toContain(".eq('id',row.installation_id).eq('instance_id',row.instance_id)");
    expect(catalogRoute).toContain(".eq('instance_id',auth.instanceId)");
    expect(catalogRoute).not.toContain('request.nextUrl.searchParams.get(\'instanceId\')');
    expect(eventRoute).toContain('instanceId:auth.instanceId');
  });

  it('limits external capability to read-only catalog and canonical Block 17 event ingress',()=>{
    expect(catalogRoute).toContain("authenticateExtensionRequest(request,'catalog.read')");
    expect(catalogRoute).toContain("admin.from('products').select");
    expect(catalogRoute).not.toContain('.insert(');expect(catalogRoute).not.toContain('.update(');expect(catalogRoute).not.toContain('.delete(');
    expect(eventRoute).toContain("authenticateExtensionRequest(request,'automation.events.write')");
    expect(eventRoute).toContain('isEventDrivenWorkflowType(body.type)');
    expect(eventRoute).toContain('dispatchEventDrivenWorkflow');
    expect(eventRoute).toContain("hasFeatureEntitlement(auth.instanceId,'automation')");
    for(const forbidden of["from('orders').insert","from('orders').update","from('products').update","from('product_variants').update","rpc(body","rpc(request"])expect(runtime+eventRoute+catalogRoute).not.toContain(forbidden);
  });

  it('uses RBAC plus advancedIntegrations/apiAccess gates for tenant lifecycle mutation',()=>{
    expect(adminRoute).toContain("getAdminRequestUser('integrations.manage')");
    expect(adminRoute).toContain("requireCurrentStoreContext('integrations.manage')");
    expect(adminRoute).toContain("hasCurrentPlanFeature('advancedIntegrations')");
    expect(adminRoute).toContain("hasCurrentPlanFeature('apiAccess')");
    expect(adminRoute).toContain("action:'platform.extension_api_key_created'");
    expect(adminRoute).toContain("action:'platform.extension_webhook_subscribed'");
  });

  it('reuses Block 17 evidence and the single integrations cron rather than creating a second event bus/schedule',()=>{
    expect(migration).toContain("new.metadata->>'authority','')<>'event-driven-workflow'");
    expect(migration).toContain('new.run_key');
    expect(migration).toContain('on conflict(subscription_id,event_key) do nothing');
    expect(cron).toContain('processDueExtensionWebhookDeliveries(20)');
    expect(runtime).toContain("admin.from('automation_control').select('global_paused,circuit_open_until')");
    expect(runtime).toContain("status:terminal?'dead_letter':'retry'");
  });

  it('validates scopes, bearer tokens, SSRF-sensitive webhook endpoints and bounded retry',()=>{
    expect(normalizeExtensionScopes(['catalog.read','bogus','catalog.read'])).toEqual(['catalog.read']);
    expect(parseExtensionApiToken('Bearer shop_ext_abcdefgh_abcdefghijklmnopqrstuvwxyz012345')).toEqual(expect.objectContaining({prefix:'abcdefgh'}));
    expect(parseExtensionApiToken('Bearer bad')).toBeNull();
    expect(normalizeWebhookEndpoint('https://example.com/hooks')).toBe('https://example.com/hooks');
    for(const endpoint of['http://example.com/x','https://localhost/x','https://127.0.0.1/x','https://10.0.0.1/x','https://192.168.1.2/x','https://[::1]/x','https://[fd00::1]/x','https://example.com:8443/x'])expect(normalizeWebhookEndpoint(endpoint)).toBeNull();
    expect(runtime).toContain("lookup(hostname,{all:true,verbatim:true})");
    expect(runtime).toContain('isNonPublicWebhookAddress(record.address)');
    expect([1,2,3,4,5].map(webhookRetryDelayMinutes)).toEqual([5,10,20,40,60]);
    expect(boundedExtensionEvidence({token:'secret',email:'a@b.c',count:3,note:'ok'})).toEqual({token:'[redacted]',email:'[redacted]',count:3,note:'ok'});
  });

  it('binds the ready customer baseline to the genuine 0001-0017 Fresh Install proof',()=>{
    const parsed=JSON.parse(manifest) as {status:string;freshInstallProofRequired:boolean;proofContractSha256:string|null;notes:string};
    expect(parsed.status).toBe('ready');expect(parsed.freshInstallProofRequired).toBe(false);expect(parsed.proofContractSha256).toBe('c0127ea9f035df7d0978a38dafe4f1fa174f69eb6667921d25663875867ef618');expect(parsed.notes).toContain('0001-0017');
  });

  it('records Block 21/22 as explicit non-scope',()=>{
    expect(doc).toContain('Block 21 Page Schema / Templates');expect(doc).toContain('Block 22 Visual Builder');expect(doc).toContain('generic SQL/RPC endpoint');
  });
});
