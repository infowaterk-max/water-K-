import{mkdtempSync,readFileSync,rmSync,writeFileSync}from'node:fs';
import{tmpdir}from'node:os';
import path from'node:path';
import{spawnSync}from'node:child_process';
import{describe,expect,it}from'vitest';

const root=process.cwd();
const source=(issues:unknown[],proofs:Record<string,unknown>={})=>({contract:'shoporation.failure-intake-reconciliation-source.v1',sourceCommit:'mainsha',collectedAt:'2026-09-30T08:00:00.000Z',proofs,issues});
const run=(issues:unknown[],proofs:Record<string,unknown>={})=>{const dir=mkdtempSync(path.join(tmpdir(),'intake-reconcile-')),snapshot=path.join(dir,'source.json'),out=path.join(dir,'out');writeFileSync(snapshot,JSON.stringify(source(issues,proofs)));const result=spawnSync(process.execPath,['scripts/shoperation-failure-intake-reconcile.mjs'],{cwd:root,encoding:'utf8',env:{...process.env,SHOPERATION_FAILURE_RECONCILIATION_SNAPSHOT:snapshot,SHOPERATION_FAILURE_RECONCILIATION_OUT_DIR:out}});const report=result.status===0?JSON.parse(readFileSync(path.join(out,'reconciliation.json'),'utf8')):null;rmSync(dir,{recursive:true,force:true});return{result,report};};

describe('Failure Intake reconciliation',()=>{
  it('closes development and canonical evidence only when a later same-workflow success proves recovery',()=>{
    const common=(n:number,branch:string,event:string)=>({number:n,title:`[Quality intake] SQ-FP-${n}: TEST_FAILED`,body:`<!-- shoperation-failure-intake:SQ-FP-${n} -->`,sourceRun:{id:`f-${n}`,name:'CI',event,headBranch:branch},laterSuccess:{id:`s-${n}`}});
    const{result,report}=run([common(1,'feature/x','pull_request'),common(2,'main','push')]);
    expect(result.status).toBe(0);
    expect(report.closeActions).toHaveLength(2);
    expect(report.closeActions.every((x:{disposition:string})=>x.disposition==='resolved-by-later-success')).toBe(true);
  });
  it('closes stale Atlas domain-scope intake only when the current Atlas maps that exact file',()=>{
    const{report}=run([
      {number:30,title:'[Quality intake] SQ-FP-A: SQ_ATLAS_DOMAIN_SCOPE_UNRESOLVED',body:'<!-- shoperation-failure-intake:SQ-FP-A -->',location:'src/lib/catalog.ts'},
      {number:31,title:'[Quality intake] SQ-FP-B: SQ_ATLAS_DOMAIN_SCOPE_UNRESOLVED',body:'<!-- shoperation-failure-intake:SQ-FP-B -->',location:'src/unknown.ts'},
    ],{atlasDomainResolvedFiles:['src/lib/catalog.ts']});
    expect(report.actions.find((x:{issueNumber:number})=>x.issueNumber===30).disposition).toBe('resolved-by-current-atlas');
    expect(report.actions.find((x:{issueNumber:number})=>x.issueNumber===31).action).toBe('keep-open');
  });
  it('uses full replay success as deterministic closure proof for old test and typecheck failures',()=>{
    const{report}=run([
      {number:3,title:'[Quality intake] SQ-FP-T: TEST_FAILED',body:'<!-- shoperation-failure-intake:SQ-FP-T -->'},
      {number:4,title:'[Quality intake] SQ-FP-TS: TYPECHECK_FAILED',body:'<!-- shoperation-failure-intake:SQ-FP-TS -->'},
    ],{fullRegressionPassed:true,typecheckPassed:true});
    expect(report.actions.find((x:{issueNumber:number})=>x.issueNumber===3).disposition).toBe('resolved-by-full-regression');
    expect(report.actions.find((x:{issueNumber:number})=>x.issueNumber===4).disposition).toBe('resolved-by-typecheck');
  });
  it('deduplicates one fingerprint without deleting the retained authority issue',()=>{
    const body='<!-- shoperation-failure-intake:SQ-FP-DUP -->';
    const{report}=run([
      {number:10,title:'[Quality intake] SQ-FP-DUP: TEST_FAILED',body,sourceRun:{id:'dev',event:'pull_request',headBranch:'feature/x'}},
      {number:11,title:'[Quality intake] SQ-FP-DUP: TEST_FAILED',body,sourceRun:{id:'main',event:'push',headBranch:'main'}},
    ]);
    expect(report.actions.find((x:{issueNumber:number})=>x.issueNumber===10).disposition).toBe('duplicate');
    expect(report.actions.find((x:{issueNumber:number})=>x.issueNumber===11).action).toBe('keep-open');
  });
  it('promotes a now-known signature and keeps unknown or active generic evidence open',()=>{
    const{report}=run([
      {number:20,title:'[Quality intake] SQ-FP-KNOWN: ENGINE_FUNCTIONAL_PROOF_FAILED',body:'<!-- shoperation-failure-intake:SQ-FP-KNOWN -->',sourceRun:{id:'a',event:'pull_request',headBranch:'feature/x'}},
      {number:21,title:'[Quality intake] SQ-FP-UNKNOWN: TEST_FAILED',body:'<!-- shoperation-failure-intake:SQ-FP-UNKNOWN -->'},
      {number:22,title:'[Quality intake] SQ-FP-ACTIVE: TEST_FAILED',body:'<!-- shoperation-failure-intake:SQ-FP-ACTIVE -->',sourceRun:{id:'b',event:'push',headBranch:'main'}},
    ]);
    expect(report.actions.find((x:{issueNumber:number})=>x.issueNumber===20)).toEqual(expect.objectContaining({action:'close',disposition:'promoted-to-known-failure',knownFailureId:'TF-KF-025'}));
    expect(report.actions.find((x:{issueNumber:number})=>x.issueNumber===21).disposition).toBe('scope-unknown');
    expect(report.actions.find((x:{issueNumber:number})=>x.issueNumber===22).disposition).toBe('still-active');
  });
  it('wires reconciliation into the existing periodic full replay instead of Sentinel mutation authority',()=>{
    const workflow=readFileSync('.github/workflows/shoperation-knowledge-full-replay.yml','utf8');
    const sentinel=readFileSync('docs/architecture/SHOPERATION_SENTINEL.md','utf8');
    expect(workflow).toContain('Collect Failure Intake reconciliation evidence');
    expect(workflow).toContain('Run deterministic Failure Intake reconciliation');
    expect(workflow).toContain('Apply explicit Failure Intake dispositions');
    expect(workflow).toContain('shoperation-failure-intake-reconcile.mjs');
    expect(workflow).toContain("const currentBody=current.body||'';");
    expect(workflow).toContain('body:nextBody');
    expect(sentinel).toContain('Sentinel remains observation-only');
  });
});
