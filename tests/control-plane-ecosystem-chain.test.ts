// @ts-nocheck
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {
  compileGateChain,
  deriveImplementationSkeleton,
  evaluateReleaseRiskFiles,
} from '../scripts/lib/shoperation-development-runtime.mjs';
import {requiredExternalCompletionGuards} from '../scripts/shoperation-external-proof-handoff.mjs';

const registry=JSON.parse(readFileSync('quality/knowledge/guard-registry.v1.json','utf8'));

describe('Control Plane ecosystem chain',()=>{
  it('gives every blocking guard an explicit chain contract and one canonical data-product registry',()=>{
    expect(registry.ecosystem?.contract).toBe('shoporation.gate-ecosystem.v1');
    expect(registry.ecosystem?.principles).toMatchObject({
      upstreamProducesDownstreamConsumes:true,
      downstreamRequirementsPropagateBeforeCode:true,
      deterministicFactsHaveOneProducer:true,
      phaseApplicabilityIsExplicit:true,
      missingProducerFailsClosed:true,
      dependencyCycleFailsClosed:true,
    });
    const blocking=registry.guards.filter((guard:any)=>guard.blocking===true);
    expect(blocking.length).toBeGreaterThan(0);
    for(const guard of blocking){
      expect(guard.chain,guard.id).toBeTruthy();
      expect(guard.chain.phases.length,guard.id).toBeGreaterThan(0);
      expect(['local','external'],guard.id).toContain(guard.chain.execution);
      for(const input of guard.chain.consumes??[])expect(registry.ecosystem.dataProducts[input]?.producer,`${guard.id} consumes ${input}`).toBeTruthy();
      for(const output of guard.chain.produces??[])expect(registry.ecosystem.dataProducts[output]?.producer,`${guard.id} produces ${output}`).toBe(guard.id);
    }
  });

  it('turns consumed upstream data into dependency edges and fails closed on cycles or missing producers',()=>{
    const chain=compileGateChain({
      guardRegistry:registry,
      plannedFiles:['quality/knowledge/guard-registry.v1.json'],
      phase:'PLAN',
      explicitGuardIds:['GUARD-RELEASE-RISK'],
    });
    expect(chain.decision,JSON.stringify(chain.issues)).toBe('PASS');
    expect(chain.orderedGateIds.indexOf('GUARD-PLAN-BEFORE-CODE')).toBeLessThan(chain.orderedGateIds.indexOf('GUARD-RELEASE-RISK'));
    expect(chain.currentPhaseGateIds).toContain('GUARD-PLAN-BEFORE-CODE');
    expect(chain.externalGateIds).toContain('GUARD-TEMPLATE-FACTORY');

    const cyclic={
      ecosystem:{dataProducts:{a:{producer:'A'},b:{producer:'B'}}},
      guards:[
        {id:'A',blocking:true,verification:{dependsOn:[]},chain:{phases:['PLAN'],execution:'local',alwaysApplicable:true,consumes:['b'],produces:['a']}},
        {id:'B',blocking:true,verification:{dependsOn:[]},chain:{phases:['PLAN'],execution:'local',consumes:['a'],produces:['b']}},
      ],
    };
    const cycle=compileGateChain({guardRegistry:cyclic,plannedFiles:[],phase:'PLAN',explicitGuardIds:['A']});
    expect(cycle.decision).toBe('BLOCK');
    expect(cycle.issues.map((item:any)=>item.code)).toContain('GATE_CHAIN_DEPENDENCY_CYCLE');

    const missing={
      ecosystem:{dataProducts:{}},
      guards:[{id:'A',blocking:true,verification:{dependsOn:[]},chain:{phases:['PLAN'],execution:'local',alwaysApplicable:true,consumes:['missing'],produces:[]}}],
    };
    const missingProducer=compileGateChain({guardRegistry:missing,plannedFiles:[],phase:'PLAN',explicitGuardIds:['A']});
    expect(missingProducer.decision).toBe('BLOCK');
    expect(missingProducer.issues.map((item:any)=>item.code)).toContain('GATE_CHAIN_INPUT_PRODUCER_MISSING');
  });

  it('predicts the canonical Release Risk Budget before implementation without weakening thresholds',()=>{
    const mixed=evaluateReleaseRiskFiles([
      'src/lib/auth/workforce-auth-form.tsx',
      'src/app/admin/platform/webaruhazak/actions.ts',
    ]);
    expect(mixed.decision).toBe('BLOCK');
    expect(mixed.score).toBe(7);
    expect(mixed.violations.map((item:any)=>item.code)).toContain('PROJECTED_RELEASE_RISK_HIGH_NOT_ISOLATED');

    const isolatedDelegators=evaluateReleaseRiskFiles([
      'src/app/admin/platform/webaruhazak/actions.ts',
      'src/app/fiokom/page.tsx',
      'src/app/platform/page.tsx',
      'tests/workforce-entrypoint-convergence.test.ts',
    ]);
    expect(isolatedDelegators.decision).toBe('PASS');
    expect(isolatedDelegators.score).toBe(5);
    expect(isolatedDelegators.subsystemCount).toBe(3);
  });

  it('turns non-existent exact planned paths into MUST_CREATE while retaining existing relationship categories',()=>{
    const skeleton=deriveImplementationSkeleton({
      plannedFilePatterns:['src/existing.ts','src/new-capability.ts'],
      atlasFiles:['src/existing.ts','src/consumer.ts'],
      executionRoute:{
        MUST_EDIT:['src/existing.ts'],
        INSTRUCTION_REQUIRED:[],
        MAY_EDIT:['src/consumer.ts'],
        IMPACTED_READ_ONLY:['src/read-only.ts'],
        PROOF:['tests/example.test.ts'],
        AUTHORITY:['quality-knowledge-system'],
        UNKNOWN:[],
        FORBIDDEN_ROUTE_TOMBSTONES:[],
        PLANNED_FORBIDDEN_ROUTE_DELETIONS:[],
      },
    });
    expect(skeleton.mustEdit).toEqual(['src/existing.ts']);
    expect(skeleton.mustCreate).toEqual(['src/new-capability.ts']);
    expect(skeleton.mayEdit).toEqual(['src/consumer.ts']);
    expect(skeleton.impactedReadOnly).toEqual(['src/read-only.ts']);
  });

  it('derives external proof applicability from planned scope even when the manual Completion Contract omits it',()=>{
    const activePlan={
      status:'ready-for-implementation',
      plannedFilePatterns:['quality/knowledge/guard-registry.v1.json'],
      operationalIntelligence:{semanticExecutionRoute:{mustEdit:['quality/knowledge/guard-registry.v1.json'],mustCreate:[]}},
      completionContract:{requirements:[{
        evidence:{implementation:['GUARD-QUALITY-TESTS'],outcome:['GUARD-PRODUCTION-BUILD']},
        forbiddenRegressions:[],
      }]},
    };
    const verificationPlan={gates:{
      'GUARD-QUALITY-TESTS':{gateId:'GUARD-QUALITY-TESTS'},
      'GUARD-PRODUCTION-BUILD':{gateId:'GUARD-PRODUCTION-BUILD'},
    }};
    expect(requiredExternalCompletionGuards({activePlan,verificationPlan,guardRegistry:registry})).toContain('GUARD-TEMPLATE-FACTORY');
  });

  it('keeps external-proof detection and resumable reconciliation on the same canonical requirement derivation',()=>{
    const checkpoint=readFileSync('scripts/shoperation-verification-checkpoint.mjs','utf8');
    expect(checkpoint).toContain('requiredExternalCompletionGuards({activePlan,verificationPlan:plan,guardRegistry})');
    expect(checkpoint).toContain('...completionEvidenceGuardIds(activePlan),...derivedExternalGuardIds');
    expect(checkpoint).not.toContain('requiredIds:completionEvidenceGuardIds(activePlan)');
  });

  it('routes Template Factory live proof through Atlas-derived runtime identity without hiding current proof execution',()=>{
    const workflow=readFileSync('.github/workflows/template-factory-quality-gate.yml','utf8');
    const qualityGate=readFileSync('scripts/template-factory-quality-gate.mjs','utf8');
    const external=readFileSync('scripts/shoperation-external-proof-handoff.mjs','utf8');
    const handoff=readFileSync('scripts/template-factory-product-owner-handoff.mjs','utf8');
    const guard=registry.guards.find((item:any)=>item.id==='GUARD-TEMPLATE-FACTORY');
    expect(guard?.chain?.liveRuntime?.contract).toBe('shoporation.template-factory-live-runtime.v1');
    expect(guard?.chain?.liveRuntime?.dependencyAuthority).toBe('codebase-atlas.forward-import-closure');
    expect(guard?.chain?.liveRuntime?.classifierInputs).toContain('scripts/lib/shoperation-template-factory-resumable-verification.mjs');
    expect(guard?.chain?.liveRuntime?.safetyFallbackRuntimePatterns).toContain('src/**');
    expect(workflow).toContain('deriveTemplateLiveRuntimeOrigin');
    expect(workflow).toContain('deriveTemplatePreviewAnchorCandidates');
    expect(workflow).toContain('steps.live-proof.outputs.runtime_sha');
    expect(workflow).not.toContain("steps.live-proof.outputs.mode != 'REUSE'");
    expect(workflow).toContain('PRODUCT_OWNER_RUNTIME_SOURCE_COMMIT');
    expect(workflow).toContain('PRODUCT_OWNER_DEPLOYMENT_SOURCE_COMMIT');
    expect(workflow).toContain("core.setOutput('deployment-source-commit',deploymentSha)");
    expect(workflow).toContain('TEMPLATE_QUALITY_LIVE_PROOF_DECISION');
    expect(workflow).toContain('TEMPLATE_QUALITY_DEPLOYMENT_SOURCE_COMMIT');
    expect(workflow).toContain("deployment.production_environment===true||environment==='production'");
    expect(workflow).toContain("deployment.production_environment!==true&&environment==='preview'");
    expect((workflow.match(/repos\.listDeployments/g)??[])).toHaveLength(1);
    expect((workflow.match(/id: runtime-preview/g)??[])).toHaveLength(1);
    expect(workflow).not.toContain('id: product-owner-preview');
    expect(workflow).not.toContain('id: engine-functional-preview');
    expect(workflow).toContain('TEMPLATE_LIVE_RUNTIME_PREVIEW_ANCHOR_MISSING');
    expect(qualityGate).toContain('liveProofDecision?.runtimeSourceCommit');
    expect(qualityGate).toContain("contract:'shoporation.template-factory-live-proof.v1'");
    expect(handoff).toContain('PRODUCT_OWNER_RUNTIME_SOURCE_COMMIT');
    expect(external).toContain('validateTemplateLiveProofRecord(manifest.liveProof');
  });

  it('makes future plan generation write transaction identity, implementation skeleton and downstream proof obligations before code',()=>{
    const guard=readFileSync('scripts/shoperation-development-guard.mjs','utf8');
    const plan=readFileSync('scripts/shoperation-plan-before-code.mjs','utf8');
    expect(guard).toContain("changeBaseSha=execFileSync('git',['rev-parse','HEAD']");
    expect(guard).toContain("implementationSkeleton=deriveImplementationSkeleton");
    expect(guard).toContain("projectedReleaseRisk=evaluateReleaseRiskFiles");
    expect(guard).toContain("systemObligations:{derivation:'canonical-gate-chain'");
    expect(plan).toContain('DEV_PLAN_PROJECTED_RELEASE_RISK_BLOCK');
    expect(plan).toContain('DEV_PLAN_SEMANTIC_MUST_CREATE_DRIFT');
    expect(plan).toContain('compileGateChain');
  });
});
