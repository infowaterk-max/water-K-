import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';

describe('Template Factory workflow source coverage',()=>{
  it('watches the Factory authority and its regression tests on push and pull requests',()=>{
    const workflow=readFileSync(resolve(process.cwd(),'.github/workflows/template-factory-quality-gate.yml'),'utf8');
    expect(workflow.match(/src\/lib\/builder\/template-factory\/\*\*/g)?.length).toBeGreaterThanOrEqual(2);
    expect(workflow.match(/tests\/\*\*template-factory\*\*/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
