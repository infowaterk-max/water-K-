-- V19: idempotent recovery governance orchestration.
create table if not exists public.recovery_runs(
 id uuid primary key default gen_random_uuid(),run_key text not null unique,status text not null default 'running' check(status in('running','completed','failed')),
 started_at timestamptz not null default now(),completed_at timestamptz,result jsonb not null default '{}'::jsonb
);
alter table public.recovery_runs enable row level security;revoke all on public.recovery_runs from public,anon,authenticated;grant select,insert on public.recovery_runs to service_role;

create or replace function public.process_recovery_governance_cycle(p_run_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.recovery_runs;r jsonb;begin
 select * into v from public.recovery_runs where run_key=p_run_key for update;
 if found and v.status='completed' then return v.result;end if;
 if not found then insert into public.recovery_runs(run_key) values(p_run_key) returning * into v;end if;
 begin
   r:=public.reconcile_recovery_governance(p_run_key);
   update public.recovery_runs set status='completed',completed_at=now(),result=r where id=v.id;
   return r;
 exception when others then
   update public.recovery_runs set status='failed',completed_at=now(),result=jsonb_build_object('error',sqlerrm) where id=v.id;
   raise;
 end;
end;$$;
revoke all on function public.process_recovery_governance_cycle(text) from public,anon,authenticated;grant execute on function public.process_recovery_governance_cycle(text) to service_role;

create or replace function public.block_recovery_run_mutation() returns trigger language plpgsql set search_path='' as $$begin if old.status in('completed','failed') then raise exception 'Terminal recovery run immutable.';end if;return new;end;$$;
drop trigger if exists trg_recovery_runs_terminal on public.recovery_runs;create trigger trg_recovery_runs_terminal before update on public.recovery_runs for each row execute function public.block_recovery_run_mutation();
revoke update,delete on public.recovery_runs from service_role;
