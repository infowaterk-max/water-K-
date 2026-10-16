import {describe,it,expect} from 'vitest';
// @ts-expect-error Intentional direct source ESM helper import.
import {SCOPE,CONTRACT,EXPECTED_FRESH_REF,OFFICE_TABLES,PRIVACY_HELPERS,buildManagedCatalogSQL,assessManagedCatalog} from '../scripts/shoperation-f6-u03q-managed-preflight.mjs';

function legacySnapshot():any{
 return {
  projectRef:EXPECTED_FRESH_REF,
  source:'managed-supabase-catalog-readonly',
  observation:{
   contract:CONTRACT,capturedAt:'2026-10-16T08:45:00.000Z',database:'postgres',serverVersionNum:170006,
   objects:OFFICE_TABLES.map((relation:string)=>({relation,rls:true,forceRls:false,authenticatedSelect:false,anonSelect:false})),
   policies:OFFICE_TABLES.map((table:string)=>({table,policy:table+'_store_all',command:'ALL',roles:['authenticated']})),
   helperSignatures:[],
  },
  migrationLedger:[],
  providerSignedJwtProven:true,releaseAuthorized:true
 };
}
function withCandidate(){
 const snap=legacySnapshot();
 snap.observation.objects.push({relation:'office_thread_participants',rls:true,forceRls:false,authenticatedSelect:false,anonSelect:false});
 snap.observation.objects= snap.observation.objects.map((x:any)=>({...x,authenticatedSelect:OFFICE_TABLES.includes(x.relation)}));
 snap.observation.policies=[];
 snap.observation.helperSignatures=PRIVACY_HELPERS.map((x:string)=>x+'(uuid)');
 snap.migrationLedger=['0001','0002'];
 return snap;
}
describe('F6-U03q real managed Supabase read-only Office preflight and proof scope',()=>{
 it('emits only SELECT catalog introspection, never user data or hosted SQL writes',()=>{
  const sql=buildManagedCatalogSQL();
  expect(sql).toContain('SELECT jsonb_build_object(');
  expect(sql).toContain('pg_catalog.pg_policies');
  expect(sql).toContain('pg_catalog.pg_proc');
  for(const table of OFFICE_TABLES)expect(sql).toContain("'"+table+"'");
  expect(sql).not.toMatch(/\b(?:insert\s+into|update\s+public|delete\s+from|create\s+table|drop\s+table|alter\s+table|grant\s+select|revoke\s+select|truncate\s+table|copy\s+public)\b/i);
  expect(sql).not.toContain('auth.users');
  expect(sql).not.toContain('service_role');
 });
 it('blocks observed managed old Office policy, missing participant/helpers and direct SELECT despite RLS enabled',()=>{
  const x=assessManagedCatalog(legacySnapshot());
  expect(x.scope).toBe(SCOPE);
  expect(x.decision).toBe('BLOCKED_MANAGED_OFFICE_SCHEMA');
  expect(x.officeRelationCount).toBe(3);
  expect(x.blockers).toContain('OFFICE_PARTICIPANTS_MISSING');
  expect(x.blockers).toContain('MANAGED_MIGRATION_LEDGER_EMPTY');
  expect(x.blockers).toContain('LEGACY_STORE_ALL_POLICY:office_threads');
  expect(x.blockers).toContain('PRIVACY_HELPER_MISSING:private.current_user_can_read_office_thread_v1');
  expect(x.blockers).toContain('DIRECT_AUTHENTICATED_SELECT_DENIED:office_messages');
  expect(x.releaseAuthorized).toBe(false);
 });
 it('rejects false signed-JWT and release claims even with candidate modern schema',()=>{
  const r=assessManagedCatalog(withCandidate());
  expect(r.decision).toBe('SCHEMA_CANDIDATE_ONLY_PROVIDER_AUTH_API_BLOCKED');
  expect(r.schemaFailures).toEqual([]);
  expect(r.actualProviderSignedJwtProven).toBe(false);
  expect(r.actualManagedPostgrestHttpProven).toBe(false);
  expect(r.actualAuthenticatedAlapProJourneyProven).toBe(false);
  expect(r.source78InstalledInHostedProven).toBe(false);
  expect(r.releaseAuthorized).toBe(false);
  expect(r.blockers).toContain('SIGNED_SUPABASE_AUTH_JWT_UNPROVEN');
 });
 it('never mistakes empty or partial table list for positive schema authority',()=>{
  const z=legacySnapshot();z.observation.objects=[];
  const x=assessManagedCatalog(z);
  expect(x.officeRelationCount).toBe(0);
  expect(x.blockers).toContain('OFFICE_TABLE_MISSING:office_threads');
  expect(x.decision).toBe('BLOCKED_MANAGED_OFFICE_SCHEMA');
  const v=legacySnapshot();v.observation.objects=v.observation.objects.slice(0,2);
  expect(assessManagedCatalog(v).blockers).toContain('OFFICE_TABLE_MISSING:office_tasks');
 });
 it('blocks RLS disabled and refuses duplicate or malformed catalog evidence',()=>{
  const z=withCandidate();z.observation.objects[0].rls=false;
  expect(assessManagedCatalog(z).blockers).toContain('OFFICE_RLS_DISABLED:office_threads');
  const a=legacySnapshot();a.observation.objects.push({...a.observation.objects[0]});
  expect(()=>assessManagedCatalog(a)).toThrow('F6U03Q_DUPLICATE_OBJECT');
  const b=legacySnapshot();b.observation.policies.push({...b.observation.policies[0]});
  expect(()=>assessManagedCatalog(b)).toThrow('F6U03Q_DUPLICATE_POLICY');
 });
 it('rejects wrong managed project, untrusted source and forged role facts',()=>{
  const z=legacySnapshot();z.projectRef='another-project';
  expect(()=>assessManagedCatalog(z)).toThrow('F6U03Q_WRONG_FRESH_PROJECT');
  const p=legacySnapshot();p.source='synthetic-docker';
  expect(()=>assessManagedCatalog(p)).toThrow('F6U03Q_UNATTESTED_CATALOG_SOURCE');
  const a=legacySnapshot();a.observation.objects[0].authenticatedSelect='true';
  expect(()=>assessManagedCatalog(a)).toThrow('F6U03Q_INVALID_CATALOG_OBJECT');
  const b=legacySnapshot();b.observation.serverVersionNum=160004;
  expect(()=>assessManagedCatalog(b)).toThrow('F6U03Q_WRONG_CONTRACT_OR_NATIVE_POSTGRES');
 });
 it('does not infer 78-source replay from a populated but unverified managed migration ledger',()=>{
  const z=withCandidate();z.migrationLedger=['0046','0058'];
  const x=assessManagedCatalog(z);
  expect(x.blockers).toContain('ORDERED_78_SOURCE_PROVENANCE_UNATTESTED');
  expect(x.source78InstalledInHostedProven).toBe(false);
  expect(x.managedStorageProven).toBe(false);
  expect(x.hostedMutationPerformed).toBe(false);
 });
});
