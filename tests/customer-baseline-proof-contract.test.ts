import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>readFileSync(path,'utf8');

describe('Shoperation Fresh Install proof contract lifecycle',()=>{
  it('binds ready state to the exact proof contract hash and snapshot-reviewed state to a mandatory re-proof',()=>{
    const validator=read('scripts/validate-customer-baseline.mjs');
    const manifest=JSON.parse(read('supabase/customer-baseline/manifest.json'));
    expect(validator).toContain('proofContractSha256');
    expect(validator).toContain('ready baseline proof is stale');
    expect(['ready','snapshot-reviewed']).toContain(manifest.status);
    if(manifest.status==='ready'){
      expect(manifest.freshInstallProofRequired).toBe(false);
      expect(manifest.proofContractSha256).toMatch(/^[a-f0-9]{64}$/);
    }else{
      expect(manifest.freshInstallProofRequired).toBe(true);
      expect(manifest.proofContractSha256).toBeNull();
    }
  });

  it('hashes every ordered customer-baseline migration plus every other clean-install proof input',()=>{
    const script=read('scripts/customer-baseline-contract-hash.mjs');
    for(const required of[
      'baselineMigrationDirectory',
      'readdirSync',
      'manifest.authBootstrapFile',
      'manifest.seedFile',
      'target-preflight.sql',
      'target-postflight.sql',
    ]) expect(script).toContain(required);
  });

  it('keeps both Fresh Install entrypoints on the same structured proof and failure-reporting contract',()=>{
    const workflows=[
      read('.github/workflows/ci.yml'),
      read('.github/workflows/fresh-install-proof.yml'),
    ];
    for(const workflow of workflows){
      for(const marker of[
        'id: fresh-secret',
        'id: fresh-baseline',
        'id: fresh-preflight',
        'id: fresh-apply',
        'id: fresh-postflight',
        'id: fresh-contract-hash',
        'id: fresh-proof-record',
        "contract:'shoporation.fresh-install-proof.v2'",
        "contract:'shoporation.fresh-install-failure.v1'",
        'sourceCommit:process.env.GITHUB_SHA',
        'SHOPERATION_FAILURE_SOURCE: fresh-install',
        'FRESH_INSTALL_FAILED=artifacts/fresh-install-proof/failure.json',
        'fresh-install-failure-intake-${{ github.sha }}',
        'Persist unresolved Fresh Install failure intake',
      ])expect(workflow).toContain(marker);
      for(const code of[
        'FRESH_INSTALL_SECRET_REQUIRED',
        'FRESH_INSTALL_BASELINE_LIFECYCLE_FAILED',
        'FRESH_INSTALL_TARGET_PREFLIGHT_FAILED',
        'FRESH_INSTALL_MIGRATION_APPLY_FAILED',
        'FRESH_INSTALL_TARGET_POSTFLIGHT_FAILED',
        'FRESH_INSTALL_CONTRACT_HASH_FAILED',
        'FRESH_INSTALL_PROOF_RECORD_FAILED',
      ])expect(workflow).toContain(code);
    }
  });

  it('rejects contamination in both public and private application schemas before a Fresh Install proof',()=>{
    const preflight=read('supabase/customer-baseline/target-preflight.sql');
    for(const required of[
      "n.nspname = 'public'",
      "n.nspname = 'private'",
      'private_relations',
      'private_functions',
      'private_sequences',
      'private_user_types',
    ]) expect(preflight).toContain(required);
  });

  it('applies all reviewed forward migrations and Auth bootstrap in both Fresh Install workflows',()=>{
    for(const workflow of[
      '.github/workflows/ci.yml',
      '.github/workflows/fresh-install-proof.yml',
    ]){
      const text=read(workflow);
      expect(text).toContain("find supabase/customer-baseline/migrations");
      expect(text).toContain('0002_block7_b2b_account_ownership.sql');
      expect(text).toContain('supabase/customer-baseline/auth-bootstrap.sql');
      expect(text).toContain('scripts/customer-baseline-contract-hash.mjs');
    }
  });
});
