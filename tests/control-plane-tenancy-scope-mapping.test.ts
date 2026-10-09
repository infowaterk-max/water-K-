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

  it('preserves the Identity/Tenancy graph while classifying Core plan and entitlement access',()=>{
    const risk=read('deploy/release-risk-policy.json');
    const domains=read('quality/knowledge/domain-foundations.v1.json');
    const identity=domains.domains.find((item:{id:string})=>item.id==='DOMAIN-IDENTITY');
    const tenancy=domains.domains.find((item:{id:string})=>item.id==='DOMAIN-TENANCY');
    expect(identity?.canonicalPaths).toEqual(expect.arrayContaining(['src/lib/plans/catalog.ts','src/lib/entitlements/catalog.ts']));
    expect(tenancy?.canonicalPaths).toEqual(expect.arrayContaining(['src/lib/plans/access.ts','src/lib/entitlements/access.ts']));
    expect(identity?.dependsOn).not.toContain('DOMAIN-TENANCY');
    expect(tenancy?.dependsOn).toContain('DOMAIN-IDENTITY');
    expect(tenancy?.owner).toBe('tenant-context-authority');
    expect(tenancy?.canonicalPaths).toContain('src/lib/instances/**');
    for(const pattern of ['src/lib/plans/**','src/lib/entitlements/**']){
      const owners=risk.subsystems.filter((item:{patterns:string[]})=>item.patterns.includes(pattern));
      expect(owners.map((item:{name:string})=>item.name)).toEqual(['auth-access-authority']);
    }
  });

});
