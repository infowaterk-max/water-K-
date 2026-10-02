import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {STOREFRONT_NEUTRAL_REFERENCE_PAGE} from '@/lib/builder/storefront-primitives';
import {
  canonicalizeStorefrontFingerprintJson,
  fingerprintStorefrontPageDocument,
  sha256StorefrontCanonicalJson,
} from '@/lib/builder/storefront-page-fingerprint';
import {
  STOREFRONT_VISUAL_DIFF_EVIDENCE_CONTRACT,
  STOREFRONT_VISUAL_DIFF_RECONCILIATION_CONTRACT,
  inspectStorefrontVisualDiffIntelligence,
} from '@/lib/builder/storefront-visual-diff-intelligence';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const SOURCE='a'.repeat(40);
const PREVIOUS='b'.repeat(40);
const page=()=>structuredClone(STOREFRONT_NEUTRAL_REFERENCE_PAGE) as StorefrontPageDocument;

const golden=(overrides:Record<string,unknown>={})=>({
  status:'pass',
  mismatchRatio:0,
  mismatchedPixels:0,
  totalPixels:100000,
  globalPassed:true,
  globalThreshold:.005,
  local:{
    passed:true,
    windowSizePx:48,
    maxMismatchRatio:.12,
    minMismatchPixels:400,
    peakMismatchRatio:0,
    peakMismatchPixels:0,
    peakRegion:null,
  },
  ...overrides,
});

async function evidenceFor(document:StorefrontPageDocument,caseMutator?:(rows:any[])=>void){
  const pageFingerprint=await fingerprintStorefrontPageDocument(document);
  const rows=(['desktop','tablet','mobile'] as const).map(viewport=>({
    templateKey:document.templateKey,
    templateVersion:document.templateVersion,
    pageType:document.pageType,
    viewport,
    sourceCommit:SOURCE,
    originSourceCommit:SOURCE,
    originRunId:'run-1',
    evidenceExecution:'RERUN',
    pageFingerprint,
    caseFingerprint:`case-${viewport}`,
    golden:golden(),
    errors:[],
    warnings:[],
  }));
  caseMutator?.(rows);
  const manifest:any={
    contract:STOREFRONT_VISUAL_DIFF_EVIDENCE_CONTRACT,
    reconciliationContract:STOREFRONT_VISUAL_DIFF_RECONCILIATION_CONTRACT,
    branch:'feature/template-production-brabus-revalidation',
    sourceCommit:SOURCE,
    complete:true,
    cases:rows,
    acceptanceProofs:[],
    errors:[],
    warnings:[],
  };
  manifest.checksum=await sha256StorefrontCanonicalJson(manifest);
  return manifest;
}

async function resign(manifest:any){
  const payload={...manifest};
  delete payload.checksum;
  manifest.checksum=await sha256StorefrontCanonicalJson(payload);
  return manifest;
}

describe('VX Visual Diff Intelligence Core',()=>{
  it('matches the existing Node SHA-256 canonical page fingerprint semantics exactly',async()=>{
    const document=page();
    const payload={
      templateKey:document.templateKey,
      templateVersion:document.templateVersion,
      pageType:document.pageType,
      page:document,
    };
    const expected=createHash('sha256').update(canonicalizeStorefrontFingerprintJson(payload)).digest('hex');
    await expect(fingerprintStorefrontPageDocument(document)).resolves.toBe(expected);
  });

  it('classifies a complete zero-diff three-viewport matrix as exact-match',async()=>{
    const document=page();
    const result=await inspectStorefrontVisualDiffIntelligence({
      document,
      exactSourceCommit:SOURCE,
      evidence:await evidenceFor(document),
    });
    expect(result.valid).toBe(true);
    expect(result.overall).toBe('exact-match');
    expect(result.withinAcceptedBounds).toBe(true);
    expect(result.viewports?.desktop.state).toBe('exact-match');
    expect(result.viewports?.tablet.state).toBe('exact-match');
    expect(result.viewports?.mobile.state).toBe('exact-match');
    expect(result.issues).toEqual([]);
  });

  it('preserves bounded positive drift without calling it exact',async()=>{
    const document=page();
    const evidence=await evidenceFor(document,rows=>{
      rows.find(row=>row.viewport==='tablet').golden=golden({
        mismatchRatio:.001,
        mismatchedPixels:100,
        globalPassed:true,
        local:{...golden().local,passed:true,peakMismatchRatio:.04,peakMismatchPixels:90},
      });
    });
    const result=await inspectStorefrontVisualDiffIntelligence({document,exactSourceCommit:SOURCE,evidence});
    expect(result.valid).toBe(true);
    expect(result.overall).toBe('bounded-drift');
    expect(result.withinAcceptedBounds).toBe(true);
    expect(result.viewports?.tablet.state).toBe('bounded-drift');
  });

  it('treats local hotspot failure as blocking even when the global ratio passes',async()=>{
    const document=page();
    const evidence=await evidenceFor(document,rows=>{
      rows[0].golden=golden({
        mismatchRatio:.001,
        globalPassed:true,
        local:{...golden().local,passed:false,peakMismatchRatio:.4,peakMismatchPixels:920},
      });
    });
    const result=await inspectStorefrontVisualDiffIntelligence({document,exactSourceCommit:SOURCE,evidence});
    expect(result.valid).toBe(true);
    expect(result.overall).toBe('blocking-drift');
    expect(result.withinAcceptedBounds).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code:'VISUAL_DIFF_BLOCKING_DRIFT',
      viewport:'desktop',
    }));
  });

  it('treats dimension mismatch and browser case errors as blocking evidence',async()=>{
    const document=page();
    const evidence=await evidenceFor(document,rows=>{
      rows[1].golden={status:'dimension-mismatch',mismatchRatio:1};
      rows[2].errors=['HORIZONTAL_OVERFLOW:12'];
      rows[2].warnings=['TOUCH_TARGET_RECOMMENDED:2'];
    });
    const result=await inspectStorefrontVisualDiffIntelligence({document,exactSourceCommit:SOURCE,evidence});
    expect(result.valid).toBe(true);
    expect(result.overall).toBe('blocking-drift');
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({code:'VISUAL_DIFF_BLOCKING_DRIFT',viewport:'tablet'}),
      expect.objectContaining({code:'VISUAL_DIFF_CASE_ERROR',viewport:'mobile',message:'HORIZONTAL_OVERFLOW:12'}),
      expect.objectContaining({code:'VISUAL_DIFF_CASE_WARNING',viewport:'mobile',message:'TOUCH_TARGET_RECOMMENDED:2'}),
    ]));
  });

  it('never converts a missing golden baseline into visual PASS',async()=>{
    const document=page();
    const evidence=await evidenceFor(document,rows=>{
      rows[2].golden={status:'missing',mismatchRatio:null};
    });
    const result=await inspectStorefrontVisualDiffIntelligence({document,exactSourceCommit:SOURCE,evidence});
    expect(result.valid).toBe(true);
    expect(result.overall).toBe('no-baseline');
    expect(result.withinAcceptedBounds).toBe(false);
    expect(result.viewports?.mobile.state).toBe('no-baseline');
    expect(result.issues).toContainEqual(expect.objectContaining({
      code:'VISUAL_DIFF_BASELINE_MISSING',
      viewport:'mobile',
    }));
  });

  it('fails closed when a checksum-valid manifest is later tampered',async()=>{
    const document=page();
    const evidence=await evidenceFor(document);
    evidence.cases[0].golden.mismatchRatio=.001;
    const result=await inspectStorefrontVisualDiffIntelligence({document,exactSourceCommit:SOURCE,evidence});
    expect(result.valid).toBe(false);
    expect(result.overall).toBe('unverified');
    expect(result.viewports).toBeNull();
    expect(result.issues.map(row=>row.code)).toContain('VISUAL_DIFF_EVIDENCE_CHECKSUM_INVALID');
  });

  it('fails closed on stale exact-source evidence even when the page fingerprint still matches',async()=>{
    const document=page();
    const evidence=await evidenceFor(document);
    const result=await inspectStorefrontVisualDiffIntelligence({
      document,
      exactSourceCommit:'c'.repeat(40),
      evidence,
    });
    expect(result.valid).toBe(false);
    expect(result.issues.map(row=>row.code)).toContain('VISUAL_DIFF_SOURCE_COMMIT_STALE');
  });

  it('fails closed when current page content no longer matches the evidence fingerprint',async()=>{
    const original=page();
    const evidence=await evidenceFor(original);
    const changed=page();
    changed.pageKey='reference.home.edited';
    const result=await inspectStorefrontVisualDiffIntelligence({document:changed,exactSourceCommit:SOURCE,evidence});
    expect(result.valid).toBe(false);
    expect(result.issues.map(row=>row.code)).toContain('VISUAL_DIFF_PAGE_FINGERPRINT_DRIFT');
  });

  it('accepts only fingerprint-proven reused cases',async()=>{
    const document=page();
    const valid=await evidenceFor(document,rows=>{
      const row=rows[1];
      row.evidenceExecution='REUSED';
      row.originSourceCommit=PREVIOUS;
      row.reuseProof={
        fingerprintEquivalent:true,
        previousFingerprint:row.pageFingerprint,
        currentFingerprint:row.pageFingerprint,
        previousSourceCommit:PREVIOUS,
      };
    });
    expect((await inspectStorefrontVisualDiffIntelligence({document,exactSourceCommit:SOURCE,evidence:valid})).valid).toBe(true);

    const invalid=await evidenceFor(document,rows=>{
      rows[1].evidenceExecution='REUSED';
      rows[1].originSourceCommit=PREVIOUS;
    });
    const result=await inspectStorefrontVisualDiffIntelligence({document,exactSourceCommit:SOURCE,evidence:invalid});
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code:'VISUAL_DIFF_REUSE_PROOF_INVALID',
      viewport:'tablet',
    }));
  });

  it('requires exactly one canonical case for Desktop, Tablet and Mobile',async()=>{
    const document=page();
    const missing=await evidenceFor(document,rows=>rows.splice(rows.findIndex(row=>row.viewport==='tablet'),1));
    let result=await inspectStorefrontVisualDiffIntelligence({document,exactSourceCommit:SOURCE,evidence:missing});
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({code:'VISUAL_DIFF_CASE_MISSING',viewport:'tablet'}));

    const duplicate=await evidenceFor(document,rows=>rows.push(structuredClone(rows[0])));
    result=await inspectStorefrontVisualDiffIntelligence({document,exactSourceCommit:SOURCE,evidence:duplicate});
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({code:'VISUAL_DIFF_CASE_DUPLICATE',viewport:'desktop'}));
  });

  it('rejects independently drifted case identity even under a freshly signed envelope',async()=>{
    const document=page();
    const evidence=await evidenceFor(document);
    evidence.cases[0].sourceCommit=PREVIOUS;
    await resign(evidence);
    const result=await inspectStorefrontVisualDiffIntelligence({document,exactSourceCommit:SOURCE,evidence});
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code:'VISUAL_DIFF_CASE_IDENTITY_DRIFT',
      viewport:'desktop',
    }));
  });

  it('keeps visual comparison and mutation authority outside the intelligence Core',()=>{
    const source=readFileSync('src/lib/builder/storefront-visual-diff-intelligence.ts','utf8');
    expect(source).not.toMatch(/playwright|pixelmatch|pngjs|node:fs|readFile|writeFile|screenshot/i);
    expect(source).not.toMatch(/applyStorefrontBuilderMutation|setStorefront|saveVisualBuilder|publishVisualBuilder|supabase/i);
    expect(source).toContain('shoporation.template-factory-quality-evidence.v2');
    expect(source).toContain('fingerprintStorefrontPageDocument');
  });
});
