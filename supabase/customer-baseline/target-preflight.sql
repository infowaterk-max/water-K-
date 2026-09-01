-- Shoperation fresh-install target preflight.
-- Read-only guard: run this against the disposable target database immediately
-- before applying the reviewed Shoperation 1.0 baseline snapshot.
-- The target must be genuinely empty and must not contain historical migration state.

do $$
declare
  public_relations integer;
  public_functions integer;
  public_sequences integer;
  public_user_types integer;
  migration_rows integer := 0;
begin
  select count(*) into public_relations
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r','p','v','m','f');

  select count(*) into public_functions
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public';

  select count(*) into public_sequences
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'S';

  select count(*) into public_user_types
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
    and t.typtype in ('e','d','c')
    and not exists (
      select 1 from pg_class c where c.oid = t.typrelid and c.relkind in ('r','p','v','m','f')
    );

  if to_regclass('supabase_migrations.schema_migrations') is not null then
    execute 'select count(*) from supabase_migrations.schema_migrations' into migration_rows;
  end if;

  if public_relations <> 0
     or public_functions <> 0
     or public_sequences <> 0
     or public_user_types <> 0
     or migration_rows <> 0 then
    raise exception
      'Fresh-install target is not empty: relations=%, functions=%, sequences=%, user_types=%, migration_rows=%',
      public_relations, public_functions, public_sequences, public_user_types, migration_rows;
  end if;
end $$;

select
  0::integer as public_relations,
  0::integer as public_functions,
  0::integer as public_sequences,
  0::integer as public_user_types,
  0::integer as historical_migration_rows,
  'target-preflight-ok'::text as status;
