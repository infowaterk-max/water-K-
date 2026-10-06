// @ts-nocheck
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync,writeFileSync,existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach,describe,expect,it} from 'vitest';
import {materializeReleaseUnit,sealReleaseUnitManifest} from '../scripts/lib/shoperation-release-unit-runtime.mjs';

const dirs:string[]=[];
const git=(cwd:string,args:string[])=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
function fixture(){
  const cwd=mkdtempSync(path.join(os.tmpdir(),'release-unit-test-'));dirs.push(cwd);
  git(cwd,['init','-b','main']);git(cwd,['config','user.email','test@example.com']);git(cwd,['config','user.name','Release Unit Test']);
  writeFileSync(path.join(cwd,'a.txt'),'old\n');writeFileSync(path.join(cwd,'old-name.txt'),'rename-me\n');writeFileSync(path.join(cwd,'delete.txt'),'delete-me\n');writeFileSync(path.join(cwd,'generated.txt'),'generated-v1\n');
  git(cwd,['add','.']);git(cwd,['commit','-m','base']);const base=git(cwd,['rev-parse','HEAD']);
  git(cwd,['checkout','-b','source']);
  writeFileSync(path.join(cwd,'a.txt'),'new\n');git(cwd,['mv','old-name.txt','new-name.txt']);rmSync(path.join(cwd,'delete.txt'));writeFileSync(path.join(cwd,'generated.txt'),'generated-v2\n');
  git(cwd,['add','-A']);git(cwd,['commit','-m','source']);const source=git(cwd,['rev-parse','HEAD']);
  return{cwd,base,source};
}
afterEach(()=>{for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true});});

describe('release-unit manifest materialization',()=>{
  it('applies create/modify/rename/delete and sealed generated content as one atomic commit',()=>{
    const {cwd,base,source}=fixture();
    const manifest:any={
      contract:'shoporation.release-unit-manifest.v1',decision:'PASS',releaseUnitId:'DEV-TEST-U01',order:1,targetBaseSha:base,
      lease:{expectedBaseSha:base,failOnDrift:true,reconciled:true},
      intendedFiles:['a.txt','new-name.txt','delete.txt','generated.txt'],
      operations:[
        {operation:'modify',file:'a.txt'},
        {operation:'rename',previousFile:'old-name.txt',file:'new-name.txt'},
        {operation:'delete',file:'delete.txt'},
        {operation:'modify',file:'generated.txt',generated:{mode:'sealed'}},
      ],
      forbiddenPaths:[],readOnlyPaths:[],reconciliationPolicy:{requiresReconciliationAfterPredecessor:false},sourceIdentity:{sourceCommit:null,sealed:false},
    };
    const sealed=sealReleaseUnitManifest(manifest,{sourceCommit:source,cwd});
    const result=materializeReleaseUnit({manifest:sealed,targetRef:'refs/heads/main',cwd,updateRef:true});
    expect(result.status).toBe('APPLIED');
    expect(git(cwd,['rev-parse','refs/heads/main'])).toBe(result.commitSha);
    expect(git(cwd,['show','refs/heads/main:a.txt'])).toBe('new');
    expect(git(cwd,['show','refs/heads/main:new-name.txt'])).toBe('rename-me');
    expect(()=>git(cwd,['show','refs/heads/main:old-name.txt'])).toThrow();
    expect(()=>git(cwd,['show','refs/heads/main:delete.txt'])).toThrow();
    expect(git(cwd,['show','refs/heads/main:generated.txt'])).toBe('generated-v2');
  });

  it('recognizes already-applied changes without manufacturing a second commit',()=>{
    const {cwd,base,source}=fixture();
    const first:any={contract:'shoporation.release-unit-manifest.v1',decision:'PASS',releaseUnitId:'DEV-TEST-U01',order:1,targetBaseSha:base,lease:{expectedBaseSha:base,failOnDrift:true,reconciled:true},intendedFiles:['a.txt'],operations:[{operation:'modify',file:'a.txt'}],forbiddenPaths:[],readOnlyPaths:[],reconciliationPolicy:{requiresReconciliationAfterPredecessor:false},sourceIdentity:{sourceCommit:null,sealed:false}};
    const applied=materializeReleaseUnit({manifest:first,sourceCommit:source,targetRef:'refs/heads/main',cwd,updateRef:true});
    const current=git(cwd,['rev-parse','refs/heads/main']);
    const second={...first,releaseUnitId:'DEV-TEST-U02',targetBaseSha:current,lease:{expectedBaseSha:current,failOnDrift:true,reconciled:true}};
    const result=materializeReleaseUnit({manifest:second,sourceCommit:source,targetRef:'refs/heads/main',cwd,updateRef:true});
    expect(result.status).toBe('ALREADY_APPLIED');
    expect(result.commitSha).toBeNull();
    expect(git(cwd,['rev-parse','refs/heads/main'])).toBe(current);
  });

  it('fails closed on target-base drift before creating a target commit',()=>{
    const {cwd,base,source}=fixture();
    const manifest:any={contract:'shoporation.release-unit-manifest.v1',decision:'PASS',releaseUnitId:'DEV-TEST-U01',order:1,targetBaseSha:'f'.repeat(40),lease:{expectedBaseSha:'f'.repeat(40),failOnDrift:true,reconciled:true},intendedFiles:['a.txt'],operations:[{operation:'modify',file:'a.txt'}],forbiddenPaths:[],readOnlyPaths:[],reconciliationPolicy:{requiresReconciliationAfterPredecessor:false},sourceIdentity:{sourceCommit:null,sealed:false}};
    expect(()=>materializeReleaseUnit({manifest,sourceCommit:source,targetRef:'refs/heads/main',cwd,updateRef:true})).toThrow(/RELEASE_UNIT_TARGET_BASE_DRIFT/);
    expect(git(cwd,['rev-parse','refs/heads/main'])).toBe(base);
  });

  it('rejects any operation outside manifest scope or inside forbidden paths',()=>{
    const {cwd,base,source}=fixture();
    const outside:any={contract:'shoporation.release-unit-manifest.v1',decision:'PASS',releaseUnitId:'U1',order:1,targetBaseSha:base,lease:{expectedBaseSha:base,reconciled:true},intendedFiles:[],operations:[{operation:'modify',file:'a.txt'}],forbiddenPaths:[],readOnlyPaths:[],reconciliationPolicy:{requiresReconciliationAfterPredecessor:false}};
    expect(()=>materializeReleaseUnit({manifest:outside,sourceCommit:source,targetRef:'refs/heads/main',cwd})).toThrow(/OUTSIDE_SCOPE/);
    const forbidden={...outside,intendedFiles:['a.txt'],forbiddenPaths:['a.txt']};
    expect(()=>materializeReleaseUnit({manifest:forbidden,sourceCommit:source,targetRef:'refs/heads/main',cwd})).toThrow(/FORBIDDEN_SCOPE/);
  });
});
