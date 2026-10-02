import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {
  buildClosedDevelopmentPlan,
  evaluateClosedDevelopmentPlan,
  evaluateCompletionTruth,
  validateOperationalIntelligence,
} from '../scripts/lib/shoperation-operational-intelligence.mjs';

const json=(path:string)=>JSON.parse(readFileSync(path,'utf8'));

describe('Control Plane Proof Semantics adversarial regressions',()=>{
  it('blocks a structurally complete critical plan whose engineering content is vacuous',()=>{
    const plan=json('quality/development/active-plan.json');
    const policy=json('quality/knowledge/development-guard-policy.v1.json');
    const guards=json('quality/knowledge/guard-registry.v1.json');
    const poisoned=structuredClone(plan);
    poisoned.operationalIntelligence.riskTier='critical';
    poisoned.operationalIntelligence.alternatives=[
      {id:'ALT-POISON-1',summary:'x',reason:'x',disposition:'selected'},
      {id:'ALT-POISON-2',summary:'x',reason:'x',disposition:'rejected'},
      {id:'ALT-POISON-3',summary:'x',reason:'x',disposition:'rejected'},
    ];
    const specialistRole=policy.operationalIntelligence.specialistRoles[0];
    poisoned.operationalIntelligence.specialistReviews=Array.from({length:4},(_,index)=>({
      role:specialistRole,
      mode:index===0?'dissent':'review',
      verdict:'pass',
      finding:'x',
      resolution:'x',
      evidence:[],
    }));
    poisoned.operationalIntelligence.challenge=Array.from({length:8},(_,index)=>({
      id:`CH-POISON-${index+1}`,
      scenario:'x',
      finding:'x',
      resolution:'x',
      status:'resolved',
    }));
    poisoned.operationalIntelligence.problemStatement='x';
    poisoned.operationalIntelligence.observableOutcomes=['x'];
    poisoned.operationalIntelligence.unresolvedRisks=['x'];
    poisoned.operationalIntelligence.assuranceCeiling.rationale='x';
    poisoned.operationalIntelligence.definition.acceptanceCriteria=poisoned.operationalIntelligence.definition.acceptanceCriteria.map(()=> 'x');
    poisoned.operationalIntelligence.definition.invariants=poisoned.operationalIntelligence.definition.invariants.map(()=> 'x');
    poisoned.operationalIntelligence.definition.forbiddenStates=poisoned.operationalIntelligence.definition.forbiddenStates.map(()=> 'x');
    poisoned.operationalIntelligence.proofPlan=poisoned.operationalIntelligence.proofPlan.map(()=> 'x');
    poisoned.completionContract.requirements=poisoned.completionContract.requirements.map((item:any)=>({
      ...item,
      requirement:'x',
      forbiddenRegressions:item.forbiddenRegressions.map((negative:any)=>({...negative,statement:'x'})),
    }));
    const result=validateOperationalIntelligence({
      plan:poisoned,
      policy,
      guardIds:guards.guards.map((item:any)=>item.id),
    });
    const codes=result.issues.map((item:any)=>item.code);
    expect(codes).toContain('DEV_PLAN_PROBLEM_STATEMENT_VACUOUS');
    expect(codes).toContain('DEV_PLAN_ASSURANCE_RATIONALE_VACUOUS');
    expect(codes).toContain('DEV_PLAN_SEMANTIC_CONTENT_VACUOUS');
    expect(codes).toContain('DEV_PLAN_COMPLETION_REQUIREMENT_VACUOUS');
    expect(codes).toContain('DEV_PLAN_ALTERNATIVES_TAUTOLOGICAL');
    expect(codes).toContain('DEV_PLAN_CHALLENGE_TAUTOLOGICAL');
    expect(codes).toContain('DEV_PLAN_SPECIALIST_EVIDENCE_REQUIRED');
  });

  it('classifies a repository-wide Atlas claim backed only by generic Quality Tests as OVERCLAIM',()=>{
    const exact={head:'abc123',branch:'feature/proof-semantics',stateVersion:'shoporation-ci.v1'};
    const plan={
      taskId:'ADVERSARIAL-OVERCLAIM',
      completionContract:{
        sourceRef:'PO-ADVERSARIAL-OVERCLAIM',
        requirements:[{
          id:'REQ-ATLAS-ALL',
          requirement:'Atlas identifies every impacted implementation point in the entire codebase.',
          claimScope:{capability:'CAP-ATLAS',breadth:'repository-complete',dimensions:['all-implementation-points']},
          requiredCapabilities:['CAP-ATLAS'],
          evidence:{implementation:['GUARD-QUALITY-TESTS'],outcome:['GUARD-QUALITY-TESTS']},
          forbiddenRegressions:[{id:'NEG-ATLAS-OMISSION',statement:'No affected implementation point is omitted.',evidence:['GUARD-QUALITY-TESTS']}],
        }],
      },
    };
    const evidence=[{
      id:'GUARD-QUALITY-TESTS',status:'success',sourceCommit:exact.head,branch:exact.branch,
      stateVersion:exact.stateVersion,runId:'run-1',
    }];
    const result=evaluateCompletionTruth({plan,evidence,currentExactState:exact});
    expect(result.truthStatus).toBe('OVERCLAIM');
    expect(result.internalState).toBe('OVERCLAIM');
    expect(result.poStatus).toBe('NOT DONE');
    expect(result.decision).toBe('BLOCK');
  });

  it('requires structured capability-matching evidence before a broad claim can become VERIFIED',()=>{
    const exact={head:'abc123',branch:'feature/proof-semantics',stateVersion:'shoporation-ci.v1'};
    const plan={
      taskId:'ADVERSARIAL-STRUCTURED-PROOF',
      completionContract:{
        sourceRef:'PO-ADVERSARIAL-STRUCTURED-PROOF',
        requirements:[{
          id:'REQ-ATLAS-ALL',
          requirement:'Atlas identifies every impacted implementation point in the entire codebase.',
          claimScope:{capability:'CAP-ATLAS',breadth:'repository-complete',dimensions:['all-implementation-points']},
          requiredCapabilities:['CAP-ATLAS'],
          evidence:{implementation:['EVID-ATLAS-STRONG'],outcome:['EVID-ATLAS-STRONG']},
          forbiddenRegressions:[{id:'NEG-ATLAS-OMISSION',statement:'No affected implementation point is omitted.',evidence:['EVID-ATLAS-STRONG']}],
        }],
      },
    };
    const strong=[{
      id:'EVID-ATLAS-STRONG',status:'success',sourceCommit:exact.head,branch:exact.branch,stateVersion:exact.stateVersion,runId:'run-1',
      semantics:{
        producer:'atlas-adversarial-suite',
        capabilities:['CAP-ATLAS'],
        scopeStrength:4,
        scope:'repository-complete-semantic-impact',
        dimensions:['all-implementation-points','symbols','semantic-consumers','execution-routes','unknowns'],
        whatItProves:'Repository-wide adversarial semantic impact cases passed on this exact state.',
        whatItDoesNotProve:['Dynamic runtime relationships outside modeled authorities remain explicit UNKNOWN.'],
        classification:'adversarial',
        confidence:1,
        negativeEvidence:[],
        dependencies:['TypeScript Program','Authority Graph'],
      },
    }];
    const verified=evaluateCompletionTruth({plan,evidence:strong,currentExactState:exact});
    expect(verified.truthStatus).toBe('VERIFIED');
    expect(verified.internalState).toBe('VERIFIED_DONE');
    expect(verified.poStatus).toBe('DONE');

    const missingDimension=structuredClone(strong);
    missingDimension[0].semantics.dimensions=['symbols','semantic-consumers','execution-routes','unknowns'];
    const dimensionOverclaim=evaluateCompletionTruth({plan,evidence:missingDimension,currentExactState:exact});
    expect(dimensionOverclaim.truthStatus).toBe('OVERCLAIM');
    expect(dimensionOverclaim.requirementResults[0].missingDimensions).toEqual(['all-implementation-points']);

    const wrongCapability=structuredClone(strong);
    wrongCapability[0].semantics.capabilities=['CAP-RELEASE'];
    const unknown=evaluateCompletionTruth({plan,evidence:wrongCapability,currentExactState:exact});
    expect(unknown.truthStatus).toBe('UNKNOWN');
    expect(unknown.internalState).toBe('UNKNOWN');
    expect(unknown.poStatus).toBe('NOT DONE');

    const stale=structuredClone(strong);
    stale[0].sourceCommit='older-head';
    const staleReport=evaluateCompletionTruth({plan,evidence:stale,currentExactState:exact});
    expect(staleReport.truthStatus).toBe('STALE');
    expect(staleReport.internalState).toBe('STALE_EVIDENCE');

    const blocked=structuredClone(strong);
    blocked[0].status='cancelled';
    const blockedReport=evaluateCompletionTruth({plan,evidence:blocked,currentExactState:exact});
    expect(blockedReport.truthStatus).toBe('FAILED');
    expect(blockedReport.internalState).toBe('BLOCKED');
  });

  it('closes only a VERIFIED exact implementation head and fails closed on later material changes',()=>{
    const source=json('quality/development/active-plan.json');
    const truth={
      contract:'shoporation.completion-truth.v2',
      taskId:source.taskId,
      sourceRef:source.completionContract.sourceRef,
      decision:'PASS',
      truthStatus:'VERIFIED',
      internalState:'VERIFIED_DONE',
      currentExactState:{head:'verified123',branch:'feature/test',stateVersion:'shoporation-ci.v1'},
    };
    const closed=buildClosedDevelopmentPlan({plan:source,truthReport:truth,currentHead:'verified123',closedAt:'2026-10-01T16:00:00.000Z'});
    expect(closed.status).toBe('closed');
    expect(closed.lifecycle).toMatchObject({state:'LEARN',truthStatus:'VERIFIED',verifiedImplementationHead:'verified123'});
    const metadataOnly=evaluateClosedDevelopmentPlan({
      plan:closed,
      currentExactState:{head:'closure456',branch:'feature/test',stateVersion:'shoporation-ci.v1'},
      changedSinceVerified:['quality/development/active-plan.json'],
      verifiedHeadIsAncestor:true,
      planIssues:[],
    });
    expect(metadataOnly.truthStatus).toBe('VERIFIED');
    const material=evaluateClosedDevelopmentPlan({
      plan:closed,
      currentExactState:{head:'changed789',branch:'feature/test',stateVersion:'shoporation-ci.v1'},
      changedSinceVerified:['quality/development/active-plan.json','src/runtime.ts'],
      verifiedHeadIsAncestor:true,
      planIssues:[],
    });
    expect(material.truthStatus).toBe('FAILED');
    expect(material.decision).toBe('BLOCK');
  });
});
