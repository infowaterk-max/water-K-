import {afterEach,describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {GET} from '@/app/api/visual-fidelity/templates/route';
import {buildRegisteredStorefrontTemplateFactoryCandidate} from '@/lib/builder/template-factory/recipe-registry';

const originalQa=process.env.VISUAL_FIDELITY_QA;
afterEach(()=>{
  if(originalQa===undefined)delete process.env.VISUAL_FIDELITY_QA;
  else process.env.VISUAL_FIDELITY_QA=originalQa;
});

describe('Template Factory handoff evidence flow',()=>{
  it('propagates compiler-owned provenance and showroom evidence through the real quality catalog payload',async()=>{
    process.env.VISUAL_FIDELITY_QA='1';
    const build=buildRegisteredStorefrontTemplateFactoryCandidate('gaming.loot-vault');
    expect(build.report.productOwnerReady).toBe(true);
    expect(build.report.provenance.compileSource).toBe('template-factory');
    expect(build.report.showroomEvidence.length).toBeGreaterThan(0);

    const response=await GET();
    expect(response.status).toBe(200);
    const payload=await response.json() as any;
    expect(payload.contract).toBe('shoporation.template-factory-quality-catalog.v1');
    const candidate=payload.templates.find((item:any)=>
      item.templateKey==='gaming.loot-vault'
      &&item.templateVersion===2
      &&item.factoryCandidate===true
    );
    expect(candidate).toBeTruthy();
    expect(candidate.provenance).toEqual(build.report.provenance);
    expect(candidate.showroomEvidence).toEqual(build.report.showroomEvidence);
    expect(candidate.showroomEvidence.every((row:any)=>row.pageKey&&row.schemaVersion===1&&row.presentationAuthority)).toBe(true);
  });

  it('does not weaken downstream Factory identity or showroom readiness predicates',()=>{
    const gate=readFileSync('scripts/template-factory-quality-gate.mjs','utf8');
    const handoff=readFileSync('scripts/template-factory-product-owner-handoff.mjs','utf8');
    const workflow=readFileSync('.github/workflows/template-factory-quality-gate.yml','utf8');
    expect(gate).toContain('manifest.provenance?.targetTemplateKey===manifest.templateKey');
    expect(gate).toContain('const showroomEvidence=manifest.showroomEvidence??[]');
    expect(gate).toContain('showroomContractPassed');
    expect(handoff).toContain('checks.factoryIdentityPinned=acceptance.factoryIdentityPinned===true');
    expect(handoff).toContain('checks.showroomContractPassed=acceptance.showroomContractPassed===true');
    expect(workflow).toContain('item.factoryIdentityPinned===true');
    expect(workflow).toContain('item.showroomContractPassed===true');
  });

  it('retains the QA-only route boundary when visual-fidelity mode is disabled',async()=>{
    delete process.env.VISUAL_FIDELITY_QA;
    const response=await GET();
    expect(response.status).toBe(404);
  });
});
