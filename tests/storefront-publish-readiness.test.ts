import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {STOREFRONT_PAGE_TYPES} from '@/lib/builder/storefront-foundation';
import {STOREFRONT_NEUTRAL_REFERENCE_PAGE} from '@/lib/builder/storefront-primitives';
import {
  inspectStorefrontPublishReadiness,
  type StorefrontPublishReadinessExternalEvidence,
  type StorefrontPublishReadinessPageInventoryRow,
} from '@/lib/builder/storefront-publish-readiness';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const COMMIT='a'.repeat(40);

const fresh=():StorefrontPageDocument=>{
  const page=structuredClone(STOREFRONT_NEUTRAL_REFERENCE_PAGE);
  page.pageKey='readiness-home';
  page.pageType='home';
  page.templateKey='readiness.template';
  page.templateVersion=7;
  return page;
};

const pages=():StorefrontPublishReadinessPageInventoryRow[]=>
  STOREFRONT_PAGE_TYPES.map((pageType,index)=>({
    pageKey:`readiness-${pageType}`,
    pageType,
    draftRevision:index+1,
    draftTemplateKey:'readiness.template',
    draftTemplateVersion:7,
  }));

const externalPass=():StorefrontPublishReadinessExternalEvidence=>({
  visualDiff:{
    contract:'shoporation.storefront-visual-diff-intelligence.v1',
    evidenceContract:'shoporation.template-factory-quality-evidence.v2',
    target:{templateKey:'readiness.template',templateVersion:7,sourceCommit:COMMIT},
    valid:true,clean:true,issues:[],cases:[],
  },
  routeIntegrity:{
    contract:'shoporation.storefront-route-integrity.v1',
    target:{templateKey:'readiness.template',templateVersion:7},
    issues:[],
  },
  showroom:{
    contract:'shoporation.storefront-showroom-contract.v1',
    target:{templateKey:'readiness.template',templateVersion:7},
    issues:[],
  },
  mediaPlanning:{
    contract:'shoporation.template-media-plan.v1',
    target:{templateKey:'readiness.template',templateVersion:7},
    result:{valid:true,technicalFulfilled:true,readyFulfilled:true,issues:[],repairs:[]},
  },
  commerce:{
    contract:'shoporation.template-factory-commerce-readiness.v1',
    target:{templateKey:'readiness.template',templateVersion:7},
    complete:true,
    issues:[],
  },
});

const inspect=(overrides:Partial<Parameters<typeof inspectStorefrontPublishReadiness>[0]>={})=>
  inspectStorefrontPublishReadiness({
    document:fresh(),
    pages:pages(),
    draft:{dirty:false,draftRevision:12},
    exactSourceCommit:COMMIT,
    external:externalPass(),
    ...overrides,
  });

describe('VX Publish Readiness Brabus decision contract',()=>{
  it('fails closed to UNKNOWN when template-level evidence is absent',()=>{
    const result=inspect({external:null,exactSourceCommit:null});
    expect(result.decision).toBe('UNKNOWN');
    expect(result.categories.find(item=>item.category==='visual-drift')?.state).toBe('UNKNOWN');
    expect(result.categories.find(item=>item.category==='media')?.state).toBe('UNKNOWN');
    expect(result.categories.find(item=>item.category==='links')?.state).toBe('UNKNOWN');
    expect(result.categories.find(item=>item.category==='commerce')?.state).toBe('UNKNOWN');
    expect(result.findings.filter(item=>item.state==='UNKNOWN').every(item=>item.evidence.source.length>0)).toBe(true);
  });

  it('returns PASS only when every required authority source is present and clean',()=>{
    const result=inspect();
    expect(result.decision).toBe('PASS');
    expect(result.summary.byState.UNKNOWN).toBe(0);
    expect(result.summary.byState.BLOCK).toBe(0);
    expect(result.categories.map(item=>item.category)).toEqual(expect.arrayContaining([
      'responsive-inheritance','visual-drift','accessibility','media','links','commerce','required-content','performance','page-route-completeness',
    ]));
  });

  it('keeps pixel-only drift blocking but non-causal and manual-review',()=>{
    const external=externalPass();
    external.visualDiff={
      ...external.visualDiff!,
      clean:false,
      cases:[{
        pageType:'home',viewport:'mobile',
        provenance:{evidenceExecution:'RERUN',sourceCommit:COMMIT,originSourceCommit:null,pageFingerprint:'page',caseFingerprint:'case',fingerprintEquivalent:true},
        visual:{goldenStatus:'fail',state:'blocking-drift',mismatchRatio:.03,globalPassed:false,localPassed:false,peakMismatchRatio:.4,peakMismatchPixels:100,peakRegion:{x:1,y:2,width:3,height:4},actualDimensions:{width:390,height:844},baselineDimensions:{width:390,height:844}},
        diagnostics:[{code:'VISUAL_PIXEL_DRIFT',severity:'error',evidenceClass:'visual-unlocalized',category:'visual-baseline-drift',repairability:'manual-review',raw:'pixel drift',structuredCause:false}],
        clean:false,
      }],
    };
    const result=inspect({external});
    const finding=result.findings.find(item=>item.evidence.code==='VISUAL_PIXEL_DRIFT');
    expect(result.decision).toBe('BLOCK');
    expect(finding).toMatchObject({
      state:'BLOCK',
      repairability:'manual-review',
      location:{pageType:'home',viewport:'mobile'},
      evidence:{source:'storefront-visual-diff-intelligence',provenance:{structuredCause:false}},
    });
  });

  it('rejects stale exact-head visual evidence rather than treating it as current',()=>{
    const result=inspect({exactSourceCommit:'b'.repeat(40)});
    expect(result.decision).toBe('BLOCK');
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({category:'visual-drift',state:'BLOCK',evidence:expect.objectContaining({code:'PUBLISH_READINESS_VISUAL_SOURCE_STALE'})}),
    ]));
  });

  it('blocks missing, duplicate and foreign canonical page coverage',()=>{
    const missing=pages().filter(item=>item.pageType!=='faq');
    expect(inspect({pages:missing}).findings.some(item=>item.evidence.code==='PUBLISH_READINESS_PAGE_MISSING')).toBe(true);

    const duplicated=pages();
    duplicated.push({...duplicated.find(item=>item.pageType==='catalog')!,pageKey:'readiness-catalog-duplicate'});
    expect(inspect({pages:duplicated}).findings.some(item=>item.evidence.code==='PUBLISH_READINESS_PAGE_DUPLICATE')).toBe(true);

    const foreign=pages();
    foreign.find(item=>item.pageType==='product')!.draftTemplateVersion=6;
    expect(inspect({pages:foreign}).findings.some(item=>item.evidence.code==='PUBLISH_READINESS_PAGE_IDENTITY_MISMATCH')).toBe(true);
  });

  it('uses BLOCK over UNKNOWN and preserves localization/provenance for mixed evidence',()=>{
    const external=externalPass();
    external.commerce=null;
    external.routeIntegrity={
      ...external.routeIntegrity!,
      issues:[{code:'STORE_ROUTE_UNKNOWN',href:'/nem-letezik',label:'Hibás',path:'pages[0].sections[1].config.href',severity:'error',message:'Ismeretlen route.'}],
    };
    const result=inspect({external});
    expect(result.decision).toBe('BLOCK');
    expect(result.summary.unknowns).toBeGreaterThan(0);
    expect(result.findings.find(item=>item.evidence.code==='STORE_ROUTE_UNKNOWN')).toMatchObject({
      category:'links',state:'BLOCK',repairability:'structured-diagnostic',
      location:{href:'/nem-letezik'},
      evidence:{source:'storefront-route-integrity'},
    });
  });

  it('keeps warning-only source findings non-blocking and is deterministic under input reordering',()=>{
    const left=externalPass();
    left.commerce!.issues=[
      {code:'COMMERCE_WARNING_B',path:'commerce.b',message:'B',severity:'warning'},
      {code:'COMMERCE_WARNING_A',path:'commerce.a',message:'A',severity:'warning'},
    ];
    const right=externalPass();
    right.commerce!.issues=[...left.commerce!.issues].reverse();
    const first=inspect({external:left});
    const second=inspect({external:right});
    expect(first.decision).toBe('PASS');
    expect(second).toEqual(first);
    expect(first.summary.warnings).toBeGreaterThan(0);
  });

  it('keeps the core read-only and outside publish, persistence, mutation and screenshot authority',()=>{
    const source=readFileSync('src/lib/builder/storefront-publish-readiness.ts','utf8');
    expect(source).not.toMatch(/publishCurrentStorefrontPage|publishVisualBuilderPageAction|saveCurrentStorefrontPageDraft|applyStorefrontBuilderMutation/);
    expect(source).not.toMatch(/screenshot|playwright|pixelmatch|sharp/i);
  });
});
