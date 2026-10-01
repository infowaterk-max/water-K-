import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {DEFAULT_LOCAL_GOLDEN_POLICY,localGoldenMismatch} from '../scripts/lib/shoperation-template-factory-golden-semantics.mjs';
import {PLAYROOM_V20_QUALITY_MANIFEST} from '@/lib/builder/storefront-template-quality-gate';
import {LOOT_VAULT_V2_QUALITY_MANIFEST} from '@/lib/builder/storefront-template-quality-candidates';

const WIDTH=512,HEIGHT=512;
function mutationMask(x0:number,y0:number){
  const mask=new Uint8Array(WIDTH*HEIGHT*4);
  for(let y=y0;y<y0+24;y+=1)for(let x=x0;x<x0+24;x+=1)mask[(y*WIDTH+x)*4+3]=255;
  return mask;
}

describe('Template Factory local golden regression semantics',()=>{
  it('blocks the diff-mask produced by a globally-small but locally-severe #35e9ff -> #ff0000 mutation, including across a window boundary',()=>{
    const globalMismatchRatio=(24*24)/(WIDTH*HEIGHT);
    expect(globalMismatchRatio).toBeLessThan(.005);
    for(const [name,mask] of [
      ['centered',mutationMask(216,216)],
      ['boundary-straddling',mutationMask(36,36)],
    ] as const){
      const local=localGoldenMismatch(mask,WIDTH,HEIGHT);
      expect(local.passed,name).toBe(false);
      expect(local.peakMismatchRatio,name).toBeGreaterThan(DEFAULT_LOCAL_GOLDEN_POLICY.maxMismatchRatio);
      expect(local.peakMismatchPixels,name).toBeGreaterThanOrEqual(DEFAULT_LOCAL_GOLDEN_POLICY.minMismatchPixels);
    }
  });

  it('wires perceptual pixelmatch evidence into the local detector instead of raw RGB comparison',()=>{
    const gate=readFileSync('scripts/template-factory-quality-gate.mjs','utf8');
    expect(gate).toContain("diffMask:true");
    expect(gate).toContain("localGoldenMismatch(mask.data,actual.width,actual.height,localPolicy)");
    expect(gate).toContain("status:globalPassed&&local.passed?'pass':'fail'");
    expect(gate).toContain("threshold:.1,includeAA:false");
  });

  it('keeps the canonical full-page mismatch threshold unchanged',()=>{
    expect(PLAYROOM_V20_QUALITY_MANIFEST.golden.maxPixelMismatchRatio).toBe(.005);
    expect(LOOT_VAULT_V2_QUALITY_MANIFEST.golden.maxPixelMismatchRatio).toBe(.005);
  });
});
