import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {
  TEMPLATE_FACTORY_AUTHORITY_GRAPH,
  TEMPLATE_FACTORY_KNOWN_FAILURES,
  TEMPLATE_FACTORY_KNOWLEDGE_VERSION,
} from '@/lib/builder/template-factory/knowledge-registry';
import {
  TEMPLATE_FACTORY_PROCEDURAL_MEMORY_VERSION,
  replayTemplateFactoryJourneyKnownFailures,
} from '@/lib/builder/template-factory/procedural-memory';

const readJson=(path:string)=>JSON.parse(readFileSync(path,'utf8')) as Record<string,any>;

describe('Template Factory engine functional proof contract',()=>{
  it('promotes shared engine behavior proof to a first-class Factory authority and recurring Known Failure',()=>{
    expect(TEMPLATE_FACTORY_KNOWLEDGE_VERSION).toBe('shoporation.template-factory-knowledge.v3');
    expect(TEMPLATE_FACTORY_PROCEDURAL_MEMORY_VERSION).toBe('shoporation.template-factory-procedural-memory.v3');
    const authority=TEMPLATE_FACTORY_AUTHORITY_GRAPH.find(item=>item.id==='TF-AUTH-025');
    expect(authority).toMatchObject({owner:'quality-system',subject:'shared engine functional proof'});
    expect(authority?.rule).toContain('Visible/demo integration is necessary but insufficient');

    const failure=TEMPLATE_FACTORY_KNOWN_FAILURES.find(item=>item.id==='TF-KF-025');
    expect(failure).toMatchObject({
      occurrences:2,
      automatable:true,
      remediationPolicy:'shared-root-cause-required',
    });
    expect(failure?.invariantIds).toContain('TF-AUTH-025');
  });

  it('replays functional proof independently from visible engine integration',()=>{
    const base={sourceCommit:'deadbeef',exactHeadBuildPassed:true,browserMatrixPassed:true,factoryPackageIdentityPassed:true,templateAwareAuthPassed:true,returnTargetPreserved:true,deploymentReady:true,handedOffUrlMatchesProvenance:true,navigationCompletenessPassed:true,routeConvergencePassed:true,presentationContinuityPassed:true,accountSurfacePassed:true,engineDemoIntegrationPassed:true,placeholderContentPassed:true};
    expect(replayTemplateFactoryJourneyKnownFailures({...base,engineFunctionalProofPassed:false})[0]).toMatchObject({failureId:'TF-KF-025',passed:false});
    expect(replayTemplateFactoryJourneyKnownFailures({...base,engineFunctionalProofPassed:true})[0]).toMatchObject({failureId:'TF-KF-025',passed:true});
  });

  it('wires the new failure into global applicability, development prevention and failure signatures',()=>{
    const quality=readJson('quality/knowledge/shoperation-quality-knowledge.v1.json');
    expect(quality.templateFactoryFailureApplicability['TF-KF-025']).toEqual([
      'builder-template-system',
      'payment-checkout-order-authority',
      'shared-storefront',
    ]);

    const guard=readJson('quality/knowledge/development-guard-policy.v1.json');
    expect(guard.directives['TF-KF-025'].forbiddenApproaches).toContain('treating rendered engine surfaces, metadata or demo integration as functional proof');

    const signatures=readJson('quality/knowledge/failure-signatures.v1.json');
    expect(signatures.rules).toContainEqual({match:'prefix',pattern:'ENGINE_FUNCTIONAL_PROOF_',failureId:'TF-KF-025'});
  });
});
