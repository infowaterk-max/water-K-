import{readFileSync}from'node:fs';import{describe,expect,it}from'vitest';
const read=(p:string)=>readFileSync(p,'utf8');
describe('Incident Intelligence API contracts',()=>{
  it('keeps customer bug reports on the canonical Support + Incident atomic RPC',()=>{
    const route=read('src/app/api/incidents/customer/route.ts'),service=read('src/lib/incidents/service.ts');
    expect(route).toContain('customerIncidentInputSchema');
    expect(route).toContain('isSameOrigin');
    expect(route).toContain('website');
    expect(service).toContain("rpc('create_customer_incident_report_v1'");
    expect(service).not.toMatch(/from\(['"]support_tickets['"]\)\.(insert|upsert)/);
    expect(service).not.toMatch(/from\(['"]platform_incidents['"]\)\.(insert|upsert)/);
  });
  it('rate limits public and merchant intake without storing raw IP identity',()=>{
    const service=read('src/lib/incidents/service.ts');
    expect(service).toContain("rpc('consume_security_rate_limit'");
    expect(service).toContain("createHash('sha256')");
    expect(service).toContain('incident:customer:');
    expect(service).toContain('incident:merchant:');
    expect(service).not.toContain('ip_address');
  });
  it('requires canonical merchant RBAC and tenant scope before reporting',()=>{
    const route=read('src/app/api/incidents/merchant/route.ts');
    expect(route).toContain("getAdminRequestUser('store.read')");
    expect(route).toContain("requireCurrentStoreContext('store.read')");
    expect(route).toContain('getActiveStoreRoles');
    expect(route).not.toContain('instanceId:parsed');
  });
  it('runs deterministic system triage and preserves deferred-triage evidence',()=>{
    const service=read('src/lib/incidents/service.ts');
    expect(service).toContain("rpc('triage_platform_incident_v2'");
    expect(service).toContain("p_actor_kind:'system'");
    expect(service).toContain('pendingCodebaseAtlasEnrichment:true');
    expect(service).toContain('triagePending');
    expect(service).toContain('incident.triage.deferred');
  });
  it('keeps platform queue and manual triage platform-only',()=>{
    const list=read('src/app/api/platform/incidents/route.ts'),triage=read('src/app/api/platform/incidents/[id]/triage/route.ts');
    expect(list).toContain('getPlatformRequestUser');
    expect(triage).toContain('getPlatformRequestUser');
    expect(triage).toContain('isSameOrigin');
    expect(triage).toContain('applyManualIncidentTriage');
  });
  it('keeps code self-healing proposal-only while persisting repair/run evidence',()=>{
    const healing=read('src/lib/incidents/self-healing.ts'),service=read('src/lib/incidents/service.ts');
    expect(healing).toContain("'code.repair.pr'");
    expect(healing).toContain("allowedModes:['propose']");
    expect(healing).toContain('repairKind===\'code_pr\'');
    expect(service).toContain("rpc('create_incident_repair_request_v1'");
    expect(service).toContain("rpc('create_self_healing_run_v1'");
  });
});
