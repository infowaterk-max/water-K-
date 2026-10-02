import{mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync}from'node:fs';
import{tmpdir}from'node:os';
import path from'node:path';
import{spawnSync}from'node:child_process';
import{describe,expect,it}from'vitest';
// @ts-ignore JavaScript runtime module intentionally has no separate declaration file.
import{evaluateSentinelIntegrity,normalizeSentinelControlPlaneEvidence}from'../scripts/lib/shoperation-sentinel-integrity.mjs';

const guard=(id:string,options:Record<string,unknown>={})=>({
  id,name:id,blocking:true,responsibilityKey:`responsibility-${id}`,
  verification:{dependsOn:[]},
  proofSemantics:{capabilities:['CAP-QUALITY'],scopeStrength:2,scope:'test',dimensions:['status','truth','freshness','coverage','limitations','claim-scope','evidence-scope','proven-scope']},
  ...options,
});
const registry=(guards:unknown[])=>({contract:'shoporation.guard-registry.v1',guards});
const plan=(requirements:unknown[]=[])=>({contract:'shoporation.development-plan.v1',completionContract:{requirements}});
const requirement={
  id:'REQ-INTEGRITY',requirement:'Structured integrity must remain coherent.',
  claimScope:{capability:'CAP-QUALITY',strength:2,dimensions:['status','truth','coverage']},requiredCapabilities:['CAP-QUALITY'],
  evidence:{implementation:['G-QUALITY'],outcome:['G-QUALITY']},
  forbiddenRegressions:[{id:'NEG-INTEGRITY',statement:'No laundering',evidence:['G-QUALITY']}],
};
const evaluate=(overrides:Record<string,unknown>={})=>evaluateSentinelIntegrity({sourceCommit:'abc123',guardRegistry:registry([guard('G-QUALITY')]),plan:plan([requirement]),evidenceRecords:[],...overrides});

describe('Sentinel integrity correlation',()=>{
  it('passes a coherent registry, completion claim and evidence set',()=>{
    const report=evaluate();
    expect(report.decision).toBe('PASS');
    expect(report.findings).toEqual([]);
    expect(report.authority).toBe(false);
    expect(report.blocking).toBe(false);
    expect(report.autoMutationAllowed).toBe(false);
  });
  it('detects child BLOCK hidden by parent PASS',()=>{
    const report=evaluate({evidenceRecords:[{id:'edit-time',parentDecision:'PASS',childDecisions:['PASS','BLOCK']}]});
    expect(report.decision).toBe('BLOCK');
    expect(report.findings.some((x:{code:string})=>x.code==='SENTINEL_INTEGRITY_STATUS_LAUNDERING')).toBe(true);
  });
  it('detects producer BLOCK hidden by workflow success',()=>{
    const report=evaluate({evidenceRecords:[{id:'producer',workflowOutcome:'success',artifactDecision:'BLOCK'}]});
    expect(report.findings.some((x:{code:string})=>x.code==='SENTINEL_INTEGRITY_PRODUCER_WORKFLOW_MISMATCH')).toBe(true);
  });
  it('detects transaction identity drift and unresolved identity',()=>{
    const report=evaluate({evidenceRecords:[{id:'transaction',transaction:{declaredBase:'base-a',evaluatedBase:'base-b',declaredHead:'head-a',evaluatedHead:'head-a',baseResolution:'DECLARED',headResolution:'EXPLICIT'}}]});
    expect(report.findings.some((x:{code:string})=>x.code==='SENTINEL_INTEGRITY_TRANSACTION_IDENTITY_DRIFT')).toBe(true);
    const unresolved=evaluate({evidenceRecords:[{id:'transaction',transaction:{declaredBase:'base-a',evaluatedBase:null,baseResolution:'UNRESOLVED'}}]});
    expect(unresolved.findings.some((x:{code:string})=>x.code==='SENTINEL_INTEGRITY_TRANSACTION_IDENTITY_DRIFT')).toBe(true);
  });
  it('detects deletion blindness and incomplete coverage',()=>{
    const report=evaluate({evidenceRecords:[{id:'reference-sync',deletedFiles:['old.ts'],observedFiles:['new.ts'],coverage:{expected:5,observed:4,truncated:true}}]});
    expect(report.findings.some((x:{code:string})=>x.code==='SENTINEL_INTEGRITY_DELETION_VISIBILITY_DRIFT')).toBe(true);
    expect(report.findings.some((x:{code:string})=>x.code==='SENTINEL_INTEGRITY_COVERAGE_INCOMPLETE')).toBe(true);
  });
  it('detects duplicate blocking ownership, unknown dependencies and cycles',()=>{
    const guards=[guard('A',{responsibilityKey:'shared',verification:{dependsOn:['B']}}),guard('B',{responsibilityKey:'shared',verification:{dependsOn:['A','MISSING']}}),guard('G-QUALITY')];
    const report=evaluate({guardRegistry:registry(guards)});
    expect(report.findings.some((x:{code:string})=>x.code==='SENTINEL_INTEGRITY_DUPLICATE_BLOCKING_RESPONSIBILITY')).toBe(true);
    expect(report.findings.some((x:{code:string})=>x.code==='SENTINEL_INTEGRITY_UNKNOWN_GUARD_DEPENDENCY')).toBe(true);
    expect(report.findings.some((x:{code:string})=>x.code==='SENTINEL_INTEGRITY_GUARD_DEPENDENCY_CYCLE')).toBe(true);
  });
  it('detects current proof-semantics drift instead of trusting an old evidence ID',()=>{
    const weak=guard('G-QUALITY',{proofSemantics:{capabilities:['CAP-ATLAS'],scopeStrength:1,scope:'weak',dimensions:['status']}});
    const report=evaluate({guardRegistry:registry([weak])});
    expect(report.findings.some((x:{code:string})=>x.code==='SENTINEL_INTEGRITY_PROOF_CAPABILITY_DRIFT')).toBe(true);
    expect(report.findings.some((x:{code:string})=>x.code==='SENTINEL_INTEGRITY_PROOF_SCOPE_OVERCLAIM')).toBe(true);
    expect(report.findings.some((x:{code:string})=>x.code==='SENTINEL_INTEGRITY_PROOF_DIMENSION_DRIFT')).toBe(true);
  });
  it('normalizes real Control Plane-shaped evidence and catches object child decisions',()=>{
    const records=normalizeSentinelControlPlaneEvidence({
      plan:{changeBaseSha:'base-a'},
      run:{headSha:'head-a',conclusion:'success'},
      planBeforeCode:{decision:'PASS',base:'base-a',head:'head-a',transactionIdentity:{requestedBase:'base-a',baseResolution:'DECLARED',requestedHead:'head-a',headResolution:'EXPLICIT'},deletedFiles:['old.ts'],changedFiles:['old.ts']},
      editTime:{decision:'PASS',base:'base-a',head:'head-a',baseResolution:'DECLARED',headResolution:'EXPLICIT',materialFiles:['old.ts'],deletedFiles:['old.ts'],childDecisions:{referenceSync:'PASS',implementationSync:'BLOCK'},referenceSync:{coverage:{totalCandidateCount:5,processedCandidateCount:5,overflow:0,decision:'PASS'}}},
      collectionExpected:true,
    });
    const report=evaluate({evidenceRecords:records});
    expect(report.findings.some((x:{code:string})=>x.code==='SENTINEL_INTEGRITY_STATUS_LAUNDERING')).toBe(true);
  });

  it('detects broad review exceptions as integrity drift',()=>{
    const report=evaluate({plan:{contract:'shoporation.development-plan.v1',exceptions:[{ruleId:'RULE-WIDE',reason:'too broad'}],completionContract:{requirements:[requirement]}}});
    expect(report.findings.some((x:{code:string})=>x.code==='SENTINEL_INTEGRITY_EXCEPTION_SCOPE_BROAD')).toBe(true);
  });

  it('runs the daily integrity probe against real registry/plan plus normalized main evidence',()=>{
    const dir=mkdtempSync(path.join(tmpdir(),'sentinel-integrity-probe-')),evidenceDir=path.join(dir,'evidence'),out=path.join(dir,'out');
    mkdirSync(evidenceDir,{recursive:true});
    const activePlan=JSON.parse(readFileSync('quality/development/active-plan.json','utf8'));
    writeFileSync(path.join(evidenceDir,'run.json'),JSON.stringify({headSha:'head-a',conclusion:'success'}));
    writeFileSync(path.join(evidenceDir,'plan-before-code.json'),JSON.stringify({
      decision:'PASS',base:activePlan.changeBaseSha,head:'head-a',
      transactionIdentity:{requestedBase:activePlan.changeBaseSha,baseResolution:'DECLARED',requestedHead:'head-a',headResolution:'EXPLICIT'},
      deletedFiles:[],changedFiles:[],
    }));
    writeFileSync(path.join(evidenceDir,'edit-time-guard.json'),JSON.stringify({
      decision:'PASS',base:activePlan.changeBaseSha,head:'head-a',baseResolution:'DECLARED',headResolution:'EXPLICIT',
      materialFiles:[],deletedFiles:[],childDecisions:{referenceSync:'PASS',implementationSync:'PASS',poInstructionState:'PASS'},
      referenceSync:{coverage:{totalCandidateCount:0,processedCandidateCount:0,overflow:0,decision:'PASS'}},
    }));
    const probePath=path.join(out,'integrity-probe.json');
    const result=spawnSync(process.execPath,['scripts/shoperation-sentinel-integrity-probe.mjs'],{
      encoding:'utf8',
      env:{...process.env,SHOPERATION_SENTINEL_OUT_DIR:out,SHOPERATION_SENTINEL_INTEGRITY_PROBE:probePath,SHOPERATION_SENTINEL_CONTROL_PLANE_EVIDENCE_DIR:evidenceDir,SHOPERATION_SOURCE_COMMIT:'head-a'},
    });
    const report=result.status===0?JSON.parse(readFileSync(probePath,'utf8')):null;
    rmSync(dir,{recursive:true,force:true});
    expect(result.status).toBe(0);
    expect(report.contract).toBe('shoporation.sentinel-integrity-report.v1');
    expect(report.decision).toBe('PASS');
    expect(report.controlPlaneEvidence.fileCount).toBeGreaterThanOrEqual(3);
  });

  it('keeps unknown evidence visible instead of manufacturing PASS',()=>{
    const report=evaluate({evidenceRecords:[{id:'probe-source',state:'UNKNOWN'}]});
    expect(report.decision).toBe('REVIEW');
    expect(report.findings.some((x:{code:string})=>x.code==='SENTINEL_INTEGRITY_EVIDENCE_UNKNOWN')).toBe(true);
  });
});
