// @ts-nocheck
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {
  deriveTemplateReplayDecision,
  reusableTemplateBrowserCase,
  templateBrowserCaseFingerprint,
} from '../scripts/lib/shoperation-template-factory-resumable-verification.mjs';

const registry=JSON.parse(readFileSync('quality/knowledge/guard-registry.v1.json','utf8'));
const pageTypes=['home','catalog','product','cart','checkout','account','search','content','blog-index','blog-article','faq','contact','legal','not-found'];
const viewports=['desktop','tablet','mobile'];
const fingerprints=(suffix='v1')=>Object.fromEntries(pageTypes.map(page=>[page,page+'-'+suffix]));
const templateFile='src/lib/builder/templates/demo.ts';

describe('Template Factory resumable browser verification',()=>{
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
    expect(reusableTemplateBrowserCase({priorCase:{errors:[]},currentCaseFingerprint:'x'}).toEqual({reusable:false,reason:'prior-case-fingerprint-missing'});
  });
});
