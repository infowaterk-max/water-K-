// @ts-nocheck
import {describe,expect,it} from 'vitest';
import {
  completionEvidenceGuardIds,
  requiredExternalCompletionGuards,
  validateTemplateFactoryExternalProof,
  mergeExternalCompletionEvidence,
} from '../scripts/shoperation-external-proof-handoff.mjs';
import {templateLiveProofInputContractDigest} from '../scripts/lib/shoperation-template-factory-resumable-verification.mjs';
import {readFileSync} from 'node:fs';

const plan=(refs=['GUARD-QUALITY-TESTS','GUARD-TEMPLATE-FACTORY'])=>({
  status:'ready-for-implementation',
  completionContract:{requirements:[{evidence:{implementation:[refs[0]],outcome:refs.slice(1)},forbiddenRegressions:[]}]},
});
const verificationPlan={gates:{'GUARD-QUALITY-TESTS':{gateId:'GUARD-QUALITY-TESTS'}}};
const guardRegistry=JSON.parse(readFileSync('quality/knowledge/guard-registry.v1.json','utf8'));
const manifest=(overrides={})=>{
  const base={
    contract:'shoporation.template-factory-quality-evidence.v2',
    sourceCommit:'head-1',
    branch:'feature/test',
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
      originRunId:'12345',
      originWorkflowConclusion:'current-workflow',
      ancestorProven:true,
      inputEquivalenceProven:false,
      inputContractDigest:templateLiveProofInputContractDigest(guardRegistry),
      changedFilesSinceOrigin:[],
      affectedInputs:[],
      reason:'exact-head-live-proof',
    },
  };
  const crypto=require('node:crypto');
  const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}':JSON.stringify(value);
  const merged={...base,...overrides};
  const copy={...merged};delete copy.checksum;
  merged.checksum=crypto.createHash('sha256').update(canonical(copy)).digest('hex');
  return merged;
};

describe('cross-workflow external completion proof handoff',()=>{
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
      manifest:manifest({liveProof:null}),expectedHead:'head-1',expectedBranch:'feature/test',runId:'123',workflowConclusion:'success',guardRegistry,guardRegistry,
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
      expectedHead:'head-1',expectedBranch:'feature/test',runId:'123',workflowConclusion:'success',guardRegistry,guardRegistry,
    });
    expect(invalidReuse.ok).toBe(false);
    expect(invalidReuse.issues.map(item=>item.code)).toContain('TEMPLATE_LIVE_PROOF_REUSE_ANCESTRY_UNPROVEN');
  });

  it('accepts an exact-head successful Template Factory artifact with complete browser evidence',()=>{
    const result=validateTemplateFactoryExternalProof({
      manifest:manifest(),expectedHead:'head-1',expectedBranch:'feature/test',stateVersion:'shoporation-ci.v1',
      runId:'12345',workflowName:'Template Factory Quality Gate v2',workflowConclusion:'success',guardRegistry,
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
      manifest:manifest(override),expectedHead:'head-1',expectedBranch:'feature/test',runId:'123',workflowConclusion:'success',guardRegistry,
    });
    expect(result.ok).toBe(false);
    expect(result.issues.map(item=>item.code)).toContain(code);
  });

  it('rejects a failed workflow even when its artifact payload looks clean',()=>{
    const result=validateTemplateFactoryExternalProof({
      manifest:manifest(),expectedHead:'head-1',expectedBranch:'feature/test',runId:'123',workflowConclusion:'failure',guardRegistry,
    });
    expect(result.ok).toBe(false);
    expect(result.issues.map(item=>item.code)).toContain('EXTERNAL_PROOF_WORKFLOW_NOT_SUCCESS');
  });

  it('merges valid exact-head external evidence and blocks missing or stale required evidence',()=>{
    const validated=validateTemplateFactoryExternalProof({
      manifest:manifest(),expectedHead:'head-1',expectedBranch:'feature/test',runId:'123',workflowConclusion:'success',guardRegistry,
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
