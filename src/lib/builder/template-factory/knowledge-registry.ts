import templateFactoryAuthority from '../../../../quality/knowledge/template-factory-authority.v1.json';
export const TEMPLATE_FACTORY_KNOWLEDGE_VERSION='shoporation.template-factory-knowledge.v2' as const;

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

export const TEMPLATE_FACTORY_AUTHORITY_GRAPH=Object.freeze(templateFactoryAuthority.rules) as unknown as readonly TemplateFactoryAuthorityRule[];

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
    title:'Browser proof samples streamed route or UI before the proof surface settles',
    symptom:'The assertion reports a missing route or UI surface even though the streamed React/Next.js response has already declared the transition or eventually renders the required surface.',
    rootCause:'The browser harness sampled a streamed React/Next.js route or DOM surface before waiting for the asserted navigation and visible state to settle.',
    occurrences:2,
    automatable:true,
    remediationPolicy:'shared-root-cause-required',
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
    symptom:'The journey verifier sees multiple auth surfaces or controls because hidden responsive copies remain in the DOM, causing false shared-surface failures or ambiguous interaction targets.',
    rootCause:'The verifier selected auth controls from all semantic auth surfaces instead of first constraining authority to the single visible active surface and then locating structural controls within it.',
    occurrences:2,
    automatable:true,
    remediationPolicy:'shared-root-cause-required',
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
  {
    id:'TF-KF-015',
    title:'Stacked Product Owner proof leaf is excluded by its own secret allowlist',
    symptom:'All technical gates pass but the deployment resolver, login journey and handoff artifact steps are skipped because the active stacked child branch no longer matches the proof branch condition.',
    rootCause:'Secret exposure was narrowed with a branch-name predicate that covered an ancestor proof branch but not the active stacked leaf carrying the final bypass wiring.',
    occurrences:1,
    automatable:true,
    remediationPolicy:'shared-invariant-preferred',
    invariantIds:['TF-AUTH-012','TF-AUTH-017'],
    regressionTests:['tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-016',
    title:'Declared Page Schema exists but is not Product Owner navigable',
    symptom:'The Factory candidate renders canonical pages in isolation, but the Product Owner showroom hides some of them behind grouped or incomplete navigation.',
    rootCause:'Page-count acceptance was treated as storefront completeness without requiring an owner-only main menu containing exactly all 14 canonical Page Schema destinations while preserving the real shopper header/footer.',
    occurrences:1,automatable:true,remediationPolicy:'shared-invariant-preferred',
    invariantIds:['TF-AUTH-018'],
    regressionTests:['tests/template-factory-storefront-contract.test.ts','tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-017',
    title:'Shopper entrypoints resolve to fragmented route authorities',
    symptom:'Header, card, PDP, toast or account entrypoints for the same capability resolve to different route or presentation authorities.',
    rootCause:'Journey proof validated individual pages but not multi-entry convergence.',
    occurrences:1,automatable:true,remediationPolicy:'shared-invariant-preferred',
    invariantIds:['TF-AUTH-019'],
    regressionTests:['tests/template-factory-storefront-contract.test.ts','tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-018',
    title:'Functional route leaks legacy or foreign-template presentation',
    symptom:'A shopper action leaves the selected template and opens legacy, generic, category-foundation or another template presentation.',
    rootCause:'Shared route behavior was not bound to the active template presentation authority.',
    occurrences:1,automatable:true,remediationPolicy:'shared-invariant-preferred',
    invariantIds:['TF-AUTH-020'],
    regressionTests:['tests/template-factory-storefront-contract.test.ts','tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-019',
    title:'Pretty demo page is disconnected from the real business route',
    symptom:'The preview contains a styled cart, checkout or content page, while the actual shopper action uses a different surface.',
    rootCause:'Demo presentation and canonical business-route authority were accepted independently, or a local proof accepted a presentation replica without consuming shared behavior authority.',
    occurrences:2,automatable:true,remediationPolicy:'shared-root-cause-required',
    invariantIds:['TF-AUTH-019','TF-AUTH-020','TF-AUTH-005'],
    regressionTests:['tests/template-factory-storefront-contract.test.ts','tests/template-factory-procedural-memory.test.ts','tests/shoperation-guard-context.test.ts'],
  },
  {
    id:'TF-KF-020',
    title:'Authenticated account route is technically valid but functionally empty',
    symptom:'Login succeeds and the account route loads, but canonical account navigation and capability surfaces are absent from the template demo.',
    rootCause:'Authentication proof was used as a proxy for complete account UX.',
    occurrences:1,automatable:true,remediationPolicy:'shared-invariant-preferred',
    invariantIds:['TF-AUTH-021'],
    regressionTests:['tests/template-factory-storefront-contract.test.ts','tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-021',
    title:'Shared engine exists but has no visible demo integration',
    symptom:'The recipe or registry declares an engine, but a merchant cannot recognize or exercise the capability in the storefront demo.',
    rootCause:'Engine registration was accepted without observable storefront components and reachable demo flows.',
    occurrences:1,automatable:true,remediationPolicy:'shared-invariant-preferred',
    invariantIds:['TF-AUTH-022'],
    regressionTests:['tests/template-factory-storefront-contract.test.ts','tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-022',
    title:'Template claims platform capability without demonstrating it',
    symptom:'A capability is listed in metadata or required features but has no meaningful showroom surface or demo data.',
    rootCause:'Capability declaration and demo evidence were not contractually coupled.',
    occurrences:1,automatable:true,remediationPolicy:'shared-invariant-preferred',
    invariantIds:['TF-AUTH-018','TF-AUTH-022'],
    regressionTests:['tests/template-factory-storefront-contract.test.ts','tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-023',
    title:'Visual browser matrix passes while storefront journey identity is fragmented',
    symptom:'All canonical pages render on desktop, tablet and mobile, yet real shopper navigation crosses route or presentation authorities.',
    rootCause:'The 14×3 matrix measured isolated render quality rather than end-to-end storefront identity continuity.',
    occurrences:1,automatable:true,remediationPolicy:'shared-invariant-preferred',
    invariantIds:['TF-AUTH-019','TF-AUTH-024'],
    regressionTests:['tests/template-factory-storefront-contract.test.ts','tests/template-factory-procedural-memory.test.ts'],
  },
  {
    id:'TF-KF-024',
    title:'Placeholder or fallback content reaches Product Owner handoff',
    symptom:'Instructional demo copy, generic fallback data, empty account content or inherited foreign-template information remains visible in the candidate.',
    rootCause:'Demo-data presence was accepted without Product Owner showroom-quality validation.',
    occurrences:1,automatable:true,remediationPolicy:'shared-invariant-preferred',
    invariantIds:['TF-AUTH-023','TF-AUTH-024'],
    regressionTests:['tests/template-factory-storefront-contract.test.ts','tests/template-factory-procedural-memory.test.ts'],
  },
]);

export function getTemplateFactoryKnownFailure(id:string){
  return TEMPLATE_FACTORY_KNOWN_FAILURES.find(item=>item.id===id)??null;
}

export function getTemplateFactoryAuthorityRule(id:string){
  return TEMPLATE_FACTORY_AUTHORITY_GRAPH.find(item=>item.id===id)??null;
}
