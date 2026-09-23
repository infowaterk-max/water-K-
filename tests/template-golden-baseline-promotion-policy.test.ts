import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

describe('Template golden baseline promotion policy',()=>{
  const script=readFileSync('scripts/promote-template-golden-baseline.mjs','utf8');
  const workflow=readFileSync('.github/workflows/template-golden-baseline-promotion.yml','utf8');

  it('keeps intentional golden drift behind an explicit opt-in',()=>{
    expect(script).toContain("process.argv[6]==='--allow-golden-drift'");
    expect(script).toContain("if(errors.length&&!allowGoldenDrift)");
    expect(workflow).toContain('allow_accepted_golden_drift:');
    expect(workflow).toContain('extra+=(--allow-golden-drift)');
  });

  it('never lets the drift exception hide structural, runtime or browser failures',()=>{
    expect(script).toContain('GOLDEN_PROMOTION_NON_GOLDEN_CASE_ERROR');
    expect(script).toContain('GOLDEN_PROMOTION_NON_GOLDEN_EVIDENCE_ERROR');
    expect(script).toContain("value==='GOLDEN_BASELINE_MISSING'||value.startsWith('GOLDEN_DIFF:')");
  });

  it('still requires the complete canonical 14x3 matrix from the exact evidence source',()=>{
    expect(script).toContain('GOLDEN_PROMOTION_MATRIX_INCOMPLETE');
    expect(script).toContain('GOLDEN_PROMOTION_MATRIX_MISSING');
    expect(workflow).toContain('Verify evidence belongs to checked out source');
  });
});
