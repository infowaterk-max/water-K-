import {describe,expect,it} from 'vitest';
import {CAPABILITY_REGISTRY,EVIDENCE_LEDGER,LIVING_ROADMAP,capabilityById,capabilityEvidence,capabilityRoadmapState,validateCapabilityEvidenceFoundation} from '@/lib/quality-system/capability-evidence';

describe('Capability Registry + Living Roadmap + Evidence Ledger',()=>{
  it('forms one valid machine-readable proof chain',()=>{
    const result=validateCapabilityEvidenceFoundation();
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.capabilityCount).toBeGreaterThanOrEqual(7);
    expect(result.evidenceCount).toBeGreaterThanOrEqual(7);
  });

  it('uses the accepted lifecycle without turning evidence into authority',()=>{
    expect(LIVING_ROADMAP.lifecycle).toEqual(['planned','in-development','implemented-unverified','verified','accepted','production']);
    expect(EVIDENCE_LEDGER.appendOnly).toBe(true);
    expect(CAPABILITY_REGISTRY.capabilityContract.authorityRule).toContain('cannot become its authority');
  });

  it('binds system-soul capabilities to canonical authorities and proof',()=>{
    expect(capabilityById('CAP-ARCH-CONSTITUTION')?.canonicalAuthority).toBe('architecture-constitution');
    expect(capabilityById('CAP-ATLAS-SELF-KNOWLEDGE')?.dependsOn).toContain('CAP-DOMAIN-FOUNDATIONS');
    expect(capabilityRoadmapState('CAP-CHANGE-IMPACT-RELEASE-CLOSURE')?.state).toBe('production');
    expect(capabilityEvidence('CAP-CHANGE-IMPACT-RELEASE-CLOSURE')[0]?.sourceSha).toBe('ab43b33addecbc2e2d3563c6497fba53647c8bc6');
  });

  it('captures implementation, contracts, tests and dependencies for every capability',()=>{
    for(const capability of CAPABILITY_REGISTRY.capabilities){
      expect(capability.implementation.length,capability.id).toBeGreaterThan(0);
      expect(capability.contracts.length,capability.id).toBeGreaterThan(0);
      expect(capability.tests.length,capability.id).toBeGreaterThan(0);
    }
  });
});
