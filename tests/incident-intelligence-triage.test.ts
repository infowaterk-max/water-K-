import{describe,expect,it}from'vitest';
import{matchKnownFailureSignature,triageIncident}from'@/lib/incidents/triage';
import{resolveSelfHealingPolicy}from'@/lib/incidents/self-healing';

describe('Incident Intelligence deterministic triage',()=>{
  it('routes merchant-owned content and catalog defects back to the merchant',()=>{
    expect(triageIncident({source:'customer',category:'content'})).toMatchObject({ownership:'merchant',status:'merchant_action',reasonCode:'MERCHANT_CONTENT_AUTHORITY'});
    expect(triageIncident({source:'merchant',category:'catalog'})).toMatchObject({ownership:'merchant',status:'merchant_action',reasonCode:'MERCHANT_CATALOG_AUTHORITY'});
  });
  it('routes platform UI/account/security defects to Shoperation',()=>{
    expect(triageIncident({source:'customer',category:'ui'})).toMatchObject({ownership:'platform',status:'platform_investigation'});
    expect(triageIncident({source:'customer',category:'account'})).toMatchObject({ownership:'platform'});
    expect(triageIncident({source:'customer',category:'security'})).toMatchObject({ownership:'platform',severity:'high'});
  });
  it('keeps commerce/provider boundaries shared until evidence resolves ownership',()=>{
    for(const category of['commerce','payment','shipping','integration'] as const)expect(triageIncident({source:'merchant',category})).toMatchObject({ownership:'shared',status:'triaged',confidence:'medium'});
  });
  it('promotes exact and prefix Known Failure signatures into deterministic platform triage',()=>{
    expect(matchKnownFailureSignature('DATABASE_SCHEMA_COMPATIBILITY_FAILED')).toBe('SQ-KF-006');
    expect(matchKnownFailureSignature('HORIZONTAL_OVERFLOW:contact')).toBe('TF-KF-006');
    expect(triageIncident({source:'system',category:'ui',errorCode:'HORIZONTAL_OVERFLOW:contact'})).toMatchObject({ownership:'platform',knownFailureId:'TF-KF-006',confidence:'deterministic',reasonCode:'KNOWN_FAILURE_MATCH'});
  });
  it('never auto-applies code repairs and only auto-allows an explicit low-risk runbook',()=>{
    expect(()=>resolveSelfHealingPolicy({runbookKey:'code.repair.pr',requestedMode:'auto',actorKind:'system'})).toThrow(/MODE_FORBIDDEN|AUTO_HEAL_FORBIDDEN/);
    const cache=resolveSelfHealingPolicy({runbookKey:'storefront.cache.revalidate',requestedMode:'auto',actorKind:'system',routePath:'/kapcsolat'});
    expect(cache).toMatchObject({risk:'low',autoAllowed:true,autoApply:true,repairKind:'runbook'});
    expect(()=>resolveSelfHealingPolicy({runbookKey:'storefront.cache.revalidate',requestedMode:'auto',actorKind:'system',routePath:'https://example.com'})).toThrow('INCIDENT_RUNBOOK_ROUTE_REQUIRED');
  });
});
