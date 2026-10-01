// @ts-nocheck
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';
import {
  checkpointChecksum,
  classifySemanticUnits,
  finalizeVerification,
  loadCheckpoint,
  planFromSnapshots,
  sealCheckpointTruth,
  validateCheckpoint,
  validateVerificationGraph,
} from '../scripts/lib/shoperation-verification-reuse.mjs';

const identity=(gateId,overrides={})=>({
  gateId,
  reusePolicy:'safe',
  dependsOn:[],
  impactTier:1,
  shadowComparable:true,
  knownFailureConsumer:false,
  gateVersionHash:'gv1',
  semanticInputHash:'s1',
  implementationHash:'i1',
  authorityHash:'a1',
  configurationHash:'c1',
  toolchainHash:'t1',
  environmentHash:'e1',
  contextHash:'x1',
  dependencyFingerprint:'d1',
  fingerprint:'fp-'+gateId,
  ...overrides,
});
const current=(gates,overrides={})=>({
  schemaVersion:'shoporation.verification-reuse.v1',
  head:'head-2',
  branch:'feature/test',
  graphValid:true,
  graphIssues:[],
  gates,
  coveredPatterns:['src/**','tests/**','quality/**','.github/**'],
  nonSemanticPatterns:['docs/**','README.md'],
  ...overrides,
});
const checkpoint=(gates,overrides={})=>({
  contract:'shoporation.verification-checkpoint.v1',
  schemaVersion:'shoporation.verification-reuse.v1',
  complete:true,
  sourceCommit:'head-1',
  branch:'feature/test',
  stateVersion:'shoporation-ci.v1',
  runId:'1-1',
  activeFailureIds:['KF-1'],
  gates:Object.fromEntries(Object.entries(gates).map(([id,value])=>[id,{...value,status:'PASS',sourceCommit:'head-1',originSourceCommit:'head-1'}])),
  createdAt:'2026-10-01T00:00:00.000Z',
  ...overrides,
});
const valid={ok:true,issues:[]};
const plan=(cur,cp,options={})=>planFromSnapshots({
  current:cur,
  previousCheckpoint:cp,
  checkpointValidation:valid,
  changedFiles:options.changedFiles??[],
  dirty:options.dirty??false,
  activeFailureIds:options.activeFailureIds??['KF-1'],
  forceFullRequested:options.forceFullRequested??false,
});

describe('dependency-aware resumable verification',()=>{
  it('reuses unchanged semantic input on a new exact HEAD',()=>{
    const a=identity('A');
    const report=plan(current({A:a}),checkpoint({A:a}),{changedFiles:['docs/note.md']});
    expect(report.verificationMode).toBe('RESUMED');
    expect(report.reusableEvidenceSet).toEqual(['A']);
    expect(report.rerunSet).toEqual([]);
  });

  it('local fix reruns the local gate and downstream dependents only',()=>{
    const oldA=identity('A'),oldB=identity('B'),oldC=identity('C',{dependsOn:['B'],dependencyFingerprint:'db1',fingerprint:'fc1'});
    const newA={...oldA},newB={...oldB,semanticInputHash:'s2',fingerprint:'fb2'};
    const newC={...oldC,dependencyFingerprint:'db2',fingerprint:'fc2'};
    const report=plan(current({A:newA,B:newB,C:newC}),checkpoint({A:oldA,B:oldB,C:oldC}),{changedFiles:['src/local.ts']});
    expect(report.reusableEvidenceSet).toContain('A');
    expect(report.rerunSet).toEqual(expect.arrayContaining(['B','C']));
    expect(report.gates.C.reasons).toContain('dependency-change');
  });

  it('shared dependency invalidates every declared consumer transitively',()=>{
    const oldS=identity('SHARED'),oldB=identity('B',{dependsOn:['SHARED']}),oldC=identity('C',{dependsOn:['B']});
    const newS={...oldS,semanticInputHash:'changed',fingerprint:'shared-2'};
    const newB={...oldB,dependencyFingerprint:'dep-2',fingerprint:'b-2'};
    const newC={...oldC,dependencyFingerprint:'dep-3',fingerprint:'c-2'};
    const report=plan(current({SHARED:newS,B:newB,C:newC}),checkpoint({SHARED:oldS,B:oldB,C:oldC}),{changedFiles:['src/shared.ts']});
    expect(report.rerunSet).toEqual(expect.arrayContaining(['SHARED','B','C']));
  });

  it('schema or authority change invalidates affected evidence',()=>{
    const old=identity('SCHEMA'),next={...old,authorityHash:'authority-2',fingerprint:'schema-2'};
    const report=plan(current({SCHEMA:next}),checkpoint({SCHEMA:old}),{changedFiles:['quality/authority.json']});
    expect(report.gates.SCHEMA.action).toBe('RERUN');
    expect(report.gates.SCHEMA.reasons).toContain('authority-change');
  });

  it('gate implementation version change invalidates that gate',()=>{
    const old=identity('GATE'),next={...old,gateVersionHash:'gv2',fingerprint:'gate-2'};
    const report=plan(current({GATE:next}),checkpoint({GATE:old}),{changedFiles:['src/gate.ts']});
    expect(report.gates.GATE.reasons).toContain('gate-version-change');
  });

  it('configuration change invalidates only dependent verification identity',()=>{
    const old=identity('CONFIG'),next={...old,configurationHash:'c2',fingerprint:'config-2'};
    const report=plan(current({CONFIG:next}),checkpoint({CONFIG:old}),{changedFiles:['.github/ci.yml']});
    expect(report.gates.CONFIG.reasons).toContain('config-change');
  });

  it('unrelated documented change keeps reusable evidence',()=>{
    const a=identity('A');
    const report=plan(current({A:a}),checkpoint({A:a}),{changedFiles:['docs/readme.md']});
    expect(report.gates.A.action).toBe('REUSE');
    expect(report.evidence.reused).toBe(1);
  });

  it('unknown changed file fails closed to full verification',()=>{
    const a=identity('A');
    const report=plan(current({A:a}),checkpoint({A:a}),{changedFiles:['mystery/file.xyz']});
    expect(report.verificationMode).toBe('FULL');
    expect(report.reasons).toContain('unknown-dependency');
    expect(report.gates.A.state).toBe('UNKNOWN');
    expect(report.gates.A.action).toBe('RERUN');
  });

  it('Known Failure scope can widen a minimal replay',()=>{
    const a=identity('A',{knownFailureConsumer:true}),b=identity('B');
    const report=plan(current({A:a,B:b}),checkpoint({A:a,B:b}),{activeFailureIds:['KF-1','KF-2']});
    expect(report.gates.A.action).toBe('RERUN');
    expect(report.gates.A.reasons).toContain('known-failure-scope-change');
    expect(report.gates.B.action).toBe('REUSE');
  });

  it('dirty workspace fails closed',()=>{
    const a=identity('A');
    const report=plan(current({A:a}),checkpoint({A:a}),{dirty:true});
    expect(report.verificationMode).toBe('FULL');
    expect(report.reasons).toContain('dirty-workspace');
  });

  it('explicit force full verification is authoritative',()=>{
    const a=identity('A');
    const report=plan(current({A:a}),checkpoint({A:a}),{forceFullRequested:true});
    expect(report.verificationMode).toBe('FULL');
    expect(report.reasons).toContain('force-full-verification');
  });

  it('corrupted checkpoint checksum is rejected',()=>{
    const a=identity('A'),cp=checkpoint({A:a});
    cp.checksum='corrupt';
    const result=validateCheckpoint(cp,{branch:'feature/test',head:'head-2',requireAncestor:false});
    expect(result.ok).toBe(false);
    expect(result.issues.map(issue=>issue.code)).toContain('CHECKPOINT_CHECKSUM_INVALID');
  });

  it('invalid JSON checkpoint is treated as corrupted cache',()=>{
    const dir=mkdtempSync(join(tmpdir(),'shoporation-checkpoint-')),file=join(dir,'checkpoint.json');
    try{
      writeFileSync(file,'{broken');
      const loaded=loadCheckpoint(file);
      expect(loaded.validation.ok).toBe(false);
      expect(loaded.validation.issues[0].code).toBe('CHECKPOINT_CORRUPTED');
    }finally{rmSync(dir,{recursive:true,force:true});}
  });

  it('interrupted checkpoint cannot resume',()=>{
    const a=identity('A'),cp=checkpoint({A:a},{complete:false});
    cp.checksum=checkpointChecksum(cp);
    const result=validateCheckpoint(cp,{branch:'feature/test',head:'head-2',requireAncestor:false});
    expect(result.issues.map(issue=>issue.code)).toContain('CHECKPOINT_INCOMPLETE');
  });

  it('stale or non-pass prior evidence is UNKNOWN and rerun',()=>{
    const a=identity('A'),cp=checkpoint({A:a});
    cp.gates.A.status='FAIL';
    const report=plan(current({A:a}),cp);
    expect(report.gates.A.state).toBe('UNKNOWN');
    expect(report.gates.A.action).toBe('RERUN');
  });

  it('branch change is rejected by checkpoint reconciliation',()=>{
    const a=identity('A'),cp=checkpoint({A:a});
    cp.checksum=checkpointChecksum(cp);
    const result=validateCheckpoint(cp,{branch:'other-branch',head:'head-2',requireAncestor:false});
    expect(result.issues.map(issue=>issue.code)).toContain('CHECKPOINT_BRANCH_MISMATCH');
  });

  it('shared CSS or design token change invalidates visual identity',()=>{
    const old=identity('VISUAL'),next={...old,semanticInputHash:'css-2',contextHash:'viewport-2',fingerprint:'visual-2'};
    const report=plan(current({VISUAL:next}),checkpoint({VISUAL:old}),{changedFiles:['src/theme/tokens.ts']});
    expect(report.gates.VISUAL.action).toBe('RERUN');
    expect(report.gates.VISUAL.reasons).toEqual(expect.arrayContaining(['semantic-input-change','context-change']));
  });

  it('transitive dependency change cannot leave downstream evidence reusable',()=>{
    const a=identity('A'),b=identity('B',{dependsOn:['A']}),c=identity('C',{dependsOn:['B']});
    const nextA={...a,semanticInputHash:'a2',fingerprint:'a2'};
    const nextB={...b,dependencyFingerprint:'b2',fingerprint:'b2'};
    const nextC={...c,dependencyFingerprint:'c2',fingerprint:'c2'};
    const report=plan(current({A:nextA,B:nextB,C:nextC}),checkpoint({A:a,B:b,C:c}),{changedFiles:['src/core.ts']});
    expect(report.rerunSet).toEqual(expect.arrayContaining(['A','B','C']));
  });

  it('UNKNOWN is never reusable',()=>{
    const a=identity('A'),cp=checkpoint({A:a});
    delete cp.gates.A.fingerprint;
    const report=plan(current({A:a}),cp);
    expect(report.gates.A.state).toBe('UNKNOWN');
    expect(report.gates.A.action).toBe('RERUN');
  });

  it('shadow mode blocks false reuse when full verification disagrees',()=>{
    const a=identity('A');
    const replay=plan(current({A:a}),checkpoint({A:a}));
    const final=finalizeVerification({plan:replay,outcomes:{A:'failure'},runId:'2-1'});
    expect(final.decision).toBe('BLOCK');
    expect(final.manifest.shadowComparison.discrepancies.map(item=>item.code)).toContain('SHADOW_FALSE_REUSE');
  });

  it('blocks interrupted shadow control without counting it as false reuse',()=>{
    const a=identity('A');
    const replay=plan(current({A:a}),checkpoint({A:a}));
    const final=finalizeVerification({plan:replay,outcomes:{A:'cancelled'},runId:'cancelled-1'});
    expect(final.decision).toBe('BLOCK');
    expect(final.manifest.shadowComparison.discrepancies.map((item:any)=>item.code)).toContain('SHADOW_FULL_EVIDENCE_INCOMPLETE');
    expect(final.manifest.shadowComparison.discrepancies.map((item:any)=>item.code)).not.toContain('SHADOW_FALSE_REUSE');
    expect(final.manifest.shadowStats.falseReuse).toBe(0);
    expect(final.checkpoint.complete).toBe(false);
  });

  it('shadow mode emits complete exact-head evidence after full agreement',()=>{
    const a=identity('A');
    const replay=plan(current({A:a}),checkpoint({A:a}));
    const final=finalizeVerification({plan:replay,outcomes:{A:'success'},runId:'2-1'});
    expect(final.decision).toBe('PASS');
    expect(final.manifest.sourceCommit).toBe('head-2');
    expect(final.manifest.gates.A.originSourceCommit).toBe('head-2');
    expect(final.checkpoint.complete).toBe(true);
  });

  it('narrows an unambiguous template FAQ diff to the FAQ proof scope',()=>{
    const registry={verificationReuse:{semanticUnits:[
      {id:'TEMPLATE.LOCAL',kind:'template',filePatterns:['src/lib/builder/templates/**'],impactTier:2,scope:'changed-template',allowPageNarrowing:true},
      {id:'TEMPLATE.PAGE.FAQ',kind:'page',parent:'TEMPLATE.LOCAL',diffPattern:'\\bfaq\\b|gyik',pageType:'faq',impactTier:1,scope:'changed-template-page-all-viewports'},
      {id:'TEMPLATE.PAGE.CART',kind:'page',parent:'TEMPLATE.LOCAL',diffPattern:'\\bcart\\b|kosár',pageType:'cart',impactTier:1,scope:'changed-template-page-all-viewports'},
    ]}};
    const units=classifySemanticUnits({registry,changedFiles:['src/lib/builder/templates/demo.ts'],diffByFile:{'src/lib/builder/templates/demo.ts':'+ const buildFaq=()=>pageType:faq;'}});
    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({id:'TEMPLATE.PAGE.FAQ',pageType:'faq',impactTier:1,narrowed:true});
  });

  it('widens ambiguous multi-page template diffs to the template package scope',()=>{
    const registry={verificationReuse:{semanticUnits:[
      {id:'TEMPLATE.LOCAL',kind:'template',filePatterns:['src/lib/builder/templates/**'],impactTier:2,scope:'changed-template',allowPageNarrowing:true},
      {id:'TEMPLATE.PAGE.FAQ',kind:'page',parent:'TEMPLATE.LOCAL',diffPattern:'\\bfaq\\b',pageType:'faq',impactTier:1,scope:'changed-template-page-all-viewports'},
      {id:'TEMPLATE.PAGE.CART',kind:'page',parent:'TEMPLATE.LOCAL',diffPattern:'\\bcart\\b',pageType:'cart',impactTier:1,scope:'changed-template-page-all-viewports'},
    ]}};
    const units=classifySemanticUnits({registry,changedFiles:['src/lib/builder/templates/demo.ts'],diffByFile:{'src/lib/builder/templates/demo.ts':'+ faq + cart'}});
    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({id:'TEMPLATE.LOCAL',impactTier:2,narrowed:false});
  });

  it('widens design-token changes to every page and viewport of the changed template',()=>{
    const registry={verificationReuse:{semanticUnits:[
      {id:'TEMPLATE.LOCAL',kind:'template',filePatterns:['src/lib/builder/templates/**'],impactTier:2,scope:'changed-template',allowPageNarrowing:true},
      {id:'TEMPLATE.DESIGN_TOKENS',kind:'template-wide',parent:'TEMPLATE.LOCAL',diffPattern:'DESIGN_TOKENS|--shoporation-',impactTier:3,scope:'changed-template-all-pages-viewports'},
      {id:'TEMPLATE.PAGE.FAQ',kind:'page',parent:'TEMPLATE.LOCAL',diffPattern:'\\bfaq\\b',pageType:'faq',impactTier:1,scope:'changed-template-page-all-viewports'},
    ]}};
    const units=classifySemanticUnits({registry,changedFiles:['src/lib/builder/templates/demo.ts'],diffByFile:{'src/lib/builder/templates/demo.ts':'+ DEMO_DESIGN_TOKENS --shoporation-color-background'}});
    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({id:'TEMPLATE.DESIGN_TOKENS',impactTier:3,scope:'changed-template-all-pages-viewports'});
  });

  it('uses semantic proof-unit impact as a replay tier floor',()=>{
    const a=identity('A');
    const report=planFromSnapshots({current:current({A:a}),previousCheckpoint:checkpoint({A:a}),checkpointValidation:valid,changedFiles:['src/lib/builder/templates/demo.ts'],activeFailureIds:['KF-1'],semanticImpact:[{id:'TEMPLATE.PAGE.FAQ',impactTier:1,scope:'changed-template-page-all-viewports',files:['src/lib/builder/templates/demo.ts']}]});
    expect(report.replayTier).toBe(1);
    expect(report.changeImpactSet.changedSemanticUnits).toEqual(['TEMPLATE.PAGE.FAQ']);
    expect(report.changeImpactSet.proofScopes[0].scope).toBe('changed-template-page-all-viewports');
  });

  it('tracks shadow promotion proof without claiming physical runtime savings',()=>{
    const a=identity('A');
    const cp=checkpoint({A:a},{shadowStats:{passes:2,resumedPasses:1,falseReuse:0},verificationEngineHash:'engine-same'});
    const replay=planFromSnapshots({current:{...current({A:a}),verificationEngineHash:'engine-same',promotionPolicy:{minimumShadowPasses:3,minimumResumedShadowPasses:2,maximumFalseReuse:0}},previousCheckpoint:cp,checkpointValidation:valid,changedFiles:[],activeFailureIds:['KF-1']});
    const final=finalizeVerification({plan:{...replay,plannerStartedAtMs:Date.now()-5},outcomes:{A:'success'},priorCheckpoint:cp,runId:'3-1'});
    expect(final.manifest.shadowStats).toMatchObject({passes:3,resumedPasses:2,falseReuse:0,promotionEligible:true});
    expect(final.manifest.metrics.physicalRuntimeSavingMs).toBe(0);
    expect(final.manifest.metrics.physicalRuntimeSavingReason).toBe('shadow-mode-full-control-authoritative');
  });

  it('does not carry promotion credit from a legacy checkpoint without engine identity',()=>{
    const a=identity('A');
    const cp=checkpoint({A:a},{verificationMode:'RESUMED'});
    delete cp.shadowStats;
    delete cp.verificationEngineHash;
    const replay=planFromSnapshots({current:{...current({A:a}),verificationEngineHash:'engine-new',promotionPolicy:{minimumShadowPasses:3,minimumResumedShadowPasses:2,maximumFalseReuse:0}},previousCheckpoint:cp,checkpointValidation:valid,changedFiles:[],activeFailureIds:['KF-1']});
    const final=finalizeVerification({plan:replay,outcomes:{A:'success'},priorCheckpoint:cp,runId:'legacy-2'});
    expect(final.manifest.shadowStats).toMatchObject({passes:1,resumedPasses:1,falseReuse:0,promotionEligible:false});
  });

  it('maps repository instructions as an explicit verification authority input',()=>{
    const registry=JSON.parse(readFileSync('quality/knowledge/guard-registry.v1.json','utf8'));
    expect(registry.verificationReuse.semanticUnits.some((unit:any)=>unit.id==='INSTRUCTION.LEDGER'&&unit.filePatterns.includes('AGENTS.md'))).toBe(true);
    for(const id of ['GUARD-PLAN-BEFORE-CODE','GUARD-EDIT-TIME','GUARD-INCREMENTAL-REPLAY','GUARD-COMPLETION-TRUTH']){
      expect(registry.guards.find((gate:any)=>gate.id===id)?.verification?.authorityInputs).toContain('AGENTS.md');
    }
  });

  it('blocks ACTIVE execution without prior promotion proof',()=>{
    const a=identity('A');
    const cp=checkpoint({A:a},{shadowStats:{passes:2,resumedPasses:1,falseReuse:0,promotionEligible:false},verificationEngineHash:'engine-same'});
    const replay=planFromSnapshots({current:{...current({A:a}),requestedExecutionMode:'ACTIVE',verificationEngineHash:'engine-same',promotionPolicy:{physicalSkippingEnabled:true,minimumShadowPasses:3,minimumResumedShadowPasses:2,maximumFalseReuse:0,referenceFullRuntimeMs:1000}},previousCheckpoint:cp,checkpointValidation:valid,changedFiles:[],activeFailureIds:['KF-1']});
    expect(replay.executionMode).toBe('SHADOW');
    const final=finalizeVerification({plan:{...replay,executionMode:'ACTIVE',plannerStartedAtMs:Date.now()-10},outcomes:{A:'skipped'},priorCheckpoint:cp,runId:'active-block'});
    expect(final.decision).toBe('BLOCK');
    expect(final.manifest.comparison.discrepancies.map((item:any)=>item.code)).toContain('ACTIVE_WITHOUT_PROMOTION_PROOF');
  });

  it('reuses skipped safe evidence in ACTIVE mode only with fingerprint equivalence',()=>{
    const a=identity('A');
    const cp=checkpoint({A:a},{shadowStats:{passes:3,resumedPasses:2,falseReuse:0,promotionEligible:true},verificationEngineHash:'engine-same'});
    const replay=planFromSnapshots({current:{...current({A:a}),requestedExecutionMode:'ACTIVE',verificationEngineHash:'engine-same',promotionPolicy:{physicalSkippingEnabled:true,minimumShadowPasses:3,minimumResumedShadowPasses:2,maximumFalseReuse:0,referenceFullRuntimeMs:1000}},previousCheckpoint:cp,checkpointValidation:valid,changedFiles:[],activeFailureIds:['KF-1']});
    expect(replay.gates.A.action).toBe('REUSE');
    const final=finalizeVerification({plan:{...replay,plannerStartedAtMs:Date.now()-10},outcomes:{A:'skipped'},priorCheckpoint:cp,runId:'active-pass'});
    expect(final.decision).toBe('PASS');
    expect(final.manifest.executionMode).toBe('ACTIVE');
    expect(final.manifest.gates.A.execution).toBe('REUSED');
    expect(final.manifest.gates.A.originSourceCommit).toBe('head-1');
    expect(final.manifest.gates.A.reuseProof.fingerprintEquivalent).toBe(true);
    expect(final.manifest.truthEvidence[0]).toMatchObject({sourceCommit:'head-2',execution:'REUSED',originSourceCommit:'head-1'});
  });

  it('requires ACTIVE rerun gates to physically pass',()=>{
    const old=identity('A'),next={...old,semanticInputHash:'changed',fingerprint:'changed'};
    const cp=checkpoint({A:old},{shadowStats:{passes:3,resumedPasses:2,falseReuse:0,promotionEligible:true},verificationEngineHash:'engine-same'});
    const replay=planFromSnapshots({current:{...current({A:next}),requestedExecutionMode:'ACTIVE',verificationEngineHash:'engine-same',promotionPolicy:{physicalSkippingEnabled:true,minimumShadowPasses:3,minimumResumedShadowPasses:2,maximumFalseReuse:0}},previousCheckpoint:cp,checkpointValidation:valid,changedFiles:['src/a.ts'],activeFailureIds:['KF-1']});
    expect(replay.gates.A.action).toBe('RERUN');
    const final=finalizeVerification({plan:replay,outcomes:{A:'skipped'},priorCheckpoint:cp,runId:'active-rerun-missing'});
    expect(final.decision).toBe('BLOCK');
    expect(final.manifest.comparison.discrepancies.map((item:any)=>item.code)).toContain('ACTIVE_RERUN_FAILED_OR_MISSING');
  });

  it('forces full verification for tier-four semantic authority impact',()=>{
    const a=identity('A'),b=identity('B');
    const report=planFromSnapshots({
      current:current({A:a,B:b}),
      previousCheckpoint:checkpoint({A:a,B:b}),
      checkpointValidation:valid,
      changedFiles:['quality/knowledge/guard-registry.v1.json'],
      activeFailureIds:['KF-1'],
      semanticImpact:[{id:'AUTHORITY.CORE',impactTier:4,scope:'full-verification',files:['quality/knowledge/guard-registry.v1.json']}],
    });
    expect(report.verificationMode).toBe('FULL');
    expect(report.reasons).toContain('semantic-impact-requires-full-verification');
    expect(report.reusableEvidenceSet).toEqual([]);
    expect(report.uncertainEvidenceSet).toEqual(expect.arrayContaining(['A','B']));
    expect(report.rerunSet).toEqual(expect.arrayContaining(['A','B']));
  });

  it('falls back to SHADOW when ACTIVE promotion proof belongs to an older verification engine',()=>{
    const a=identity('A');
    const cp=checkpoint({A:a},{shadowStats:{passes:3,resumedPasses:2,falseReuse:0,promotionEligible:true},verificationEngineHash:'engine-old'});
    const report=planFromSnapshots({
      current:{...current({A:a}),requestedExecutionMode:'ACTIVE',verificationEngineHash:'engine-new'},
      previousCheckpoint:cp,
      checkpointValidation:valid,
      changedFiles:[],
      activeFailureIds:['KF-1'],
    });
    expect(report.executionMode).toBe('SHADOW');
    expect(report.promotionProofValid).toBe(false);
    expect(report.promotionEngineEquivalent).toBe(false);
    expect(report.reasons).toContain('promotion-engine-changed');
  });

  it('keeps ACTIVE disabled until promotion checkpoint is truth-sealed',()=>{
    const a=identity('A');
    const cp=checkpoint({A:a},{shadowStats:{passes:3,resumedPasses:2,falseReuse:0,promotionEligible:true},verificationEngineHash:'engine-same',truthVerified:false});
    const report=planFromSnapshots({
      current:{...current({A:a}),requestedExecutionMode:'ACTIVE',verificationEngineHash:'engine-same',promotionPolicy:{physicalSkippingEnabled:true,requireExactHeadTruth:true}},
      previousCheckpoint:cp,
      checkpointValidation:valid,
      changedFiles:[],
      activeFailureIds:['KF-1'],
    });
    expect(report.executionMode).toBe('SHADOW');
    expect(report.promotionTruthVerified).toBe(false);
    expect(report.promotionProofValid).toBe(false);
    expect(report.reasons).toContain('promotion-truth-unverified');
  });

  it('truth-seals an exact-head checkpoint and permits ACTIVE on the next revision',()=>{
    const a=identity('A');
    const cp=checkpoint({A:a},{shadowStats:{passes:3,resumedPasses:2,falseReuse:0,promotionEligible:true},verificationEngineHash:'engine-same',truthVerified:false});
    cp.checksum=checkpointChecksum(cp);
    const sealed=sealCheckpointTruth(cp,{
      currentExactState:{head:'head-1',branch:'feature/test',stateVersion:'shoporation-ci.v1'},
      truthReport:{decision:'PASS',internalState:'VERIFIED_DONE',poStatus:'DONE',runId:'truth-1',runAttempt:'1'},
    });
    expect(sealed.truthVerified).toBe(true);
    expect(sealed.truthGate).toMatchObject({decision:'PASS',internalState:'VERIFIED_DONE',sourceCommit:'head-1',branch:'feature/test'});
    expect(sealed.checksum).toBe(checkpointChecksum(sealed));
    expect(validateCheckpoint(sealed,{branch:'feature/test',head:'head-1',requireAncestor:false}).ok).toBe(true);
    const report=planFromSnapshots({
      current:{...current({A:a}),requestedExecutionMode:'ACTIVE',verificationEngineHash:'engine-same',promotionPolicy:{physicalSkippingEnabled:true,requireExactHeadTruth:true}},
      previousCheckpoint:sealed,
      checkpointValidation:valid,
      changedFiles:[],
      activeFailureIds:['KF-1'],
    });
    expect(report.promotionTruthVerified).toBe(true);
    expect(report.promotionProofValid).toBe(true);
    expect(report.executionMode).toBe('ACTIVE');
  });

  it('rejects truth sealing for stale exact-head identity or non-PASS truth',()=>{
    const a=identity('A');
    const cp=checkpoint({A:a},{verificationEngineHash:'engine-same'});
    cp.checksum=checkpointChecksum(cp);
    expect(()=>sealCheckpointTruth(cp,{
      currentExactState:{head:'wrong-head',branch:'feature/test',stateVersion:'shoporation-ci.v1'},
      truthReport:{decision:'PASS',internalState:'VERIFIED_DONE'},
    })).toThrow('CHECKPOINT_TRUTH_SEAL_HEAD_MISMATCH');
    expect(()=>sealCheckpointTruth(cp,{
      currentExactState:{head:'head-1',branch:'feature/test',stateVersion:'shoporation-ci.v1'},
      truthReport:{decision:'BLOCK',internalState:'BLOCKED'},
    })).toThrow('CHECKPOINT_TRUTH_SEAL_TRUTH_NOT_VERIFIED');
  });

  it('allows ACTIVE only when promotion proof matches the current verification engine',()=>{
    const a=identity('A');
    const cp=checkpoint({A:a},{shadowStats:{passes:3,resumedPasses:2,falseReuse:0,promotionEligible:true},verificationEngineHash:'engine-same'});
    const report=planFromSnapshots({
      current:{...current({A:a}),requestedExecutionMode:'ACTIVE',verificationEngineHash:'engine-same'},
      previousCheckpoint:cp,
      checkpointValidation:valid,
      changedFiles:[],
      activeFailureIds:['KF-1'],
    });
    expect(report.executionMode).toBe('ACTIVE');
    expect(report.promotionProofValid).toBe(true);
    expect(report.promotionEngineEquivalent).toBe(true);
  });

  it('forces SHADOW full control even with valid ACTIVE proof when tier-four impact requires FULL',()=>{
    const a=identity('A');
    const cp=checkpoint({A:a},{shadowStats:{passes:3,resumedPasses:2,falseReuse:0,promotionEligible:true},verificationEngineHash:'engine-same'});
    const report=planFromSnapshots({
      current:{...current({A:a}),requestedExecutionMode:'ACTIVE',verificationEngineHash:'engine-same'},
      previousCheckpoint:cp,
      checkpointValidation:valid,
      changedFiles:['quality/knowledge/guard-registry.v1.json'],
      activeFailureIds:['KF-1'],
      semanticImpact:[{id:'AUTHORITY.CORE',impactTier:4,scope:'full-verification',files:['quality/knowledge/guard-registry.v1.json']}],
    });
    expect(report.verificationMode).toBe('FULL');
    expect(report.executionMode).toBe('SHADOW');
    expect(report.reusableEvidenceSet).toEqual([]);
  });

  it('never physically skips safe gates while execution mode is SHADOW',()=>{
    const workflow=readFileSync('.github/workflows/ci.yml','utf8');
    for(const output of ['reuse_customer_baseline','reuse_market_ready','reuse_quality_tests','reuse_typecheck','reuse_production_build']){
      expect(workflow).toContain("steps.incremental-replay.outputs.execution_mode != 'ACTIVE' || steps.incremental-replay.outputs."+output+" != 'true'");
    }
  });

  it('truth-seals before checkpoint persistence in CI',()=>{
    const workflow=readFileSync('.github/workflows/ci.yml','utf8');
    const reconcile=workflow.indexOf('- name: Reconcile Resumable Verification');
    const truth=workflow.indexOf('- name: Completion Truth Gate');
    const save=workflow.indexOf('- name: Save Resumable Verification checkpoint');
    const upload=workflow.indexOf('- name: Upload Resumable Verification evidence');
    expect(reconcile).toBeGreaterThanOrEqual(0);
    expect(truth).toBeGreaterThan(reconcile);
    expect(save).toBeGreaterThan(truth);
    expect(upload).toBeGreaterThan(save);
    expect(workflow).toContain('SHOPERATION_TRUTH_CHECKPOINT: artifacts/shoperation-verification-cache/checkpoint.json');
    expect(workflow).toContain("steps.verification-finalize.outcome == 'success' && steps.completion-truth.outcome == 'success'");
  });

  it('binds promotion identity to engine code, CI and canonical verification policy',()=>{
    const registry=JSON.parse(readFileSync('quality/knowledge/guard-registry.v1.json','utf8'));
    expect(registry.verificationReuse.promotion.engineInputs).toEqual(expect.arrayContaining([
      'scripts/lib/shoperation-verification-reuse.mjs',
      'scripts/shoperation-incremental-replay.mjs',
      'scripts/shoperation-verification-checkpoint.mjs',
      'scripts/shoperation-truth-gate.mjs',
      '.github/workflows/ci.yml',
      'quality/knowledge/guard-registry.v1.json',
      'quality/knowledge/development-guard-policy.v1.json',
    ]));
  });

  it('verification graph rejects cycles and unknown dependencies',()=>{
    const registry={
      guards:[
        {id:'A',blocking:true,producer:'a',verification:{dependsOn:['B']}},
        {id:'B',blocking:true,producer:'b',verification:{dependsOn:['A','MISSING']}},
      ],
    };
    const result=validateVerificationGraph(registry);
    expect(result.ok).toBe(false);
    expect(result.issues.map(issue=>issue.code)).toEqual(expect.arrayContaining(['VERIFICATION_GRAPH_CYCLE','VERIFICATION_GRAPH_UNKNOWN_DEPENDENCY']));
  });
});
