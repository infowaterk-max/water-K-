import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
import {ARCHITECTURE_CONSTITUTION,DOMAIN_FOUNDATIONS,domainFoundation,validateArchitectureConstitution} from '@/lib/quality-system/architecture-constitution';

describe('Shoperation Architecture Constitution',()=>{
  it('keeps the Constitution above all lower architecture authorities',()=>{
    expect(ARCHITECTURE_CONSTITUTION.authorityOrder).toEqual([
      'architecture-constitution','global-foundation','domain-foundation','capability-contract','implementation','evidence',
    ]);
    expect(ARCHITECTURE_CONSTITUTION.amendmentPolicy).toMatchObject({requiresVersionBump:true,requiresRegressionProof:true,requiresExplicitSupersession:true,forbidsSilentOverride:true});
  });

  it('has unique stable principles and a valid acyclic domain foundation registry',()=>{
    const validation=validateArchitectureConstitution();
    expect(validation).toEqual({ok:true,issues:[]});
    expect(new Set(ARCHITECTURE_CONSTITUTION.principles.map(item=>item.id)).size).toBe(ARCHITECTURE_CONSTITUTION.principles.length);
    expect(new Set(DOMAIN_FOUNDATIONS.domains.map(item=>item.id)).size).toBe(DOMAIN_FOUNDATIONS.domains.length);
  });

  it('binds critical system domains to explicit canonical owners',()=>{
    expect(domainFoundation('DOMAIN-IDENTITY')?.owner).toBe('auth-access-authority');
    expect(domainFoundation('DOMAIN-QUALITY')?.owner).toBe('quality-knowledge-system');
    expect(domainFoundation('DOMAIN-INCIDENT')?.owner).toBe('incident-intelligence');
    expect(domainFoundation('DOMAIN-RELEASE')?.owner).toBe('release-infrastructure');
  });

  it('makes architecture documents part of knowledge infrastructure rather than an unclassified side channel',()=>{
    const scope=JSON.parse(fs.readFileSync('quality/knowledge/knowledge-scope-policy.v1.json','utf8')) as {knowledgeInfrastructurePrefixes:string[]};
    expect(scope.knowledgeInfrastructurePrefixes).toContain('docs/architecture/');
  });

  it('retains prior architecture documents as references, not silent competing authorities',()=>{
    expect(ARCHITECTURE_CONSTITUTION.supersession.legacyReferences).toEqual(expect.arrayContaining([
      'docs/NATIVE-ARCHITECTURE.md','docs/WEBSHOP_INSTANCE_ARCHITECTURE.md','docs/DEVELOPMENT.md',
    ]));
  });
});
