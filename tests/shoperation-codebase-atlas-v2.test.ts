import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {beforeAll,describe,expect,it} from 'vitest';

describe('Shoperation Codebase Atlas 2.0 / System Self-Knowledge',()=>{
  beforeAll(()=>{execFileSync('node',['scripts/shoperation-codebase-atlas.mjs','--check'],{encoding:'utf8'});},60000);
  it('uses one Atlas v2 policy and no parallel v1 policy authority',()=>{
    const runtime=readFileSync('scripts/lib/shoperation-codebase-atlas-runtime.mjs','utf8');
    const policy=JSON.parse(readFileSync('quality/knowledge/codebase-atlas-policy.v2.json','utf8')) as {contract:string;version:number;architectureContracts:{constitution:string;domains:string};selfKnowledge:Record<string,boolean>};
    expect(policy.contract).toBe('shoporation.codebase-atlas-policy.v2');
    expect(policy.version).toBe(2);
    expect(runtime).toContain("readFileSync('quality/knowledge/codebase-atlas-policy.v2.json'");
    expect(runtime).not.toContain('codebase-atlas-policy.v1.json');
    expect(policy.selfKnowledge.mapDomainsFromCanonicalPaths).toBe(true);
    expect(policy.selfKnowledge.exposeTruthOwnership).toBe(true);
  });

  it('builds a valid v2 atlas bound to Constitution and Domain Foundations',()=>{
    const atlas=JSON.parse(readFileSync('artifacts/shoperation-atlas/codebase-atlas.json','utf8')) as {
      contract:string;
      architecture:{constitutionContract:string;domainContract:string;domainCount:number;truthOwnerCount:number};
      nodes:Array<{path:string;domains:string[];authorities:string[];truthKeys:string[]}>;
      domainIndexDefinition:Record<string,{owner:string;dependsOn:string[]}>;
      truthOwnerIndex:Record<string,{domainId:string;owner:string}>;
    };
    expect(atlas.contract).toBe('shoporation.codebase-atlas.v2');
    expect(atlas.architecture.constitutionContract).toBe('shoporation.architecture-constitution.v1');
    expect(atlas.architecture.domainContract).toBe('shoporation.domain-foundations.v1');
    expect(atlas.architecture.domainCount).toBe(13);
    expect(atlas.architecture.truthOwnerCount).toBeGreaterThan(30);
    expect(atlas.truthOwnerIndex['commerce.order']).toEqual({domainId:'DOMAIN-COMMERCE',owner:'commerce-core-authority'});
    expect(atlas.truthOwnerIndex['content.story']).toEqual({domainId:'DOMAIN-CONTENT',owner:'content-authority'});
    expect(atlas.nodes.find(node=>node.path==='src/lib/content/story-engine.ts')?.domains).toContain('DOMAIN-CONTENT');
    expect(atlas.domainIndexDefinition['DOMAIN-RELEASE']?.owner).toBe('release-infrastructure');
    expect(atlas.nodes.some(node=>node.domains.length>0&&node.authorities.length>0)).toBe(true);
  });

  it('does not parse import-looking assertion strings as dependency edges and keeps real imports',()=>{
    const atlas=JSON.parse(readFileSync('artifacts/shoperation-atlas/codebase-atlas.json','utf8')) as {
      unresolvedInternalImports:Array<{from:string;specifier:string}>;
      nodes:Array<{path:string;imports:string[];domains:string[]}>;
      summary:{domainCounts:Record<string,number>};
    };
    expect(atlas.unresolvedInternalImports).not.toContainEqual(expect.objectContaining({from:'tests/admin-mobile-desktop-compat.test.ts',specifier:'./mobile-desktop-compat.css'}));
    expect(atlas.nodes.find(node=>node.path==='src/lib/catalog-server.ts')?.imports).toContain('src/lib/catalog.ts');
    expect(atlas.nodes.find(node=>node.path==='src/lib/catalog.ts')?.domains).toContain('DOMAIN-CATALOG');
    expect(atlas.summary.domainCounts['DOMAIN-CATALOG']).toBeGreaterThan(0);
  });

  it('exposes deterministic architecture impact and release-closure projections',()=>{
    const runtime=readFileSync('scripts/lib/shoperation-codebase-atlas-runtime.mjs','utf8');
    const cli=readFileSync('scripts/shoperation-codebase-atlas.mjs','utf8');
    expect(runtime).toContain("contract:'shoporation.atlas-impact.v2'");
    expect(runtime).toContain("contract:'shoporation.atlas-release-closure.v2'");
    expect(runtime).toContain('domainDependencyClosure');
    expect(runtime).toContain('evidenceObligations');
    expect(runtime).toContain('regressionTests');
    expect(cli).toContain('--closure-file');
  });
});
