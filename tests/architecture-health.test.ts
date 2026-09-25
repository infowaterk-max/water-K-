import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

describe('Architecture Drift + Confidence + Guard Rationalization',()=>{
  it('keeps blocking guard responsibilities unique',()=>{
    const registry=JSON.parse(readFileSync('quality/knowledge/guard-registry.v1.json','utf8')) as {guards:Array<{id:string;blocking:boolean;responsibilityKey:string}>};
    const blocking=registry.guards.filter(item=>item.blocking);
    expect(new Set(blocking.map(item=>item.id)).size).toBe(blocking.length);
    expect(new Set(blocking.map(item=>item.responsibilityKey)).size).toBe(blocking.length);
  });

  it('produces a deterministic PASS architecture health report for the current canonical registries',()=>{
    execFileSync('node',['scripts/lib/shoperation-architecture-health.mjs','--check'],{encoding:'utf8'});
    const report=JSON.parse(readFileSync('artifacts/shoperation-architecture/architecture-health.json','utf8')) as {
      contract:string;decision:string;hardDrift:unknown[];warnings:unknown[];
      confidence:{average:number;capabilities:Array<{capabilityId:string;score:number;level:string}>};
      guards:{blocking:number;blockingResponsibilityCount:number};
      templateAuthority:{contract:string;decision:string;packages:Array<{identity:string;entrypoint:string}>;hardDrift:unknown[]};
    };
    expect(report.contract).toBe('shoporation.architecture-health.v1');
    expect(report.decision).toBe('PASS');
    expect(report.hardDrift).toEqual([]);
    expect(report.confidence.capabilities.length).toBeGreaterThanOrEqual(10);
    expect(report.confidence.average).toBeGreaterThan(0);
    expect(report.guards.blocking).toBe(report.guards.blockingResponsibilityCount);
    expect(report.templateAuthority.contract).toBe('shoporation.template-single-source-authority.v1');
    expect(report.templateAuthority.decision).toBe('PASS');
    expect(report.templateAuthority.hardDrift).toEqual([]);
    expect(report.templateAuthority.packages).toContainEqual(expect.objectContaining({
      identity:'gaming.playroom@20',
      entrypoint:'src/lib/builder/templates/gaming/playroom/v20/index.ts',
    }));
  });

  it('keeps canonical legacy blocking package-local so independent template versions can coexist',()=>{
    const probe=[
      "import {evaluateCanonicalPackageDependencyClosure} from './scripts/lib/shoperation-architecture-health.mjs';",
      "const pkg={identity:'gaming.loot-vault@2',slug:'loot-vault',entrypoint:'src/lib/builder/templates/gaming/loot-vault/v2/index.ts',packageDir:'src/lib/builder/templates/gaming/loot-vault/v2'};",
      "const legacy='src/lib/builder/templates/loot-vault.ts';",
      "const clean=new Map([[pkg.entrypoint,[]],['src/lib/builder/storefront-template-catalog.ts',[legacy]]]);",
      "const contaminated=new Map([[pkg.entrypoint,[legacy]],[legacy,[]]]);",
      "console.log('PROBE:'+JSON.stringify({clean:evaluateCanonicalPackageDependencyClosure(pkg,clean).hardDrift,contaminated:evaluateCanonicalPackageDependencyClosure(pkg,contaminated).hardDrift}));",
    ].join('');
    const output=execFileSync('node',['--input-type=module','-e',probe],{encoding:'utf8'});
    const line=output.split(/\r?\n/).find(value=>value.startsWith('PROBE:'));
    expect(line).toBeTruthy();
    const result=JSON.parse(line!.slice('PROBE:'.length)) as {clean:unknown[];contaminated:Array<{code:string}>};
    expect(result.clean).toEqual([]);
    expect(result.contaminated).toContainEqual(expect.objectContaining({code:'TEMPLATE_LEGACY_RUNTIME_REACHABLE'}));
  });

  it('keeps confidence informational and does not create another CI gate authority',()=>{
    const registry=JSON.parse(readFileSync('quality/knowledge/guard-registry.v1.json','utf8')) as {guards:Array<{id:string;blocking:boolean}>};
    expect(registry.guards.find(item=>item.id==='SIGNAL-ARCHITECTURE-CONFIDENCE')?.blocking).toBe(false);
    const workflow=readFileSync('.github/workflows/ci.yml','utf8');
    expect(workflow).not.toContain('Architecture Confidence Gate');
  });

  it('keeps accepted roadmap references and sequencing canonical',()=>{
    const capabilities=JSON.parse(readFileSync('quality/knowledge/capability-registry.v1.json','utf8')) as {capabilities:Array<{id:string;roadmapRefs?:string[]}>};
    const roadmap=JSON.parse(readFileSync('quality/knowledge/living-roadmap.v1.json','utf8')) as {items:Array<{id:string;status:string;order?:number;targetWindow?:string;dependsOn?:string[]}>};
    const ids=new Set(roadmap.items.map(item=>item.id));
    for(const capability of capabilities.capabilities){
      for(const ref of capability.roadmapRefs??[])expect(ids.has(ref),`${capability.id} missing roadmap ref ${ref}`).toBe(true);
    }
    for(const item of roadmap.items){
      for(const dependency of item.dependsOn??[])expect(ids.has(dependency),`${item.id} missing dependency ${dependency}`).toBe(true);
    }
    const byId=new Map(roadmap.items.map(item=>[item.id,item]));
    expect(byId.get('TEMPLATE-PRODUCTION-SYSTEM')?.status).toBe('in-progress');
    expect(byId.get('TEMPLATE-PORTFOLIO-42')?.order).toBeLessThan(byId.get('GUARDED-VISUAL-SECTION-LIBRARY')?.order??0);
    expect(byId.get('GUARDED-VISUAL-SECTION-LIBRARY')?.order).toBeLessThan(byId.get('MARKET-READY-1-0')?.order??0);
    expect(byId.get('SANDBOX-TEST-MODE')?.targetWindow).toBe('market-ready-1.0');
    expect(byId.get('PAYMENT-HUB-1')?.targetWindow).toBe('post-launch');
    expect(byId.get('SURFACE-REDUCTION')?.targetWindow).toBe('immediately-after-market-ready-1.0');
    expect(byId.get('WEBSITE-BUILDER')?.status).toBe('parked');
  });

});
