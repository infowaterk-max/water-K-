import{mkdtempSync,readFileSync,rmSync,writeFileSync}from'node:fs';
import{tmpdir}from'node:os';
import path from'node:path';
import{spawnSync}from'node:child_process';
import{describe,expect,it}from'vitest';

const root=process.cwd();
const read=(p:string)=>readFileSync(path.join(root,p),'utf8');
const run=(snapshot:unknown)=>{
  const dir=mkdtempSync(path.join(tmpdir(),'sentinel-'));
  const snapshotPath=path.join(dir,'snapshot.json');
  const out=path.join(dir,'out');
  writeFileSync(snapshotPath,JSON.stringify(snapshot));
  const integrityPath=path.join(dir,'integrity.json');
  writeFileSync(integrityPath,JSON.stringify({
    contract:'shoporation.sentinel-integrity-report.v1',sourceCommit:'abc1234',generatedAt:'2026-09-28T12:00:00.000Z',
    decision:'PASS',authority:false,blocking:false,autoMutationAllowed:false,
    counts:{findings:0,action:0,review:0},categories:[],findings:[],
  }));
  const result=spawnSync(process.execPath,['scripts/shoperation-sentinel-scan.mjs'],{
    cwd:root,
    encoding:'utf8',
    env:{...process.env,SHOPERATION_SENTINEL_SNAPSHOT:snapshotPath,SHOPERATION_SENTINEL_OUT_DIR:out,SHOPERATION_SENTINEL_INTEGRITY_PROBE:integrityPath},
  });
  const report=result.status===0?JSON.parse(readFileSync(path.join(out,'sentinel-report.json'),'utf8')):null;
  rmSync(dir,{recursive:true,force:true});
  return{result,report};
};
const base=(overrides:Record<string,unknown>={})=>({
  contract:'shoporation.sentinel-source-snapshot.v1',
  repository:'infowaterk-max/water-K-',
  sourceCommit:'abc1234',
  collectedAt:'2026-09-28T12:00:00.000Z',
  workflowRuns:[],
  openIssues:[],
  ...overrides,
});

describe('Shoperation Sentinel',()=>{
  it('is scheduled observation, not a blocking or mutation authority',()=>{
    const workflow=read('.github/workflows/shoperation-sentinel.yml');
    const registry=JSON.parse(read('quality/knowledge/guard-registry.v1.json'));
    const signal=registry.guards.find((x:{id:string})=>x.id==='SIGNAL-SENTINEL');
    expect(workflow).toContain("cron: '17 4 * * *'");
    expect(workflow).toContain('Collect latest main Control Plane evidence');
    expect(workflow).toContain('Sentinel integrity probe');
    expect(workflow).toContain('Sync Sentinel attention issue');
    expect(workflow).toContain('compareCommits');
    expect(workflow).toContain("sourceScope=comparison.data.merge_base_commit?.sha===sourceCommit?'canonical':'development'");
    expect(signal.blocking).toBe(false);
    expect(signal.lifecycle).toBe('observation');
    const policy=JSON.parse(read('quality/knowledge/sentinel-policy.v1.json'));
    expect(policy.behavior.authority).toBe(false);
    expect(policy.behavior.autoMutationAllowed).toBe(false);
  });

  it('stays HEALTHY when recent evidence is clean',()=>{
    const{result,report}=run(base({workflowRuns:[
      {id:'1',name:'CI',event:'push',headBranch:'main',conclusion:'success',createdAt:'2026-09-28T08:00:00.000Z'},
      {id:'2',name:'Template Factory Quality Gate v2',event:'push',headBranch:'main',conclusion:'success',createdAt:'2026-09-27T08:00:00.000Z'},
    ]}));
    expect(result.status).toBe(0);
    expect(report.status).toBe('HEALTHY');
    expect(report.recommendations).toEqual([]);
    expect(report.autoMutationAllowed).toBe(false);
  });

  it('marks canonical unresolved Failure Intake as REVIEW without inventing authority',()=>{
    const{report}=run(base({
      workflowRuns:[{id:'main-1',name:'CI',event:'push',headBranch:'main',headSha:'abc1234',conclusion:'failure',createdAt:'2026-09-28T10:00:00.000Z'}],
      openIssues:[{number:41,title:'quality',body:'<!-- shoperation-failure-intake:SQ-FP-ABC -->\nSource commit: `abc1234`',updatedAt:'2026-09-28T10:00:00.000Z'}],
    }));
    expect(report.status).toBe('REVIEW');
    expect(report.openEvidence.fingerprints).toEqual(['SQ-FP-ABC']);
    expect(report.openEvidence.canonicalFailureIntakeIssues).toBe(1);
    expect(report.signals.some((x:{code:string})=>x.code==='SENTINEL_OPEN_FAILURE_INTAKE')).toBe(true);
    expect(report.authority).toBe(false);
  });

  it('reconciles feature-branch push intake as development evidence instead of platform health debt',()=>{
    const{report}=run(base({
      workflowRuns:[{id:'dev-1',name:'Template Factory Quality Gate v2',event:'push',headBranch:'feature/loot-vault',headSha:'def4567',conclusion:'failure',createdAt:'2026-09-28T10:00:00.000Z'}],
      openIssues:[{number:42,title:'quality',body:'<!-- shoperation-failure-intake:SQ-FP-DEV -->\nSource commit: `def4567`',updatedAt:'2026-09-28T10:00:00.000Z'}],
    }));
    expect(report.status).toBe('HEALTHY');
    expect(report.openEvidence.canonicalFailureIntakeIssues).toBe(0);
    expect(report.openEvidence.developmentFailureIntakeIssues).toBe(1);
    expect(report.openEvidence.developmentFingerprints).toEqual(['SQ-FP-DEV']);
    expect(report.signals.some((x:{code:string})=>x.code==='SENTINEL_OPEN_FAILURE_INTAKE')).toBe(false);
  });

  it('uses source-commit ancestry scope when the originating workflow run has aged out of the observation window',()=>{
    const development=run(base({openIssues:[{number:44,title:'quality',body:'<!-- shoperation-failure-intake:SQ-FP-OLD-DEV -->\nSource commit: `def4567`',sourceScope:'development',updatedAt:'2026-08-01T10:00:00.000Z'}]})).report;
    expect(development.status).toBe('HEALTHY');
    expect(development.openEvidence.developmentFailureIntakeIssues).toBe(1);
    expect(development.openEvidence.unknownFailureIntakeIssues).toBe(0);
    const canonical=run(base({openIssues:[{number:45,title:'quality',body:'<!-- shoperation-failure-intake:SQ-FP-OLD-MAIN -->\nSource commit: `abc1234`',sourceScope:'canonical',updatedAt:'2026-08-01T10:00:00.000Z'}]})).report;
    expect(canonical.status).toBe('REVIEW');
    expect(canonical.openEvidence.canonicalFailureIntakeIssues).toBe(1);
    expect(canonical.openEvidence.unknownFailureIntakeIssues).toBe(0);
  });

  it('keeps unknown-scope intake visible rather than silently treating it as development noise',()=>{
    const{report}=run(base({openIssues:[{number:43,title:'quality',body:'<!-- shoperation-failure-intake:SQ-FP-UNKNOWN -->',updatedAt:'2026-09-28T10:00:00.000Z'}]}));
    expect(report.status).toBe('REVIEW');
    expect(report.openEvidence.unknownFailureIntakeIssues).toBe(1);
    expect(report.signals.some((x:{code:string})=>x.code==='SENTINEL_FAILURE_INTAKE_SCOPE_UNKNOWN')).toBe(true);
  });

  it('raises ACTION_REQUIRED from repeated main evidence',()=>{
    const workflowRuns=[1,2,3].map(i=>({id:String(i),name:'CI',event:'push',headBranch:'main',conclusion:'failure',createdAt:`2026-09-2${8-i}T09:00:00.000Z`}));
    const{report}=run(base({workflowRuns}));
    expect(report.status).toBe('ACTION_REQUIRED');
    expect(report.repeatedWorkflows[0].workflow).toBe('CI');
    expect(report.signals.some((x:{code:string})=>x.code==='SENTINEL_REPEATED_MAIN_WORKFLOW_FAILURE')).toBe(true);
  });

  it('does not turn iterative PR failures into ACTION_REQUIRED by themselves',()=>{
    const workflowRuns=[1,2,3,4,5].map(i=>({id:String(i),name:'CI',event:'pull_request',headBranch:`feature/test-${i}`,conclusion:'failure',createdAt:`2026-09-2${8-i}T09:00:00.000Z`}));
    const{report}=run(base({workflowRuns}));
    expect(report.status).toBe('REVIEW');
    expect(report.repeatedWorkflows).toEqual([]);
    expect(report.signals.some((x:{code:string})=>x.code==='SENTINEL_DEVELOPMENT_FRICTION_TREND')).toBe(true);
    expect(report.signals.some((x:{severity:string})=>x.severity==='action')).toBe(false);
  });

  it('treats an open Deep Atlas hard finding as ACTION_REQUIRED',()=>{
    const{report}=run(base({openIssues:[{number:9,title:'drift',body:'<!-- shoperation-deep-atlas-scan -->',updatedAt:'2026-09-28T10:00:00.000Z'}]}));
    expect(report.status).toBe('ACTION_REQUIRED');
    expect(report.signals.some((x:{code:string})=>x.code==='SENTINEL_DEEP_ATLAS_ATTENTION')).toBe(true);
  });

  it('does not collapse missing integrity evidence into HEALTHY',()=>{
    const dir=mkdtempSync(path.join(tmpdir(),'sentinel-missing-integrity-'));
    const snapshotPath=path.join(dir,'snapshot.json'),out=path.join(dir,'out');
    writeFileSync(snapshotPath,JSON.stringify(base()));
    const missing=path.join(dir,'missing-integrity.json');
    const result=spawnSync(process.execPath,['scripts/shoperation-sentinel-scan.mjs'],{
      cwd:root,encoding:'utf8',
      env:{...process.env,SHOPERATION_SENTINEL_SNAPSHOT:snapshotPath,SHOPERATION_SENTINEL_OUT_DIR:out,SHOPERATION_SENTINEL_INTEGRITY_PROBE:missing},
    });
    const report=JSON.parse(readFileSync(path.join(out,'sentinel-report.json'),'utf8'));
    rmSync(dir,{recursive:true,force:true});
    expect(result.status).toBe(0);
    expect(report.status).toBe('REVIEW');
    expect(report.integrity.decision).toBe('UNKNOWN');
    expect(report.signals.some((x:{code:string})=>x.code==='SENTINEL_INTEGRITY_PROBE_MISSING')).toBe(true);
  });

  it('promotes action-level integrity divergence to ACTION_REQUIRED without making Sentinel a gate',()=>{
    const dir=mkdtempSync(path.join(tmpdir(),'sentinel-integrity-block-'));
    const snapshotPath=path.join(dir,'snapshot.json'),integrityPath=path.join(dir,'integrity.json'),out=path.join(dir,'out');
    writeFileSync(snapshotPath,JSON.stringify(base()));
    writeFileSync(integrityPath,JSON.stringify({
      contract:'shoporation.sentinel-integrity-report.v1',sourceCommit:'abc1234',generatedAt:'2026-09-28T12:00:00.000Z',
      decision:'BLOCK',authority:false,blocking:false,autoMutationAllowed:false,
      counts:{findings:1,action:1,review:0},categories:['decision'],
      findings:[{code:'SENTINEL_INTEGRITY_STATUS_LAUNDERING',category:'decision',severity:'action',reason:'child block',evidence:{}}],
    }));
    const result=spawnSync(process.execPath,['scripts/shoperation-sentinel-scan.mjs'],{
      cwd:root,encoding:'utf8',
      env:{...process.env,SHOPERATION_SENTINEL_SNAPSHOT:snapshotPath,SHOPERATION_SENTINEL_OUT_DIR:out,SHOPERATION_SENTINEL_INTEGRITY_PROBE:integrityPath},
    });
    const report=JSON.parse(readFileSync(path.join(out,'sentinel-report.json'),'utf8'));
    rmSync(dir,{recursive:true,force:true});
    expect(result.status).toBe(0);
    expect(report.status).toBe('ACTION_REQUIRED');
    expect(report.blocking).toBe(false);
    expect(report.authority).toBe(false);
    expect(report.signals.some((x:{code:string})=>x.code==='SENTINEL_INTEGRITY_DIVERGENCE')).toBe(true);
  });

  it('records the accepted component in the canonical roadmap',()=>{
    const roadmap=JSON.parse(read('quality/knowledge/living-roadmap.v1.json'));
    const item=roadmap.items.find((x:{id:string})=>x.id==='SHOPERATION-SENTINEL');
    expect(item.status).toBe('in-progress');
    expect(item.scope).toContain('no blocking authority and no autonomous code mutation');
  });
});
