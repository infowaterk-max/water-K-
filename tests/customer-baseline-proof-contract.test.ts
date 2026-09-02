import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>readFileSync(path,'utf8');

describe('Shoperation Fresh Install proof contract lifecycle',()=>{
  it('binds ready state to the exact proof contract hash',()=>{
    const validator=read('scripts/validate-customer-baseline.mjs');
    const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
    expect(validator).toContain('proofContractSha256');
    expect(validator).toContain('ready baseline proof is stale');
    expect(manifest.status).toBe('snapshot-reviewed');
    expect(manifest.freshInstallProofRequired).toBe(true);
    expect(manifest.proofContractSha256).toBeNull();
  });

  it('hashes every file used by the clean-install proof',()=>{
    const script=read('scripts/customer-baseline-contract-hash.mjs');
    for(const required of [
      'manifest.snapshotFile',
      'manifest.authBootstrapFile',
      'manifest.seedFile',
      'target-preflight.sql',
      'target-postflight.sql',
    ]) expect(script).toContain(required);
  });

  it('applies Auth bootstrap in both Fresh Install workflows',()=>{
    for(const workflow of [
      '.github/workflows/ci.yml',
      '.github/workflows/fresh-install-proof.yml',
    ]){
      const text=read(workflow);
      expect(text).toContain('supabase/customer-baseline/auth-bootstrap.sql');
      expect(text).toContain('scripts/customer-baseline-contract-hash.mjs');
    }
  });
});
