export const TEMPLATE_FACTORY_KNOWLEDGE_VERSION='shoporation.template-factory-knowledge.v1' as const;

export type TemplateFactoryRemediationPolicy='shared-root-cause-required'|'shared-invariant-preferred';
export type TemplateFactoryAuthorityOwner='platform'|'factory'|'category-foundation'|'template'|'quality-system';

export type TemplateFactoryKnownFailure={
  id:string;
  title:string;
  symptom:string;
  rootCause:string;
  occurrences:number;
  automatable:boolean;
  remediationPolicy:TemplateFactoryRemediationPolicy;
  invariantIds:readonly string[];
  regressionTests:readonly string[];
};

export type TemplateFactoryAuthorityRule={
  id:string;
  subject:string;
  owner:TemplateFactoryAuthorityOwner;
  delegates:readonly TemplateFactoryAuthorityOwner[];
  rule:string;
};

export const TEMPLATE_FACTORY_AUTHORITY_GRAPH:readonly TemplateFactoryAuthorityRule[]=Object.freeze([
  {id:'TF-AUTH-001',subject:'authentication behavior',owner:'platform',delegates:[],rule:'Credentials, session, password recovery and authorization remain shared platform authority.'},
  {id:'TF-AUTH-002',subject:'signed-out auth presentation',owner:'template',delegates:[],rule:'Every Factory recipe owns its account/auth public composition; category-foundation presentation may not leak.'},
  {id:'TF-AUTH-003',subject:'Factory candidate package resolution',owner:'factory',delegates:[],rule:'Internal QA and Product Owner preview must resolve the same compiled Factory candidate identity.'},
  {id:'TF-AUTH-004',subject:'header and footer composition',owner:'template',delegates:[],rule:'One canonical template-owned shell is compiled across all 14 pages.'},
  {id:'TF-AUTH-005',subject:'commerce behavior',owner:'platform',delegates:['template'],rule:'Cart, checkout, account and binding behavior stay shared; templates own composition and visual presentation only.'},
  {id:'TF-AUTH-006',subject:'responsive authority',owner:'platform',delegates:['template'],rule:'Responsive semantics and stable node identity are shared; template recipes may provide bounded responsive composition.'},
  {id:'TF-AUTH-007',subject:'demo media and demo content',owner:'template',delegates:['factory'],rule:'Demo assets are presentation fillers, package-owned and non-authoritative; shopper-facing UI copy remains template-owned.'},
  {id:'TF-AUTH-008',subject:'Product Owner handoff proof',owner:'quality-system',delegates:[],rule:'The handed-off URL must identify the same exact-head Factory candidate proven by QA.'},
  {id:'TF-AUTH-009',subject:'browser proof stabilization',owner:'quality-system',delegates:[],rule:'Browser assertions and screenshots must observe the same settled DOM state; streamed UI must be awaited before proof is sampled.'},
  {id:'TF-AUTH-010',subject:'Product Owner preview authorization context',owner:'platform',delegates:['quality-system'],rule:'Authenticated Factory Product Owner preview authorization is tenant-independent: access may be proven by platform-operator authority or an active owner/admin RBAC binding, but rendering capability comes from the compiled candidate and must not require an active webshop or subscription-plan context.'},
  {id:'TF-AUTH-011',subject:'exact-head Factory browser acceptance coverage',owner:'quality-system',delegates:[],rule:'A Factory candidate may claim browserMatrixPassed only after every canonical page type has passed every canonical viewport on the exact source commit; a canary subset is diagnostic evidence only and can never satisfy full-matrix acceptance.'},
  {id:'TF-AUTH-012',subject:'executable Product Owner journey proof',owner:'quality-system',delegates:[],rule:'Product Owner handoff is proven only by an executable CI path that resolves the exact-head deployed preview, consumes protected authentication material without exposing it, runs the journey verifier, and persists the resulting proof artifact; the existence of a handoff script alone is never proof.'},
  {id:'TF-AUTH-013',subject:'Product Owner proof source-commit normalization',owner:'quality-system',delegates:[],rule:'Exact-head Product Owner proof must normalize the source commit from the PR head SHA for pull_request runs and from github.sha for push runs; merge-ref SHAs are never accepted as candidate provenance.'},
  {id:'TF-AUTH-014',subject:'visible Product Owner auth interaction target',owner:'quality-system',delegates:['template'],rule:'Automated Product Owner authentication must interact only with the single visible active auth control set; hidden responsive duplicates are non-interactive evidence and ambiguous visible targets fail closed.'},
  {id:'TF-AUTH-015',subject:'Product Owner failure evidence persistence',owner:'quality-system',delegates:[],rule:'After handoff preflight starts, expected and unexpected journey failures must persist a machine-readable proof artifact; a browser interaction exception may fail the gate but may not erase the failure evidence.'},
  {id:'TF-AUTH-016',subject:'Vercel protected-preview automation boundary',owner:'quality-system',delegates:['platform'],rule:'Automated Product Owner proof against a protected Vercel preview must cross Deployment Protection with the dedicated automation bypass secret and must never treat a Vercel protection surface as Shoperation application output.'},
]);

export const TEMPLATE_FACTORY_KNOWN_FAILURES:readonly TemplateFactoryKnownFailure[]=Object.freeze([
  {
    id:'TF-KF-001',
    title:'Legacy package rendered instead of Factory candidate',
    symptom:'Internal QA shows the new template while Product Owner preview renders an older catalog package.',
    rootCause:'QA and Product Owner preview resolve different package authorities or lose factory/version identity.',
    occurrences:2,
    automatable:true,
    remediationPolicy:'shared-root-cause-required',
    invariantIds:['TF-AUTH-003','TF-AUTH-008'],
    regressionTests:['tests/storefront-template-preview-runtime.test.ts','tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-002',
    title:'Template-aware authentication falls back to generic storefront auth',
    symptom:'Preview login opens generic /fiokom or another storefront instead of the candidate template shell.',
    rootCause:'Template identity is not carried across the preview-auth boundary.',
    occurrences:2,
    automatable:true,
    remediationPolicy:'shared-root-cause-required',
    invariantIds:['TF-AUTH-001','TF-AUTH-002','TF-AUTH-003'],
    regressionTests:['tests/storefront-auth-surface.test.ts','tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-003',
    title:'Category-foundation auth composition leaks into a new template',
    symptom:'The new template uses another template\'s auth copy, node IDs, colors or layout.',
    rootCause:'The account page was inherited even though signed-out auth presentation is template-owned.',
    occurrences:1,
    automatable:true,
    remediationPolicy:'shared-invariant-preferred',
    invariantIds:['TF-AUTH-002'],
    regressionTests:['tests/template-factory-loot-vault-v2.test.ts','tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-004',
    title:'Foundation brand or media leak',
    symptom:'A Factory candidate contains Foundation-specific brand text, media paths or shell remnants.',
    rootCause:'Inherited content was not neutralized or an inherited page bypassed recipe ownership rules.',
    occurrences:2,
    automatable:true,
    remediationPolicy:'shared-root-cause-required',
    invariantIds:['TF-AUTH-004','TF-AUTH-007'],
    regressionTests:['tests/template-factory-scaffold-v1.test.ts','tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-005',
    title:'Green technical gate does not prove the Product Owner path',
    symptom:'CI is green but the URL handed to the Product Owner resolves a different or broken surface.',
    rootCause:'The quality system proved an internal route but did not bind the handoff artifact to the same candidate identity.',
    occurrences:2,
    automatable:true,
    remediationPolicy:'shared-root-cause-required',
    invariantIds:['TF-AUTH-003','TF-AUTH-008'],
    regressionTests:['tests/storefront-template-preview-runtime.test.ts','tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-006',
    title:'Responsive defect repeats on later templates',
    symptom:'Overflow, clipping, touch-target, shell height or desktop/mobile composition defects recur after being fixed elsewhere.',
    rootCause:'A prior template-specific correction was not promoted into shared responsive or browser-matrix authority.',
    occurrences:2,
    automatable:true,
    remediationPolicy:'shared-root-cause-required',
    invariantIds:['TF-AUTH-006'],
    regressionTests:['tests/storefront-responsive-isolation.test.ts','tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-007',
    title:'Browser QA samples streamed UI before the proof surface settles',
    symptom:'The assertion reports missing UI while the screenshot from the same case visibly contains the required surface.',
    rootCause:'The browser harness sampled a streamed React/Next.js surface before waiting for the asserted state to become visible.',
    occurrences:1,
    automatable:true,
    remediationPolicy:'shared-invariant-preferred',
    invariantIds:['TF-AUTH-009'],
    regressionTests:['tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-008',
    title:'Product Owner preview depends on active tenant or subscription plan after login',
    symptom:'Template-aware login succeeds, then the preview falls into an active-webshop-context or plan gate instead of rendering the compiled Factory candidate.',
    rootCause:'The Product Owner preview route reused merchant/storefront authorization that resolves a current tenant and plan even though the candidate preview is tenant-independent.',
    occurrences:2,
    automatable:true,
    remediationPolicy:'shared-root-cause-required',
    invariantIds:['TF-AUTH-003','TF-AUTH-008','TF-AUTH-010'],
    regressionTests:['tests/storefront-template-preview-access.test.ts','tests/storefront-auth-surface.test.ts','tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-009',
    title:'Factory canary subset mislabeled as full browser matrix',
    symptom:'An exact-head Factory quality run exercises only the canary page subset but still emits browserMatrixPassed=true and can appear ready for handoff.',
    rootCause:'Acceptance evaluated only the cases that happened to run instead of proving complete canonical page-by-viewport coverage, while fallback scope allowed Factory candidates to remain canary-only.',
    occurrences:1,
    automatable:true,
    remediationPolicy:'shared-invariant-preferred',
    invariantIds:['TF-AUTH-008','TF-AUTH-011'],
    regressionTests:['tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-010',
    title:'Product Owner handoff verifier exists but is orphaned from CI',
    symptom:'The repository contains a Product Owner journey verifier, yet no protected exact-head workflow actually executes it, so the final handoff gate can remain permanently unproven.',
    rootCause:'The proof script was implemented as a local capability but never wired to an exact-head deployment resolver, protected authentication secrets and persisted CI evidence.',
    occurrences:1,
    automatable:true,
    remediationPolicy:'shared-invariant-preferred',
    invariantIds:['TF-AUTH-008','TF-AUTH-012'],
    regressionTests:['tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-011',
    title:'Product Owner PR proof binds to merge-ref SHA instead of branch HEAD',
    symptom:'A pull_request workflow can pass technical CI while the deployment resolver and DOM provenance check look for the synthetic merge SHA rather than the Factory candidate branch HEAD.',
    rootCause:'The journey workflow used github.sha/context.sha uniformly across push and pull_request events instead of normalizing to pull_request.head.sha for PR execution.',
    occurrences:1,
    automatable:true,
    remediationPolicy:'shared-invariant-preferred',
    invariantIds:['TF-AUTH-008','TF-AUTH-013'],
    regressionTests:['tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-012',
    title:'Responsive duplicate auth controls break strict Product Owner locator',
    symptom:'The journey verifier sees multiple email/password controls because hidden responsive copies remain in the DOM and Playwright strict mode aborts before authentication.',
    rootCause:'The verifier selected semantic auth fields without constraining interaction to the single visible active control set.',
    occurrences:1,
    automatable:true,
    remediationPolicy:'shared-invariant-preferred',
    invariantIds:['TF-AUTH-009','TF-AUTH-014'],
    regressionTests:['tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-013',
    title:'Unexpected journey exception exits before handoff proof is persisted',
    symptom:'A browser interaction exception fails the job but produces no Product Owner proof artifact, obscuring the exact failure state.',
    rootCause:'Proof serialization lived inside the happy-path try block instead of after guarded browser cleanup.',
    occurrences:1,
    automatable:true,
    remediationPolicy:'shared-invariant-preferred',
    invariantIds:['TF-AUTH-008','TF-AUTH-015'],
    regressionTests:['tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-014',
    title:'Vercel Deployment Protection is mistaken for Shoperation preview output',
    symptom:'The exact preview URL stays on the requested path but neither the template-aware login shell nor Factory provenance root is present, because the browser is still on the deployment-protection layer.',
    rootCause:'The CI browser reached a protected Vercel deployment without the dedicated automation bypass header, so application routing and authentication never executed.',
    occurrences:1,
    automatable:true,
    remediationPolicy:'shared-invariant-preferred',
    invariantIds:['TF-AUTH-008','TF-AUTH-016'],
    regressionTests:['tests/template-factory-procedural-memory.test.ts'],
  },
]);

export function getTemplateFactoryKnownFailure(id:string){
  return TEMPLATE_FACTORY_KNOWN_FAILURES.find(item=>item.id===id)??null;
}

export function getTemplateFactoryAuthorityRule(id:string){
  return TEMPLATE_FACTORY_AUTHORITY_GRAPH.find(item=>item.id===id)??null;
}
