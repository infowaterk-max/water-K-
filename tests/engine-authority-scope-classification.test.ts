import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {resolveShoperationKnowledgeScope} from '@/lib/quality-system/scope-resolver';

const readJson=(path:string)=>JSON.parse(readFileSync(path,'utf8'));

describe('Engine authority scope classification',()=>{
  const risk=readJson('deploy/release-risk-policy.json') as {
    maxPoints:number;
    maxSubsystems:number;
    riskWeights:Record<string,number>;
    subsystems:{name:string;risk:string;patterns:string[]}[];
  };
  const domains=readJson('quality/knowledge/domain-foundations.v1.json') as {
    domains:{id:string;owner:string;canonicalPaths:string[];truthOwnership:string[]}[];
  };

  it('keeps the release budget strict while classifying deterministic commerce engines separately from checkout',()=>{
    expect(risk.maxPoints).toBe(5);
    expect(risk.maxSubsystems).toBe(3);
    expect(risk.riskWeights.high).toBe(5);
    expect(risk.riskWeights.medium).toBe(2);

    const readModel=risk.subsystems.find(item=>item.name==='commerce-read-model-authority');
    expect(readModel?.risk).toBe('medium');
    expect(readModel?.patterns).toEqual(expect.arrayContaining([
      'src/lib/commerce/product-discovery.ts',
      'src/lib/commerce/structured-product.ts',
      'src/lib/commerce/guided-finder.ts',
      'src/lib/commerce/compatibility-engine.ts',
      'src/lib/commerce/product-configurator.ts',
    ]));
    expect(readModel?.patterns).not.toContain('src/lib/commerce/checkout-quote.ts');

    const checkout=risk.subsystems.find(item=>item.name==='payment-checkout-order-authority');
    expect(checkout?.risk).toBe('high');
    expect(checkout?.patterns).toEqual(expect.arrayContaining([
      'src/lib/commerce/cart-engine.ts',
      'src/lib/commerce/checkout-quote.ts',
      'src/lib/commerce/pricing.ts',
      'src/lib/commerce/providers.ts',
      'src/lib/commerce/settings.ts',
    ]));
  });

  it('adds one canonical content/editorial authority instead of hiding E10 under Builder or Storefront',()=>{
    const content=domains.domains.find(item=>item.id==='DOMAIN-CONTENT');
    expect(content).toBeTruthy();
    expect(content?.owner).toBe('content-authority');
    expect(content?.canonicalPaths).toContain('src/lib/content/**');
    expect(content?.truthOwnership).toEqual(expect.arrayContaining([
      'content.document',
      'content.publication-state',
      'content.story',
      'content.provenance-validation',
    ]));

    const subsystem=risk.subsystems.find(item=>item.name==='content-authority');
    expect(subsystem?.risk).toBe('medium');
    expect(subsystem?.patterns).toEqual(['src/lib/content/**']);
  });

  it('resolves E2, E7 and E10 without unresolved scope and expands their presentation dependency',()=>{
    for(const [file,subsystem] of [
      ['src/lib/commerce/product-discovery.ts','commerce-read-model-authority'],
      ['src/lib/commerce/structured-product.ts','commerce-read-model-authority'],
      ['src/lib/content/story-engine.ts','content-authority'],
    ] as const){
      const resolved=resolveShoperationKnowledgeScope({changedFiles:[file]});
      expect(resolved.unresolvedFiles,file).toEqual([]);
      expect(resolved.directSubsystems,file).toContain(subsystem);
      expect(resolved.impactedSubsystems,file).toContain('shared-storefront');
    }
  });

  it('keeps canonical E13 core files in the high-risk checkout subsystem',()=>{
    const resolved=resolveShoperationKnowledgeScope({changedFiles:['src/lib/commerce/checkout-quote.ts']});
    expect(resolved.unresolvedFiles).toEqual([]);
    expect(resolved.directSubsystems).toContain('payment-checkout-order-authority');
    expect(resolved.directSubsystems).not.toContain('commerce-read-model-authority');
  });

  it('classifies Core entitlement catalogs and tenant-aware access under the existing high-risk authorities',()=>{
    const auth=risk.subsystems.find(item=>item.name==='auth-access-authority');
    const identity=domains.domains.find(item=>item.id==='DOMAIN-IDENTITY');
    const tenancy=domains.domains.find(item=>item.id==='DOMAIN-TENANCY');
    expect(auth?.risk).toBe('high');
    expect(identity?.owner).toBe('auth-access-authority');
    expect(tenancy?.owner).toBe('tenant-context-authority');
    for(const pattern of ['src/lib/plans/**','src/lib/entitlements/**']){
      expect(auth?.patterns).toContain(pattern);
      expect(risk.subsystems.filter(item=>item.patterns.includes(pattern)).map(item=>item.name)).toEqual(['auth-access-authority']);
    }
    expect(identity?.canonicalPaths).toEqual(expect.arrayContaining(['src/lib/plans/catalog.ts','src/lib/plans/addons.ts','src/lib/entitlements/catalog.ts']));
    expect(tenancy?.canonicalPaths).toEqual(expect.arrayContaining(['src/lib/plans/access.ts','src/lib/entitlements/access.ts','src/lib/entitlements/policy.ts']));
    expect(identity?.canonicalPaths).not.toContain('src/lib/plans/**');
    for(const file of ['src/lib/plans/catalog.ts','src/lib/plans/access.ts','src/lib/entitlements/access.ts','src/lib/entitlements/policy.ts']){
      const resolved=resolveShoperationKnowledgeScope({changedFiles:[file]});
      expect(resolved.unresolvedFiles,file).toEqual([]);
      expect(resolved.directSubsystems,file).toContain('auth-access-authority');
    }
    expect(risk.riskWeights.high).toBe(risk.maxPoints);
  });

});
