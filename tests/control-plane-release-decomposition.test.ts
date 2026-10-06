// @ts-nocheck
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {describe,expect,it} from 'vitest';
import {decomposeReleaseScope,reconcileReleaseUnitManifest} from '../scripts/lib/shoperation-development-runtime.mjs';
import {materializeReleaseUnit,preflightReleaseUnitMaterialization} from '../scripts/shoperation-release-unit-materializer.mjs';

const registry=JSON.parse(readFileSync('quality/knowledge/guard-registry.v1.json','utf8'));
function atlasFor(files,{imports={},kinds={}}={}){
  const reverse={};
  for(const [from,deps] of Object.entries(imports))for(const to of deps){reverse[to]??=[];reverse[to].push(from);}
  return{
    contract:'shoporation.codebase-atlas.v2',
    nodes:files.map(file=>({path:file,imports:imports[file]??[],kind:kinds[file]??(file.startsWith('tests/')?'test':'code'),authorities:[]})),
    reverseImports:reverse,
    semanticGraph:{edges:[],reverseFileEdges:{},unknowns:[]},
  };
}
function decompose(files,options={}){
  const atlas=options.atlas??atlasFor(files);
  return decomposeReleaseScope({
    transactionIdentity:{taskId:'DEV-TEST',sourceRef:'TEST',changeBaseSha:'base'},
    baseSha:'base',
    files,
    atlas,
    guardRegistry:registry,
    fileMetadata:Object.fromEntries(files.map(file=>[file,{authorities:[]}])),
    ...options,
  });
}

describe('Control Plane release decomposition',()=>{
  it('blocks stale upstream Atlas evidence without recomputing it downstream',()=>{
    const source=readFileSync('scripts/shoperation-plan-before-code.mjs','utf8');
    expect(source).toContain("mode:'STALE_UPSTREAM_BLOCKED'");
    expect(source).not.toContain('STALE_UPSTREAM_RECOMPUTED_FOR_DIAGNOSTICS');
  });

  it('automatically decomposes a 30-file over-budget medium scope without changing the RRB',()=>{
    const admin=Array.from({length:10},(_,i)=>`src/app/admin/unit-${i}/page.tsx`);
    const account=Array.from({length:10},(_,i)=>`src/lib/customer/unit-${i}.ts`);
    const storefront=Array.from({length:10},(_,i)=>`src/lib/storefront/unit-${i}.ts`);
    const result=decompose([...admin,...account,...storefront]);
    expect(result.overallRisk.decision).toBe('BLOCK');
    expect(result.required).toBe(true);
    expect(result.decision).toBe('PASS');
    expect(result.manifests.length).toBeGreaterThan(1);
    expect(result.manifests.every(unit=>unit.projectedRisk.decision==='PASS')).toBe(true);
    expect(result.manifests.flatMap(unit=>unit.intendedFiles).sort()).toEqual([...admin,...account,...storefront].sort());
  });

  it('isolates high-risk work from another substantive subsystem',()=>{
    const files=['src/lib/auth/workforce-unit.ts','src/app/admin/release-unit/page.tsx'];
    const result=decompose(files);
    expect(result.overallRisk.decision).toBe('BLOCK');
    expect(result.decision).toBe('PASS');
    expect(result.manifests).toHaveLength(2);
  });

  it('fails closed when an Atlas dependency makes a high-risk plus medium scope inseparable',()=>{
    const files=['src/lib/auth/workforce-unit.ts','src/app/admin/release-unit/page.tsx'];
    const atlas=atlasFor(files,{imports:{'src/app/admin/release-unit/page.tsx':['src/lib/auth/workforce-unit.ts']}});
    const result=decompose(files,{atlas});
    expect(result.decision).toBe('FAIL_CLOSED');
    expect(result.issues.map(issue=>issue.code)).toContain('RELEASE_DECOMPOSITION_ATOMIC_COMPONENT_BLOCKED');
  });

  it('fails closed on cyclic release-unit prerequisites',()=>{
    const files=['src/app/a/page.tsx','src/app/b/page.tsx'];
    const result=decompose(files,{prerequisiteEdges:[
      {from:files[0],to:files[1],reason:'A-before-B'},
      {from:files[1],to:files[0],reason:'B-before-A'},
    ]});
    expect(result.decision).toBe('FAIL_CLOSED');
    expect(result.issues.map(issue=>issue.code)).toContain('RELEASE_DECOMPOSITION_DEPENDENCY_CYCLE');
  });

  it('keeps a planned proof file in the same atomic unit as the capability it imports',()=>{
    const files=['src/lib/storefront/proven-feature.ts','tests/proven-feature-proof.test.ts'];
    const atlas=atlasFor(files,{imports:{'tests/proven-feature-proof.test.ts':['src/lib/storefront/proven-feature.ts']},kinds:{'tests/proven-feature-proof.test.ts':'test'}});
    const result=decompose(files,{atlas});
    expect(result.decision).toBe('PASS');
    const unit=result.manifests.find(item=>item.intendedFiles.includes('src/lib/storefront/proven-feature.ts'));
    expect(unit.intendedFiles).toContain('tests/proven-feature-proof.test.ts');
  });

  it('blocks forbidden authority paths rather than transplanting them',()=>{
    const result=decompose(['src/lib/auth/core.ts'],{forbiddenPatterns:['src/lib/auth/**']});
    expect(result.decision).toBe('FAIL_CLOSED');
    expect(result.issues.map(issue=>issue.code)).toContain('RELEASE_DECOMPOSITION_FORBIDDEN_OPERATION');
  });

  it('reconciles a successor only from its declared predecessor and fresh base',()=>{
    const original={
      contract:'shoporation.release-unit-manifest.v1',releaseUnitId:'DEV-RU-02',order:2,targetBaseSha:null,
      targetBaseLease:{contract:'shoporation.target-base-lease.v1',mode:'RECONCILE_AFTER_PREDECESSOR',sha:null,predecessorUnitId:'DEV-RU-01'},
      intendedFiles:['src/app/a/page.tsx'],operations:[{type:'modify',path:'src/app/a/page.tsx'}],
      projectedRisk:{decision:'PASS'},requiredGates:{decision:'PASS'},requiredEvidence:{proofFiles:[]},requiredDependencyFiles:[],authorities:[],subsystems:[],
    };
    const recomputed={...original,targetBaseSha:'new-main',targetBaseLease:{contract:'shoporation.target-base-lease.v1',mode:'EXACT',sha:'new-main'}};
    const pass=reconcileReleaseUnitManifest(original,{newBaseSha:'new-main',predecessorUnitId:'DEV-RU-01',recomputedUnit:recomputed});
    expect(pass.decision).toBe('PASS');
    expect(pass.manifest.targetBaseLease).toMatchObject({mode:'EXACT',sha:'new-main'});
    const blocked=reconcileReleaseUnitManifest(original,{newBaseSha:'new-main',predecessorUnitId:'OTHER',recomputedUnit:recomputed});
    expect(blocked.decision).toBe('BLOCK');
  });
});

describe('manifest-driven release-unit materialization',()=>{
  const baseManifest=()=>({
    contract:'shoporation.release-unit-manifest.v1',
    releaseUnitId:'DEV-TEST-RU-01',order:1,targetBaseSha:'base',
    targetBaseLease:{contract:'shoporation.target-base-lease.v1',mode:'EXACT',sha:'base'},
    intendedFiles:['a.txt'],operations:[{type:'modify',path:'a.txt',sourceCommit:'source'}],
    projectedRisk:{decision:'PASS'},requiredGates:{decision:'PASS'},requiredEvidence:{proofFiles:[]},requiredDependencyFiles:[],authorities:[],subsystems:[],
    forbiddenPaths:[],readOnlyPaths:[],materialization:{state:'SEALED',sourceCommit:'source'},
  });

  it('fails closed on main drift before mutation',()=>{
    const result=preflightReleaseUnitMaterialization({
      manifest:baseManifest(),currentHead:'other',
      inspectTarget:()=>({exists:true,blob:'old',sha256:'old'}),
      inspectSource:()=>({exists:true,blob:'new',sha256:'new'}),
    });
    expect(result.decision).toBe('BLOCK');
    expect(result.issues.map(issue=>issue.code)).toContain('MATERIALIZATION_TARGET_BASE_LEASE_MISMATCH');
  });

  it('recognizes already-applied modify/delete/rename states',()=>{
    const manifest={...baseManifest(),intendedFiles:['a.txt','old.txt','new.txt','gone.txt'],operations:[
      {type:'modify',path:'a.txt',sourceCommit:'source'},
      {type:'rename',sourcePath:'old.txt',path:'new.txt',sourceCommit:'source'},
      {type:'delete',path:'gone.txt'},
    ]};
    const targetState={
      'a.txt':{exists:true,blob:'same',sha256:'same'},
      'old.txt':{exists:false,blob:null,sha256:null},
      'new.txt':{exists:true,blob:'renamed',sha256:'renamed'},
      'gone.txt':{exists:false,blob:null,sha256:null},
    };
    const result=preflightReleaseUnitMaterialization({
      manifest,currentHead:'base',
      inspectTarget:file=>targetState[file]??{exists:false,blob:null,sha256:null},
      inspectSource:operation=>operation.type==='rename'?{exists:true,blob:'renamed',sha256:'renamed'}:{exists:true,blob:'same',sha256:'same'},
    });
    expect(result.decision).toBe('ALREADY_APPLIED');
  });

  it('requires sealed generated-artifact hash and blocks read-only scope',()=>{
    const generated={...baseManifest(),intendedFiles:['generated.json'],operations:[{type:'create',path:'generated.json',generatedArtifact:{mode:'sealed'}}]};
    const badGenerated=preflightReleaseUnitMaterialization({
      manifest:generated,currentHead:'base',
      inspectTarget:()=>({exists:false,blob:null,sha256:null}),
      inspectSource:()=>({exists:true,blob:'blob',sha256:'hash'}),
    });
    expect(badGenerated.issues.map(issue=>issue.code)).toContain('MATERIALIZATION_GENERATED_SEALED_HASH_REQUIRED');

    const readOnly={...baseManifest(),readOnlyPaths:['a.txt']};
    const blocked=preflightReleaseUnitMaterialization({
      manifest:readOnly,currentHead:'base',
      inspectTarget:()=>({exists:true,blob:'old',sha256:'old'}),
      inspectSource:()=>({exists:true,blob:'new',sha256:'new'}),
    });
    expect(blocked.issues.map(issue=>issue.code)).toContain('MATERIALIZATION_READ_ONLY_PATH');
  });

  it('does not leave partial application when a later operation conflicts',()=>{
    const cwd=mkdtempSync(path.join(tmpdir(),'release-unit-materializer-test-'));
    const run=args=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
    try{
      run(['init','-b','main']);run(['config','user.email','test@example.com']);run(['config','user.name','Test']);
      writeFileSync(path.join(cwd,'a.txt'),'old\n');writeFileSync(path.join(cwd,'c.txt'),'base\n');run(['add','.']);run(['commit','-m','base']);
      const base=run(['rev-parse','HEAD']);
      writeFileSync(path.join(cwd,'a.txt'),'new\n');writeFileSync(path.join(cwd,'c.txt'),'source-different\n');run(['add','.']);run(['commit','-m','source']);
      const source=run(['rev-parse','HEAD']);run(['reset','--hard',base]);
      const manifest={
        contract:'shoporation.release-unit-manifest.v1',releaseUnitId:'DEV-ATOMIC-RU-01',order:1,targetBaseSha:base,
        targetBaseLease:{contract:'shoporation.target-base-lease.v1',mode:'EXACT',sha:base},
        intendedFiles:['a.txt','c.txt'],operations:[
          {type:'modify',path:'a.txt',sourceCommit:source},
          {type:'create',path:'c.txt',sourceCommit:source},
        ],
        projectedRisk:{decision:'PASS'},requiredGates:{decision:'PASS'},requiredEvidence:{proofFiles:[]},requiredDependencyFiles:[],authorities:[],subsystems:[],
        forbiddenPaths:[],readOnlyPaths:[],materialization:{state:'SEALED',sourceCommit:source},
      };
      const result=materializeReleaseUnit({manifest,cwd,apply:true});
      expect(result.decision).toBe('BLOCK');
      expect(run(['rev-parse','HEAD'])).toBe(base);
      expect(readFileSync(path.join(cwd,'a.txt'),'utf8')).toBe('old\n');
    }finally{rmSync(cwd,{recursive:true,force:true});}
  });
});
