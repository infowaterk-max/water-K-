import {execFileSync} from 'node:child_process';
import {describe,expect,it} from 'vitest';
import {PLAYROOM_V20_QUALITY_MANIFEST} from '@/lib/builder/storefront-template-quality-gate';
import {LOOT_VAULT_V2_QUALITY_MANIFEST} from '@/lib/builder/storefront-template-quality-candidates';

describe('Template Factory local golden regression semantics',()=>{
  it('blocks a globally-small but locally-severe cyan-to-red mutation, including across a fixed-window boundary',()=>{
    const output=execFileSync(
      process.execPath,
      ['scripts/template-factory-quality-gate.mjs','--golden-local-self-test'],
      {encoding:'utf8',env:{...process.env}},
    );
    const line=output.split(/\r?\n/).find(row=>row.startsWith('GOLDEN_LOCAL_SELF_TEST:'));
    expect(line).toBeTruthy();
    const proof=JSON.parse(line!.slice('GOLDEN_LOCAL_SELF_TEST:'.length));
    expect(proof).toMatchObject({
      contract:'shoporation.template-factory-golden-local-self-test.v1',
      passed:true,
      policy:{
        windowSizePx:48,
        maxMismatchRatio:.12,
        minMismatchPixels:72,
      },
    });
    for(const result of [proof.cases.centered,proof.cases.boundaryStraddling]){
      expect(result.status).toBe('fail');
      expect(result.globalPassed).toBe(true);
      expect(result.mismatchRatio).toBeLessThan(.005);
      expect(result.local.passed).toBe(false);
      expect(result.local.peakMismatchRatio).toBeGreaterThan(.12);
      expect(result.local.peakMismatchPixels).toBeGreaterThanOrEqual(72);
    }
  });

  it('keeps the canonical full-page mismatch threshold unchanged',()=>{
    expect(PLAYROOM_V20_QUALITY_MANIFEST.golden.maxPixelMismatchRatio).toBe(.005);
    expect(LOOT_VAULT_V2_QUALITY_MANIFEST.golden.maxPixelMismatchRatio).toBe(.005);
  });
});
