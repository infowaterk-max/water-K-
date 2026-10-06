// @ts-nocheck
import {describe,expect,it} from 'vitest';
import {decomposeReleaseScope,derivePlannedOperations,reconcileReleaseUnitManifest,validateReleaseUnitOrder} from '../scripts/lib/shoperation-release-unit-runtime.mjs';

const atlas=(files,imports={})=>({
  nodes:files.map(file=>({path:file,imports:imports[file]??[],domains:['DOMAIN-RELEASE'],authorities:['release-infrastructure']})),
  reverseImports:Object.fromEntries(files.map(file=>[file,files.filter(candidate=>(imports[candidate]??[]).includes(file))])),
  semanticGraph:{edges:[]},
  domainIndexDefinition:{'DOMAIN-RELEASE':{owner:'release-infrastructure'}},
});
const transaction={taskId:'DEV-TEST',parentTransactionId:'DEV-PARENT',sourceRef:'PO-TEST',changeBaseSha:'a'.repeat(40)};
const gateChain={orderedGateIds:['GUARD-PLAN-BEFORE-CODE','GUARD-RELEASE-RISK','GUARD-QUALITY-TESTS'],externalGateIds:[]};
const decompose=(files,extra={})=>decomposeReleaseScope({transaction,operations:derivePlannedOperations({projectedFiles:files,atlas:extra.atlas??atlas(files),plannedDeletions:extra.plannedDeletions,plannedRenames:extra.plannedRenames,generatedArtifacts:extra.generatedArtifacts}),atlas:extra.atlas??atlas(files),gateChain,targetBaseSha:transaction.changeBaseSha,forbiddenPatterns:extra.forbiddenPatterns??[],readOnlyPaths:extra.readOnlyPaths??[],maxFilesPerUnit:extra.maxFilesPerUnit??12});

describe('Control Plane release decomposition',()=>{
  it('automatically decomposes a thirty-file scope into bounded release units',()=>{
    const files=[...Array.from({length:10},(_,i)=>`src/app/admin/unit-${i}/page.tsx`),...Array.from({length:10},(_,i)=>`src/lib/customer/unit-${i}.ts`),...Array.from({length:10},(_,i)=>`src/lib/builder/unit-${i}.ts`)];
    const result=decompose(files);
    expect(result.decision).toBe('PASS');
    expect(result.decompositionRequired).toBe(true);
    expect(result.releaseUnits.length).toBeGreaterThan(2);
    for(const unit of result.releaseUnits){expect(unit.intendedFiles.length).toBeLessThanOrEqual(12);expect(unit.projectedRisk.decision).toBe('PASS');}
  });

  it('isolates a High-risk subsystem from a substantive Medium subsystem',()=>{
    const files=['src/lib/auth/workforce-a.ts','src/app/admin/platform/example/page.tsx'];
    const result=decompose(files);
    expect(result.decision).toBe('PASS');
    expect(result.releaseUnits).toHaveLength(2);
    expect(result.releaseUnits.some(unit=>unit.subsystems.includes('auth-access-authority'))).toBe(true);
  });

  it('splits multiple Medium subsystems when their combined RRB would block',()=>{
    const files=['src/app/admin/platform/example/page.tsx','src/lib/customer/example.ts','src/lib/storefront/example.ts'];
    const result=decompose(files);
    expect(result.decision).toBe('PASS');
    expect(result.releaseUnits.length).toBeGreaterThan(1);
    expect(result.releaseUnits.every(unit=>unit.projectedRisk.decision==='PASS')).toBe(true);
  });

  it('fails closed when an inseparable dependency cycle is itself over budget',()=>{
    const files=['src/lib/auth/cycle.ts','src/app/admin/platform/cycle.ts'];
    const a=atlas(files,{[files[0]]:[files[1]],[files[1]]:[files[0]]});
    const result=decompose(files,{atlas:a});
    expect(result.decision).toBe('FAIL_CLOSED');
    expect(result.reason).toBe('NO_SAFE_DECOMPOSITION');
  });

  it('detects cyclic release-unit prerequisites',()=>{
    const manifests=[
      {releaseUnitId:'U1',predecessorUnits:['U2']},
      {releaseUnitId:'U2',predecessorUnits:['U1']},
    ];
    expect(validateReleaseUnitOrder(manifests).decision).toBe('FAIL_CLOSED');
  });

  it('keeps proof files in the same atomic component as the capability they prove',()=>{
    const files=['scripts/shoperation-example.mjs','tests/shoperation-example.test.ts'];
    const a=atlas(files,{[files[1]]:[files[0]]});
    const result=decompose(files,{atlas:a});
    expect(result.decision).toBe('PASS');
    const sourceUnit=result.releaseUnits.find(unit=>unit.intendedFiles.includes(files[0]));
    expect(sourceUnit.intendedFiles).toContain(files[1]);
  });

  it('represents rename, delete and generated-artifact semantics explicitly',()=>{
    const files=['src/lib/customer/new-name.ts','src/lib/customer/remove.ts','src/lib/customer/generated.ts','src/lib/customer/old-name.ts'];
    const a=atlas(files);
    const operations=derivePlannedOperations({
      projectedFiles:files,
      atlas:a,
      plannedDeletions:['src/lib/customer/remove.ts'],
      plannedRenames:[{from:'src/lib/customer/old-name.ts',to:'src/lib/customer/new-name.ts'}],
      generatedArtifacts:[{path:'src/lib/customer/generated.ts',mode:'sealed'}],
    });
    expect(operations).toEqual(expect.arrayContaining([
      expect.objectContaining({operation:'rename',previousFile:'src/lib/customer/old-name.ts',file:'src/lib/customer/new-name.ts'}),
      expect.objectContaining({operation:'delete',file:'src/lib/customer/remove.ts'}),
      expect.objectContaining({file:'src/lib/customer/generated.ts',generated:expect.objectContaining({mode:'sealed'})}),
    ]));
  });

  it('blocks forbidden Auth Core/read-only scope before manifest materialization',()=>{
    const files=['src/lib/auth/authority.ts'];
    const result=decompose(files,{forbiddenPatterns:['src/lib/auth/**']});
    expect(result.decision).toBe('FAIL_CLOSED');
    expect(result.reason).toBe('FORBIDDEN_OR_READ_ONLY_PATH');
  });

  it('fails closed when generated artifacts lack regenerate or sealed identity semantics',()=>{
    const files=['src/app/admin/generated/page.tsx'];
    const a=atlas(files);
    const operations=derivePlannedOperations({projectedFiles:files,atlas:a,generatedArtifacts:[{path:files[0],mode:'copy'}]});
    const result=decomposeReleaseScope({transaction,operations,atlas:a,gateChain,targetBaseSha:transaction.changeBaseSha});
    expect(result.decision).toBe('FAIL_CLOSED');
    expect(result.reason).toBe('GENERATED_ARTIFACT_SEMANTICS_REQUIRED');
  });

  it('reconciles a successor only from its merged predecessor exact main SHA and blocks unrelated drift',()=>{
    const files=['src/app/admin/a/page.tsx','src/lib/customer/a.ts','src/lib/storefront/a.ts'];
    const result=decompose(files);
    expect(result.releaseUnits.length).toBeGreaterThan(1);
    const successor=result.releaseUnits[1],predecessor=result.releaseUnits[0],merged='b'.repeat(40);
    expect(()=>reconcileReleaseUnitManifest(successor,{newBaseSha:'c'.repeat(40),predecessorReceipts:[{releaseUnitId:predecessor.releaseUnitId,status:'MERGED',mergedMainSha:merged}]})).toThrow(/RELEASE_UNIT_MAIN_DRIFT/);
    const reconciled=reconcileReleaseUnitManifest(successor,{newBaseSha:merged,predecessorReceipts:[{releaseUnitId:predecessor.releaseUnitId,status:'MERGED',mergedMainSha:merged}]});
    expect(reconciled.targetBaseSha).toBe(merged);
    expect(reconciled.lease.reconciled).toBe(true);
  });
});
