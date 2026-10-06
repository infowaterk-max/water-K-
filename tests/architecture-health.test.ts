import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {beforeAll,describe,expect,it} from 'vitest';

describe('Architecture Drift + Confidence + Guard Rationalization',()=>{
  beforeAll(()=>{execFileSync('node',['scripts/lib/shoperation-architecture-health.mjs','--check'],{encoding:'utf8'});},60000);
  it('keeps blocking guard responsibilities unique',()=>{
    const registry=JSON.parse(readFileSync('quality/knowledge/guard-registry.v1.json','utf8')) as {guards:Array<{id:string;blocking:boolean;responsibilityKey:string}>};
    const blocking=registry.guards.filter(item=>item.blocking);
    expect(new Set(blocking.map(item=>item.id)).size).toBe(blocking.length);
    expect(new Set(blocking.map(item=>item.responsibilityKey)).size).toBe(blocking.length);
  });

  it('produces a deterministic PASS architecture health report for the current canonical registries',()=>{
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

  it('keeps Living Roadmap v2 dependency maturity canonical',()=>{
    const capabilities=JSON.parse(readFileSync('quality/knowledge/capability-registry.v1.json','utf8')) as {capabilities:Array<{id:string;roadmapRefs?:string[]}>};
    const roadmap=JSON.parse(readFileSync('quality/knowledge/living-roadmap.v2.json','utf8')) as {
      contract:string;version:number;principles:{maturityBackbone:string[];higherLayerCannotProveLowerLayer:boolean};
      items:Array<{id:string;status:string;order?:number;targetWindow?:string;dependsOn?:string[];packageMatrix?:{alap:{capabilities:string[]};pro:{capabilities:string[]};addOnOrLater:{capabilities:string[]};explicitExclusionsFromAlap:string[]}}>;
    };
    expect(roadmap.contract).toBe('shoporation.living-roadmap.v2');
    expect(roadmap.version).toBe(2);
    expect(roadmap.principles.higherLayerCannotProveLowerLayer).toBe(true);
    const ids=new Set(roadmap.items.map(item=>item.id));
    for(const capability of capabilities.capabilities){
      for(const ref of capability.roadmapRefs??[])expect(ids.has(ref),`${capability.id} missing roadmap ref ${ref}`).toBe(true);
    }
    for(const item of roadmap.items){
      for(const dependency of item.dependsOn??[])expect(ids.has(dependency),`${item.id} missing dependency ${dependency}`).toBe(true);
    }
    const byId=new Map(roadmap.items.map(item=>[item.id,item]));
    const backbone=[
      'SHOPERATION-CORE-CAPABILITY-COMPLETE',
      'CORE-OPERATIONAL-ADVERSARIAL-PROOF',
      'UNIFIED-SHOPERATION-PRODUCT-EXPERIENCE',
      'TEMPLATE-CAPABILITY-CENSUS-42',
      'MANAGED-TEMPLATE-QUICK-START',
      'BUILDER-PRODUCTION-COMPLETE',
      'BUILDER-ADVERSARIAL-ACCEPTANCE',
      'TEMPLATE-PRODUCTION-SYSTEM',
      'TEMPLATE-PORTFOLIO-42',
      'MARKET-READY-1-0',
    ];
    expect(roadmap.principles.maturityBackbone).toEqual(backbone);
    for(let i=1;i<backbone.length;i++){
      expect(byId.get(backbone[i])?.dependsOn, `${backbone[i]} must depend on prior maturity ${backbone[i-1]}`).toContain(backbone[i-1]);
    }
    expect(byId.get('PAYMENT-HUB-1')?.targetWindow).toBe('core-capability-complete');
    expect(byId.get('SPECIAL-COMMERCE')?.targetWindow).toBe('core-capability-complete');
    expect(byId.get('DEVELOPER-INTEGRATION-SANDBOX')?.dependsOn).toContain('CONTROLLED-INTEGRATION-FRAMEWORK');
    expect(byId.get('AI-BUILDER-DARK-LAUNCH')?.dependsOn).toContain('BUILDER-ADVERSARIAL-ACCEPTANCE');
    expect(byId.get('SURFACE-REDUCTION')?.dependsOn).toContain('TEMPLATE-PORTFOLIO-42');
    expect(byId.get('MARKET-READY-1-0')?.dependsOn).toContain('SURFACE-REDUCTION');
    expect(byId.get('WEBSITE-BUILDER')?.status).toBe('parked');
    const packageMatrix=byId.get('MR1-PACKAGE-CAPABILITY-MATRIX')?.packageMatrix;
    expect(packageMatrix).toBeDefined();
    expect(packageMatrix?.alap.capabilities).toContain('full manual Visual Builder and responsive Desktop/Tablet/Mobile storefront editing/preview');
    expect(packageMatrix?.alap.capabilities).toContain('baseline inventory plus multi-location/multi-warehouse InventoryLocation support');
    expect(packageMatrix?.alap.capabilities).toContain('simple ready-made automation recipes and single event-to-action rules');
    expect(packageMatrix?.pro.capabilities).toContain('automated cross-location source selection and cross-warehouse routing');
    expect(packageMatrix?.pro.capabilities).toContain('multi-condition, branching, multi-step governed workflow automation');
    expect(packageMatrix?.pro.capabilities).toContain('Digital Office Team Chat for staff-to-staff communication');
    expect(packageMatrix?.pro.capabilities).toContain('Guided Finder (E3) entitlement');
    expect(packageMatrix?.pro.capabilities).toContain('Multi-Product Composer (E4) entitlement');
    expect(packageMatrix?.pro.capabilities).toContain('Product Configurator (E5) entitlement');
    expect(packageMatrix?.pro.capabilities).toContain('Compatibility / Fitment (E6) entitlement');
    expect(packageMatrix?.pro.capabilities).toContain('Compare & Spec (E7) entitlement');
    expect(packageMatrix?.pro.capabilities).toContain('Profile / Context (E8) entitlement');
    expect(packageMatrix?.pro.capabilities).toContain('Drop / Release Commerce entitlement');
    expect(packageMatrix?.alap.capabilities.some(capability=>/Guided Finder|Composer|Configurator|Compatibility|Compare\/Spec|Profile\/Context|Drop\/Release/i.test(capability))).toBe(false);
    expect(packageMatrix?.alap.capabilities.some(capability=>capability.includes('Digital Office'))).toBe(false);
    expect(packageMatrix?.explicitExclusionsFromAlap).toContain('Digital Office Team Chat');
    expect(packageMatrix?.explicitExclusionsFromAlap).toContain('Digital Office shared mailbox/inbox/thread workspace');
  });

  it('ADVERSARIAL: free-form capability evidence cannot produce PROVEN confidence',()=>{
    const report=JSON.parse(readFileSync('artifacts/shoperation-architecture/architecture-health.json','utf8')) as any;
    const atlas=report.confidence.capabilities.find((item:any)=>item.capabilityId==='CAP-ATLAS');
    expect(atlas.score).toBeLessThan(90);
    expect(atlas.level).not.toBe('proven');
    expect(atlas.evidenceSemantics.strong).toBe(false);
    expect(atlas.limitations).toContain('No current structured capability-scoped behavioral evidence satisfies the semantic evidence contract.');
    const runtime=readFileSync('scripts/lib/shoperation-architecture-health.mjs','utf8');
    expect(runtime).not.toContain("if((item.evidence??[]).length)score+=15");
    const registry=JSON.parse(readFileSync('quality/knowledge/capability-registry.v1.json','utf8')) as any;
    expect(registry.capabilities.find((item:any)=>item.id==='CAP-ATLAS').evidenceRequirement.freeFormEvidenceDoesNotScore).toBe(true);
  });

});
