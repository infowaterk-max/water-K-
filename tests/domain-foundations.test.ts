import {describe,expect,it} from 'vitest';
import {DOMAIN_FOUNDATION_REGISTRY,dependencyClosure,domainForTruth,getDomainFoundation,validateDomainFoundations} from '@/lib/quality-system/domain-foundations';

describe('Shoperation Domain Foundations v1',()=>{
  it('forms a valid canonical and acyclic domain authority registry',()=>{
    const result=validateDomainFoundations();
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.domainCount).toBe(12);
    expect(result.truthOwnerCount).toBeGreaterThan(30);
  });

  it('assigns each critical truth to one explicit owner',()=>{
    expect(domainForTruth('identity.authorization-decision')?.id).toBe('DOMAIN-IDENTITY');
    expect(domainForTruth('context.tenant')?.id).toBe('DOMAIN-TENANCY');
    expect(domainForTruth('commerce.order')?.id).toBe('DOMAIN-COMMERCE');
    expect(domainForTruth('inventory.stock')?.id).toBe('DOMAIN-CATALOG');
    expect(domainForTruth('data.migration-state')?.id).toBe('DOMAIN-DATA');
    expect(domainForTruth('release.deployment-state')?.id).toBe('DOMAIN-RELEASE');
  });

  it('keeps cross-domain ownership boundaries explicit',()=>{
    expect(getDomainFoundation('DOMAIN-STOREFRONT')?.doesNotOwn).toEqual(expect.arrayContaining(['authentication truth','price/order truth','inventory truth']));
    expect(getDomainFoundation('DOMAIN-INCIDENT')?.doesNotOwn).toContain('arbitrary code mutation authority');
    expect(getDomainFoundation('DOMAIN-INTEGRATIONS')?.doesNotOwn).toContain('commerce policy');
  });

  it('exposes deterministic dependency closure for later Change Impact / Atlas 2.0',()=>{
    expect(dependencyClosure('DOMAIN-RELEASE')).toEqual(expect.arrayContaining(['DOMAIN-QUALITY','DOMAIN-DATA','DOMAIN-TENANCY','DOMAIN-IDENTITY']));
    expect(dependencyClosure('DOMAIN-BUILDER')).toEqual(expect.arrayContaining(['DOMAIN-STOREFRONT','DOMAIN-COMMERCE','DOMAIN-CATALOG','DOMAIN-IDENTITY','DOMAIN-TENANCY']));
  });

  it('requires every domain to state evidence obligations and machine-queryable paths',()=>{
    for(const domain of DOMAIN_FOUNDATION_REGISTRY.domains){
      expect(domain.evidenceObligations.length,domain.id).toBeGreaterThan(0);
      expect(domain.canonicalPaths.length,domain.id).toBeGreaterThan(0);
      expect(domain.boundaryRules.length,domain.id).toBeGreaterThan(0);
    }
  });
});
