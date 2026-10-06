// @ts-nocheck
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {
  canonicalizeTemplateFactoryInfrastructureInput,
  deriveTemplateLiveRuntimeClosure,
  deriveTemplatePreviewAnchorCandidates,
  selectTemplateLiveRuntimeOrigin,
  templatePreviewAnchorEquivalence,
  deriveTemplateReplayDecision,
  reusableTemplateBrowserCase,
  templateBrowserCaseFingerprint,
  templateFactoryInfrastructureSemanticallyEquivalent,
} from '../scripts/lib/shoperation-template-factory-resumable-verification.mjs';

const registry=JSON.parse(readFileSync('quality/knowledge/guard-registry.v1.json','utf8'));
const pageTypes=['home','catalog','product','cart','checkout','account','search','content','blog-index','blog-article','faq','contact','legal','not-found'];
const viewports=['desktop','tablet','mobile'];
const fingerprints=(suffix='v1')=>Object.fromEntries(pageTypes.map(page=>[page,page+'-'+suffix]));
const templateFile='src/lib/builder/templates/demo.ts';

describe('Template Factory resumable browser verification',()=>{
  it('treats provenance-only guard-registry changes as semantically equivalent for Template Factory scope',()=>{
    const file='quality/knowledge/guard-registry.v1.json';
    const a={verificationReuse:{promotion:{minimumShadowPasses:3,promotedFrom:{sourceCommit:'old',ciRunId:'1'}}}};
    const b={verificationReuse:{promotion:{minimumShadowPasses:3,promotedFrom:{sourceCommit:'new',ciRunId:'2'}}}};
    const semantic={verificationReuse:{promotion:{minimumShadowPasses:4,promotedFrom:{sourceCommit:'new',ciRunId:'2'}}}};
    expect(templateFactoryInfrastructureSemanticallyEquivalent(file,JSON.stringify(a),JSON.stringify(b))).toBe(true);
    expect(templateFactoryInfrastructureSemanticallyEquivalent(file,JSON.stringify(a),JSON.stringify(semantic))).toBe(false);
    const qualityGate=readFileSync('scripts/template-factory-quality-gate.mjs','utf8');
    expect(qualityGate).toContain('semanticQualityInfrastructureChange(change,diffBaseSha)');
    expect(qualityGate).toContain('templateFactoryInfrastructureSemanticallyEquivalent(change.file,before,readFileSync(change.file))');
  });

  it('keeps promotion provenance out of the Template Factory engine fingerprint while semantic policy remains identity-bearing',()=>{
    const file='quality/knowledge/guard-registry.v1.json';
    const a={verificationReuse:{promotion:{minimumShadowPasses:3,promotedFrom:{sourceCommit:'old',ciRunId:'1'}}}};
    const b={verificationReuse:{promotion:{minimumShadowPasses:3,promotedFrom:{sourceCommit:'new',ciRunId:'2'}}}};
    const semantic={verificationReuse:{promotion:{minimumShadowPasses:4,promotedFrom:{sourceCommit:'new',ciRunId:'2'}}}};
    expect(canonicalizeTemplateFactoryInfrastructureInput(file,JSON.stringify(a))).toBe(canonicalizeTemplateFactoryInfrastructureInput(file,JSON.stringify(b)));
    expect(canonicalizeTemplateFactoryInfrastructureInput(file,JSON.stringify(a))).not.toBe(canonicalizeTemplateFactoryInfrastructureInput(file,JSON.stringify(semantic)));
    const qualityGate=readFileSync('scripts/template-factory-quality-gate.mjs','utf8');
    expect(qualityGate).toContain('canonicalizeTemplateFactoryInfrastructureInput(file,readFileSync(file))');
  });

  it('derives deployed runtime scope from canonical entrypoints plus the exact-head Atlas snapshot',()=>{
    const atlas=JSON.parse(readFileSync('artifacts/shoperation-atlas/codebase-atlas.json','utf8'));
    const closure=deriveTemplateLiveRuntimeClosure({registry,atlas});
    expect(closure.decision,JSON.stringify(closure.issues)).toBe('PASS');
    expect(closure.entrypoints).toContain('src/app/admin/platform/page.tsx');
    expect(closure.entrypoints).toContain('src/app/api/auth/workforce-login/page.tsx');
    expect(closure.entrypoints).toContain('src/app/api/checkout/quote/route.ts');
    expect(closure.globalFiles).toContain('src/middleware.ts');
    expect(closure.files.length).toBeGreaterThan(closure.entrypoints.length);
    expect(closure.files).not.toContain('.github/workflows/template-factory-quality-gate.yml');
    expect(closure.files).not.toContain('scripts/template-factory-quality-gate.mjs');
  });

  it('selects the latest runtime-changing commit while ignoring newer proof-engine-only commits',()=>{
    const runtimeFile='src/app/admin/platform/page.tsx';
    const proofFile='.github/workflows/template-factory-quality-gate.yml';
    const base='base-sha';
    const proofOnly=selectTemplateLiveRuntimeOrigin({
      baseSha:base,currentHead:'head-proof',runtimeFiles:[runtimeFile],
      commitHistory:[{sha:'head-proof',files:[proofFile]}],
    });
    expect(proofOnly).toMatchObject({decision:'PASS',runtimeSourceCommit:base,mode:'BASE_RUNTIME',affectedInputs:[],runtimeEquivalenceProven:true});

    const ancestorRuntime=selectTemplateLiveRuntimeOrigin({
      baseSha:base,currentHead:'head-proof-2',runtimeFiles:[runtimeFile],
      commitHistory:[
        {sha:'head-proof-2',files:[proofFile]},
        {sha:'runtime-1',files:[runtimeFile]},
      ],
    });
    expect(ancestorRuntime).toMatchObject({decision:'PASS',runtimeSourceCommit:'runtime-1',mode:'ANCESTOR_RUNTIME',affectedInputs:[],runtimeEquivalenceProven:true});
    expect(ancestorRuntime.changedFilesSinceOrigin).toEqual([proofFile]);

    const currentRuntime=selectTemplateLiveRuntimeOrigin({
      baseSha:base,currentHead:'head-runtime',runtimeFiles:[runtimeFile],
      commitHistory:[
        {sha:'head-runtime',files:[runtimeFile]},
        {sha:'proof-before',files:[proofFile]},
      ],
    });
    expect(currentRuntime).toMatchObject({decision:'PASS',runtimeSourceCommit:'head-runtime',mode:'CURRENT_HEAD',affectedInputs:[]});
  });

  it('activates a conservative runtime fallback when the classifier changes so self-narrowing cannot hide runtime drift',()=>{
    const runtimeFile='src/app/admin/platform/page.tsx';
    const omittedRuntimeFile='src/lib/hidden-runtime.ts';
    const classifierFile='scripts/lib/shoperation-template-factory-resumable-verification.mjs';
    const proofFile='.github/workflows/template-factory-quality-gate.yml';
    const base='base-sha';

    const classifierOnly=selectTemplateLiveRuntimeOrigin({
      baseSha:base,currentHead:'head-classifier',
      runtimeFiles:[runtimeFile],
      classifierInputs:[classifierFile,proofFile],
      safetyFallbackRuntimePatterns:['src/**','public/**','package.json'],
      commitHistory:[{sha:'head-classifier',files:[classifierFile]}],
    });
    expect(classifierOnly).toMatchObject({
      decision:'PASS',runtimeSourceCommit:base,mode:'BASE_RUNTIME',
      classifierChanged:true,safetyFallbackApplied:true,affectedInputs:[],
    });

    const selfNarrowingAttempt=selectTemplateLiveRuntimeOrigin({
      baseSha:base,currentHead:'head-classifier',
      runtimeFiles:[runtimeFile],
      classifierInputs:[classifierFile,proofFile],
      safetyFallbackRuntimePatterns:['src/**','public/**','package.json'],
      commitHistory:[
        {sha:'head-classifier',files:[classifierFile]},
        {sha:'runtime-hidden',files:[omittedRuntimeFile]},
      ],
    });
    expect(selfNarrowingAttempt).toMatchObject({
      decision:'PASS',runtimeSourceCommit:'runtime-hidden',mode:'ANCESTOR_RUNTIME',
      classifierChanged:true,safetyFallbackApplied:true,affectedInputs:[],
    });
    expect(selfNarrowingAttempt.changedFilesSinceOrigin).toEqual([classifierFile]);
  });

  it('accepts only ancestor Preview anchors with zero conservative runtime drift',()=>{
    const runtime='runtime-main';
    const docsOnly=templatePreviewAnchorEquivalence({
      registry,runtimeSourceCommit:runtime,candidateSourceCommit:'ancestor-preview',ancestorProven:true,
      changedFiles:['quality/development/active-plan.json','docs/example.md'],
    });
    expect(docsOnly).toMatchObject({decision:'PASS',mode:'ANCESTOR_EQUIVALENT',runtimeEquivalenceProven:true,affectedRuntimeFiles:[]});

    const runtimeDrift=templatePreviewAnchorEquivalence({
      registry,runtimeSourceCommit:runtime,candidateSourceCommit:'ancestor-preview',ancestorProven:true,
      changedFiles:['src/app/platform/page.tsx'],
    });
    expect(runtimeDrift.decision).toBe('BLOCK');
    expect(runtimeDrift.issues.map(item=>item.code)).toContain('TEMPLATE_PREVIEW_ANCHOR_RUNTIME_DRIFT');

    const unrelated=templatePreviewAnchorEquivalence({
      registry,runtimeSourceCommit:runtime,candidateSourceCommit:'not-an-ancestor',ancestorProven:false,
      changedFiles:[],
    });
    expect(unrelated.decision).toBe('BLOCK');
    expect(unrelated.issues.map(item=>item.code)).toContain('TEMPLATE_PREVIEW_ANCHOR_ANCESTRY_UNPROVEN');
  });

  it('recognizes the existing Stage 1 Preview head as a runtime-equivalent anchor for the current main merge',()=>{
    const candidates=deriveTemplatePreviewAnchorCandidates({
      registry,
      runtimeSourceCommit:'42e60510de935efd6f95d0dbe92ed57f5a3377ac',
      maxScanCommits:1000,
    });
    expect(candidates.decision,JSON.stringify(candidates.issues)).toBe('PASS');
    expect(candidates.candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        deploymentSourceCommit:'33ed65d17cd4f12a4456351276f01001982f6f39',
        mode:'ANCESTOR_EQUIVALENT',
        runtimeEquivalenceProven:true,
        affectedRuntimeFiles:[],
      }),
    ]));
  });

  it('does not lose a valid Preview anchor behind more than forty quality-only commits',()=>{
    const candidates=deriveTemplatePreviewAnchorCandidates({
      registry,
      runtimeSourceCommit:'f8a22cc4a014c2d0fb293b8b327736a1138309b0',
      maxCandidates:40,
      maxScanCommits:1000,
    });
    expect(candidates.decision,JSON.stringify(candidates.issues)).toBe('PASS');
    expect(candidates.scan.boundaryReached).toBe(true);
    expect(candidates.scan.scannedCommitCount).toBeGreaterThan(40);
    expect(candidates.candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        deploymentSourceCommit:'33ed65d17cd4f12a4456351276f01001982f6f39',
        mode:'ANCESTOR_EQUIVALENT',
        runtimeEquivalenceProven:true,
        affectedRuntimeFiles:[],
      }),
    ]));
    const workflow=readFileSync('.github/workflows/template-factory-quality-gate.yml','utf8');
    expect(workflow).toContain('maxScanCommits:1000');
  });

  it('fails closed when the runtime-equivalence boundary is outside the ancestry safety cap',()=>{
    const blocked=deriveTemplatePreviewAnchorCandidates({
      registry,
      runtimeSourceCommit:'f8a22cc4a014c2d0fb293b8b327736a1138309b0',
      maxScanCommits:10,
    });
    expect(blocked.decision).toBe('BLOCK');
    expect(blocked.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({code:'TEMPLATE_PREVIEW_EQUIVALENT_ANCESTRY_SCAN_OVERFLOW'}),
    ]));
    expect(blocked.scan.boundaryReached).toBe(false);
  });

  it('fails closed when runtime origin identity is incomplete',()=>{
    expect(selectTemplateLiveRuntimeOrigin({baseSha:'',currentHead:'head',runtimeFiles:['src/app/page.tsx'],commitHistory:[]}).decision).toBe('BLOCK');
    expect(selectTemplateLiveRuntimeOrigin({baseSha:'base',currentHead:'',runtimeFiles:['src/app/page.tsx'],commitHistory:[]}).decision).toBe('BLOCK');
    expect(selectTemplateLiveRuntimeOrigin({baseSha:'base',currentHead:'head',runtimeFiles:[],commitHistory:[]}).decision).toBe('BLOCK');
  });

  it('reruns only FAQ x 3 viewports and reuses the other 39 matrix cases',()=>{
    const previous=fingerprints();
    const current={...previous,faq:'faq-v2'};
    const decision=deriveTemplateReplayDecision({
      registry,
      changedFiles:[templateFile],
      diffByFile:{[templateFile]:'+ const buildFaq=()=>pageType:faq; // GYIK'},
      pageTypes,
      currentPageFingerprints:current,
      previousPageFingerprints:previous,
      priorComplete:true,
    });
    expect(decision).toMatchObject({mode:'partial',pages:['faq']});
    const rerunCases=decision.pages.length*viewports.length;
    expect(rerunCases).toBe(3);
    expect(pageTypes.length*viewports.length-rerunCases).toBe(39);
  });

  it('reruns the semantic FAQ scope even when output fingerprint is unchanged',()=>{
    const same=fingerprints();
    const decision=deriveTemplateReplayDecision({
      registry,
      changedFiles:[templateFile],
      diffByFile:{[templateFile]:'+ function buildFaq(){ return existingFaq(); }'},
      pageTypes,
      currentPageFingerprints:same,
      previousPageFingerprints:same,
      priorComplete:true,
    });
    expect(decision).toMatchObject({mode:'partial',pages:['faq']});
  });

  it('widens template design-token changes to the full 14x3 matrix',()=>{
    const same=fingerprints();
    const decision=deriveTemplateReplayDecision({
      registry,
      changedFiles:[templateFile],
      diffByFile:{[templateFile]:'+ export const DEMO_DESIGN_TOKENS={"--shoporation-color-background":"#000"};'},
      pageTypes,
      currentPageFingerprints:same,
      previousPageFingerprints:same,
      priorComplete:true,
    });
    expect(decision.mode).toBe('full');
    expect(decision.pages).toEqual(pageTypes);
  });

  it('widens shared template shell changes to the full 14x3 matrix',()=>{
    const same=fingerprints();
    const decision=deriveTemplateReplayDecision({
      registry,
      changedFiles:[templateFile],
      diffByFile:{[templateFile]:'+ const header=()=>sharedHeader();'},
      pageTypes,
      currentPageFingerprints:same,
      previousPageFingerprints:same,
      priorComplete:true,
    });
    expect(decision.mode).toBe('full');
    expect(decision.pages).toHaveLength(14);
  });

  it('fails wider when multiple page families are touched ambiguously',()=>{
    const previous=fingerprints();
    const current={...previous,faq:'faq-v2',cart:'cart-v2'};
    const decision=deriveTemplateReplayDecision({
      registry,
      changedFiles:[templateFile],
      diffByFile:{[templateFile]:'+ faq cart'},
      pageTypes,
      currentPageFingerprints:current,
      previousPageFingerprints:previous,
      priorComplete:true,
    });
    expect(decision.mode).toBe('full');
  });

  it('requires a complete prior proof before any case reuse',()=>{
    const same=fingerprints();
    const decision=deriveTemplateReplayDecision({
      registry,
      changedFiles:[templateFile],
      diffByFile:{[templateFile]:'+ faq'},
      pageTypes,
      currentPageFingerprints:same,
      previousPageFingerprints:same,
      priorComplete:false,
    });
    expect(decision).toMatchObject({mode:'full',reason:'template-source-changed-no-reusable-proof'});
  });

  it('binds browser reuse to engine, toolchain, browser, golden, baseline and viewport context',()=>{
    const base={
      templateKey:'gaming.demo',templateVersion:1,pageType:'faq',viewport:'mobile',pageFingerprint:'faq-v1',
      browser:{maxHorizontalOverflowPx:2,minimumTouchTargetPx:32},golden:{required:true,maxPixelMismatchRatio:.005},
      viewportProfile:{width:390,height:844},baselineHash:'golden-a',factoryEngineHash:'engine-a',toolchainHash:'toolchain-a',candidateMode:'accepted',
    };
    const fingerprint=templateBrowserCaseFingerprint(base);
    const prior={errors:[],caseFingerprint:fingerprint};
    expect(reusableTemplateBrowserCase({priorCase:prior,currentCaseFingerprint:fingerprint})).toEqual({reusable:true,reason:'case-context-fingerprint-equivalent'});
    for(const changed of [
      {...base,factoryEngineHash:'engine-b'},
      {...base,toolchainHash:'toolchain-b'},
      {...base,baselineHash:'golden-b'},
      {...base,viewportProfile:{width:391,height:844}},
      {...base,browser:{...base.browser,maxHorizontalOverflowPx:3}},
      {...base,golden:{...base.golden,maxPixelMismatchRatio:.01}},
    ]){
      expect(reusableTemplateBrowserCase({priorCase:prior,currentCaseFingerprint:templateBrowserCaseFingerprint(changed)}).reusable).toBe(false);
    }
  });

  it('never reuses a prior browser case that previously failed or lacks a fingerprint',()=>{
    expect(reusableTemplateBrowserCase({priorCase:{errors:['GOLDEN_DIFF:1'],caseFingerprint:'x'},currentCaseFingerprint:'x'}).reusable).toBe(false);
    expect(reusableTemplateBrowserCase({priorCase:{errors:[]},currentCaseFingerprint:'x'})).toEqual({reusable:false,reason:'prior-case-fingerprint-missing'});
  });
});
