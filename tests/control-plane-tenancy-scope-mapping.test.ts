import fs from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>JSON.parse(fs.readFileSync(path,'utf8'));

describe('Control Plane tenancy scope mapping',()=>{
  it('classifies canonical tenancy instance code through the existing high-risk auth/access subsystem',()=>{
    const policy=read('deploy/release-risk-policy.json');
    const auth=policy.subsystems.find((item:{name:string})=>item.name==='auth-access-authority');
    expect(auth?.risk).toBe('high');
    expect(auth?.patterns).toContain('src/lib/instances/**');
    expect(policy.subsystems.filter((item:{patterns?:string[]})=>item.patterns?.includes('src/lib/instances/**'))).toHaveLength(1);
  });

  it('does not change canonical tenancy truth ownership',()=>{
    const domains=read('quality/knowledge/domain-foundations.v1.json');
    const tenancy=domains.domains.find((item:{id:string})=>item.id==='DOMAIN-TENANCY');
    expect(tenancy?.owner).toBe('tenant-context-authority');
    expect(tenancy?.canonicalPaths).toContain('src/lib/instances/**');
  });
});
