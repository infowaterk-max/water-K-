// @ts-nocheck
import {describe,expect,it} from 'vitest';
import {
  completionEvidenceGuardIds,
  requiredExternalCompletionGuards,
  templateFactoryProducerPaths,
  templateFactoryIndependenceProof,
  validateTemplateFactoryExternalProof,
  mergeExternalCompletionEvidence,
} from '../scripts/shoperation-external-proof-handoff.mjs';
import {deriveTemplateLiveRuntimeClosure,templateFactoryEvidenceChecksum,templateLiveProofInputContractDigest} from '../scripts/lib/shoperation-template-factory-resumable-verification.mjs';
import {readFileSync} from 'node:fs';
import {globToRegExp} from '../scripts/lib/shoperation-development-runtime.mjs';

const plan=(refs=['GUARD-QUALITY-TESTS','GUARD-TEMPLATE-FACTORY'])=>({
  status:'ready-for-implementation',
  completionContract:{requirements:[{evidence:{implementation:[refs[0]],outcome:refs.slice(1)},forbiddenRegressions:[]}]},
});
const verificationPlan={gates:{'GUARD-QUALITY-TESTS':{gateId:'GUARD-QUALITY-TESTS'}}};
const guardRegistry=JSON.parse(readFileSync('quality/knowledge/guard-registry.v1.json','utf8'));
const atlasSnapshot=JSON.parse(readFileSync('artifacts/shoperation-atlas/codebase-atlas.json','utf8'));
const runtimeClosure=deriveTemplateLiveRuntimeClosure({registry:guardRegistry,atlas:atlasSnapshot});
const liveRuntime=guardRegistry.guards.find((item:any)=>item.id==='GUARD-TEMPLATE-FACTORY')?.chain?.liveRuntime;
const runtimeOrigin={
  decision:'PASS',
  runtimeSourceCommit:'runtime-0',
  mode:'ANCESTOR_RUNTIME',
  changedFilesSinceOrigin:[],
  affectedInputs:[],
  classifierChanged:false,
  safetyFallbackApplied:false,
  classifierInputs:[...(liveRuntime?.classifierInputs??[])],
  safetyFallbackRuntimePatterns:[...(liveRuntime?.safetyFallbackRuntimePatterns??[])],
};
const previewAnchorCandidates={
  decision:'PASS',
  runtimeSourceCommit:'runtime-0',
  candidates:[{
    decision:'PASS',
    runtimeSourceCommit:'runtime-0',
    deploymentSourceCommit:'preview-0',
    mode:'ANCESTOR_EQUIVALENT',
    ancestorProven:true,
    runtimeEquivalenceProven:true,
    equivalencePatterns:[...(liveRuntime?.safetyFallbackRuntimePatterns??[])],
    changedFiles:['quality/development/active-plan.json'],
    affectedRuntimeFiles:[],
  }],
  rejected:[],
};
const manifest=(overrides={})=>{
  const base={
    contract:'shoporation.template-factory-quality-evidence.v2',
    sourceCommit:'head-1',
    branch:'feature/test',
    baseSha:'base-0',
    complete:true,
    acceptanceProofs:[{templateKey:'gaming.loot-vault',browserMatrixPassed:true,browserMatrixComplete:true,browserMatrixCaseCount:42}],
    errors:[],
    liveProof:{
      contract:'shoporation.template-factory-live-proof.v1',
      mode:'LIVE',
      decision:'PASS',
      sourceCommit:'head-1',
      branch:'feature/test',
      originSourceCommit:'head-1',
      originRunId:'123',
      originWorkflowConclusion:'current-workflow',
      ancestorProven:true,
      inputEquivalenceProven:true,
      inputContractDigest:templateLiveProofInputContractDigest(guardRegistry,runtimeClosure),
      runtimeClosureDecision:'PASS',
      runtimeSourceCommit:runtimeOrigin.runtimeSourceCommit,
      runtimeOriginMode:runtimeOrigin.mode,
      runtimeEquivalenceProven:true,
      deploymentSourceCommit:'preview-0',
      deploymentAnchorMode:'ANCESTOR_EQUIVALENT',
      deploymentRuntimeEquivalenceProven:true,
      deploymentEnvironment:'Preview',
      deploymentId:'dpl_preview_0',
      runtimeClassifierChanged:false,
      runtimeSafetyFallbackApplied:false,
      runtimeClassifierInputs:runtimeOrigin.classifierInputs,
      runtimeSafetyFallbackPatterns:runtimeOrigin.safetyFallbackRuntimePatterns,
      changedFilesSinceOrigin:[],
      affectedInputs:[],
      reason:'runtime-equivalent-to-latest-runtime-ancestor',
    },
  };
  const merged={...base,...overrides};
  merged.checksum=templateFactoryEvidenceChecksum(merged);
  return merged;
};

describe('cross-workflow external completion proof handoff',()=>{
  it('proves the unrelated office route has no Template Factory external dependency under a complete runtime graph',()=>{
    const files=['src/app/admin/kommunikacio/layout.tsx','tests/customer-email-plan-split.test.ts','tests/pro-entitlement-guards.test.ts'];
    const scoped={...plan(['GUARD-QUALITY-TESTS']),plannedFilePatterns:files};
    expect(runtimeClosure.decision).toBe('PASS');
    expect(runtimeClosure.files).not.toContain(files[0]);
    expect(requiredExternalCompletionGuards({activePlan:scoped,verificationPlan,guardRegistry,liveClosure:runtimeClosure})).not.toContain('GUARD-TEMPLATE-FACTORY');
    const proof=templateFactoryIndependenceProof({registry:guardRegistry,plannedFiles:files,liveClosure:runtimeClosure});
    expect(proof.independent).toBe(true);
    expect(proof.reason).toBe('complete-runtime-and-producer-independence');
  });

  it('never suppresses the external gate when actual runtime, producer or classifier input is touched',()=>{
    for(const file of ['src/app/layout.tsx','src/app/penztar/page.tsx','scripts/shoperation-external-proof-handoff.mjs','quality/knowledge/guard-registry.v1.json']){
      const proof=templateFactoryIndependenceProof({registry:guardRegistry,plannedFiles:[file],liveClosure:runtimeClosure});
      expect(proof).toMatchObject({independent:false,reason:'runtime-or-producer-input-affected'});
    }
  });

  it('requires external proof for explicit guard references, transitive consumers and unknown runtime states',()=>{
    const office=['src/app/admin/kommunikacio/layout.tsx'];
    expect(templateFactoryIndependenceProof({registry:guardRegistry,plannedFiles:office,liveClosure:runtimeClosure,explicitGuardIds:['GUARD-TEMPLATE-FACTORY']}).reason).toBe('explicit-proof-authority');
    expect(templateFactoryIndependenceProof({registry:guardRegistry,plannedFiles:office,liveClosure:{decision:'BLOCK',files:[]}}).reason).toBe('runtime-closure-unproven');
    expect(templateFactoryIndependenceProof({registry:guardRegistry,plannedFiles:[]}).reason).toBe('missing-file-scope');
    const added={id:'DEPENDENT-TEST',verification:{dependsOn:['GUARD-TEMPLATE-FACTORY']}};
    const registry={...guardRegistry,guards:[...guardRegistry.guards,added]};
    expect(templateFactoryIndependenceProof({registry,plannedFiles:office,gateChain:{orderedGateIds:['DEPENDENT-TEST','GUARD-TEMPLATE-FACTORY']},liveClosure:runtimeClosure}).reason).toBe('transitive-proof-dependency');
  });

  it('validates exact push/PR producer path parity rather than treating malformed filters as absent proof need',()=>{
    const original=readFileSync('.github/workflows/template-factory-quality-gate.yml','utf8');
    const paths=templateFactoryProducerPaths(original);
    expect(paths).toContain('scripts/shoperation-external-proof-handoff.mjs');
    expect(paths).toContain('src/app/penztar/**');
    for(const input of [...(liveRuntime?.classifierInputs??[]),...(liveRuntime?.globalRuntimeInputs??[]),...(liveRuntime?.entrypoints??[])]){
      const covers=paths?.some(pattern=>pattern===input||globToRegExp(pattern).test(input));
      expect(covers,'missing producer trigger for '+input).toBe(true);
    }
    const office=['src/app/admin/kommunikacio/layout.tsx'];
    const mismatch=original.replace("      - 'scripts/shoperation-external-proof-handoff.mjs'\n", '');
    expect(templateFactoryProducerPaths(mismatch)).toBeNull();
    expect(templateFactoryIndependenceProof({registry:guardRegistry,plannedFiles:office,liveClosure:runtimeClosure,workflowSource:mismatch}).reason).toBe('producer-trigger-unknown');
    expect(templateFactoryIndependenceProof({registry:guardRegistry,plannedFiles:office,liveClosure:runtimeClosure,workflowSource:'invalid'}).independent).toBe(false);
  });

  it('derives only Completion Contract evidence absent from the local verification plan',()=>{
    expect(completionEvidenceGuardIds(plan())).toEqual(['GUARD-QUALITY-TESTS','GUARD-TEMPLATE-FACTORY']);
    expect(requiredExternalCompletionGuards({activePlan:plan(),verificationPlan})).toEqual(['GUARD-TEMPLATE-FACTORY']);
  });

  it('does not require external evidence for a closed lifecycle',()=>{
    const closed={...plan(),status:'closed'};
    expect(requiredExternalCompletionGuards({activePlan:closed,verificationPlan})).toEqual([]);
  });

  it('rejects missing or unproven live-proof provenance even when the browser matrix is complete',()=>{
    const missing=validateTemplateFactoryExternalProof({
      manifest:manifest({liveProof:null}),expectedHead:'head-1',expectedBranch:'feature/test',runId:'123',workflowConclusion:'success',guardRegistry,runtimeOrigin,previewAnchorCandidates,
    });
    expect(missing.ok).toBe(false);
    expect(missing.issues.map(item=>item.code)).toContain('TEMPLATE_LIVE_PROOF_CONTRACT_INVALID');

    const invalidReuse=validateTemplateFactoryExternalProof({
      manifest:manifest({liveProof:{
        ...manifest().liveProof,
        mode:'REUSED',
        originSourceCommit:'ancestor-1',
        originRunId:'111',
        originWorkflowConclusion:'success',
        ancestorProven:false,
        inputEquivalenceProven:true,
        affectedInputs:[],
      }}),
      expectedHead:'head-1',expectedBranch:'feature/test',runId:'123',workflowConclusion:'success',guardRegistry,runtimeOrigin,previewAnchorCandidates,
    });
    expect(invalidReuse.ok).toBe(false);
    expect(invalidReuse.issues.map(item=>item.code)).toContain('TEMPLATE_LIVE_PROOF_RESULT_REUSE_NOT_AUTHORIZED');
  });

  it('rejects runtime-origin and classifier-fallback provenance drift',()=>{
    const bad=manifest({liveProof:{
      ...manifest().liveProof,
      runtimeSourceCommit:'wrong-runtime',
      runtimeSafetyFallbackApplied:true,
    }});
    const result=validateTemplateFactoryExternalProof({
      manifest:bad,expectedHead:'head-1',expectedBranch:'feature/test',runId:'123',
      workflowConclusion:'success',guardRegistry,runtimeOrigin,previewAnchorCandidates,
    });
    expect(result.ok).toBe(false);
    const codes=result.issues.map(item=>item.code);
    expect(codes).toContain('EXTERNAL_PROOF_RUNTIME_SOURCE_MISMATCH');
    expect(codes).toContain('EXTERNAL_PROOF_RUNTIME_FALLBACK_MISMATCH');
  });

  it('rejects a deployment anchor that is not in the independently derived runtime-equivalent candidate set',()=>{
    const bad=manifest({liveProof:{
      ...manifest().liveProof,
      deploymentSourceCommit:'unproven-preview',
    }});
    const result=validateTemplateFactoryExternalProof({
      manifest:bad,expectedHead:'head-1',expectedBranch:'feature/test',runId:'123',
      workflowConclusion:'success',guardRegistry,runtimeOrigin,previewAnchorCandidates,
    });
    expect(result.ok).toBe(false);
    expect(result.issues.map(item=>item.code)).toContain('EXTERNAL_PROOF_PREVIEW_ANCHOR_NOT_EQUIVALENT');
  });

  it('rejects production deployment provenance even if the rest of the artifact is complete',()=>{
    const bad=manifest({liveProof:{
      ...manifest().liveProof,
      deploymentEnvironment:'Production',
    }});
    const result=validateTemplateFactoryExternalProof({
      manifest:bad,expectedHead:'head-1',expectedBranch:'feature/test',runId:'123',
      workflowConclusion:'success',guardRegistry,runtimeOrigin,previewAnchorCandidates,
    });
    expect(result.ok).toBe(false);
    expect(result.issues.map(item=>item.code)).toContain('TEMPLATE_LIVE_PROOF_DEPLOYMENT_NOT_PREVIEW');
  });

  it('accepts an exact-head successful Template Factory artifact with complete browser evidence',()=>{
    const result=validateTemplateFactoryExternalProof({
      manifest:manifest(),expectedHead:'head-1',expectedBranch:'feature/test',stateVersion:'shoporation-ci.v1',
      runId:'123',workflowName:'Template Factory Quality Gate v2',workflowConclusion:'success',guardRegistry,runtimeOrigin,previewAnchorCandidates,
    });
    expect(result.ok).toBe(true);
    expect(result.evidence).toMatchObject({id:'GUARD-TEMPLATE-FACTORY',status:'PASS',sourceCommit:'head-1',branch:'feature/test',execution:'EXTERNAL'});
  });

  it.each([
    ['wrong head',{sourceCommit:'old-head'},'EXTERNAL_PROOF_HEAD_MISMATCH'],
    ['wrong branch',{branch:'other'},'EXTERNAL_PROOF_BRANCH_MISMATCH'],
    ['incomplete',{complete:false},'EXTERNAL_PROOF_MANIFEST_INCOMPLETE'],
    ['artifact errors',{errors:[{code:'x'}]},'EXTERNAL_PROOF_MANIFEST_ERRORS'],
    ['incomplete browser matrix',{acceptanceProofs:[{templateKey:'x',browserMatrixPassed:true,browserMatrixComplete:false}]},'EXTERNAL_PROOF_BROWSER_MATRIX_INCOMPLETE'],
  ])('fails closed on %s',(_label,override,code)=>{
    const result=validateTemplateFactoryExternalProof({
      manifest:manifest(override),expectedHead:'head-1',expectedBranch:'feature/test',runId:'123',workflowConclusion:'success',guardRegistry,runtimeOrigin,previewAnchorCandidates,
    });
    expect(result.ok).toBe(false);
    expect(result.issues.map(item=>item.code)).toContain(code);
  });

  it('rejects a failed workflow even when its artifact payload looks clean',()=>{
    const result=validateTemplateFactoryExternalProof({
      manifest:manifest(),expectedHead:'head-1',expectedBranch:'feature/test',runId:'123',workflowConclusion:'failure',guardRegistry,runtimeOrigin,previewAnchorCandidates,
    });
    expect(result.ok).toBe(false);
    expect(result.issues.map(item=>item.code)).toContain('EXTERNAL_PROOF_WORKFLOW_NOT_SUCCESS');
  });

  it('merges valid exact-head external evidence and blocks missing or stale required evidence',()=>{
    const validated=validateTemplateFactoryExternalProof({
      manifest:manifest(),expectedHead:'head-1',expectedBranch:'feature/test',runId:'123',workflowConclusion:'success',guardRegistry,runtimeOrigin,previewAnchorCandidates,
    });
    const exact={head:'head-1',branch:'feature/test',stateVersion:'shoporation-ci.v1'};
    const merged=mergeExternalCompletionEvidence({
      truthEvidence:[{id:'GUARD-QUALITY-TESTS',status:'PASS',sourceCommit:'head-1',branch:'feature/test',stateVersion:'shoporation-ci.v1',runId:'ci'}],
      externalEvidence:[validated.evidence],
      requiredIds:['GUARD-QUALITY-TESTS','GUARD-TEMPLATE-FACTORY'],
      currentExactState:exact,
    });
    expect(merged.decision).toBe('PASS');
    expect(merged.truthEvidence.map(item=>item.id)).toContain('GUARD-TEMPLATE-FACTORY');
    expect(mergeExternalCompletionEvidence({truthEvidence:[],externalEvidence:[],requiredIds:['GUARD-TEMPLATE-FACTORY'],currentExactState:exact}).decision).toBe('BLOCK');
    expect(mergeExternalCompletionEvidence({truthEvidence:[],externalEvidence:[{...validated.evidence,sourceCommit:'stale'}],requiredIds:['GUARD-TEMPLATE-FACTORY'],currentExactState:exact}).issues.map(item=>item.code)).toContain('EXTERNAL_EVIDENCE_HEAD_MISMATCH');
  });
});
