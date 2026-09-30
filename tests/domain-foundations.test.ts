import {describe,expect,it} from 'vitest';
import {DOMAIN_FOUNDATION_REGISTRY,dependencyClosure,domainForTruth,getDomainFoundation,validateDomainFoundations} from '@/lib/quality-system/domain-foundations';

describe('Shoperation Domain Foundations v1',()=>{
  it('forms a valid canonical and acyclic domain authority registry',()=>{
    const result=validateDomainFoundations();
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.domainCount).toBe(13);
    expect(result.truthOwnerCount).toBeGreaterThan(30);
  });

  it('assigns each critical truth to one explicit owner',()=>{
    expect(domainForTruth('identity.authorization-decision')?.id).toBe('DOMAIN-IDENTITY');
    expect(domainForTruth('context.tenant')?.id).toBe('DOMAIN-TENANCY');
    expect(domainForTruth('commerce.order')?.id).toBe('DOMAIN-COMMERCE');
    expect(domainForTruth('inventory.stock')?.id).toBe('DOMAIN-CATALOG');
    expect(domainForTruth('data.migration-state')?.id).toBe('DOMAIN-DATA');
    expect(domainForTruth('release.deployment-state')?.id).toBe('DOMAIN-RELEASE');
    expect(domainForTruth('content.story')?.id).toBe('DOMAIN-CONTENT');
    expect(domainForTruth('content.provenance-validation')?.id).toBe('DOMAIN-CONTENT');
  });

  it('keeps cross-domain ownership boundaries explicit',()=>{
    expect(getDomainFoundation('DOMAIN-STOREFRONT')?.doesNotOwn).toEqual(expect.arrayContaining(['authentication truth','price/order truth','inventory truth']));
    expect(getDomainFoundation('DOMAIN-INCIDENT')?.doesNotOwn).toContain('arbitrary code mutation authority');
    expect(getDomainFoundation('DOMAIN-INTEGRATIONS')?.doesNotOwn).toContain('commerce policy');
    expect(getDomainFoundation('DOMAIN-CONTENT')?.doesNotOwn).toEqual(expect.arrayContaining(['product/catalog facts','price/order/payment truth','storefront layout','builder page schema']));
  });

  it('exposes deterministic dependency closure for later Change Impact / Atlas 2.0',()=>{
    expect(dependencyClosure('DOMAIN-RELEASE')).toEqual(expect.arrayContaining(['DOMAIN-QUALITY','DOMAIN-DATA','DOMAIN-TENANCY','DOMAIN-IDENTITY']));
    expect(dependencyClosure('DOMAIN-BUILDER')).toEqual(expect.arrayContaining(['DOMAIN-STOREFRONT','DOMAIN-COMMERCE','DOMAIN-CATALOG','DOMAIN-IDENTITY','DOMAIN-TENANCY']));
  });

  it('maps the real canonical catalog modules instead of an empty directory-only assumption',()=>{
    const catalog=getDomainFoundation('DOMAIN-CATALOG');
    expect(catalog?.canonicalPaths).toEqual(expect.arrayContaining(['src/lib/catalog.ts','src/lib/catalog-*.ts','src/lib/inventory/**']));
  });

  it('maps shared commerce shells and shopper routes to their existing canonical authorities',()=>{
    const commerce=getDomainFoundation('DOMAIN-COMMERCE');
    expect(commerce?.canonicalPaths).toEqual(expect.arrayContaining(['src/components/cart/**','src/components/checkout/**','src/components/commerce/**']));
    expect(commerce?.boundaryRules).toContain('Cart and Checkout behavior, state, validation, totals, shipping/payment selection and fail-closed order submission are platform Commerce authority; templates may supply bounded visual tokens only.');
    const storefront=getDomainFoundation('DOMAIN-STOREFRONT');
    expect(storefront?.canonicalPaths).toEqual(expect.arrayContaining(['src/lib/account/**','src/components/account/**','src/app/fiokom/**','src/app/szallitas/**','src/app/fizetes/**','src/app/szallitas-es-fizetes/**','src/app/sitemap.ts','src/app/globals.css']));
    expect(storefront?.boundaryRules).toContain('Account Collection presentation may project purchase-history ownership but may not reinterpret wishlist state as ownership truth.');
  });

  it('requires every domain to state evidence obligations and machine-queryable paths',()=>{
    for(const domain of DOMAIN_FOUNDATION_REGISTRY.domains){
      expect(domain.evidenceObligations.length,domain.id).toBeGreaterThan(0);
      expect(domain.canonicalPaths.length,domain.id).toBeGreaterThan(0);
      expect(domain.boundaryRules.length,domain.id).toBeGreaterThan(0);
    }
  });
});
