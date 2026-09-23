import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>readFileSync(resolve(process.cwd(),path),'utf8');

describe('Template Factory workflow source coverage',()=>{
  it('watches the Factory authority and its regression tests on push and pull requests',()=>{
    const workflow=read('.github/workflows/template-factory-quality-gate.yml');
    expect(workflow.match(/src\/lib\/builder\/template-factory\/\*\*/g)?.length).toBeGreaterThanOrEqual(2);
    expect(workflow.match(/tests\/\*\*template-factory\*\*/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('renders registered Factory candidates through the internal QA path without catalog registration',()=>{
    const qaRoute=read('src/app/visual-fidelity-qa/page.tsx');
    const qaCatalog=read('src/app/api/visual-fidelity/templates/route.ts');
    const runner=read('scripts/template-factory-quality-gate.mjs');
    const storefrontCatalog=read('src/lib/builder/storefront-template-catalog.ts');

    expect(qaRoute).toContain("query.factory==='1'");
    expect(qaRoute).toContain('buildRegisteredStorefrontTemplateFactoryCandidate');
    expect(qaRoute).toContain('build.report.technicalReady');
    expect(qaCatalog).toContain('factoryCandidate:true');
    expect(qaCatalog).toContain('build.report.technicalReady');
    expect(runner).toContain("manifest.factoryCandidate?'&factory=1':''");
    expect(storefrontCatalog).not.toContain('LOOT_VAULT_V2_FACTORY_RECIPE');
    expect(storefrontCatalog).not.toContain('buildRegisteredStorefrontTemplateFactoryCandidate');
  });
});
