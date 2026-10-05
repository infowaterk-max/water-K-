import fs from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>fs.readFileSync(path,'utf8');

describe('tenant scope classification',()=>{
  it('classifies canonical instance context paths in the high-risk auth/access subsystem',()=>{
    const policy=JSON.parse(read('deploy/release-risk-policy.json'));
    const auth=policy.subsystems.find((item:{name:string})=>item.name==='auth-access-authority');
    expect(auth?.risk).toBe('high');
    expect(auth?.patterns).toContain('src/lib/instances/**');
  });

  it('keeps canonical tenant truth ownership in DOMAIN-TENANCY',()=>{
    const domains=JSON.parse(read('quality/knowledge/domain-foundations.v1.json'));
    const tenancy=domains.domains.find((item:{id:string})=>item.id==='DOMAIN-TENANCY');
    expect(tenancy?.owner).toBe('tenant-context-authority');
    expect(tenancy?.canonicalPaths).toContain('src/lib/instances/**');
  });
});
