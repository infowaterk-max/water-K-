import {describe,expect,it} from 'vitest';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

const generate=()=>{
  execFileSync(process.execPath,['scripts/shoperation-codebase-atlas.mjs','--check'],{stdio:'pipe'});
  return JSON.parse(readFileSync('artifacts/shoperation-atlas/codebase-atlas.json','utf8')) as {
    summary:{indexedNodes:number;routeNodes:number;importEdges:number;exportedSymbols:number;literalKeys:number};
    nodes:{path:string;imports:string[];exports:string[];literalKeys:string[];subsystems:string[];route?:{path:string;kind:string}|null}[];
    literalIndex:Record<string,string[]>;exportIndex:Record<string,string[]>;referenceIndex:Record<string,string[]>;reverseImports:Record<string,string[]>;
  };
};
describe('Shoperation Codebase Atlas v1',()=>{
  it('builds a broad machine-readable repository graph',()=>{
    const atlas=generate();
    expect(atlas.summary.indexedNodes).toBeGreaterThan(500);
    expect(atlas.summary.routeNodes).toBeGreaterThan(50);
    expect(atlas.summary.importEdges).toBeGreaterThan(500);
    expect(atlas.summary.exportedSymbols).toBeGreaterThan(100);
  });
  it('resolves the historical contact-form authority instead of forcing blind CSS search',()=>{
    const atlas=generate();
    expect(atlas.literalIndex['support.contact-form']).toEqual(expect.arrayContaining([
      'src/lib/builder/storefront-support.ts',
      'src/components/builder/storefront-support.tsx',
    ]));
    expect(atlas.exportIndex['StorefrontFormWizard']).toContain('src/components/forms/storefront-form-wizard.tsx');
    expect(atlas.referenceIndex['create_support_ticket_v2']).toEqual(expect.arrayContaining(['src/app/api/support/route.ts','supabase/migrations/20260903185000_support_submission_atomic_v2.sql']));
  });
  it('links source files to consumers and tests through reverse imports',()=>{
    const atlas=generate();
    const importers=atlas.reverseImports['src/components/forms/storefront-form-wizard.tsx']??[];
    expect(importers).toContain('src/components/builder/storefront-support-contact-form-client.tsx');
    const support=atlas.nodes.find(node=>node.path==='src/components/builder/storefront-support-contact-form-client.tsx');
    expect(support?.imports).toContain('src/components/forms/storefront-form-wizard.tsx');
  });
  it('maps routes and subsystem ownership from the same repository snapshot',()=>{
    const atlas=generate();
    const supportApi=atlas.nodes.find(node=>node.path==='src/app/api/support/route.ts');
    expect(supportApi?.route).toMatchObject({path:'/api/support',kind:'api'});
    expect(supportApi?.subsystems).toContain('storefront-ui');
  });
  it('injects Atlas impact into the Development Guard',()=>{
    const source=readFileSync('scripts/shoperation-development-guard.mjs','utf8');
    expect(source).toContain('buildCodebaseAtlas');
    expect(source).toContain('atlasContext');
    expect(source).toContain('Codebase Atlas impact');
  });
});
