import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

describe('Template golden baseline promotion policy',()=>{
  const script=readFileSync('scripts/promote-template-golden-baseline.mjs','utf8');
  const workflow=readFileSync('.github/workflows/template-golden-baseline-promotion.yml','utf8');

  it('keeps intentional golden drift behind an explicit opt-in',()=>{
    expect(script).toContain("flags.includes('--allow-golden-drift')");
    expect(script).toContain("if(errors.length&&!allowGoldenDrift)");
    expect(script).toContain("const promotionItems=allowGoldenDrift?selected.filter");
    expect(script).toContain('GOLDEN_PROMOTION_DRIFT_FLAG_REQUIRES_GOLDEN_ERRORS');
    expect(workflow).toContain('allow_accepted_golden_drift:');
    expect(workflow).toContain('extra+=(--allow-golden-drift)');
  });

  it('never lets the drift exception hide structural, runtime or browser failures',()=>{
    expect(script).toContain('GOLDEN_PROMOTION_NON_GOLDEN_CASE_ERROR');
    expect(script).toContain('GOLDEN_PROMOTION_NON_GOLDEN_EVIDENCE_ERROR');
    expect(script).toContain("value==='GOLDEN_BASELINE_MISSING'||value.startsWith('GOLDEN_DIFF:')");
  });

  it('defaults to the complete canonical 14x3 matrix from the exact evidence source',()=>{
    expect(script).toContain("if(!raw||raw==='all')return[...allowed]");
    expect(script).toContain('GOLDEN_PROMOTION_MATRIX_INCOMPLETE');
    expect(script).toContain('GOLDEN_PROMOTION_MATRIX_MISSING');
    expect(workflow).toContain('Verify evidence belongs to checked out source');
    expect(workflow).toContain('default: all');
  });

  it('allows an explicit narrow PO-approved page and viewport scope without accepting unrelated golden drift',()=>{
    expect(script).toContain("flagValue('page-types')");
    expect(script).toContain("flagValue('viewports')");
    expect(script).toContain('selectedEvidenceErrors');
    expect(script).toContain('ignoredGoldenDriftCount');
    expect(workflow).toContain('"--page-types=${{ inputs.page_types }}"');
    expect(workflow).toContain('"--viewports=${{ inputs.viewports }}"');
  });

  it('guards optional write-back to the exact target branch and selected paths',()=>{
    expect(workflow).toContain('commit_promoted_baseline:');
    expect(workflow).toContain('test "$remote_head" = "$(git rev-parse HEAD)"');
    expect(workflow).toContain('Unexpected golden mutation outside selected scope');
    expect(workflow).toContain('git push origin "HEAD:refs/heads/$TARGET_BRANCH"');
  });
});
