import {describe,expect,it} from 'vitest';
import {CAPABILITY_REGISTRY,EVIDENCE_LEDGER,LIVING_ROADMAP,capabilityById,evidenceForSubject,roadmapItem,validateCapabilityEvidenceFoundation} from '@/lib/quality-system/capability-evidence';

describe('Capability Registry + Living Roadmap + Evidence Ledger',()=>{
  it('forms one valid machine-readable proof chain',()=>{
    const result=validateCapabilityEvidenceFoundation();
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.capabilityCount).toBeGreaterThanOrEqual(10);
    expect(result.evidenceCount).toBeGreaterThanOrEqual(4);
  });

  it('binds capability ownership back to canonical domain authority',()=>{
    expect(capabilityById('CAP-ATLAS')?.authority).toBe('quality-knowledge-system');
    expect(capabilityById('CAP-RELEASE')?.authority).toBe('release-infrastructure');
    expect(capabilityById('CAP-COMMERCE')?.domain).toBe('DOMAIN-COMMERCE');
  });

  it('does not allow roadmap completion without evidence',()=>{
    expect(LIVING_ROADMAP.principles.completionRequiresEvidence).toBe(true);
    for(const item of LIVING_ROADMAP.items.filter(item=>item.status==='done')){
      expect(item.evidenceRefs.length,item.id).toBeGreaterThan(0);
      for(const ref of item.evidenceRefs)expect(EVIDENCE_LEDGER.evidence.some(e=>e.id===ref),ref).toBe(true);
    }
  });

  it('keeps evidence bound to explicit source SHA and assertions',()=>{
    for(const item of EVIDENCE_LEDGER.evidence.filter(item=>item.state==='verified')){
      expect(item.sourceSha).toMatch(/^[0-9a-f]{40}$/);
      expect(item.assertions.length).toBeGreaterThan(0);
    }
    expect(evidenceForSubject('SYSTEM-SELF-KNOWLEDGE').length).toBeGreaterThan(0);
  });

  it('keeps future work visible instead of silently marking it complete',()=>{
    expect(roadmapItem('DRIFT-CONFIDENCE')?.status).toBe('planned');
    expect(roadmapItem('DEEP-ATLAS-SCAN')?.status).toBe('planned');
    expect(roadmapItem('TEMPLATE-PRODUCTION-SYSTEM')?.status).toBe('in-progress');
  });
});
