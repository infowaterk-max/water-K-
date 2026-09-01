-- Tamper-evident, append-only audit chain for merchant and platform actions.
-- The chain is scoped per webshop/organization/platform and serialized with advisory locks.

alter table public.admin_audit_log add column if not exists actor_roles text[];
alter table public.admin_audit_log add column if not exists audit_scope text;
alter table public.admin_audit_log add column if not exists chain_seq bigint;
alter table public.admin_audit_log add column if not exists prev_hash text;
alter table public.admin_audit_log add column if not exists entry_hash text;

create sequence if not exists public.admin_audit_chain_seq;
alter sequence public.admin_audit_chain_seq owned by public.admin_audit_log.chain_seq;

update public.admin_audit_log
set audit_scope=case
  when instance_id is not null then 'store:'||instance_id::text
  when organization_id is not null then 'org:'||organization_id::text
  else 'platform'
end
where audit_scope is null;

update public.admin_audit_log set actor_roles=array['legacy']::text[] where actor_roles is null;

with ordered as (
  select id,nextval('public.admin_audit_chain_seq') as seq
  from public.admin_audit_log
  where chain_seq is null
  order by created_at,id
)
update public.admin_audit_log a set chain_seq=o.seq from ordered o where a.id=o.id;

select setval(
  'public.admin_audit_chain_seq',
  greatest(coalesce((select max(chain_seq) from public.admin_audit_log),0),1),
  coalesce((select max(chain_seq) from public.admin_audit_log),0)>0
);

alter table public.admin_audit_log alter column actor_roles set not null;
alter table public.admin_audit_log alter column audit_scope set not null;
alter table public.admin_audit_log alter column chain_seq set not null;

create or replace function public.compute_admin_audit_hash(
  p_chain_seq bigint,p_audit_scope text,p_prev_hash text,p_actor_user_id uuid,p_actor_roles text[],p_action text,p_entity_type text,p_entity_id text,
  p_summary text,p_before_state jsonb,p_after_state jsonb,p_metadata jsonb,p_created_at timestamptz
) returns text
language sql immutable set search_path=public,extensions as $$
  select encode(extensions.digest(convert_to(jsonb_build_object(
    'chain_seq',p_chain_seq,'audit_scope',p_audit_scope,'prev_hash',p_prev_hash,'actor_user_id',p_actor_user_id,
    'actor_roles',coalesce(p_actor_roles,'{}'::text[]),'action',p_action,'entity_type',p_entity_type,'entity_id',p_entity_id,
    'summary',p_summary,'before_state',p_before_state,'after_state',p_after_state,'metadata',coalesce(p_metadata,'{}'::jsonb),
    'created_at',p_created_at
  )::text,'UTF8'),'sha256'),'hex');
$$;

do $$
declare r record;v_scope text:=null;v_prev text:=null;v_hash text;
begin
  for r in select * from public.admin_audit_log order by audit_scope,chain_seq loop
    if v_scope is distinct from r.audit_scope then v_scope:=r.audit_scope;v_prev:=null;end if;
    v_hash:=public.compute_admin_audit_hash(r.chain_seq,r.audit_scope,v_prev,r.actor_user_id,r.actor_roles,r.action,r.entity_type,r.entity_id,r.summary,r.before_state,r.after_state,r.metadata,r.created_at);
    update public.admin_audit_log set prev_hash=v_prev,entry_hash=v_hash where id=r.id;
    v_prev:=v_hash;
  end loop;
end $$;

alter table public.admin_audit_log alter column entry_hash set not null;
create unique index if not exists admin_audit_chain_seq_uidx on public.admin_audit_log(chain_seq);
create index if not exists admin_audit_scope_chain_idx on public.admin_audit_log(audit_scope,chain_seq desc);
create index if not exists admin_audit_instance_chain_idx on public.admin_audit_log(instance_id,chain_seq desc) where instance_id is not null;
create index if not exists admin_audit_org_chain_idx on public.admin_audit_log(organization_id,chain_seq desc) where organization_id is not null;

create or replace function public.prepare_admin_audit_entry() returns trigger
language plpgsql security definer set search_path=public,extensions as $$
declare v_store_org uuid;v_roles text[];v_prev text;
begin
  if new.created_at is null then new.created_at:=now();end if;
  if new.instance_id is not null then
    select organization_id into v_store_org from public.webshop_instances where id=new.instance_id;
    if not found then raise exception 'Audit entry references unknown webshop instance.';end if;
    if new.organization_id is not null and new.organization_id is distinct from v_store_org then raise exception 'Audit organization/store mismatch.';end if;
    new.organization_id:=v_store_org;
    new.audit_scope:='store:'||new.instance_id::text;
  elsif new.organization_id is not null then
    perform 1 from public.organizations where id=new.organization_id;if not found then raise exception 'Audit entry references unknown organization.';end if;
    new.audit_scope:='org:'||new.organization_id::text;
  else new.audit_scope:='platform';end if;

  select array_agg(distinct role_label order by role_label) into v_roles from (
    select 'platform:'||po.role::text role_label from public.platform_operators po where po.user_id=new.actor_user_id
    union all
    select 'store:'||rb.role_code from public.role_bindings rb
      where rb.user_id=new.actor_user_id and new.instance_id is not null
        and rb.organization_id=new.organization_id and (rb.instance_id=new.instance_id or rb.instance_id is null)
        and rb.revoked_at is null and rb.valid_from<=new.created_at and (rb.valid_until is null or rb.valid_until>new.created_at)
    union all
    select 'organization:'||om.role from public.organization_members om
      where om.user_id=new.actor_user_id and new.organization_id is not null and om.organization_id=new.organization_id
  ) roles;
  new.actor_roles:=coalesce(v_roles,array['unknown']::text[]);

  perform pg_advisory_xact_lock(hashtextextended(new.audit_scope,0));
  new.chain_seq:=nextval('public.admin_audit_chain_seq');
  select entry_hash into v_prev from public.admin_audit_log where audit_scope=new.audit_scope order by chain_seq desc limit 1;
  new.prev_hash:=v_prev;
  new.entry_hash:=public.compute_admin_audit_hash(new.chain_seq,new.audit_scope,new.prev_hash,new.actor_user_id,new.actor_roles,new.action,new.entity_type,new.entity_id,new.summary,new.before_state,new.after_state,new.metadata,new.created_at);
  return new;
end $$;

create or replace function public.prevent_admin_audit_mutation() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  raise exception 'Admin audit log is append-only.';
end $$;

drop trigger if exists admin_audit_prepare_insert on public.admin_audit_log;
create trigger admin_audit_prepare_insert before insert on public.admin_audit_log for each row execute function public.prepare_admin_audit_entry();
drop trigger if exists admin_audit_immutable on public.admin_audit_log;
create trigger admin_audit_immutable before update or delete on public.admin_audit_log for each row execute function public.prevent_admin_audit_mutation();

revoke update,delete on public.admin_audit_log from anon,authenticated,service_role;
revoke insert on public.admin_audit_log from anon,authenticated;

-- Replace audit read policies with tenant-aware visibility. Writes remain service-side only.
do $$ declare p record;begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='admin_audit_log' loop
    execute format('drop policy if exists %I on public.admin_audit_log',p.policyname);
  end loop;
end $$;
alter table public.admin_audit_log enable row level security;
create policy admin_audit_tenant_read on public.admin_audit_log for select to authenticated using (
  public.is_platform_operator(auth.uid())
  or (instance_id is not null and public.can_read_store(instance_id,auth.uid()))
  or (instance_id is null and organization_id is not null and exists(select 1 from public.organization_members om where om.organization_id=admin_audit_log.organization_id and om.user_id=auth.uid()))
);

create or replace function public.verify_admin_audit_chain(p_instance_id uuid default null)
returns table(audit_scope text,entries bigint,invalid_links bigint,invalid_hashes bigint,valid boolean)
language sql stable security invoker set search_path=public,extensions as $$
  with ordered as (
    select a.*,lag(a.entry_hash) over(partition by a.audit_scope order by a.chain_seq) expected_prev
    from public.admin_audit_log a
    where p_instance_id is null or a.instance_id=p_instance_id
  ), checked as (
    select *,
      (coalesce(prev_hash,'')<>coalesce(expected_prev,'')) bad_link,
      (entry_hash<>public.compute_admin_audit_hash(chain_seq,audit_scope,prev_hash,actor_user_id,actor_roles,action,entity_type,entity_id,summary,before_state,after_state,metadata,created_at)) bad_hash
    from ordered
  )
  select audit_scope,count(*)::bigint,count(*) filter(where bad_link)::bigint,count(*) filter(where bad_hash)::bigint,
    (count(*) filter(where bad_link or bad_hash)=0) valid
  from checked group by audit_scope order by audit_scope;
$$;
revoke all on function public.verify_admin_audit_chain(uuid) from public;
grant execute on function public.verify_admin_audit_chain(uuid) to authenticated,service_role;

comment on column public.admin_audit_log.entry_hash is 'SHA-256 hash over the canonical audit entry and previous hash.';
comment on function public.verify_admin_audit_chain(uuid) is 'Verifies visible audit-chain links and hashes; RLS applies because the function is security invoker.';
