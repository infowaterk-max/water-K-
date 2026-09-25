import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {resolveSelfHealingPolicy} from '@/lib/incidents/self-healing';

const read=(path:string)=>readFileSync(path,'utf8');

describe('Incident Intelligence governed recovery boundary',()=>{
  it('allows deterministic auto eligibility only for the explicit low-risk system runbook',()=>{
    const policy=resolveSelfHealingPolicy({
      runbookKey:'storefront.cache.revalidate',
      requestedMode:'auto',
      actorKind:'system',
      routePath:'/kapcsolat',
    });
    expect(policy).toMatchObject({
      risk:'low',
      repairKind:'runbook',
      targetAuthority:'next.cache',
      actorKind:'system',
      autoEligible:true,
      autoApply:true,
      executionDisposition:'auto-eligible',
      completionEvidenceRequired:true,
    });
  });

  it('keeps platform and AI callers proposal-first',()=>{
    for(const actorKind of ['platform','ai'] as const){
      expect(()=>resolveSelfHealingPolicy({
        runbookKey:'storefront.cache.revalidate',
        requestedMode:'auto',
        actorKind,
        routePath:'/kapcsolat',
      })).toThrow('INCIDENT_AUTO_HEAL_ACTOR_FORBIDDEN');

      expect(resolveSelfHealingPolicy({
        runbookKey:'storefront.cache.revalidate',
        requestedMode:'propose',
        actorKind,
        routePath:'/kapcsolat',
      })).toMatchObject({autoEligible:false,autoApply:false,executionDisposition:'proposal-only'});
    }
  });

  it('never auto-authorizes code repair or unsafe route targets',()=>{
    expect(()=>resolveSelfHealingPolicy({
      runbookKey:'code.repair.pr',
      requestedMode:'auto',
      actorKind:'system',
    })).toThrow(/MODE_FORBIDDEN|AUTO_HEAL_FORBIDDEN/);

    for(const routePath of ['//evil.example/path','https://evil.example/path','/ok?query=1','/bad#fragment','/bad\\path']){
      expect(()=>resolveSelfHealingPolicy({
        runbookKey:'storefront.cache.revalidate',
        requestedMode:'auto',
        actorKind:'system',
        routePath,
      }),routePath).toThrow('INCIDENT_RUNBOOK_ROUTE_REQUIRED');
    }
  });

  it('separates auto eligibility from execution completion evidence',()=>{
    const service=read('src/lib/incidents/service.ts');
    expect(service).toContain('registerDeterministicSystemHealingPlan');
    expect(service).toContain("createdByKind:'system'");
    expect(service).toContain("executionSemantics:'eligibility-not-completion'");
    expect(service).toContain('completionEvidenceRequired:true');

    const route=read('src/app/api/platform/incidents/[id]/repair/route.ts');
    expect(route).toContain('createPlatformRepairProposal');
    expect(route).not.toContain("requestedMode:'auto'");
  });

  it('classifies Incident Intelligence explicitly without relaxing Release Risk Budget',()=>{
    const release=JSON.parse(read('deploy/release-risk-policy.json')) as {
      maxPoints:number;
      maxSubsystems:number;
      subsystems:Array<{name:string;risk:string;patterns:string[]}>;
    };
    const incident=release.subsystems.find(item=>item.name==='incident-intelligence');
    expect(incident).toBeTruthy();
    expect(incident?.risk).toBe('medium');
    expect(incident?.patterns).toContain('src/lib/incidents/**');
    expect(release.maxPoints).toBe(5);
    expect(release.maxSubsystems).toBe(3);
  });
});
