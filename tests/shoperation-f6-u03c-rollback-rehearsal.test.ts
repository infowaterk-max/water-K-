import {describe,it,expect} from 'vitest';
import {spawnSync} from 'node:child_process';
// @ts-expect-error Deliberately plain .mjs PostgreSQL fixture runner without TypeScript declarations.
import{assertIsolatedHarnessEnvironment,fixtureSql,replaySql,checkSql,runIsolatedRollbackProof,FAILURE_POINTS,FIXTURE_DATABASE,FIXTURE_HOST,PROOF_SCOPE}from'../scripts/shoperation-f6-u03c-rollback-rehearsal.mjs';

const safe={GITHUB_ACTIONS:'true',F6_U03C_EPHEMERAL_FIXTURE:'yes',F6_U03C_EXPECTED_SERVICE_IP:'172.18.0.2',PATH:'/usr/bin:/bin'};
describe('F6-U03c isolated real PostgreSQL rollback harness safety contract',()=>{
  it('pins the test to exact ephemeral database and loopback target',()=>{
    expect(assertIsolatedHarnessEnvironment(safe)).toEqual({
      host:'127.0.0.1',port:'5432',database:'f6_u03c_fixture',user:'postgres',expectedServiceIp:'172.18.0.2',
    });
    expect(FIXTURE_DATABASE).toBe('f6_u03c_fixture');
    expect(FIXTURE_HOST).toBe('127.0.0.1');
    expect(PROOF_SCOPE).toBe('LOCAL_POSTGRES16_TRANSACTION_ONLY');
  });
  it('rejects missing explicit GitHub ephemeral marker',()=>{
    expect(()=>assertIsolatedHarnessEnvironment({})).toThrow('F6U03C_NON_EPHEMERAL_ENVIRONMENT');
    expect(()=>assertIsolatedHarnessEnvironment({...safe,GITHUB_ACTIONS:'false'})).toThrow('F6U03C_NON_EPHEMERAL_ENVIRONMENT');
  });
  it.each(['PGHOST','PGHOSTADDR','PGSERVICE','PGPORT','PGDATABASE','PGOPTIONS','PGSSLMODE','PGPASSWORD','PGSSLROOTCERT'])(
    'blocks inherited libpq selector %s',key=>{
      expect(()=>assertIsolatedHarnessEnvironment({...safe,[key]:'untrusted'})).toThrow('F6U03C_INHERITED_PG_CONNECTION_SELECTOR');
    });
  it.each(['DATABASE_URL','SHOPERATION_FRESH_INSTALL_DB_URL','SUPABASE_DB_URL','SUPABASE_DATABASE_URL'])(
    'blocks a hosted-connection variable %s even if other values look local',key=>{
      expect(()=>assertIsolatedHarnessEnvironment({...safe,[key]:'postgres://external.example/postgres'})).toThrow('F6U03C_HOSTED_CONNECTION_PRESENT');
    });
  it('uses fixture-namespaced schemas and never issues DROP on Supabase-managed schemas',()=>{
    const setup=fixtureSql(),replay=replaySql();
    for(const schema of ['f6_u03c_auth','f6_u03c_app','f6_u03c_private']){
      expect(setup).toContain('CREATE SCHEMA '+schema+';');
    }
    expect(replay).toContain('DROP SCHEMA f6_u03c_private CASCADE;');
    expect(replay).toContain('DROP SCHEMA f6_u03c_app CASCADE;');
    expect(replay).not.toMatch(/DROP SCHEMA (?:public|private|auth|storage|realtime)\b/i);
    expect(replay).not.toContain('istjjkdcvsvilrycqecd');
    expect(replay).not.toContain('supabase_migrations');
  });
  it('prepares a real external Auth-like trigger dependency for the fixture',()=>{
    expect(fixtureSql()).toContain('CREATE TRIGGER f6_u03c_external_auth_trigger');
    expect(fixtureSql()).toContain('EXECUTE FUNCTION f6_u03c_private.on_user()');
    expect(checkSql()).toContain('f6_u03c_external_auth_trigger');
    expect(fixtureSql()).toContain('before-transaction');
    expect(checkSql()).toContain('SELECT label FROM f6_u03c_app.orders WHERE id=7');
  });
  it('includes seven independently injectable fault phases, all before COMMIT',()=>{
    expect(FAILURE_POINTS).toEqual(['BEFORE_DROP','AFTER_DROP','MIGRATION_0001','MIGRATION_0058','AUTH_BOOTSTRAP','NEUTRAL_SEED','POSTFLIGHT']);
    for(const point of FAILURE_POINTS){
      const sql=replaySql(point);
      expect(sql.trimStart().startsWith('BEGIN;')).toBe(true);
      expect(sql.trimEnd().endsWith('COMMIT;')).toBe(true);
      expect(sql).toContain('F6U03C_INJECTED_'+point);
      expect(sql.indexOf('F6U03C_INJECTED_'+point)).toBeLessThan(sql.lastIndexOf('COMMIT;'));
    }
  });
  it('orders the fixture transaction through DROP, replacement, trigger bootstrap, seed, postflight, and commit',()=>{
    const sql=replaySql();
    const fragments=['BEGIN;','DROP SCHEMA f6_u03c_private CASCADE;','CREATE SCHEMA f6_u03c_private;',
      'CREATE TABLE f6_u03c_app.orders','INSERT INTO f6_u03c_app.orders',
      'CREATE TRIGGER f6_u03c_external_auth_trigger','INSERT INTO f6_u03c_app.neutral_catalog',
      'F6U03C_POSTFLIGHT_BAD','COMMIT;'];
    let previous=-1;
    for(const fragment of fragments){
      const index=sql.indexOf(fragment);
      expect(index).toBeGreaterThan(previous);
      previous=index;
    }
  });
  it('rejects an unrecognized injection state',()=>{
    expect(()=>replaySql('UNKNOWN_PHASE')).toThrow('F6U03C_UNKNOWN_INJECTION_POINT');
  });
  it('does not allow a routine CLI to run fixture-only DDL',()=>{
    const a=spawnSync(process.execPath,['scripts/shoperation-f6-u03c-rollback-rehearsal.mjs','--execute'],{encoding:'utf8'});
    expect(a.status).not.toBe(0);
    expect(a.stderr).toContain('F6U03C_FIXTURE_ONLY_NO_GENERAL_SQL_MODE');
  });
  it('does not claim that real 59-file Supabase migrations or Alap/Pro RLS were proved',()=>{
    expect(PROOF_SCOPE).toContain('LOCAL_POSTGRES16');
    expect(replaySql()).not.toContain('supabase/customer-baseline');
    expect(()=>runIsolatedRollbackProof({})).toThrow('F6U03C_NON_EPHEMERAL_ENVIRONMENT');
  });
});
