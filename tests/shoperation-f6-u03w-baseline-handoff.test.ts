import {describe,it,expect} from 'vitest';
// @ts-expect-error The reviewed source is a Node ESM module without declaration file.
import {validateHistoricProofShape,verifyOriginalArtifactProof,assessTarget0046,buildHandoff,operatorRunbook,buildCurrentTargetCatalogSql,CONTRACT,PROJECT_REF} from '../scripts/shoperation-f6-u03w-baseline-handoff.mjs';
// @ts-expect-error Original source manifest is intentionally Node ESM.
import {buildCandidateManifest} from '../scripts/shoperation-f6-u03l-release-candidate-acl.mjs';

const checked=()=>({
 contract:'shoporation.fresh-install-proof.v2',repository:'infowaterk-max/water-K-',
 sourceCommit:'03a7f0f690f94fa955e1ad459e3d5eb1fe22cbf4',
 ciRunId:'37919705159',ciWorkflow:'CI',environment:'fresh-install-disposable',
 generatedAt:'2026-10-09T11:59:29.398Z',baselineStatus:'snapshot-reviewed',
 freshInstallProofRequired:true,
 proofContractSha256:'a04b0990e7cf7a0a21591b9fd81fa44d5010ca8818b7edb7f00397c6b84807bb',
 migrationFiles:buildCandidateManifest().sources.slice(0,47).map((x:any)=>x.path),
 authBootstrapFile:'supabase/customer-baseline/auth-bootstrap.sql',
 seedFile:'supabase/customer-baseline/seed.sql',
 checks:{targetPreflight:'PASS',orderedMigrations:'PASS',authBootstrap:'PASS',
  neutralSeed:'PASS',targetPostflight:'PASS'}
});
const now=Date.now();
const live=()=>({
 projectRef:PROJECT_REF,source:'connected-supabase-readonly',now,
 observed:{capturedAt:new Date(now).toISOString(),database:'postgres',role:'postgres',pgVersion:170006,
  catalogCount:4621,catalogMd5:'e312b40ad91150ce937f4aa00db587f3',
  migrationLedger:0,modernOfficeParticipants:null}
});
const proof=()=>({
 contract:CONTRACT,historicalSourceApplyAttested:true,
 historicalSecretTargetProjectBindingProven:false
});

describe('F6-U03w original 0046 receipt and one-time managed baseline adoption operator handoff',()=>{
 it('original migration list has exactly 47 original SQL sources, two 0026 and five confirmed workflow steps',()=>{
  const p=checked(),x=validateHistoricProofShape(p);
  expect(x.originalFiles).toBe(47);
  expect(x.allFiveChecksPassed).toBe(true);
  expect(p.migrationFiles.filter((s:string)=>s.includes('/0026_'))).toHaveLength(2);
  expect(p.migrationFiles.at(-1)).toContain('0046_alap_team_chat');
 });
 it('rejects forged original receipt SHA, damaged original source identities and false proof checkpoints',()=>{
  expect(()=>verifyOriginalArtifactProof(JSON.stringify(checked()))).toThrow('F6U03W_ORIGINAL_GITHUB_ARTIFACT_HASH_MISMATCH');
  const p=checked();p.checks.targetPostflight='FAIL';
  expect(()=>validateHistoricProofShape(p)).toThrow('F6U03W_HISTORIC_PROOF_CONTRACT_MISMATCH');
  const broken=checked();broken.migrationFiles[46]=broken.migrationFiles[45];
  expect(()=>validateHistoricProofShape(broken)).toThrow('F6U03W_HISTORIC_ORIGINAL_0046_ORDER_MISMATCH');
 });
 it('exact current read-only catalogue is a candidate baseline capture, never historical GitHub secret authority',()=>{
  const p=assessTarget0046(live());
  expect(p.knownLegacy0046CatalogMatches).toBe(true);
  expect(p.activeSchemaIsUntracked).toBe(true);
  expect(p.historicRunAppliedToThisTargetUnproven).toBe(true);
  expect(p.releaseAuthorized).toBe(false);
  expect(buildCurrentTargetCatalogSql()).toContain('f6_u03t_readonly');
 });
 it('wrong target, mutated MD5, invented remote ledger and stale observation fail closed',()=>{
  const x=live();x.projectRef='ewdederyvnwmghlydbno';
  expect(()=>assessTarget0046(x)).toThrow('F6U03W_WRONG_PROJECT_OR_UNTRUSTED_SOURCE');
  const y=live();y.observed.catalogMd5='f'.repeat(32);
  expect(assessTarget0046(y).decision).toBe('BLOCKED_CATALOG_OR_LEDGER_DRIFT');
  const z=live();z.observed.migrationLedger=47;
  expect(assessTarget0046(z).releaseAuthorized).toBe(false);
  const stale=live();stale.now+=901000;
  expect(()=>assessTarget0046(stale)).toThrow('F6U03W_LIVE_CATALOG_STALE');
 });
 it('handoff pins all 31 unchanged future SQL sources, never authorizes repair, publish or replay',()=>{
  const packet=buildHandoff({originalProof:proof(),currentTarget:assessTarget0046(live())});
  expect(packet.forwardOriginalCount).toBe(31);
  expect(packet.forwardPaths).toHaveLength(31);
  expect(packet.historicalProjectBindingProven).toBe(false);
  expect(packet.migrationHistoryWritten).toBe(false);
  expect(packet.currentManagedSnapshotCaptured).toBe(false);
  expect(packet.ownerAdoptionApprovalVerified).toBe(false);
  expect(packet.releaseAuthorized).toBe(false);
  const doc=operatorRunbook(packet);
  expect(doc).toContain('SCHEMA-ONLY');
  expect(doc).toContain('NEVER use the root supabase/migrations');
  expect(doc).toContain('single new current-state baseline');
  expect(doc).toContain('No live Supabase DDL/DML');
  expect(()=>buildHandoff({originalProof:null})).toThrow('F6U03W_EXACT_HISTORICAL_RECEIPT_REQUIRED');
 });
});
