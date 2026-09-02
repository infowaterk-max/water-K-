


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."customer_journey_kind" AS ENUM (
    'post_purchase',
    'replenishment',
    'winback',
    'abandoned_checkout'
);


ALTER TYPE "public"."customer_journey_kind" OWNER TO "postgres";


CREATE TYPE "public"."customer_journey_status" AS ENUM (
    'active',
    'completed',
    'cancelled',
    'blocked'
);


ALTER TYPE "public"."customer_journey_status" OWNER TO "postgres";


CREATE TYPE "public"."customer_role" AS ENUM (
    'customer',
    'reseller',
    'admin'
);


ALTER TYPE "public"."customer_role" OWNER TO "postgres";


CREATE TYPE "public"."order_status" AS ENUM (
    'draft',
    'pending',
    'paid',
    'processing',
    'shipped',
    'completed',
    'cancelled',
    'refunded',
    'pending_payment',
    'pending_transfer'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."return_case_status" AS ENUM (
    'requested',
    'approved',
    'rejected',
    'received',
    'refund_pending',
    'refunded',
    'closed'
);


ALTER TYPE "public"."return_case_status" OWNER TO "postgres";


CREATE TYPE "public"."support_ticket_category" AS ENUM (
    'product',
    'order',
    'shipping',
    'invoice',
    'reseller',
    'return',
    'other'
);


ALTER TYPE "public"."support_ticket_category" OWNER TO "postgres";


CREATE TYPE "public"."support_ticket_status" AS ENUM (
    'open',
    'in_progress',
    'waiting_customer',
    'resolved',
    'closed'
);


ALTER TYPE "public"."support_ticket_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_account_type text:=coalesce(new.raw_user_meta_data->>'account_type','customer');v_requested_instance uuid;
begin
  insert into public.profiles(id,email,full_name,company_name,tax_number,role,reseller_approved)
  values(new.id,new.email,nullif(trim(coalesce(new.raw_user_meta_data->>'full_name','')),''),nullif(trim(coalesce(new.raw_user_meta_data->>'company_name','')),''),nullif(trim(coalesce(new.raw_user_meta_data->>'tax_number','')),''),'customer'::public.customer_role,false)
  on conflict(id) do update set email=excluded.email;
  begin v_requested_instance:=nullif(trim(coalesce(new.raw_user_meta_data->>'requested_instance_id','')),'')::uuid;exception when others then v_requested_instance:=null;end;
  if v_requested_instance is not null and exists(select 1 from public.webshop_instances w where w.id=v_requested_instance and w.status in('pilot','active')) then
    insert into public.customer_instance_roles(instance_id,user_id,role,reseller_approved,reseller_requested_at)
    values(v_requested_instance,new.id,case when v_account_type='reseller' then 'reseller'::public.customer_role else 'customer'::public.customer_role end,false,case when v_account_type='reseller' then now() else null end)
    on conflict(instance_id,user_id) do nothing;
  end if;
  return new;
end;$$;


ALTER FUNCTION "private"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."has_feature_entitlement_current"("p_instance_id" "uuid", "p_feature_code" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select case
    when p_instance_id is null or nullif(trim(p_feature_code),'') is null then false
    when coalesce(auth.jwt()->>'role','')<>'service_role'
      and not private.is_platform_operator_current(auth.uid())
      and not private.has_store_role_current(
        p_instance_id,
        array['owner','admin','catalog_manager','order_manager','marketing_manager','support','analyst','viewer'],
        auth.uid()
      )
    then false
    else exists(
      select 1
      from public.feature_entitlements e
      join public.webshop_instances w
        on w.id=p_instance_id and w.organization_id=e.organization_id
      where e.feature_code=p_feature_code
        and e.enabled
        and (e.instance_id is null or e.instance_id=p_instance_id)
        and e.valid_from<=now()
        and (e.valid_until is null or e.valid_until>now())
    )
  end;
$$;


ALTER FUNCTION "private"."has_feature_entitlement_current"("p_instance_id" "uuid", "p_feature_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."has_store_role_current"("p_instance_id" "uuid", "p_roles" "text"[], "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select case
    when p_instance_id is null or p_user_id is null then false
    when coalesce(auth.jwt()->>'role','')<>'service_role'
      and (auth.uid() is null or p_user_id is distinct from auth.uid()) then false
    else private.is_platform_operator_current(p_user_id) or exists(
      select 1
      from public.role_bindings r
      where r.user_id=p_user_id
        and r.role_code=any(p_roles)
        and r.revoked_at is null
        and r.valid_from<=now()
        and (r.valid_until is null or r.valid_until>now())
        and (
          r.instance_id=p_instance_id
          or (
            r.instance_id is null
            and r.organization_id=(
              select w.organization_id from public.webshop_instances w where w.id=p_instance_id
            )
          )
        )
    )
  end;
$$;


ALTER FUNCTION "private"."has_store_role_current"("p_instance_id" "uuid", "p_roles" "text"[], "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    exists(
      select 1
      from public.profiles
      where id=auth.uid() and role='admin'
    )
    or exists(
      select 1
      from public.platform_operators
      where user_id=auth.uid()
        and role in ('owner','admin','operator')
    );
$$;


ALTER FUNCTION "private"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_platform_operator_current"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select case
    when p_user_id is null then false
    when coalesce(auth.jwt()->>'role','')='service_role' then
      exists(select 1 from public.platform_operators p where p.user_id=p_user_id)
    when auth.uid() is null or p_user_id is distinct from auth.uid() then false
    else exists(select 1 from public.platform_operators p where p.user_id=p_user_id)
  end;
$$;


ALTER FUNCTION "private"."is_platform_operator_current"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."snapshot_order_item_tax"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v record; v_net integer;
begin
  if new.variant_id is null then return new; end if;
  select gross_price_huf,net_price_huf,reseller_gross_price_huf,reseller_net_price_huf into v from public.product_variants where id=new.variant_id;
  if not found then return new; end if;
  v_net:=case when v.reseller_gross_price_huf is not null and v.reseller_net_price_huf is not null and new.unit_gross_huf=v.reseller_gross_price_huf then v.reseller_net_price_huf when new.unit_gross_huf=v.gross_price_huf then v.net_price_huf else null end;
  if v_net is not null and v_net>0 then
    new.unit_net_huf_snapshot:=v_net;
    new.line_total_net_huf_snapshot:=v_net*new.quantity;
    new.vat_rate_percent_snapshot:=round(((new.unit_gross_huf::numeric/v_net::numeric)-1)*100,3);
  end if;
  return new;
end;$$;


ALTER FUNCTION "private"."snapshot_order_item_tax"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."touch_product_variant_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$begin new.updated_at:=now(); return new; end;$$;


ALTER FUNCTION "private"."touch_product_variant_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accrue_loyalty_points_from_paid_orders"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_count integer:=0;begin
  insert into public.loyalty_ledger(customer_id,event_key,entry_type,points,order_id,reason,metadata,occurred_at)
  select o.customer_id,'order-earn:'||o.id::text,'earn',least(1000,greatest(1,floor(o.total_gross_huf/1000.0)::integer)),o.id,
         'Fizetett rendelés után jóváírt hűségpont',jsonb_build_object('order_total_gross_huf',o.total_gross_huf,'rule','1_point_per_1000_huf_gross','cap',1000),o.created_at
  from public.orders o
  where o.customer_id is not null and o.status in ('paid','processing','shipped','completed') and o.total_gross_huf>0
  on conflict(event_key) do nothing;
  get diagnostics v_count=row_count;
  return v_count;
end;$$;


ALTER FUNCTION "public"."accrue_loyalty_points_from_paid_orders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accrue_loyalty_points_from_paid_orders_v2"("p_instance_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$declare v_count int:=0;begin
 insert into public.loyalty_ledger(instance_id,customer_id,event_key,entry_type,points,order_id,reason,metadata,occurred_at)
 select p_instance_id,o.customer_id,'order-earn:'||o.id::text,'earn',least(1000,greatest(1,floor(o.total_gross_huf/1000.0)::int)),o.id,'Fizetett rendelés után jóváírt hűségpont',jsonb_build_object('order_total_gross_huf',o.total_gross_huf,'rule','1_point_per_1000_huf_gross','cap',1000),o.created_at from public.orders o
 where o.instance_id=p_instance_id and o.customer_id is not null and o.status in('paid','processing','shipped','completed') and o.total_gross_huf>0 on conflict(instance_id,event_key) do nothing;get diagnostics v_count=row_count;return v_count;end$$;


ALTER FUNCTION "public"."accrue_loyalty_points_from_paid_orders_v2"("p_instance_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."action_proposal_is_stale"("p_proposal_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$select case when p.simulated_at is null then true when a.last_detected_at>p.simulated_at then true when a.status in ('resolved','dismissed') then true when not pol.enabled then true when p.created_at<a.incident_started_at then true when p.source_snapshot ? 'incident_started_at' and (p.source_snapshot->>'incident_started_at')::timestamptz is distinct from a.incident_started_at then true else false end from public.action_proposals p join public.control_alerts a on a.id=p.alert_id join public.action_policies pol on pol.id=p.policy_id where p.id=p_proposal_id$$;


ALTER FUNCTION "public"."action_proposal_is_stale"("p_proposal_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."automation_runbook_instances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "instance_key" "text" NOT NULL,
    "runbook_id" "uuid" NOT NULL,
    "alert_id" "uuid" NOT NULL,
    "proposal_id" "uuid",
    "status" "text" DEFAULT 'planned'::"text" NOT NULL,
    "escalation_level" integer DEFAULT 0 NOT NULL,
    "failure_count" integer DEFAULT 0 NOT NULL,
    "source_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "started_at" timestamp with time zone,
    "paused_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "deadline_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "automation_runbook_instances_escalation_level_check" CHECK ((("escalation_level" >= 0) AND ("escalation_level" <= 5))),
    CONSTRAINT "automation_runbook_instances_failure_count_check" CHECK (("failure_count" >= 0)),
    CONSTRAINT "automation_runbook_instances_status_check" CHECK (("status" = ANY (ARRAY['planned'::"text", 'active'::"text", 'paused'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."automation_runbook_instances" OWNER TO "postgres";


COMMENT ON TABLE "public"."automation_runbook_instances" IS 'V15 governed multi-step automation state. Initial release may mutate only control-plane records.';



CREATE OR REPLACE FUNCTION "public"."activate_automation_runbook"("p_instance_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") RETURNS "public"."automation_runbook_instances"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare i public.automation_runbook_instances;r public.automation_runbooks;a public.control_alerts;p public.action_proposals;c public.automation_control;e public.automation_events;begin
 if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('automation-instance:'||p_instance_id::text,0));
 select * into e from public.automation_events where event_key=p_event_key;if found then if e.instance_id<>p_instance_id or e.event_type<>'activated' then raise exception 'event_key_conflict';end if;select * into i from public.automation_runbook_instances where id=p_instance_id;return i;end if;
 select * into i from public.automation_runbook_instances where id=p_instance_id for update;if not found then raise exception 'instance_not_found';end if;if i.status<>'planned' then raise exception 'instance_not_activatable';end if;
 select * into c from public.automation_control where singleton=true;if c.global_paused or(c.circuit_open_until is not null and c.circuit_open_until>now()) then raise exception 'automation_circuit_open';end if;
 select * into r from public.automation_runbooks where id=i.runbook_id;if not r.enabled then raise exception 'runbook_disabled';end if;select * into a from public.control_alerts where id=i.alert_id;if a.status not in ('open','acknowledged') then raise exception 'source_alert_not_active';end if;
 if r.requires_action_approval then if i.proposal_id is null then raise exception 'approved_action_required';end if;select * into p from public.action_proposals where id=i.proposal_id;if p.status not in ('approved','executed') or public.action_proposal_is_stale(p.id) then raise exception 'approved_action_stale_or_missing';end if;end if;
 update public.automation_runbook_instances set status='active',started_at=coalesce(started_at,now()),paused_at=null,updated_at=now() where id=i.id returning * into i;
 insert into public.automation_events(event_key,instance_id,event_type,actor_id,metadata) values(p_event_key,i.id,'activated',p_actor_id,jsonb_build_object('runbook_id',i.runbook_id));return i;
end;$$;


ALTER FUNCTION "public"."activate_automation_runbook"("p_instance_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."activate_automation_runbook_v2"("p_store_instance_id" "uuid", "p_runbook_instance_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") RETURNS "public"."automation_runbook_instances"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$begin if not exists(select 1 from public.automation_runbook_instances where id=p_runbook_instance_id and instance_id=p_store_instance_id)then raise exception 'automation_instance_not_found';end if;return public.activate_automation_runbook(p_runbook_instance_id,p_actor_id,p_store_instance_id::text||':'||p_event_key);end$$;


ALTER FUNCTION "public"."activate_automation_runbook_v2"("p_store_instance_id" "uuid", "p_runbook_instance_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_customer_journey_step"("p_journey_id" "uuid", "p_step_key" "text", "p_purpose" "text", "p_template_key" "text", "p_scheduled_at" timestamp with time zone) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_id uuid;j public.customer_journeys%rowtype;begin
  select * into j from public.customer_journeys where id=p_journey_id for update;
  if not found then raise exception 'journey not found'; end if;
  if j.status<>'active' then raise exception 'journey is not active'; end if;
  if p_purpose not in ('transactional','marketing') then raise exception 'invalid purpose'; end if;
  insert into public.customer_journey_steps(journey_id,step_key,purpose,template_key,scheduled_at)
  values(p_journey_id,trim(p_step_key),p_purpose,trim(p_template_key),p_scheduled_at)
  on conflict(journey_id,step_key) do update set scheduled_at=excluded.scheduled_at
  returning id into v_id;
  return v_id;
end;$$;


ALTER FUNCTION "public"."add_customer_journey_step"("p_journey_id" "uuid", "p_step_key" "text", "p_purpose" "text", "p_template_key" "text", "p_scheduled_at" timestamp with time zone) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."release_candidates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_key" "text" NOT NULL,
    "version_label" "text" NOT NULL,
    "source_ref" "text" NOT NULL,
    "source_sha" "text" NOT NULL,
    "risk_class" "text" NOT NULL,
    "change_summary" "text" NOT NULL,
    "rollback_plan" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "policy_id" "uuid" NOT NULL,
    "ci_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "ci_observed_at" timestamp with time zone,
    "ci_evidence" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "assurance_run_id" "uuid",
    "assurance_bundle_hash" "text",
    "assurance_score" integer,
    "gate_snapshot" "jsonb",
    "gate_hash" "text",
    "evaluated_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "change_set_hash" "text",
    CONSTRAINT "release_candidates_assurance_score_check" CHECK ((("assurance_score" >= 0) AND ("assurance_score" <= 100))),
    CONSTRAINT "release_candidates_ci_status_check" CHECK (("ci_status" = ANY (ARRAY['pending'::"text", 'success'::"text", 'failure'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "release_candidates_risk_class_check" CHECK (("risk_class" = ANY (ARRAY['standard'::"text", 'high_impact'::"text"]))),
    CONSTRAINT "release_candidates_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'evaluated'::"text", 'ready'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."release_candidates" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_release_change"("p_candidate_id" "uuid", "p_actor_id" "uuid", "p_change_key" "text", "p_category" "text", "p_title" "text", "p_description" "text", "p_risk_level" "text", "p_event_key" "text") RETURNS "public"."release_candidates"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare c public.release_candidates;ev public.release_events;begin perform pg_advisory_xact_lock(hashtextextended('release:'||p_candidate_id::text,0));select * into ev from public.release_events where event_key=p_event_key;if found then if ev.candidate_id<>p_candidate_id then raise exception 'event_key_conflict';end if;select * into c from public.release_candidates where id=p_candidate_id;return c;end if;select * into c from public.release_candidates where id=p_candidate_id for update;if not found then raise exception 'candidate_not_found';end if;if c.status in('approved','rejected','expired','cancelled') then raise exception 'candidate_terminal';end if;
 insert into public.release_changes(candidate_id,change_key,category,title,description,risk_level) values(c.id,p_change_key,p_category,p_title,p_description,p_risk_level);update public.release_candidates set status='draft',gate_snapshot=null,gate_hash=null,evaluated_at=null,change_set_hash=public.release_change_set_hash(c.id),updated_at=now() where id=c.id returning * into c;insert into public.release_events(event_key,candidate_id,event_type,actor_id,metadata) values(p_event_key,c.id,'evaluation_invalidated',p_actor_id,jsonb_build_object('reason','change_set_updated','change_key',p_change_key,'change_set_hash',c.change_set_hash));return c;end;$$;


ALTER FUNCTION "public"."add_release_change"("p_candidate_id" "uuid", "p_actor_id" "uuid", "p_change_key" "text", "p_category" "text", "p_title" "text", "p_description" "text", "p_risk_level" "text", "p_event_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_approve_communication_job"("p_job_id" "uuid", "p_actor" "uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare j public.communication_jobs%rowtype; begin if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'admin required';end if; select * into j from public.communication_jobs where id=p_job_id for update;if not found then return false;end if; if j.status<>'pending' then raise exception 'job cannot be approved';end if; if j.purpose='marketing' and not public.has_marketing_consent(j.recipient_email,'email') then raise exception 'marketing consent required';end if; update public.communication_jobs set approved_at=now(),approved_by=p_actor,updated_at=now() where id=j.id; insert into public.communication_job_events(job_id,actor_user_id,action,previous_status,new_status,previous_scheduled_at,new_scheduled_at,note) values(j.id,p_actor,'approve',j.status,j.status,j.scheduled_at,j.scheduled_at,left(p_note,1000));return true; end$$;


ALTER FUNCTION "public"."admin_approve_communication_job"("p_job_id" "uuid", "p_actor" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_approve_communication_job_v2"("p_instance_id" "uuid", "p_job_id" "uuid", "p_actor" "uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare j public.communication_jobs%rowtype;
begin
  if not public.can_manage_marketing(p_instance_id,p_actor) then raise exception 'marketing permission required'; end if;
  select * into j from public.communication_jobs where id=p_job_id and instance_id=p_instance_id for update;
  if not found then return false; end if;
  if j.status<>'pending' then raise exception 'job cannot be approved'; end if;
  if j.purpose='marketing' and not public.has_marketing_consent_v2(p_instance_id,j.recipient_email,'email') then raise exception 'marketing consent required'; end if;
  update public.communication_jobs set approved_at=now(),approved_by=p_actor,updated_at=now() where id=j.id and instance_id=p_instance_id;
  insert into public.communication_job_events(instance_id,job_id,actor_user_id,action,previous_status,new_status,previous_scheduled_at,new_scheduled_at,note)
    values(p_instance_id,j.id,p_actor,'approve',j.status,j.status,j.scheduled_at,j.scheduled_at,left(p_note,1000));
  return true;
end;
$$;


ALTER FUNCTION "public"."admin_approve_communication_job_v2"("p_instance_id" "uuid", "p_job_id" "uuid", "p_actor" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_block_communication_email"("p_email" "text", "p_actor" "uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare v_id uuid;v_email text:=lower(trim(p_email)); begin if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'admin required';end if; if v_email='' then raise exception 'email required';end if; select id into v_id from public.communication_suppressions where lower(email)=v_email and active=true order by created_at desc limit 1 for update; if v_id is null then insert into public.communication_suppressions(email,reason,source,note,active) values(v_email,'manual','admin',left(p_note,1000),true) returning id into v_id; end if; insert into public.communication_suppression_events(suppression_id,email,actor_user_id,action,reason,note) values(v_id,v_email,p_actor,'block','manual',left(p_note,1000)); return v_id; end$$;


ALTER FUNCTION "public"."admin_block_communication_email"("p_email" "text", "p_actor" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_block_communication_email_v2"("p_instance_id" "uuid", "p_email" "text", "p_actor" "uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_id uuid;v_email text:=lower(trim(p_email));
begin
  if not public.can_manage_marketing(p_instance_id,p_actor) then raise exception 'marketing permission required'; end if;
  if v_email='' then raise exception 'email required'; end if;
  select id into v_id from public.communication_suppressions where instance_id=p_instance_id and lower(email)=v_email and active=true
    order by created_at desc limit 1 for update;
  if v_id is null then
    insert into public.communication_suppressions(instance_id,email,reason,source,note,active)
    values(p_instance_id,v_email,'manual','admin',left(p_note,1000),true) returning id into v_id;
  end if;
  insert into public.communication_suppression_events(instance_id,suppression_id,email,actor_user_id,action,reason,note)
    values(p_instance_id,v_id,v_email,p_actor,'block','manual',left(p_note,1000));
  return v_id;
end;
$$;


ALTER FUNCTION "public"."admin_block_communication_email_v2"("p_instance_id" "uuid", "p_email" "text", "p_actor" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_manage_communication_job"("p_job_id" "uuid", "p_actor" "uuid", "p_action" "text", "p_scheduled_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_note" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare j public.communication_jobs%rowtype; v_status text; v_schedule timestamptz; begin if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'admin required'; end if; select * into j from public.communication_jobs where id=p_job_id for update; if not found then return false; end if; if p_action='cancel' then if j.status not in('pending','failed','blocked') then raise exception 'job cannot be cancelled'; end if; v_status='cancelled';v_schedule=j.scheduled_at; elsif p_action='reschedule' then if j.status not in('pending','failed','blocked') or p_scheduled_at is null then raise exception 'job cannot be rescheduled'; end if;v_status='pending';v_schedule=p_scheduled_at; elsif p_action='retry' then if j.status not in('failed','blocked') then raise exception 'job cannot be retried'; end if;v_status='pending';v_schedule=coalesce(p_scheduled_at,now()); elsif p_action='approve' then if j.status<>'pending' then raise exception 'job cannot be approved'; end if;v_status='pending';v_schedule=coalesce(p_scheduled_at,j.scheduled_at); else raise exception 'invalid action'; end if; update public.communication_jobs set status=v_status,scheduled_at=v_schedule,last_error=case when p_action in('retry','reschedule') then null else last_error end,claim_token=null,claimed_at=null,updated_at=now() where id=j.id; insert into public.communication_job_events(job_id,actor_user_id,action,previous_status,new_status,previous_scheduled_at,new_scheduled_at,note) values(j.id,p_actor,p_action,j.status,v_status,j.scheduled_at,v_schedule,left(p_note,1000)); return true; end$$;


ALTER FUNCTION "public"."admin_manage_communication_job"("p_job_id" "uuid", "p_actor" "uuid", "p_action" "text", "p_scheduled_at" timestamp with time zone, "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_manage_communication_job_v2"("p_instance_id" "uuid", "p_job_id" "uuid", "p_actor" "uuid", "p_action" "text", "p_scheduled_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_note" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare j public.communication_jobs%rowtype;v_status text;v_schedule timestamptz;
begin
  if not (public.can_manage_marketing(p_instance_id,p_actor) or public.can_manage_orders(p_instance_id,p_actor) or public.can_manage_support(p_instance_id,p_actor)) then raise exception 'store permission required'; end if;
  select * into j from public.communication_jobs where id=p_job_id and instance_id=p_instance_id for update;
  if not found then return false; end if;
  if p_action='cancel' then if j.status not in('pending','failed','blocked') then raise exception 'job cannot be cancelled';end if;v_status='cancelled';v_schedule=j.scheduled_at;
  elsif p_action='reschedule' then if j.status not in('pending','failed','blocked') or p_scheduled_at is null then raise exception 'job cannot be rescheduled';end if;v_status='pending';v_schedule=p_scheduled_at;
  elsif p_action='retry' then if j.status not in('failed','blocked') then raise exception 'job cannot be retried';end if;v_status='pending';v_schedule=coalesce(p_scheduled_at,now());
  elsif p_action='approve' then if j.status<>'pending' then raise exception 'job cannot be approved';end if;v_status='pending';v_schedule=coalesce(p_scheduled_at,j.scheduled_at);
  else raise exception 'invalid action';end if;
  update public.communication_jobs set status=v_status,scheduled_at=v_schedule,last_error=case when p_action in('retry','reschedule') then null else last_error end,
    claim_token=null,claimed_at=null,updated_at=now() where id=j.id and instance_id=p_instance_id;
  insert into public.communication_job_events(instance_id,job_id,actor_user_id,action,previous_status,new_status,previous_scheduled_at,new_scheduled_at,note)
    values(p_instance_id,j.id,p_actor,p_action,j.status,v_status,j.scheduled_at,v_schedule,left(p_note,1000));
  return true;
end;
$$;


ALTER FUNCTION "public"."admin_manage_communication_job_v2"("p_instance_id" "uuid", "p_job_id" "uuid", "p_actor" "uuid", "p_action" "text", "p_scheduled_at" timestamp with time zone, "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_manage_marketing_campaign"("p_campaign_id" "uuid", "p_actor" "uuid", "p_action" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare c public.marketing_campaigns%rowtype;r record;v_job uuid;v_queued integer:=0;begin if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'admin required';end if;select * into c from public.marketing_campaigns where id=p_campaign_id for update;if not found then raise exception 'campaign not found';end if; if p_action='submit_review' then if c.status<>'draft' then raise exception 'invalid state';end if;update public.marketing_campaigns set status='review',updated_at=now() where id=c.id; elsif p_action='approve' then if c.status<>'review' then raise exception 'invalid state';end if;update public.marketing_campaigns set status='approved',approved_by=p_actor,approved_at=now(),updated_at=now() where id=c.id; elsif p_action='queue' then if c.status<>'approved' then raise exception 'invalid state';end if; for r in select * from public.marketing_campaign_recipients where campaign_id=c.id and eligible=true and communication_job_id is null loop if public.has_marketing_consent(r.email,'email') and not public.is_communication_suppressed(r.email) then begin v_job:=public.enqueue_communication(r.email,r.user_id,'marketing',c.template_key,jsonb_build_object('customerName',coalesce(r.customer_name,''),'campaignId',c.id),concat('campaign:',c.id,':',lower(r.email)),coalesce(c.scheduled_at,now()));update public.marketing_campaign_recipients set communication_job_id=v_job where id=r.id;v_queued:=v_queued+1;exception when others then null;end; else update public.marketing_campaign_recipients set eligible=false,exclusion_reason='ELIGIBILITY_CHANGED_BEFORE_QUEUE' where id=r.id;end if; end loop;update public.marketing_campaigns set status='queued',updated_at=now() where id=c.id; elsif p_action='cancel' then if c.status in('queued','completed','cancelled') then raise exception 'invalid state';end if;update public.marketing_campaigns set status='cancelled',updated_at=now() where id=c.id; else raise exception 'invalid action';end if; insert into public.marketing_campaign_events(campaign_id,actor_user_id,action,note) values(c.id,p_actor,p_action,left(p_note,1000));return jsonb_build_object('ok',true,'queued',v_queued);end$$;


ALTER FUNCTION "public"."admin_manage_marketing_campaign"("p_campaign_id" "uuid", "p_actor" "uuid", "p_action" "text", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_manage_marketing_campaign_v2"("p_instance_id" "uuid", "p_campaign_id" "uuid", "p_actor" "uuid", "p_action" "text", "p_note" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  c public.marketing_campaigns%rowtype;
  r record;
  v_job uuid;
  v_queued integer:=0;
begin
  if not public.can_manage_marketing(p_instance_id,p_actor)
     and not public.is_platform_operator(p_actor) then
    raise exception 'admin required';
  end if;

  select * into c
  from public.marketing_campaigns
  where id=p_campaign_id and instance_id=p_instance_id
  for update;

  if not found then raise exception 'campaign not found in webshop'; end if;

  if p_action='submit_review' then
    if c.status<>'draft' then raise exception 'invalid state'; end if;
    update public.marketing_campaigns
      set status='review',updated_at=now()
      where id=c.id and instance_id=p_instance_id;

  elsif p_action='approve' then
    if c.status<>'review' then raise exception 'invalid state'; end if;
    update public.marketing_campaigns
      set status='approved',approved_by=p_actor,approved_at=now(),updated_at=now()
      where id=c.id and instance_id=p_instance_id;

  elsif p_action='queue' then
    if c.status<>'approved' then raise exception 'invalid state'; end if;

    for r in
      select *
      from public.marketing_campaign_recipients
      where instance_id=p_instance_id
        and campaign_id=c.id
        and eligible=true
        and communication_job_id is null
    loop
      if public.has_marketing_consent_v2(p_instance_id,r.email,'email')
         and not public.is_communication_suppressed_v2(p_instance_id,r.email) then
        begin
          v_job:=public.enqueue_communication_v2(
            p_instance_id,
            r.email,
            r.user_id,
            'marketing',
            c.template_key,
            jsonb_build_object('customerName',coalesce(r.customer_name,''),'campaignId',c.id),
            concat('campaign:',p_instance_id,':',c.id,':',lower(r.email)),
            coalesce(c.scheduled_at,now())
          );
          update public.marketing_campaign_recipients
            set communication_job_id=v_job
            where id=r.id and instance_id=p_instance_id;
          v_queued:=v_queued+1;
        exception when others then
          null;
        end;
      else
        update public.marketing_campaign_recipients
          set eligible=false,exclusion_reason='ELIGIBILITY_CHANGED_BEFORE_QUEUE'
          where id=r.id and instance_id=p_instance_id;
      end if;
    end loop;

    update public.marketing_campaigns
      set status='queued',updated_at=now()
      where id=c.id and instance_id=p_instance_id;

  elsif p_action='cancel' then
    if c.status in('queued','completed','cancelled') then raise exception 'invalid state'; end if;
    update public.marketing_campaigns
      set status='cancelled',updated_at=now()
      where id=c.id and instance_id=p_instance_id;
  else
    raise exception 'invalid action';
  end if;

  insert into public.marketing_campaign_events(
    instance_id,campaign_id,actor_user_id,action,note
  ) values(
    p_instance_id,c.id,p_actor,p_action,left(p_note,1000)
  );

  return jsonb_build_object('ok',true,'queued',v_queued);
end;
$$;


ALTER FUNCTION "public"."admin_manage_marketing_campaign_v2"("p_instance_id" "uuid", "p_campaign_id" "uuid", "p_actor" "uuid", "p_action" "text", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_release_communication_suppression"("p_suppression_id" "uuid", "p_actor" "uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare s public.communication_suppressions%rowtype; begin if not exists(select 1 from public.profiles where id=p_actor and role='admin') then raise exception 'admin required';end if; select * into s from public.communication_suppressions where id=p_suppression_id for update;if not found then return false;end if; if not s.active then return true;end if; update public.communication_suppressions set active=false,released_at=now(),released_by=p_actor where id=s.id; insert into public.communication_suppression_events(suppression_id,email,actor_user_id,action,reason,note) values(s.id,s.email,p_actor,'release',s.reason,left(p_note,1000)); return true; end$$;


ALTER FUNCTION "public"."admin_release_communication_suppression"("p_suppression_id" "uuid", "p_actor" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_release_communication_suppression_v2"("p_instance_id" "uuid", "p_suppression_id" "uuid", "p_actor" "uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare s public.communication_suppressions%rowtype;
begin
  if not public.can_manage_marketing(p_instance_id,p_actor) then raise exception 'marketing permission required'; end if;
  select * into s from public.communication_suppressions where id=p_suppression_id and instance_id=p_instance_id for update;
  if not found then return false; end if;
  if not s.active then return true; end if;
  update public.communication_suppressions set active=false,released_at=now(),released_by=p_actor where id=s.id and instance_id=p_instance_id;
  insert into public.communication_suppression_events(instance_id,suppression_id,email,actor_user_id,action,reason,note)
    values(p_instance_id,s.id,s.email,p_actor,'release',s.reason,left(p_note,1000));
  return true;
end;
$$;


ALTER FUNCTION "public"."admin_release_communication_suppression_v2"("p_instance_id" "uuid", "p_suppression_id" "uuid", "p_actor" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."allow_stock_notification_request"("p_email" "text", "p_ip" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare normalized_email text:=lower(trim(coalesce(p_email,''))); normalized_ip text:=left(trim(coalesce(p_ip,'unknown')),100); email_count integer; ip_count integer;
begin
 if normalized_email='' or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then return false; end if;
 select count(*) into email_count from private.stock_notification_rate_limits where email=normalized_email and requested_at>now()-interval '1 hour';
 select count(*) into ip_count from private.stock_notification_rate_limits where ip=normalized_ip and requested_at>now()-interval '1 hour';
 if email_count>=3 or ip_count>=12 then return false; end if;
 insert into private.stock_notification_rate_limits(email,ip) values(normalized_email,normalized_ip);
 return true;
end;$_$;


ALTER FUNCTION "public"."allow_stock_notification_request"("p_email" "text", "p_ip" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_checkout_instance_context"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare raw_instance text;ctx uuid;
begin
  if new.instance_id is not null then return new; end if;
  raw_instance:=current_setting('shoperation.instance_id',true);
  if nullif(raw_instance,'') is null then
    raise exception 'Order insert blocked: explicit webshop tenant context is required.';
  end if;
  begin ctx:=raw_instance::uuid; exception when others then raise exception 'Order insert blocked: invalid webshop tenant context.'; end;
  if not exists(select 1 from public.webshop_instances w where w.id=ctx and w.status in('pilot','active')) then
    raise exception 'Order insert blocked: webshop tenant context is not active.';
  end if;
  new.instance_id:=ctx;
  return new;
end $$;


ALTER FUNCTION "public"."apply_checkout_instance_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_loyalty_tier_bonus_points"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_count integer:=0;v_cutover timestamptz;begin
 select tier_bonus_cutover_at into v_cutover from public.loyalty_program_settings where singleton=true;
 insert into public.loyalty_ledger(customer_id,event_key,entry_type,points,order_id,reason,metadata,occurred_at)
 select e.customer_id,'tier-bonus:'||e.order_id::text,'earn',greatest(1,round(e.points*(case p.value_tier when 'silver' then 0.10 when 'gold' then 0.25 when 'platinum' then 0.50 else 0 end))::integer),e.order_id,
        'Hűségszint alapján jóváírt extra pont',jsonb_build_object('base_event_key',e.event_key,'tier_at_bonus',p.value_tier,'base_points',e.points,'multiplier',case p.value_tier when 'silver' then 1.10 when 'gold' then 1.25 when 'platinum' then 1.50 else 1 end),now()
 from public.loyalty_ledger e
 join public.customer_value_profiles p on p.customer_id=e.customer_id
 join public.orders o on o.id=e.order_id
 where e.entry_type='earn' and e.event_key like 'order-earn:%' and e.order_id is not null and e.occurred_at>=v_cutover
   and p.value_tier in ('silver','gold','platinum') and o.status in ('paid','processing','shipped','completed')
   and not exists(select 1 from public.loyalty_ledger r where r.reverses_entry_id=e.id and r.entry_type='reversal')
   and not exists(select 1 from public.return_cases rc where rc.order_id=o.id group by rc.order_id having coalesce(sum(rc.refund_amount_gross_huf) filter(where rc.status='refunded'),0)>=o.total_gross_huf)
 on conflict(event_key) do nothing;
 get diagnostics v_count=row_count; return v_count;
end;$$;


ALTER FUNCTION "public"."apply_loyalty_tier_bonus_points"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."commercial_offers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "opportunity_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "discount_percent" numeric(5,2) DEFAULT 0 NOT NULL,
    "minimum_margin_percent" numeric(5,2) DEFAULT 20 NOT NULL,
    "net_price_before_huf" numeric(14,2),
    "net_price_after_huf" numeric(14,2),
    "unit_cost_net_huf" numeric(14,2),
    "margin_net_huf" numeric(14,2),
    "margin_percent" numeric(8,2),
    "total_net_huf" numeric(14,2),
    "approved_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "commercial_offers_discount_percent_check" CHECK ((("discount_percent" >= (0)::numeric) AND ("discount_percent" <= (100)::numeric))),
    CONSTRAINT "commercial_offers_minimum_margin_percent_check" CHECK ((("minimum_margin_percent" >= (0)::numeric) AND ("minimum_margin_percent" <= (100)::numeric))),
    CONSTRAINT "commercial_offers_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "commercial_offers_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'approved'::"text", 'sent'::"text", 'accepted'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."commercial_offers" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_commercial_offer"("p_offer_id" "uuid") RETURNS "public"."commercial_offers"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_offer public.commercial_offers;
  v_preview jsonb;
begin
  select * into v_offer from public.commercial_offers where id=p_offer_id for update;
  if not found then raise exception 'offer_not_found'; end if;
  if v_offer.status <> 'draft' then raise exception 'offer_not_draft'; end if;
  select public.preview_promotion_margin(v_offer.variant_id,v_offer.discount_percent,v_offer.minimum_margin_percent) into v_preview;
  if coalesce((v_preview->>'safe')::boolean,false) is not true then raise exception 'margin_guard_failed'; end if;
  update public.commercial_offers set
    status='approved',
    net_price_before_huf=(v_preview->>'netPriceBefore')::numeric,
    net_price_after_huf=(v_preview->>'netPriceAfter')::numeric,
    unit_cost_net_huf=(v_preview->>'unitCostNet')::numeric,
    margin_net_huf=(v_preview->>'marginNet')::numeric,
    margin_percent=(v_preview->>'marginPercent')::numeric,
    total_net_huf=((v_preview->>'netPriceAfter')::numeric * quantity),
    approved_at=now(),updated_at=now()
  where id=p_offer_id returning * into v_offer;
  return v_offer;
end;
$$;


ALTER FUNCTION "public"."approve_commercial_offer"("p_offer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_commercial_offer_v2"("p_instance_id" "uuid", "p_offer_id" "uuid") RETURNS "public"."commercial_offers"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_offer public.commercial_offers;v_preview jsonb;
begin
 select * into v_offer from public.commercial_offers where id=p_offer_id and instance_id=p_instance_id for update;
 if not found then raise exception 'offer_not_found';end if;
 if v_offer.status<>'draft' then raise exception 'offer_not_draft';end if;
 perform 1 from public.product_variants where id=v_offer.variant_id and instance_id=p_instance_id;if not found then raise exception 'variant_not_found';end if;
 select public.preview_promotion_margin(v_offer.variant_id,v_offer.discount_percent,v_offer.minimum_margin_percent) into v_preview;
 if coalesce((v_preview->>'safe')::boolean,false) is not true then raise exception 'margin_guard_failed';end if;
 update public.commercial_offers set status='approved',net_price_before_huf=(v_preview->>'netPriceBefore')::numeric,net_price_after_huf=(v_preview->>'netPriceAfter')::numeric,unit_cost_net_huf=(v_preview->>'unitCostNet')::numeric,margin_net_huf=(v_preview->>'marginNet')::numeric,margin_percent=(v_preview->>'marginPercent')::numeric,total_net_huf=((v_preview->>'netPriceAfter')::numeric*quantity),approved_at=now(),updated_at=now() where id=p_offer_id and instance_id=p_instance_id returning * into v_offer;
 return v_offer;
end$$;


ALTER FUNCTION "public"."approve_commercial_offer_v2"("p_instance_id" "uuid", "p_offer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."automation_child_store_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$ declare v uuid; begin select instance_id into v from public.automation_runbook_instances where id=new.instance_id; if v is null then raise exception 'tenant_parent_missing';end if;if new.store_instance_id is null then new.store_instance_id:=v;elsif new.store_instance_id<>v then raise exception 'tenant_parent_mismatch';end if;return new;end$$;


ALTER FUNCTION "public"."automation_child_store_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."block_post_release_immutable_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  raise exception 'Append-only V18 rekord nem módosítható.';
end;
$$;


ALTER FUNCTION "public"."block_post_release_immutable_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."block_rollout_ledger_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin raise exception 'Rollout evidence és döntés append-only.';end;$$;


ALTER FUNCTION "public"."block_rollout_ledger_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bulk_update_product_variants"("p_changes" "jsonb", "p_actor" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  item jsonb;
  variant_id uuid;
  current_row public.product_variants%rowtype;
  new_stock integer;
  new_gross integer;
  new_net integer;
  new_active boolean;
  results jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_changes) <> 'array' then
    raise exception 'p_changes must be an array';
  end if;
  if jsonb_array_length(p_changes) > 500 then
    raise exception 'too many changes';
  end if;

  for item in select value from jsonb_array_elements(p_changes)
  loop
    variant_id := (item->>'id')::uuid;
    select * into current_row from public.product_variants where id = variant_id for update;
    if not found then raise exception 'variant not found: %', variant_id; end if;

    new_stock := case when item ? 'stock' then (item->>'stock')::integer else current_row.stock_quantity end;
    new_gross := case when item ? 'grossPrice' then (item->>'grossPrice')::integer else current_row.gross_price_huf end;
    new_net := case when item ? 'netPrice' then (item->>'netPrice')::integer else current_row.net_price_huf end;
    new_active := case when item ? 'active' then (item->>'active')::boolean else current_row.active end;

    if new_stock < 0 or new_stock > 100000 then raise exception 'invalid stock for %', variant_id; end if;
    if new_gross < 0 or new_gross > 10000000 then raise exception 'invalid gross price for %', variant_id; end if;
    if new_net < 0 or new_net > 10000000 then raise exception 'invalid net price for %', variant_id; end if;

    update public.product_variants
      set stock_quantity = new_stock,
          gross_price_huf = new_gross,
          net_price_huf = new_net,
          active = new_active,
          updated_at = now()
      where id = variant_id;

    if new_stock <> current_row.stock_quantity then
      insert into public.inventory_events(variant_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata)
      values(variant_id,new_stock-current_row.stock_quantity,current_row.stock_quantity,new_stock,'bulk_admin_adjustment',p_actor,jsonb_build_object('sku',current_row.sku));
    end if;

    results := results || jsonb_build_array(jsonb_build_object(
      'id', variant_id,
      'sku', current_row.sku,
      'before', jsonb_build_object('stock',current_row.stock_quantity,'grossPrice',current_row.gross_price_huf,'netPrice',current_row.net_price_huf,'active',current_row.active),
      'after', jsonb_build_object('stock',new_stock,'grossPrice',new_gross,'netPrice',new_net,'active',new_active)
    ));
  end loop;

  return results;
end;
$$;


ALTER FUNCTION "public"."bulk_update_product_variants"("p_changes" "jsonb", "p_actor" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_catalog"("p_instance_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','catalog_manager'],p_user_id);$$;


ALTER FUNCTION "public"."can_manage_catalog"("p_instance_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_loyalty"("p_instance_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','marketing_manager'],p_user_id);$$;


ALTER FUNCTION "public"."can_manage_loyalty"("p_instance_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_marketing"("p_instance_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','marketing_manager'],p_user_id);$$;


ALTER FUNCTION "public"."can_manage_marketing"("p_instance_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_orders"("p_instance_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','order_manager'],p_user_id);$$;


ALTER FUNCTION "public"."can_manage_orders"("p_instance_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_procurement"("p_instance_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','catalog_manager'],p_user_id);$$;


ALTER FUNCTION "public"."can_manage_procurement"("p_instance_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_sales"("p_instance_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','marketing_manager'],p_user_id);$$;


ALTER FUNCTION "public"."can_manage_sales"("p_instance_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_support"("p_instance_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','order_manager','support'],p_user_id);$$;


ALTER FUNCTION "public"."can_manage_support"("p_instance_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_read_loyalty"("p_instance_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','marketing_manager','analyst'],p_user_id);$$;


ALTER FUNCTION "public"."can_read_loyalty"("p_instance_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_read_store"("p_instance_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','catalog_manager','order_manager','marketing_manager','support','analyst','viewer'],p_user_id);$$;


ALTER FUNCTION "public"."can_read_store"("p_instance_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_read_store"("p_instance_id" "uuid", "p_user_id" "uuid") IS 'Tenant-aware RBAC helper used by strict commerce RLS.';



CREATE OR REPLACE FUNCTION "public"."cancel_release_candidate"("p_candidate_id" "uuid", "p_actor_id" "uuid", "p_reason" "text", "p_event_key" "text") RETURNS "public"."release_candidates"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare c public.release_candidates;ev public.release_events;begin if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('release:'||p_candidate_id::text,0));select * into ev from public.release_events where event_key=p_event_key;if found then if ev.candidate_id<>p_candidate_id then raise exception 'event_key_conflict';end if;select * into c from public.release_candidates where id=p_candidate_id;return c;end if;select * into c from public.release_candidates where id=p_candidate_id for update;if not found then raise exception 'candidate_not_found';end if;if c.status in('approved','rejected','expired','cancelled') then raise exception 'candidate_terminal';end if;update public.release_candidates set status='cancelled',cancelled_at=now(),updated_at=now() where id=c.id returning * into c;insert into public.release_events(event_key,candidate_id,event_type,actor_id,metadata) values(p_event_key,c.id,'cancelled',p_actor_id,jsonb_build_object('reason',coalesce(nullif(trim(p_reason),''),'manual_cancel')));return c;end;$$;


ALTER FUNCTION "public"."cancel_release_candidate"("p_candidate_id" "uuid", "p_actor_id" "uuid", "p_reason" "text", "p_event_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_stale_automation_incidents"("p_run_key" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare i record;v_count integer:=0;begin
 for i in select ai.id,ai.alert_id,ai.source_snapshot,ca.incident_started_at from public.automation_runbook_instances ai join public.control_alerts ca on ca.id=ai.alert_id where ai.status in ('planned','active','paused') loop
   if not(i.source_snapshot ? 'incident_started_at') or (i.source_snapshot->>'incident_started_at')::timestamptz is distinct from i.incident_started_at then
     update public.automation_runbook_instances set status='cancelled',cancelled_at=now(),updated_at=now() where id=i.id;update public.automation_step_runs set status='cancelled',finished_at=coalesce(finished_at,now()),updated_at=now() where instance_id=i.id and status in ('pending','ready','failed');
     insert into public.automation_events(event_key,instance_id,event_type,metadata) values('incident-stale:'||p_run_key||':'||i.id::text,i.id,'cancelled',jsonb_build_object('reason','source_incident_changed')) on conflict(event_key) do nothing;v_count:=v_count+1;
   end if;
 end loop;return v_count;end;$$;


ALTER FUNCTION "public"."cancel_stale_automation_incidents"("p_run_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."capture_inventory_snapshot"("p_snapshot_date" "date" DEFAULT CURRENT_DATE) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare affected integer;
begin
 insert into public.inventory_snapshots(snapshot_date,variant_id,stock_quantity,unit_cost_net_huf,inventory_cost_net_huf,retail_net_price_huf,inventory_retail_net_huf,captured_at)
 select p_snapshot_date,pv.id,greatest(coalesce(pv.stock_quantity,0),0),pv.unit_cost_net_huf,case when pv.unit_cost_net_huf is null then null else greatest(coalesce(pv.stock_quantity,0),0)*pv.unit_cost_net_huf end,pv.net_price_huf,greatest(coalesce(pv.stock_quantity,0),0)*pv.net_price_huf,now() from public.product_variants pv
 on conflict(snapshot_date,variant_id) do update set stock_quantity=excluded.stock_quantity,unit_cost_net_huf=excluded.unit_cost_net_huf,inventory_cost_net_huf=excluded.inventory_cost_net_huf,retail_net_price_huf=excluded.retail_net_price_huf,inventory_retail_net_huf=excluded.inventory_retail_net_huf,captured_at=now();
 get diagnostics affected=row_count; return affected;
end;$$;


ALTER FUNCTION "public"."capture_inventory_snapshot"("p_snapshot_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."capture_order_coupon_redemption"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.instance_id is not null
     and nullif(trim(new.coupon_code),'') is not null
     and new.discount_gross_huf > 0
     and (tg_op='INSERT' or old.discount_gross_huf is distinct from new.discount_gross_huf or old.coupon_code is distinct from new.coupon_code)
  then
    perform public.record_coupon_redemption_v1(new.instance_id,new.id,new.coupon_code,new.discount_gross_huf);
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."capture_order_coupon_redemption"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."communication_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_email" "text" NOT NULL,
    "user_id" "uuid",
    "purpose" "text" NOT NULL,
    "template_key" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "idempotency_key" "text" NOT NULL,
    "scheduled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "provider_message_id" "text",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "claim_token" "uuid",
    "claimed_at" timestamp with time zone,
    "requires_approval" boolean DEFAULT true NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "communication_jobs_attempts_check" CHECK (("attempts" >= 0)),
    CONSTRAINT "communication_jobs_purpose_check" CHECK (("purpose" = ANY (ARRAY['transactional'::"text", 'marketing'::"text"]))),
    CONSTRAINT "communication_jobs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'sent'::"text", 'failed'::"text", 'blocked'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."communication_jobs" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_communication_jobs"("p_limit" integer DEFAULT 10) RETURNS SETOF "public"."communication_jobs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$begin return query with candidates as(select id from public.communication_jobs where status='pending' and scheduled_at<=now() and (requires_approval=false or approved_at is not null) order by scheduled_at,created_at for update skip locked limit greatest(1,least(p_limit,50))),claimed as(update public.communication_jobs j set status='processing',claim_token=gen_random_uuid(),claimed_at=now(),attempts=j.attempts+1,updated_at=now() from candidates c where j.id=c.id returning j.*) select * from claimed; end$$;


ALTER FUNCTION "public"."claim_communication_jobs"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_communication_jobs_v2"("p_instance_id" "uuid", "p_limit" integer DEFAULT 10) RETURNS SETOF "public"."communication_jobs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  return query with candidates as(
    select id from public.communication_jobs
    where instance_id=p_instance_id and status='pending' and scheduled_at<=now()
      and (requires_approval=false or approved_at is not null)
    order by scheduled_at,created_at for update skip locked limit greatest(1,least(p_limit,50))
  ),claimed as(
    update public.communication_jobs j set status='processing',claim_token=gen_random_uuid(),claimed_at=now(),attempts=j.attempts+1,updated_at=now()
    from candidates c where j.id=c.id and j.instance_id=p_instance_id returning j.*
  ) select * from claimed;
end;
$$;


ALTER FUNCTION "public"."claim_communication_jobs_v2"("p_instance_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_integration_job"("p_id" "uuid") RETURNS TABLE("id" "uuid", "processing_token" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$begin return query update public.integration_jobs j set status='processing',processing_token=gen_random_uuid(),updated_at=now(),next_attempt_at=null where j.id=p_id and (j.status in ('pending','failed','blocked') or (j.status='processing' and j.updated_at<=now()-interval '15 minutes')) returning j.id,j.processing_token; end;$$;


ALTER FUNCTION "public"."claim_integration_job"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_integration_job_v2"("p_instance_id" "uuid", "p_id" "uuid") RETURNS TABLE("id" "uuid", "instance_id" "uuid", "processing_token" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if p_instance_id is null then raise exception 'instance_required'; end if;
  return query
  update public.integration_jobs j
  set status='processing',
      processing_token=gen_random_uuid(),
      updated_at=now(),
      next_attempt_at=null
  where j.id=p_id
    and j.instance_id=p_instance_id
    and (
      j.status in('pending','failed','blocked')
      or (j.status='processing' and j.updated_at<=now()-interval '15 minutes')
    )
  returning j.id,j.instance_id,j.processing_token;
end;
$$;


ALTER FUNCTION "public"."claim_integration_job_v2"("p_instance_id" "uuid", "p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_integration_jobs"("p_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "processing_token" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$begin return query with picked as (select j.id from public.integration_jobs j where (j.status='pending' or (j.status='failed' and j.next_attempt_at is not null and j.next_attempt_at<=now()) or (j.status='processing' and j.updated_at<=now()-interval '15 minutes')) order by j.created_at for update skip locked limit greatest(1,least(coalesce(p_limit,10),50))), claimed as (update public.integration_jobs j set status='processing',processing_token=gen_random_uuid(),updated_at=now() from picked where j.id=picked.id returning j.id,j.processing_token) select claimed.id,claimed.processing_token from claimed; end;$$;


ALTER FUNCTION "public"."claim_integration_jobs"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_communication_job"("p_id" "uuid", "p_claim_token" "uuid", "p_provider_message_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$begin update public.communication_jobs set status='sent',provider_message_id=p_provider_message_id,sent_at=now(),claim_token=null,claimed_at=null,last_error=null,updated_at=now() where id=p_id and status='processing' and claim_token=p_claim_token; return found; end$$;


ALTER FUNCTION "public"."complete_communication_job"("p_id" "uuid", "p_claim_token" "uuid", "p_provider_message_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_communication_job_v2"("p_instance_id" "uuid", "p_id" "uuid", "p_claim_token" "uuid", "p_provider_message_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  update public.communication_jobs set status='sent',provider_message_id=p_provider_message_id,sent_at=now(),claim_token=null,claimed_at=null,last_error=null,updated_at=now()
  where instance_id=p_instance_id and id=p_id and status='processing' and claim_token=p_claim_token;
  return found;
end;
$$;


ALTER FUNCTION "public"."complete_communication_job_v2"("p_instance_id" "uuid", "p_id" "uuid", "p_claim_token" "uuid", "p_provider_message_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_admin_audit_hash"("p_chain_seq" bigint, "p_audit_scope" "text", "p_prev_hash" "text", "p_actor_user_id" "uuid", "p_actor_roles" "text"[], "p_action" "text", "p_entity_type" "text", "p_entity_id" "text", "p_summary" "text", "p_before_state" "jsonb", "p_after_state" "jsonb", "p_metadata" "jsonb", "p_created_at" timestamp with time zone) RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public', 'extensions'
    AS $$
  select encode(extensions.digest(convert_to(jsonb_build_object(
    'chain_seq',p_chain_seq,'audit_scope',p_audit_scope,'prev_hash',p_prev_hash,'actor_user_id',p_actor_user_id,
    'actor_roles',coalesce(p_actor_roles,'{}'::text[]),'action',p_action,'entity_type',p_entity_type,'entity_id',p_entity_id,
    'summary',p_summary,'before_state',p_before_state,'after_state',p_after_state,'metadata',coalesce(p_metadata,'{}'::jsonb),
    'created_at',p_created_at
  )::text,'UTF8'),'sha256'),'hex');
$$;


ALTER FUNCTION "public"."compute_admin_audit_hash"("p_chain_seq" bigint, "p_audit_scope" "text", "p_prev_hash" "text", "p_actor_user_id" "uuid", "p_actor_roles" "text"[], "p_action" "text", "p_entity_type" "text", "p_entity_id" "text", "p_summary" "text", "p_before_state" "jsonb", "p_after_state" "jsonb", "p_metadata" "jsonb", "p_created_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consume_security_rate_limit"("p_rate_key" "text", "p_window_seconds" integer, "p_max_count" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare r public.security_rate_limits;now_ts timestamptz:=now();begin if nullif(trim(p_rate_key),'') is null or p_window_seconds<1 or p_window_seconds>3600 or p_max_count<1 or p_max_count>10000 then raise exception 'invalid_rate_limit';end if;perform pg_advisory_xact_lock(hashtextextended('rate:'||p_rate_key,0));select * into r from public.security_rate_limits where rate_key=p_rate_key for update;if not found or r.window_started_at<=now_ts-make_interval(secs=>p_window_seconds) then insert into public.security_rate_limits(rate_key,window_started_at,count,updated_at) values(p_rate_key,now_ts,1,now_ts) on conflict(rate_key) do update set window_started_at=excluded.window_started_at,count=1,updated_at=excluded.updated_at;return true;end if;if r.count>=p_max_count then return false;end if;update public.security_rate_limits set count=count+1,updated_at=now_ts where rate_key=p_rate_key;return true;end;$$;


ALTER FUNCTION "public"."consume_security_rate_limit"("p_rate_key" "text", "p_window_seconds" integer, "p_max_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."convert_checkout_recovery_intent"("p_user_id" "uuid", "p_order_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$begin update public.checkout_recovery_intents set status='converted',converted_order_id=p_order_id,updated_at=now() where user_id=p_user_id and status='open'; return found;end;$$;


ALTER FUNCTION "public"."convert_checkout_recovery_intent"("p_user_id" "uuid", "p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."convert_checkout_recovery_intent_v2"("p_instance_id" "uuid", "p_user_id" "uuid", "p_order_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform 1 from public.orders where id=p_order_id and instance_id=p_instance_id and customer_id=p_user_id;
  if not found then return false; end if;
  update public.checkout_recovery_intents set status='converted',converted_order_id=p_order_id,updated_at=now()
    where instance_id=p_instance_id and user_id=p_user_id and status='open';
  return found;
end;
$$;


ALTER FUNCTION "public"."convert_checkout_recovery_intent_v2"("p_instance_id" "uuid", "p_user_id" "uuid", "p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_commercial_offer"("p_opportunity_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_discount_percent" numeric, "p_minimum_margin_percent" numeric, "p_created_by" "uuid") RETURNS "public"."commercial_offers"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_opp public.commercial_opportunities; v public.commercial_offers;begin
 if p_quantity<=0 then raise exception 'invalid_quantity'; end if;
 if p_discount_percent<0 or p_discount_percent>100 then raise exception 'invalid_discount'; end if;
 if p_minimum_margin_percent<0 or p_minimum_margin_percent>100 then raise exception 'invalid_minimum_margin'; end if;
 select * into v_opp from public.commercial_opportunities where id=p_opportunity_id for update;
 if not found then raise exception 'opportunity_not_found'; end if;
 if v_opp.status not in ('open','in_progress') then raise exception 'opportunity_closed'; end if;
 insert into public.commercial_offers(opportunity_id,variant_id,quantity,discount_percent,minimum_margin_percent,created_by)
 values(p_opportunity_id,p_variant_id,p_quantity,p_discount_percent,p_minimum_margin_percent,p_created_by)
 returning * into v;
 update public.commercial_opportunities set status='in_progress',updated_at=now() where id=p_opportunity_id and status='open';
 return v;
end;$$;


ALTER FUNCTION "public"."create_commercial_offer"("p_opportunity_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_discount_percent" numeric, "p_minimum_margin_percent" numeric, "p_created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_commercial_offer_v2"("p_instance_id" "uuid", "p_opportunity_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_discount_percent" numeric, "p_minimum_margin_percent" numeric, "p_created_by" "uuid") RETURNS "public"."commercial_offers"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$declare v public.commercial_offers;begin perform 1 from public.commercial_opportunities where id=p_opportunity_id and instance_id=p_instance_id and status in('open','in_progress');if not found then raise exception 'opportunity_not_found';end if;perform 1 from public.product_variants where id=p_variant_id and instance_id=p_instance_id;if not found then raise exception 'variant_not_found';end if;insert into public.commercial_offers(instance_id,opportunity_id,variant_id,quantity,discount_percent,minimum_margin_percent,created_by) values(p_instance_id,p_opportunity_id,p_variant_id,p_quantity,p_discount_percent,p_minimum_margin_percent,p_created_by) returning * into v;update public.commercial_opportunities set status='in_progress',updated_at=now() where id=p_opportunity_id and instance_id=p_instance_id and status='open';return v;end$$;


ALTER FUNCTION "public"."create_commercial_offer_v2"("p_instance_id" "uuid", "p_opportunity_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_discount_percent" numeric, "p_minimum_margin_percent" numeric, "p_created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_customer_journey"("p_kind" "public"."customer_journey_kind", "p_user_id" "uuid", "p_email" "text", "p_source_key" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_id uuid;begin
  if length(trim(p_email))<5 or length(trim(p_source_key))<3 then raise exception 'invalid journey identity'; end if;
  insert into public.customer_journeys(kind,user_id,email,source_key,metadata)
  values(p_kind,p_user_id,lower(trim(p_email)),trim(p_source_key),coalesce(p_metadata,'{}'::jsonb))
  on conflict(kind,source_key) do update set updated_at=now()
  returning id into v_id;
  return v_id;
end;$$;


ALTER FUNCTION "public"."create_customer_journey"("p_kind" "public"."customer_journey_kind", "p_user_id" "uuid", "p_email" "text", "p_source_key" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_customer_journey_v2"("p_instance_id" "uuid", "p_kind" "public"."customer_journey_kind", "p_user_id" "uuid", "p_email" "text", "p_source_key" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_id uuid;
begin
  if p_instance_id is null then raise exception 'instance_required'; end if;
  if length(trim(p_email))<5 or length(trim(p_source_key))<3 then raise exception 'invalid journey identity'; end if;
  if not exists(select 1 from public.webshop_instances w where w.id=p_instance_id and w.status in('pilot','active')) then
    raise exception 'inactive webshop';
  end if;

  insert into public.customer_journeys(instance_id,kind,user_id,email,source_key,metadata)
  values(p_instance_id,p_kind,p_user_id,lower(trim(p_email)),trim(p_source_key),coalesce(p_metadata,'{}'::jsonb))
  on conflict(instance_id,kind,source_key)
  do update set updated_at=now(),metadata=excluded.metadata
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."create_customer_journey_v2"("p_instance_id" "uuid", "p_kind" "public"."customer_journey_kind", "p_user_id" "uuid", "p_email" "text", "p_source_key" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_purchase_order"("p_order_number" "text", "p_supplier_name" "text", "p_payment_terms_days" integer, "p_expected_at" "date", "p_payment_due_at" "date", "p_notes" "text", "p_created_by" "uuid", "p_items" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_supplier_id uuid;
  v_supplier_name text;
  v_id uuid;
  v_total numeric(14,2);
  v_item jsonb;
  v_variant uuid;
  v_quantity integer;
  v_cost numeric(12,2);
begin
  v_supplier_name := trim(p_supplier_name);
  if length(v_supplier_name) < 2 then raise exception 'Érvénytelen beszállítónév.'; end if;
  if p_payment_terms_days < 0 or p_payment_terms_days > 365 then raise exception 'Érvénytelen fizetési határidő.'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then raise exception 'A beszerzéshez legalább egy tétel szükséges.'; end if;

  select id into v_supplier_id from public.suppliers where lower(trim(name))=lower(v_supplier_name) limit 1;
  if v_supplier_id is null then
    insert into public.suppliers(name,payment_terms_days)
    values(v_supplier_name,p_payment_terms_days)
    on conflict ((lower(trim(name)))) do update set updated_at=now()
    returning id into v_supplier_id;
  end if;

  select coalesce(sum((x->>'quantity')::integer * (x->>'unitCostNetHuf')::numeric),0)
  into v_total from jsonb_array_elements(p_items) x;
  if v_total < 0 then raise exception 'Érvénytelen beszerzési összeg.'; end if;

  insert into public.purchase_orders(order_number,supplier_id,status,expected_at,payment_due_at,net_total_huf,notes,created_by)
  values(p_order_number,v_supplier_id,'draft',p_expected_at,p_payment_due_at,v_total,p_notes,p_created_by)
  returning id into v_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_variant := (v_item->>'variantId')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    v_cost := (v_item->>'unitCostNetHuf')::numeric;
    if v_quantity <= 0 or v_cost < 0 then raise exception 'Érvénytelen beszerzési tétel.'; end if;
    perform 1 from public.product_variants where id=v_variant;
    if not found then raise exception 'A beszerzési termékváltozat nem található.'; end if;
    insert into public.purchase_order_items(purchase_order_id,variant_id,quantity,unit_cost_net_huf)
    values(v_id,v_variant,v_quantity,v_cost);
  end loop;

  return jsonb_build_object('id',v_id,'supplierId',v_supplier_id,'supplierName',v_supplier_name,'netTotal',v_total);
end;$$;


ALTER FUNCTION "public"."create_purchase_order"("p_order_number" "text", "p_supplier_name" "text", "p_payment_terms_days" integer, "p_expected_at" "date", "p_payment_due_at" "date", "p_notes" "text", "p_created_by" "uuid", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_purchase_order_v2"("p_instance_id" "uuid", "p_order_number" "text", "p_supplier_name" "text", "p_payment_terms_days" integer, "p_expected_at" "date", "p_payment_due_at" "date", "p_notes" "text", "p_created_by" "uuid", "p_items" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_supplier_id uuid;v_supplier_name text;v_id uuid;v_total numeric(14,2);v_item jsonb;v_variant uuid;v_quantity integer;v_cost numeric(12,2);
begin
  if not exists(select 1 from public.webshop_instances where id=p_instance_id) then raise exception 'Érvénytelen webshop.'; end if;
  v_supplier_name:=trim(p_supplier_name);
  if length(v_supplier_name)<2 then raise exception 'Érvénytelen beszállítónév.'; end if;
  if p_payment_terms_days<0 or p_payment_terms_days>365 then raise exception 'Érvénytelen fizetési határidő.'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'A beszerzéshez legalább egy tétel szükséges.'; end if;
  select id into v_supplier_id from public.suppliers where instance_id=p_instance_id and lower(trim(name))=lower(v_supplier_name) limit 1;
  if v_supplier_id is null then
    insert into public.suppliers(instance_id,name,payment_terms_days) values(p_instance_id,v_supplier_name,p_payment_terms_days)
    on conflict(instance_id,lower(trim(name))) do update set updated_at=now() returning id into v_supplier_id;
  end if;
  select coalesce(sum((x->>'quantity')::integer*(x->>'unitCostNetHuf')::numeric),0) into v_total from jsonb_array_elements(p_items)x;
  if v_total<0 then raise exception 'Érvénytelen beszerzési összeg.'; end if;
  insert into public.purchase_orders(instance_id,order_number,supplier_id,status,expected_at,payment_due_at,net_total_huf,notes,created_by)
  values(p_instance_id,p_order_number,v_supplier_id,'draft',p_expected_at,p_payment_due_at,v_total,p_notes,p_created_by) returning id into v_id;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_variant:=(v_item->>'variantId')::uuid;v_quantity:=(v_item->>'quantity')::integer;v_cost:=(v_item->>'unitCostNetHuf')::numeric;
    if v_quantity<=0 or v_cost<0 then raise exception 'Érvénytelen beszerzési tétel.'; end if;
    perform 1 from public.product_variants where id=v_variant and instance_id=p_instance_id;
    if not found then raise exception 'A beszerzési termékváltozat nem ehhez a webshophoz tartozik.'; end if;
    insert into public.purchase_order_items(instance_id,purchase_order_id,variant_id,quantity,unit_cost_net_huf) values(p_instance_id,v_id,v_variant,v_quantity,v_cost);
  end loop;
  return jsonb_build_object('id',v_id,'supplierId',v_supplier_id,'supplierName',v_supplier_name,'netTotal',v_total);
end $$;


ALTER FUNCTION "public"."create_purchase_order_v2"("p_instance_id" "uuid", "p_order_number" "text", "p_supplier_name" "text", "p_payment_terms_days" integer, "p_expected_at" "date", "p_payment_due_at" "date", "p_notes" "text", "p_created_by" "uuid", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_release_candidate"("p_candidate_key" "text", "p_version_label" "text", "p_source_ref" "text", "p_source_sha" "text", "p_risk_class" "text", "p_change_summary" "text", "p_rollback_plan" "text", "p_created_by" "uuid", "p_event_key" "text") RETURNS "public"."release_candidates"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare c public.release_candidates;pol public.release_policies;ev public.release_events;begin
 if nullif(trim(p_candidate_key),'') is null or nullif(trim(p_source_sha),'') is null then raise exception 'candidate_identity_required';end if;select * into ev from public.release_events where event_key=p_event_key;if found then select * into c from public.release_candidates where id=ev.candidate_id;return c;end if;select distinct on(policy_key) * into pol from public.release_policies where enabled and risk_class=p_risk_class order by policy_key,version desc limit 1;if not found then raise exception 'release_policy_not_found';end if;
 insert into public.release_candidates(candidate_key,version_label,source_ref,source_sha,risk_class,change_summary,rollback_plan,policy_id,created_by,expires_at) values(p_candidate_key,p_version_label,p_source_ref,p_source_sha,p_risk_class,p_change_summary,p_rollback_plan,pol.id,p_created_by,now()+make_interval(mins=>pol.evaluation_valid_minutes)) returning * into c;
 insert into public.release_changes(candidate_id,change_key,category,title,description,risk_level) values(c.id,'initial','code','Kiadási változás',p_change_summary,case when p_risk_class='high_impact' then 'high' else 'medium' end);
 update public.release_candidates set change_set_hash=public.release_change_set_hash(c.id) where id=c.id returning * into c;insert into public.release_events(event_key,candidate_id,event_type,actor_id,metadata) values(p_event_key,c.id,'created',p_created_by,jsonb_build_object('source_ref',p_source_ref,'source_sha',p_source_sha,'policy_id',pol.id,'change_set_hash',c.change_set_hash));return c;end;$$;


ALTER FUNCTION "public"."create_release_candidate"("p_candidate_key" "text", "p_version_label" "text", "p_source_ref" "text", "p_source_sha" "text", "p_risk_class" "text", "p_change_summary" "text", "p_rollback_plan" "text", "p_created_by" "uuid", "p_event_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_return_case"("p_order_id" "uuid", "p_user_id" "uuid", "p_customer_email" "text", "p_reason" "text", "p_customer_note" "text", "p_items" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_case_id uuid;
  v_order record;
  v_item jsonb;
  v_order_item record;
  v_qty integer;
  v_open_case uuid;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then
    raise exception 'Legalább egy visszaküldendő tétel szükséges.';
  end if;

  select id,customer_id,customer_email,status into v_order
  from public.orders where id=p_order_id for update;
  if not found or v_order.customer_id is distinct from p_user_id then
    raise exception 'A rendelés nem található.';
  end if;
  if v_order.status not in ('shipped','completed') then
    raise exception 'Ehhez a rendeléshez jelenleg nem indítható visszaküldési kérelem.';
  end if;

  select id into v_open_case from public.return_cases
  where order_id=p_order_id and user_id=p_user_id
    and status in ('requested','approved','received','refund_pending')
  limit 1 for update;
  if v_open_case is not null then
    raise exception 'Ehhez a rendeléshez már van folyamatban lévő ügy.';
  end if;

  insert into public.return_cases(order_id,user_id,customer_email,reason,customer_note)
  values(p_order_id,p_user_id,coalesce(nullif(trim(p_customer_email),''),v_order.customer_email),p_reason,nullif(trim(p_customer_note),''))
  returning id into v_case_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty <= 0 then raise exception 'Érvénytelen visszaküldési mennyiség.'; end if;
    select id,order_id,quantity into v_order_item
    from public.order_items where id=(v_item->>'orderItemId')::uuid;
    if not found or v_order_item.order_id<>p_order_id or v_qty>v_order_item.quantity then
      raise exception 'Érvénytelen visszaküldési tétel vagy mennyiség.';
    end if;
    insert into public.return_case_items(return_case_id,order_item_id,quantity)
    values(v_case_id,v_order_item.id,v_qty);
  end loop;

  return v_case_id;
end;$$;


ALTER FUNCTION "public"."create_return_case"("p_order_id" "uuid", "p_user_id" "uuid", "p_customer_email" "text", "p_reason" "text", "p_customer_note" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_return_case_v2"("p_instance_id" "uuid", "p_order_id" "uuid", "p_user_id" "uuid", "p_customer_email" "text", "p_reason" "text", "p_customer_note" "text", "p_items" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_case_id uuid;
  v_order record;
  v_item jsonb;
  v_order_item record;
  v_qty integer;
  v_open_case uuid;
begin
  if p_instance_id is null or p_user_id is null then
    raise exception 'A visszaküldési kérelem azonosítója hiányos.';
  end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then
    raise exception 'Legalább egy visszaküldendő tétel szükséges.';
  end if;
  if jsonb_array_length(p_items)>30 then
    raise exception 'Túl sok visszaküldendő tétel.';
  end if;

  select id,instance_id,customer_id,customer_email,status
  into v_order
  from public.orders
  where id=p_order_id and instance_id=p_instance_id and customer_id=p_user_id
  for update;

  if not found then
    raise exception 'A rendelés nem található ebben a webshopban.';
  end if;
  if v_order.status not in('shipped','completed') then
    raise exception 'Ehhez a rendeléshez jelenleg nem indítható visszaküldési kérelem.';
  end if;

  select id into v_open_case
  from public.return_cases
  where instance_id=p_instance_id
    and order_id=p_order_id
    and user_id=p_user_id
    and status in('requested','approved','received','refund_pending')
  limit 1
  for update;

  if v_open_case is not null then
    raise exception 'Ehhez a rendeléshez már van folyamatban lévő ügy.';
  end if;

  insert into public.return_cases(
    instance_id,order_id,user_id,customer_email,reason,customer_note
  ) values(
    p_instance_id,p_order_id,p_user_id,
    coalesce(nullif(trim(p_customer_email),''),v_order.customer_email),
    p_reason,nullif(trim(p_customer_note),'')
  )
  returning id into v_case_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    begin
      v_qty:=(v_item->>'quantity')::integer;
    exception when others then
      raise exception 'Érvénytelen visszaküldési mennyiség.';
    end;
    if v_qty<=0 then raise exception 'Érvénytelen visszaküldési mennyiség.'; end if;

    select id,instance_id,order_id,quantity
    into v_order_item
    from public.order_items
    where id=(v_item->>'orderItemId')::uuid
      and instance_id=p_instance_id;

    if not found or v_order_item.order_id<>p_order_id or v_qty>v_order_item.quantity then
      raise exception 'Érvénytelen visszaküldési tétel vagy mennyiség.';
    end if;

    insert into public.return_case_items(
      instance_id,return_case_id,order_item_id,quantity
    ) values(
      p_instance_id,v_case_id,v_order_item.id,v_qty
    );
  end loop;

  return v_case_id;
end;
$$;


ALTER FUNCTION "public"."create_return_case_v2"("p_instance_id" "uuid", "p_order_id" "uuid", "p_user_id" "uuid", "p_customer_email" "text", "p_reason" "text", "p_customer_note" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."action_proposals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "proposal_key" "text" NOT NULL,
    "alert_id" "uuid" NOT NULL,
    "policy_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'proposed'::"text" NOT NULL,
    "action_kind" "text" NOT NULL,
    "impact_class" "text" NOT NULL,
    "risk_score" integer DEFAULT 0 NOT NULL,
    "rationale" "text" NOT NULL,
    "proposed_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "source_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "simulation_snapshot" "jsonb",
    "simulation_hash" "text",
    "simulated_at" timestamp with time zone,
    "expires_at" timestamp with time zone NOT NULL,
    "approved_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "executed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "action_proposals_action_kind_check" CHECK (("action_kind" = ANY (ARRAY['human_task'::"text", 'notify_admin'::"text", 'record_decision'::"text"]))),
    CONSTRAINT "action_proposals_impact_class_check" CHECK (("impact_class" = ANY (ARRAY['advisory'::"text", 'reversible'::"text", 'high_impact'::"text"]))),
    CONSTRAINT "action_proposals_risk_score_check" CHECK ((("risk_score" >= 0) AND ("risk_score" <= 100))),
    CONSTRAINT "action_proposals_status_check" CHECK (("status" = ANY (ARRAY['proposed'::"text", 'simulated'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text", 'executed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."action_proposals" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decide_action_proposal"("p_proposal_id" "uuid", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text", "p_event_key" "text") RETURNS "public"."action_proposals"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare p public.action_proposals;pol public.action_policies;ev record;v_count integer;v_slot integer;v_from text;begin
 if p_decision not in ('approved','rejected') then raise exception 'invalid_decision';end if;if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('action-proposal:'||p_proposal_id::text,0));
 select proposal_id,event_type into ev from public.action_proposal_events where event_key=p_event_key;if found then if ev.proposal_id<>p_proposal_id then raise exception 'event_key_conflict';end if;select * into p from public.action_proposals where id=p_proposal_id;return p;end if;
 select * into p from public.action_proposals where id=p_proposal_id for update;if not found then raise exception 'proposal_not_found';end if;select * into pol from public.action_policies where id=p.policy_id;v_from:=p.status;if p.status<>'simulated' then raise exception 'proposal_not_approvable';end if;if public.action_proposal_is_stale(p.id) then raise exception 'simulation_stale';end if;if p.expires_at<=now() then raise exception 'proposal_expired';end if;if exists(select 1 from public.action_approvals where proposal_id=p.id and approver_id=p_actor_id) then raise exception 'approver_already_decided';end if;
 if p_decision='rejected' then select case when exists(select 1 from public.action_approvals where proposal_id=p.id and slot=1) then 2 else 1 end into v_slot;insert into public.action_approvals(proposal_id,slot,approver_id,decision,note) values(p.id,v_slot,p_actor_id,'rejected',p_note);update public.action_proposals set status='rejected',rejected_at=now(),updated_at=now() where id=p.id returning * into p;insert into public.action_proposal_events(event_key,proposal_id,event_type,from_status,to_status,actor_id,metadata) values(p_event_key,p.id,'rejected',v_from,'rejected',p_actor_id,jsonb_build_object('note',p_note,'slot',v_slot));return p;end if;
 if pol.approval_mode='none' then update public.action_proposals set status='approved',approved_at=now(),updated_at=now() where id=p.id returning * into p;insert into public.action_proposal_events(event_key,proposal_id,event_type,from_status,to_status,actor_id,metadata) values(p_event_key,p.id,'approved',v_from,'approved',p_actor_id,jsonb_build_object('approval_mode','none'));return p;end if;
 select case when exists(select 1 from public.action_approvals where proposal_id=p.id and slot=1) then 2 else 1 end into v_slot;if pol.approval_mode='single' and v_slot<>1 then raise exception 'approval_already_recorded';end if;insert into public.action_approvals(proposal_id,slot,approver_id,decision,note) values(p.id,v_slot,p_actor_id,'approved',p_note);select count(*) into v_count from public.action_approvals where proposal_id=p.id and decision='approved';if pol.approval_mode='single' or (pol.approval_mode='dual' and v_count>=2) then update public.action_proposals set status='approved',approved_at=now(),updated_at=now() where id=p.id returning * into p;end if;insert into public.action_proposal_events(event_key,proposal_id,event_type,from_status,to_status,actor_id,metadata) values(p_event_key,p.id,case when p.status='approved' then 'approved' else 'approval_added' end,v_from,p.status,p_actor_id,jsonb_build_object('approval_slot',v_slot,'approval_mode',pol.approval_mode,'note',p_note));return p;end;$$;


ALTER FUNCTION "public"."decide_action_proposal"("p_proposal_id" "uuid", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text", "p_event_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decide_action_proposal_v2"("p_instance_id" "uuid", "p_proposal_id" "uuid", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text", "p_event_key" "text") RETURNS "public"."action_proposals"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$begin if not exists(select 1 from public.action_proposals where id=p_proposal_id and instance_id=p_instance_id)then raise exception 'proposal_not_found';end if;return public.decide_action_proposal(p_proposal_id,p_actor_id,p_decision,p_note,p_instance_id::text||':'||p_event_key);end$$;


ALTER FUNCTION "public"."decide_action_proposal_v2"("p_instance_id" "uuid", "p_proposal_id" "uuid", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text", "p_event_key" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_release_rollback_decisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "decision_key" "text" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "decision" "text" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "note" "text" NOT NULL,
    "session_evidence_hash" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "post_release_rollback_decisions_decision_check" CHECK (("decision" = ANY (ARRAY['rollback_authorized'::"text", 'continue_observation'::"text", 'risk_accepted'::"text"])))
);


ALTER TABLE "public"."post_release_rollback_decisions" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decide_post_release_rollback"("p_session_id" "uuid", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text", "p_event_key" "text") RETURNS "public"."post_release_rollback_decisions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare s public.post_release_sessions;d public.post_release_rollback_decisions;v_hash text;begin
 select * into s from public.post_release_sessions where id=p_session_id for update;if not found then raise exception 'Ismeretlen utóellenőrzés.';end if;
 if s.status not in('degraded','rollback_recommended') then raise exception 'Rollback döntés csak degradált állapotban adható.';end if;
 if p_decision not in('rollback_authorized','continue_observation','risk_accepted') then raise exception 'Érvénytelen rollback döntés.';end if;
 if length(trim(coalesce(p_note,'')))<10 then raise exception 'A döntés indoklása kötelező.';end if;
 select md5(coalesce(string_agg(evidence_hash,'|' order by evidence_hash),'')) into v_hash from public.post_release_evidence where session_id=s.id;
 select * into d from public.post_release_rollback_decisions where decision_key=p_event_key;if found then
  if d.session_id<>s.id or d.actor_id<>p_actor_id or d.decision<>p_decision then raise exception 'A döntési kulcs már más művelethez tartozik.';end if;return d;end if;
 insert into public.post_release_rollback_decisions(decision_key,session_id,decision,actor_id,note,session_evidence_hash)
 values(p_event_key,s.id,p_decision,p_actor_id,trim(p_note),v_hash) returning * into d;
 return d;end;$$;


ALTER FUNCTION "public"."decide_post_release_rollback"("p_session_id" "uuid", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text", "p_event_key" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_release_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_key" "text" NOT NULL,
    "release_candidate_id" "uuid" NOT NULL,
    "policy_id" "uuid" NOT NULL,
    "source_sha" "text" NOT NULL,
    "status" "text" DEFAULT 'observing'::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "observation_ends_at" timestamp with time zone NOT NULL,
    "stable_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "post_release_sessions_status_check" CHECK (("status" = ANY (ARRAY['observing'::"text", 'degraded'::"text", 'rollback_recommended'::"text", 'stable'::"text", 'closed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."post_release_sessions" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decide_post_release_session"("p_session_id" "uuid", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text", "p_event_key" "text") RETURNS "public"."post_release_sessions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare s public.post_release_sessions;begin
 select * into s from public.post_release_sessions where id=p_session_id for update;if not found then raise exception 'Ismeretlen utóellenőrzés.';end if;
 if p_decision='close' then
   if s.status<>'stable' then raise exception 'Csak stabil utóellenőrzés zárható le.';end if;
   update public.post_release_sessions set status='closed',closed_at=now(),updated_at=now() where id=s.id returning * into s;
   insert into public.post_release_events(event_key,session_id,event_type,actor_id,metadata) values(p_event_key,s.id,'closed',p_actor_id,jsonb_build_object('note',p_note));
 elsif p_decision='cancel' then
   if s.status in('closed','cancelled') then return s;end if;
   update public.post_release_sessions set status='cancelled',closed_at=now(),updated_at=now() where id=s.id returning * into s;
   insert into public.post_release_events(event_key,session_id,event_type,actor_id,metadata) values(p_event_key,s.id,'cancelled',p_actor_id,jsonb_build_object('note',p_note));
 else raise exception 'Érvénytelen döntés.';end if;
 return s;end;$$;


ALTER FUNCTION "public"."decide_post_release_session"("p_session_id" "uuid", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text", "p_event_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decide_release_candidate"("p_candidate_id" "uuid", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text", "p_event_key" "text") RETURNS "public"."release_candidates"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare c public.release_candidates;pol public.release_policies;ev public.release_events;v_slot integer;v_count integer;v_window jsonb;begin
 if p_decision not in('approved','rejected') then raise exception 'invalid_decision';end if;perform pg_advisory_xact_lock(hashtextextended('release:'||p_candidate_id::text,0));select * into ev from public.release_events where event_key=p_event_key;if found then if ev.candidate_id<>p_candidate_id then raise exception 'event_key_conflict';end if;select * into c from public.release_candidates where id=p_candidate_id;return c;end if;
 select * into c from public.release_candidates where id=p_candidate_id for update;if not found then raise exception 'candidate_not_found';end if;select * into pol from public.release_policies where id=c.policy_id;if c.status<>'ready' or c.gate_hash is null then raise exception 'candidate_not_ready';end if;if public.release_candidate_is_stale(c.id) then raise exception 'release_evidence_stale';end if;
 select case when exists(select 1 from public.release_approvals where candidate_id=c.id and gate_hash=c.gate_hash) then 2 else 1 end into v_slot;if pol.approval_mode='single' then v_slot:=1;end if;
 insert into public.release_approvals(candidate_id,gate_hash,slot,approver_id,decision,note) values(c.id,c.gate_hash,v_slot,p_actor_id,p_decision,p_note);
 if p_decision='rejected' then update public.release_candidates set status='rejected',rejected_at=now(),updated_at=now() where id=c.id returning * into c;insert into public.release_events(event_key,candidate_id,event_type,actor_id,metadata) values(p_event_key,c.id,'rejected',p_actor_id,jsonb_build_object('slot',v_slot,'gate_hash',c.gate_hash,'note',p_note));return c;end if;
 select count(*) into v_count from public.release_approvals where candidate_id=c.id and gate_hash=c.gate_hash and decision='approved';if pol.approval_mode='single' or v_count>=2 then v_window:=public.release_window_status(c.id);if coalesce((v_window->>'allowed')::boolean,false)=false then raise exception 'release_window_closed';end if;update public.release_candidates set status='approved',approved_at=now(),updated_at=now() where id=c.id returning * into c;end if;
 insert into public.release_events(event_key,candidate_id,event_type,actor_id,metadata) values(p_event_key,c.id,case when c.status='approved' then 'approved' else 'approval_added' end,p_actor_id,jsonb_build_object('slot',v_slot,'gate_hash',c.gate_hash,'approval_mode',pol.approval_mode,'note',p_note));return c;end;$$;


ALTER FUNCTION "public"."decide_release_candidate"("p_candidate_id" "uuid", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text", "p_event_key" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rollout_decisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "decision_key" "text" NOT NULL,
    "environment_key" "text" NOT NULL,
    "source_sha" "text" NOT NULL,
    "decision" "text" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "evidence_bundle_hash" "text" NOT NULL,
    "note" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rollout_decisions_decision_check" CHECK (("decision" = ANY (ARRAY['go'::"text", 'no_go'::"text"])))
);


ALTER TABLE "public"."rollout_decisions" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decide_rollout"("p_decision_key" "text", "p_environment_key" "text", "p_source_sha" "text", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text") RETURNS "public"."rollout_decisions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare d public.rollout_decisions;r record;v_hash text;v_required int;begin if p_decision not in('go','no_go') then raise exception 'Érvénytelen rollout döntés.';end if;if length(trim(coalesce(p_note,'')))<10 then raise exception 'A rollout döntés indoklása kötelező.';end if;select * into d from public.rollout_decisions where decision_key=p_decision_key;if found then if d.environment_key<>p_environment_key or d.source_sha<>p_source_sha or d.actor_id<>p_actor_id or d.decision<>p_decision then raise exception 'A rollout döntési kulcs már más művelethez tartozik.';end if;return d;end if;select md5(coalesce(string_agg(evidence_hash,'|' order by check_kind,evidence_hash),'')),count(*) filter(where trusted and status in('fail','error')) into v_hash,v_required from public.rollout_checks where environment_key=p_environment_key and source_sha=p_source_sha;if p_decision='go' then if v_required>0 then raise exception 'GO nem adható blokkoló rollout evidence mellett.';end if;if not exists(select 1 from public.rollout_checks where environment_key=p_environment_key and source_sha=p_source_sha and trusted and status='pass' and check_kind='ci') then raise exception 'Trusted CI evidence hiányzik.';end if;if not exists(select 1 from public.rollout_checks where environment_key=p_environment_key and source_sha=p_source_sha and trusted and status='pass' and check_kind='smoke') then raise exception 'Trusted smoke evidence hiányzik.';end if;if p_environment_key in('staging','production') and not exists(select 1 from public.rollout_checks where environment_key=p_environment_key and source_sha=p_source_sha and trusted and status='pass' and check_kind='migration') then raise exception 'Trusted migration evidence hiányzik.';end if;if p_environment_key='production' and not exists(select 1 from public.rollout_checks where environment_key=p_environment_key and source_sha=p_source_sha and trusted and status='pass' and check_kind='security') then raise exception 'Trusted security evidence hiányzik.';end if;end if;insert into public.rollout_decisions(decision_key,environment_key,source_sha,decision,actor_id,evidence_bundle_hash,note) values(trim(p_decision_key),p_environment_key,trim(p_source_sha),p_decision,p_actor_id,coalesce(v_hash,md5('')),trim(p_note)) returning * into d;return d;end;$$;


ALTER FUNCTION "public"."decide_rollout"("p_decision_key" "text", "p_environment_key" "text", "p_source_sha" "text", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."detect_customer_value_control_alerts"("p_run_key" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare r record;a public.control_alerts;v_debt integer:=0;begin
  if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required'; end if;
  for r in
    select * from public.customer_loyalty_summary where points_debt>0
  loop
    select public.upsert_control_alert(
      'loyalty-debt:'||r.customer_id::text,
      'customer','loyalty_points_debt',case when r.points_debt>=500 then 'high' else 'warning' end,
      least(95,60+least(r.points_debt::integer,700)/20),
      'Hűségpont-egyenleg adósság · '||r.value_tier,
      'Az ügyfél auditált hűségpont-adóssága '||r.points_debt::text||' pont. A beváltást a V11 integritási szabály már blokkolja.',
      'Ellenőrizd a refund/reversal előzményt. Ne módosíts kézzel pontot bizonyíték nélkül; korrekció csak auditált loyalty bejegyzéssel történjen.',
      p_run_key,null,r.customer_id,null,null,null,
      jsonb_build_object('points_debt',r.points_debt,'points_balance',r.points_balance,'value_tier',r.value_tier,'value_score',r.value_score,'lifecycle_segment',r.lifecycle_segment,'paid_orders',r.paid_orders,'revenue_gross_huf',r.revenue_gross_huf,'last_order_at',r.last_order_at)
    ) into a;
    v_debt:=v_debt+1;
  end loop;
  return jsonb_build_object('loyalty_debt_customers',v_debt,'total',v_debt);
end;$$;


ALTER FUNCTION "public"."detect_customer_value_control_alerts"("p_run_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."detect_system_control_alerts"("p_run_key" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare r record;a public.control_alerts;v_jobs integer:=0;v_webhooks integer:=0;begin
  if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required'; end if;
  for r in select * from public.integration_jobs where status in ('failed','blocked') or (status='processing' and updated_at<now()-interval '20 minutes') order by created_at loop
    select public.upsert_control_alert('integration-job:'||r.id::text,'system','integration_job_failure',case when r.status='blocked' or r.attempt_count>=3 then 'critical' else 'high' end,least(100,75+(least(r.attempt_count,5)*5)),'Integrációs feldolgozási hiba · '||r.kind,r.provider||' integrációs feladat állapota: '||r.status||'.','Ellenőrizd az integrációs naplót és a szolgáltatói választ; csak az ok feltárása után indíts újrapróbálást.',p_run_key,r.order_id,null,null,null,null,jsonb_build_object('integration_job_id',r.id,'kind',r.kind,'provider',r.provider,'status',r.status,'attempt_count',r.attempt_count,'last_error',r.last_error,'next_attempt_at',r.next_attempt_at,'updated_at',r.updated_at)) into a;
    v_jobs:=v_jobs+1;
  end loop;
  for r in select * from public.webhook_events where status='failed' and created_at>=now()-interval '7 days' order by created_at desc loop
    select public.upsert_control_alert('webhook:'||r.id::text,'system','webhook_processing_failure','high',80,'Webhook feldolgozási hiba · '||r.provider,'A webhook esemény feldolgozása sikertelen volt.','Ellenőrizd az esemény naplóját, az idempotencia állapotot és a szolgáltatói payloadot.',p_run_key,null,null,null,null,null,jsonb_build_object('webhook_event_id',r.id,'provider',r.provider,'external_event_id',r.external_event_id,'signature_valid',r.signature_valid,'status',r.status,'error_message',r.error_message,'created_at',r.created_at)) into a;
    v_webhooks:=v_webhooks+1;
  end loop;
  return jsonb_build_object('integration_jobs',v_jobs,'failed_webhooks',v_webhooks,'total',v_jobs+v_webhooks);
end;$$;


ALTER FUNCTION "public"."detect_system_control_alerts"("p_run_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dispatch_due_customer_journey_steps"("p_limit" integer DEFAULT 50) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  s record;
  v_job uuid;
  v_queued integer:=0;
  v_blocked integer:=0;
  v_seen integer:=0;
begin
  for s in
    select
      js.id, js.journey_id, js.step_key, js.purpose, js.template_key, js.scheduled_at,
      j.user_id, j.email, j.kind, j.source_key, j.metadata
    from public.customer_journey_steps js
    join public.customer_journeys j on j.id=js.journey_id
    where js.status='pending'
      and js.scheduled_at<=now()
      and j.status='active'
    order by js.scheduled_at,js.id
    for update of js skip locked
    limit greatest(1,least(coalesce(p_limit,50),100))
  loop
    v_seen:=v_seen+1;
    begin
      select public.enqueue_communication(
        s.email,
        s.user_id,
        s.purpose,
        s.template_key,
        coalesce(s.metadata,'{}'::jsonb) || jsonb_build_object(
          'journeyId',s.journey_id,
          'journeyKind',s.kind,
          'journeySourceKey',s.source_key,
          'journeyStep',s.step_key
        ),
        concat('journey:',s.journey_id,':',s.step_key),
        s.scheduled_at
      ) into v_job;

      update public.customer_journey_steps
      set status='queued',communication_job_id=v_job
      where id=s.id and status='pending';
      if found then v_queued:=v_queued+1; end if;
    exception when others then
      update public.customer_journey_steps
      set status='blocked'
      where id=s.id and status='pending';
      if found then v_blocked:=v_blocked+1; end if;
    end;
  end loop;

  update public.customer_journeys j
  set status='completed',completed_at=coalesce(j.completed_at,now()),updated_at=now()
  where j.status='active'
    and exists(select 1 from public.customer_journey_steps s where s.journey_id=j.id)
    and not exists(select 1 from public.customer_journey_steps s where s.journey_id=j.id and s.status='pending');

  return jsonb_build_object('seen',v_seen,'queued',v_queued,'blocked',v_blocked);
end;$$;


ALTER FUNCTION "public"."dispatch_due_customer_journey_steps"("p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."dispatch_due_customer_journey_steps"("p_limit" integer) IS 'V9 idempotent, lock-safe journey-step dispatcher into the V8 communication queue.';



CREATE OR REPLACE FUNCTION "public"."dispatch_due_customer_journey_steps_v2"("p_instance_id" "uuid", "p_limit" integer DEFAULT 50) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  s record;
  v_job uuid;
  v_queued integer:=0;
  v_blocked integer:=0;
  v_seen integer:=0;
begin
  if p_instance_id is null then raise exception 'instance_required'; end if;

  for s in
    select
      js.id,js.journey_id,js.step_key,js.purpose,js.template_key,js.scheduled_at,
      j.user_id,j.email,j.kind,j.source_key,j.metadata
    from public.customer_journey_steps js
    join public.customer_journeys j
      on j.id=js.journey_id
     and j.instance_id=js.instance_id
    where js.instance_id=p_instance_id
      and j.instance_id=p_instance_id
      and js.status='pending'
      and js.scheduled_at<=now()
      and j.status='active'
    order by js.scheduled_at,js.id
    for update of js skip locked
    limit greatest(1,least(coalesce(p_limit,50),100))
  loop
    v_seen:=v_seen+1;
    begin
      select public.enqueue_communication_v2(
        p_instance_id,
        s.email,
        s.user_id,
        s.purpose,
        s.template_key,
        coalesce(s.metadata,'{}'::jsonb)||jsonb_build_object(
          'journeyId',s.journey_id,
          'journeyKind',s.kind,
          'journeySourceKey',s.source_key,
          'journeyStep',s.step_key
        ),
        concat('journey:',p_instance_id,':',s.journey_id,':',s.step_key),
        s.scheduled_at
      ) into v_job;

      update public.customer_journey_steps
      set status='queued',communication_job_id=v_job
      where id=s.id
        and instance_id=p_instance_id
        and status='pending';
      if found then v_queued:=v_queued+1; end if;
    exception when others then
      update public.customer_journey_steps
      set status='blocked'
      where id=s.id
        and instance_id=p_instance_id
        and status='pending';
      if found then v_blocked:=v_blocked+1; end if;
    end;
  end loop;

  update public.customer_journeys j
  set status='completed',completed_at=coalesce(j.completed_at,now()),updated_at=now()
  where j.instance_id=p_instance_id
    and j.status='active'
    and exists(
      select 1 from public.customer_journey_steps s
      where s.instance_id=p_instance_id and s.journey_id=j.id
    )
    and not exists(
      select 1 from public.customer_journey_steps s
      where s.instance_id=p_instance_id and s.journey_id=j.id and s.status='pending'
    );

  return jsonb_build_object('seen',v_seen,'queued',v_queued,'blocked',v_blocked);
end;
$$;


ALTER FUNCTION "public"."dispatch_due_customer_journey_steps_v2"("p_instance_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_office_message_tenant"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare v_thread_instance uuid;v_job_instance uuid;
begin
  select instance_id into v_thread_instance from public.office_threads where id=new.thread_id;
  if v_thread_instance is null or new.instance_id<>v_thread_instance then raise exception 'Cross-store office message relation is not allowed.'; end if;
  if new.communication_job_id is not null then
    select instance_id into v_job_instance from public.communication_jobs where id=new.communication_job_id;
    if v_job_instance is null or new.instance_id<>v_job_instance then raise exception 'Cross-store office communication relation is not allowed.'; end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_office_message_tenant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_office_task_tenant"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare v_instance uuid;
begin
  if new.thread_id is null then return new; end if;
  select instance_id into v_instance from public.office_threads where id=new.thread_id;
  if v_instance is null or new.instance_id<>v_instance then raise exception 'Cross-store office task relation is not allowed.'; end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_office_task_tenant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_office_thread_tenant"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare v_instance uuid;
begin
  if new.order_id is null then return new; end if;
  select instance_id into v_instance from public.orders where id=new.order_id;
  if v_instance is null or new.instance_id<>v_instance then raise exception 'Cross-store office order relation is not allowed.'; end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_office_thread_tenant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_order_tenant_match"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare v_instance uuid;
begin
  select instance_id into v_instance from public.orders where id=new.order_id;
  if v_instance is null or new.instance_id<>v_instance then raise exception 'Cross-store order relation is not allowed.'; end if;
  return new;
end $$;


ALTER FUNCTION "public"."enforce_order_tenant_match"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_purchase_order_tenant_match"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare v_instance uuid;
begin
  select instance_id into v_instance from public.purchase_orders where id=new.purchase_order_id;
  if v_instance is null or new.instance_id<>v_instance then raise exception 'Cross-store purchase order relation is not allowed.'; end if;
  return new;
end $$;


ALTER FUNCTION "public"."enforce_purchase_order_tenant_match"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_return_case_tenant_match"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare v_instance uuid;
begin
  select instance_id into v_instance from public.return_cases where id=new.return_case_id;
  if v_instance is null or new.instance_id<>v_instance then raise exception 'Cross-store return relation is not allowed.'; end if;
  return new;
end $$;


ALTER FUNCTION "public"."enforce_return_case_tenant_match"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_support_ticket_tenant_match"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare v_instance uuid;
begin
  select instance_id into v_instance from public.support_tickets where id=new.ticket_id;
  if v_instance is null or new.instance_id<>v_instance then raise exception 'Cross-store support relation is not allowed.'; end if;
  return new;
end $$;


ALTER FUNCTION "public"."enforce_support_ticket_tenant_match"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enqueue_communication"("p_email" "text", "p_user_id" "uuid", "p_purpose" "text", "p_template_key" "text", "p_payload" "jsonb", "p_idempotency_key" "text", "p_scheduled_at" timestamp with time zone DEFAULT "now"()) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_id uuid;
  v_requires_approval boolean;
begin
  if p_purpose not in ('transactional','marketing') then
    raise exception 'invalid purpose';
  end if;
  if public.is_communication_suppressed(p_email) then
    raise exception 'recipient suppressed';
  end if;
  if p_purpose='marketing' and not public.has_marketing_consent(p_email,'email') then
    raise exception 'marketing consent required';
  end if;

  v_requires_approval := (p_purpose='marketing');

  insert into public.communication_jobs(
    recipient_email,user_id,purpose,template_key,payload,idempotency_key,scheduled_at,
    requires_approval,approved_at,approved_by
  ) values(
    lower(trim(p_email)),p_user_id,p_purpose,p_template_key,coalesce(p_payload,'{}'::jsonb),
    p_idempotency_key,p_scheduled_at,v_requires_approval,null,null
  )
  on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."enqueue_communication"("p_email" "text", "p_user_id" "uuid", "p_purpose" "text", "p_template_key" "text", "p_payload" "jsonb", "p_idempotency_key" "text", "p_scheduled_at" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enqueue_communication"("p_email" "text", "p_user_id" "uuid", "p_purpose" "text", "p_template_key" "text", "p_payload" "jsonb", "p_idempotency_key" "text", "p_scheduled_at" timestamp with time zone) IS 'Queues communication idempotently; transactional jobs bypass manual approval, marketing jobs require active consent and manual approval.';



CREATE OR REPLACE FUNCTION "public"."enqueue_communication_v2"("p_instance_id" "uuid", "p_email" "text", "p_user_id" "uuid", "p_purpose" "text", "p_template_key" "text", "p_payload" "jsonb", "p_idempotency_key" "text", "p_scheduled_at" timestamp with time zone DEFAULT "now"()) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_id uuid;v_requires_approval boolean;
begin
  if not exists(select 1 from public.webshop_instances where id=p_instance_id) then raise exception 'invalid tenant'; end if;
  if p_purpose not in('transactional','marketing') then raise exception 'invalid purpose'; end if;
  if public.is_communication_suppressed_v2(p_instance_id,p_email) then raise exception 'recipient suppressed'; end if;
  if p_purpose='marketing' and not public.has_marketing_consent_v2(p_instance_id,p_email,'email') then raise exception 'marketing consent required'; end if;
  v_requires_approval:=(p_purpose='marketing');
  insert into public.communication_jobs(instance_id,recipient_email,user_id,purpose,template_key,payload,idempotency_key,scheduled_at,requires_approval,approved_at,approved_by)
  values(p_instance_id,lower(trim(p_email)),p_user_id,p_purpose,p_template_key,coalesce(p_payload,'{}'::jsonb),p_idempotency_key,p_scheduled_at,v_requires_approval,null,null)
  on conflict(instance_id,idempotency_key) do update set idempotency_key=excluded.idempotency_key
  returning id into v_id;
  return v_id;
end;
$$;


ALTER FUNCTION "public"."enqueue_communication_v2"("p_instance_id" "uuid", "p_email" "text", "p_user_id" "uuid", "p_purpose" "text", "p_template_key" "text", "p_payload" "jsonb", "p_idempotency_key" "text", "p_scheduled_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."evaluate_assurance_control"("p_control_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare c public.assurance_controls;v_count integer:=0;v_details jsonb:='{}'::jsonb;v_observed timestamptz:=now();begin
 select * into c from public.assurance_controls where id=p_control_id;if not found then raise exception 'control_not_found';end if;
 case c.control_key
  when 'control-critical-aging' then
   select count(*),coalesce(max(last_detected_at),now()) into v_count,v_observed from public.control_alerts where status in ('open','acknowledged','snoozed') and severity='critical' and incident_started_at<now()-make_interval(hours=>coalesce((c.definition->>'max_age_hours')::integer,4));
   v_details:=jsonb_build_object('violations',v_count,'max_age_hours',coalesce((c.definition->>'max_age_hours')::integer,4));
  when 'action-stale-approved' then
   select count(*),coalesce(max(updated_at),now()) into v_count,v_observed from public.action_proposals where status='approved' and public.action_proposal_is_stale(id);
   v_details:=jsonb_build_object('stale_approved_proposals',v_count);
  when 'action-dual-approval' then
   select count(*) into v_count from public.action_proposals p join public.action_policies pol on pol.id=p.policy_id
   where pol.approval_mode='dual' and p.status in ('approved','executed') and (select count(distinct aa.approver_id) from public.action_approvals aa where aa.proposal_id=p.id and aa.decision='approved')<2;
   v_details:=jsonb_build_object('invalid_dual_approvals',v_count);
  when 'automation-circuit-health' then
   select case when global_paused or(circuit_open_until is not null and circuit_open_until>now()) then 1 else 0 end,updated_at into v_count,v_observed from public.automation_control where singleton=true;
   v_details:=(select jsonb_build_object('global_paused',global_paused,'pause_reason',pause_reason,'consecutive_failures',consecutive_failures,'circuit_open_until',circuit_open_until) from public.automation_control where singleton=true);
  when 'automation-overdue' then
   select count(*),coalesce(max(updated_at),now()) into v_count,v_observed from public.automation_runbook_instances where status in ('planned','active','paused') and deadline_at<now();
   v_details:=jsonb_build_object('overdue_instances',v_count);
  when 'automation-waiting-task' then
   select count(*),coalesce(max(sr.updated_at),now()) into v_count,v_observed from public.automation_step_runs sr join public.automation_runbook_instances i on i.id=sr.instance_id
   where sr.status='waiting' and i.status='active' and sr.started_at<now()-interval '24 hours';
   v_details:=jsonb_build_object('waiting_over_24h',v_count);
  when 'control-overdue-task' then
   select count(*),coalesce(max(updated_at),now()) into v_count,v_observed from public.control_tasks where status in ('open','in_progress') and due_at<now();
   v_details:=jsonb_build_object('overdue_control_tasks',v_count);
  when 'action-expired-active' then
   select count(*),coalesce(max(updated_at),now()) into v_count,v_observed from public.action_proposals where status in ('proposed','simulated','approved') and expires_at<=now();
   v_details:=jsonb_build_object('expired_active_proposals',v_count);
  else raise exception 'unsupported_control_key:%',c.control_key;
 end case;
 return jsonb_build_object('passed',v_count=0,'violations',v_count,'details',v_details,'source_observed_at',v_observed);
end;$$;


ALTER FUNCTION "public"."evaluate_assurance_control"("p_control_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."evaluate_release_candidate"("p_candidate_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") RETURNS "public"."release_candidates"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare c public.release_candidates;pol public.release_policies;r public.assurance_readiness;ar record;ev public.release_events;v_ci_ok boolean;v_rb_ok boolean;v_assurance_ok boolean;v_change_ok boolean;v_change_hash text;v_snapshot jsonb;v_hash text;begin perform pg_advisory_xact_lock(hashtextextended('release:'||p_candidate_id::text,0));select * into ev from public.release_events where event_key=p_event_key;if found then if ev.candidate_id<>p_candidate_id then raise exception 'event_key_conflict';end if;select * into c from public.release_candidates where id=p_candidate_id;return c;end if;select * into c from public.release_candidates where id=p_candidate_id for update;if not found then raise exception 'candidate_not_found';end if;if c.status in('approved','rejected','expired','cancelled') then raise exception 'candidate_terminal';end if;select * into pol from public.release_policies where id=c.policy_id;if not pol.enabled then raise exception 'release_policy_disabled';end if;select * into r from public.assurance_readiness;select * into ar from public.assurance_recent_runs where status='completed' order by completed_at desc nulls last limit 1;v_change_hash:=public.release_change_set_hash(c.id);
 v_ci_ok:=not pol.require_ci_green or(public.release_ci_is_trusted(c.id) and c.ci_observed_at>=now()-make_interval(mins=>pol.ci_freshness_minutes));v_rb_ok:=not pol.require_rollback_plan or nullif(trim(c.rollback_plan),'') is not null;v_assurance_ok:=r.assurance_score>=pol.min_assurance_score and r.stale_controls<=pol.max_stale_controls and r.critical_open=0 and r.high_open<=pol.max_high_findings and r.accepted_risks<=pol.max_accepted_risks and r.readiness_status='ready' and ar.id is not null;v_change_ok:=not(c.risk_class='standard' and exists(select 1 from public.release_changes where candidate_id=c.id and risk_level='high'));
 v_snapshot:=jsonb_build_object('policy_id',pol.id,'policy_version',pol.version,'assurance_score',r.assurance_score,'readiness_status',r.readiness_status,'stale_controls',r.stale_controls,'critical_open',r.critical_open,'high_open',r.high_open,'accepted_risks',r.accepted_risks,'assurance_run_id',ar.id,'assurance_bundle_hash',ar.evidence_bundle_hash,'change_set_hash',v_change_hash,'change_set_ok',v_change_ok,'ci_status',c.ci_status,'ci_observed_at',c.ci_observed_at,'ci_source',c.ci_evidence->>'source','ci_trusted',public.release_ci_is_trusted(c.id),'ci_ok',v_ci_ok,'rollback_plan_ok',v_rb_ok,'assurance_ok',v_assurance_ok,'evaluated_at',now());v_hash:=md5(v_snapshot::text);
 insert into public.release_gate_results(gate_key,candidate_id,gate_name,status,evidence,evidence_hash) values('candidate:'||c.id||':evaluation:'||v_hash,c.id,'release_readiness',case when v_ci_ok and v_rb_ok and v_assurance_ok and v_change_ok then 'pass' else 'fail' end,v_snapshot,v_hash);update public.release_candidates set status=case when v_ci_ok and v_rb_ok and v_assurance_ok and v_change_ok then 'ready' else 'evaluated' end,assurance_run_id=ar.id,assurance_bundle_hash=ar.evidence_bundle_hash,assurance_score=r.assurance_score,change_set_hash=v_change_hash,gate_snapshot=v_snapshot,gate_hash=v_hash,evaluated_at=now(),expires_at=now()+make_interval(mins=>pol.evaluation_valid_minutes),updated_at=now() where id=c.id returning * into c;insert into public.release_events(event_key,candidate_id,event_type,actor_id,metadata) values(p_event_key,c.id,'evaluated',p_actor_id,jsonb_build_object('gate_hash',v_hash,'status',c.status,'change_set_hash',v_change_hash));return c;end;$$;


ALTER FUNCTION "public"."evaluate_release_candidate"("p_candidate_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."action_executions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "execution_key" "text" NOT NULL,
    "proposal_id" "uuid" NOT NULL,
    "adapter" "text" NOT NULL,
    "status" "text" NOT NULL,
    "input_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "result" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "error_message" "text",
    "executed_by" "uuid",
    "executed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "action_executions_adapter_check" CHECK (("adapter" = ANY (ARRAY['human_task'::"text", 'notify_admin'::"text", 'record_decision'::"text"]))),
    CONSTRAINT "action_executions_status_check" CHECK (("status" = ANY (ARRAY['succeeded'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."action_executions" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_action_proposal"("p_proposal_id" "uuid", "p_actor_id" "uuid", "p_execution_key" "text") RETURNS "public"."action_executions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare p public.action_proposals;e public.action_executions;v_result jsonb;v_task_id uuid;v_alert_title text;begin
 if nullif(trim(p_execution_key),'') is null then raise exception 'execution_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('action-proposal:'||p_proposal_id::text,0));select * into e from public.action_executions where execution_key=p_execution_key;if found then if e.proposal_id<>p_proposal_id then raise exception 'execution_key_conflict';end if;return e;end if;
 select * into p from public.action_proposals where id=p_proposal_id for update;if not found then raise exception 'proposal_not_found';end if;if p.status<>'approved' then raise exception 'proposal_not_approved';end if;if public.action_proposal_is_stale(p.id) then raise exception 'simulation_stale';end if;if p.expires_at<=now() then raise exception 'proposal_expired';end if;if p.action_kind not in ('human_task','notify_admin','record_decision') then raise exception 'adapter_not_allowlisted';end if;
 select title into v_alert_title from public.control_alerts where id=p.alert_id;
 if p.action_kind in ('human_task','notify_admin') then
  insert into public.control_tasks(task_key,alert_id,status,priority_score,title,recommended_action,owner_user_id,due_at,metadata)
  values('v14-proposal:'||p.id::text,p.alert_id,'open',p.risk_score,case when p.action_kind='notify_admin' then 'Admin figyelem · ' else 'Intézkedési feladat · ' end||coalesce(v_alert_title,'Kontrolljelzés'),p.rationale,null,now()+case when p.risk_score>=90 then interval '2 hours' when p.risk_score>=75 then interval '8 hours' else interval '24 hours' end,jsonb_build_object('source','v14_action_execution','proposal_id',p.id,'action_kind',p.action_kind))
  on conflict(task_key) do update set priority_score=greatest(public.control_tasks.priority_score,excluded.priority_score),recommended_action=excluded.recommended_action,updated_at=now() returning id into v_task_id;
  v_result:=jsonb_build_object('adapter',p.action_kind,'control_task_id',v_task_id,'recorded',true);
 else v_result:=jsonb_build_object('adapter','record_decision','recorded',true);end if;
 insert into public.action_executions(execution_key,proposal_id,adapter,status,input_snapshot,result,executed_by) values(p_execution_key,p.id,p.action_kind,'succeeded',coalesce(p.simulation_snapshot,'{}'::jsonb),v_result,p_actor_id) returning * into e;update public.action_proposals set status='executed',executed_at=now(),updated_at=now() where id=p.id;insert into public.action_proposal_events(event_key,proposal_id,event_type,from_status,to_status,actor_id,metadata) values('execute:'||p_execution_key,p.id,'executed','approved','executed',p_actor_id,jsonb_build_object('execution_id',e.id,'adapter',e.adapter,'control_task_id',v_task_id));return e;end;$$;


ALTER FUNCTION "public"."execute_action_proposal"("p_proposal_id" "uuid", "p_actor_id" "uuid", "p_execution_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_action_proposal_v2"("p_instance_id" "uuid", "p_proposal_id" "uuid", "p_actor_id" "uuid", "p_execution_key" "text") RETURNS "public"."action_executions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$begin if not exists(select 1 from public.action_proposals where id=p_proposal_id and instance_id=p_instance_id)then raise exception 'proposal_not_found';end if;return public.execute_action_proposal(p_proposal_id,p_actor_id,p_instance_id::text||':'||p_execution_key);end$$;


ALTER FUNCTION "public"."execute_action_proposal_v2"("p_instance_id" "uuid", "p_proposal_id" "uuid", "p_actor_id" "uuid", "p_execution_key" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automation_step_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    "step_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "ready_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "next_attempt_at" timestamp with time zone,
    "last_error" "text",
    "result" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "store_instance_id" "uuid" NOT NULL,
    CONSTRAINT "automation_step_runs_attempt_count_check" CHECK (("attempt_count" >= 0)),
    CONSTRAINT "automation_step_runs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'ready'::"text", 'running'::"text", 'waiting'::"text", 'succeeded'::"text", 'failed'::"text", 'skipped'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."automation_step_runs" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_automation_step"("p_instance_id" "uuid", "p_actor_id" "uuid", "p_execution_key" "text") RETURNS "public"."automation_step_runs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare i public.automation_runbook_instances;r public.automation_runbooks;a public.control_alerts;p public.action_proposals;s public.automation_step_runs;d public.automation_runbook_steps;c public.automation_control;v_task_id uuid;v_error text;begin
 if nullif(trim(p_execution_key),'') is null then raise exception 'execution_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('automation-instance:'||p_instance_id::text,0));
 if exists(select 1 from public.automation_events where event_key='step-execute:'||p_execution_key) then select sr.* into s from public.automation_events e join public.automation_step_runs sr on sr.id=e.step_run_id where e.event_key='step-execute:'||p_execution_key;if s.instance_id<>p_instance_id then raise exception 'execution_key_conflict';end if;return s;end if;
 select * into i from public.automation_runbook_instances where id=p_instance_id for update;if not found then raise exception 'instance_not_found';end if;if i.status<>'active' then raise exception 'instance_not_active';end if;
 select * into c from public.automation_control where singleton=true;if c.global_paused or(c.circuit_open_until is not null and c.circuit_open_until>now()) then raise exception 'automation_circuit_open';end if;select * into r from public.automation_runbooks where id=i.runbook_id;if not r.enabled then raise exception 'runbook_disabled';end if;
 select * into a from public.control_alerts where id=i.alert_id;if a.status not in ('open','acknowledged') then raise exception 'source_alert_not_active';end if;if not(i.source_snapshot ? 'incident_started_at') or(i.source_snapshot->>'incident_started_at')::timestamptz is distinct from a.incident_started_at then raise exception 'source_incident_stale';end if;
 if r.requires_action_approval then if i.proposal_id is null then raise exception 'approved_action_required';end if;select * into p from public.action_proposals where id=i.proposal_id;if p.status not in ('approved','executed') or public.action_proposal_is_stale(p.id) then raise exception 'approved_action_stale_or_missing';end if;end if;
 select sr.* into s from public.automation_step_runs sr join public.automation_runbook_steps st on st.id=sr.step_id where sr.instance_id=i.id and sr.status in ('ready','failed') and(sr.next_attempt_at is null or sr.next_attempt_at<=now()) order by st.step_order limit 1 for update of sr;if not found then raise exception 'no_executable_step';end if;select * into d from public.automation_runbook_steps where id=s.step_id;if s.status='failed' and s.attempt_count>=d.max_attempts then raise exception 'step_attempts_exhausted';end if;
 update public.automation_step_runs set status='running',attempt_count=attempt_count+1,started_at=now(),finished_at=null,last_error=null,updated_at=now() where id=s.id returning * into s;
 begin
   if d.action_kind in ('human_task','notify_admin') then
     insert into public.control_tasks(task_key,alert_id,status,priority_score,title,recommended_action,due_at,metadata)
     values('automation:'||i.id::text||':step:'||d.id::text,i.alert_id,'open',least(100,greatest(a.priority_score,case when d.action_kind='notify_admin' then 75 else 60 end)),case when d.action_kind='notify_admin' then 'Automatizálási értesítés · ' else 'Automatizálási feladat · ' end||d.name,coalesce(a.recommended_action,'Ellenőrizd a forráshelyzetet és rögzíts eredményt.'),now()+make_interval(mins=>d.timeout_minutes),jsonb_build_object('source','v15_runbook','instance_id',i.id,'step_id',d.id,'runbook_key',r.runbook_key,'action_kind',d.action_kind))
     on conflict(task_key) do update set priority_score=greatest(public.control_tasks.priority_score,excluded.priority_score),due_at=least(public.control_tasks.due_at,excluded.due_at),updated_at=now() returning id into v_task_id;
   end if;
   if d.action_kind='human_task' then
     update public.automation_step_runs set status='waiting',result=jsonb_build_object('action_kind',d.action_kind,'control_task_id',v_task_id,'awaiting_human_completion',true),updated_at=now() where id=s.id returning * into s;
     insert into public.automation_events(event_key,instance_id,step_run_id,event_type,actor_id,metadata) values('step-execute:'||p_execution_key,i.id,s.id,'step_waiting',p_actor_id,jsonb_build_object('step_key',d.step_key,'attempt',s.attempt_count,'control_task_id',v_task_id));update public.automation_control set consecutive_failures=0,updated_at=now() where singleton=true;return s;
   end if;
   update public.automation_step_runs set status='succeeded',finished_at=now(),next_attempt_at=null,result=jsonb_build_object('action_kind',d.action_kind,'control_task_id',v_task_id,'executed_control_plane_only',true),updated_at=now() where id=s.id returning * into s;
   insert into public.automation_events(event_key,instance_id,step_run_id,event_type,actor_id,metadata) values('step-execute:'||p_execution_key,i.id,s.id,'step_succeeded',p_actor_id,jsonb_build_object('step_key',d.step_key,'attempt',s.attempt_count,'action_kind',d.action_kind,'control_task_id',v_task_id));update public.automation_control set consecutive_failures=0,updated_at=now() where singleton=true;perform public.refresh_automation_ready_steps('execute:'||p_execution_key);return s;
 exception when others then
   v_error:=sqlerrm;update public.automation_step_runs set status='failed',finished_at=now(),last_error=v_error,next_attempt_at=case when attempt_count<d.max_attempts then now()+make_interval(mins=>d.retry_backoff_minutes*greatest(attempt_count,1)) else null end,updated_at=now() where id=s.id returning * into s;update public.automation_runbook_instances set failure_count=failure_count+1,updated_at=now() where id=i.id;update public.automation_control set consecutive_failures=consecutive_failures+1,circuit_open_until=case when consecutive_failures+1>=5 then now()+interval '30 minutes' else circuit_open_until end,updated_at=now() where singleton=true;insert into public.automation_events(event_key,instance_id,step_run_id,event_type,actor_id,metadata) values('step-execute:'||p_execution_key,i.id,s.id,'step_failed',p_actor_id,jsonb_build_object('step_key',d.step_key,'attempt',s.attempt_count,'error',v_error));return s;
 end;end;$$;


ALTER FUNCTION "public"."execute_automation_step"("p_instance_id" "uuid", "p_actor_id" "uuid", "p_execution_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_automation_step_v2"("p_store_instance_id" "uuid", "p_runbook_instance_id" "uuid", "p_actor_id" "uuid", "p_execution_key" "text") RETURNS "public"."automation_step_runs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$begin if not exists(select 1 from public.automation_runbook_instances where id=p_runbook_instance_id and instance_id=p_store_instance_id)then raise exception 'automation_instance_not_found';end if;return public.execute_automation_step(p_runbook_instance_id,p_actor_id,p_store_instance_id::text||':'||p_execution_key);end$$;


ALTER FUNCTION "public"."execute_automation_step_v2"("p_store_instance_id" "uuid", "p_runbook_instance_id" "uuid", "p_actor_id" "uuid", "p_execution_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_assurance_risk_acceptances"("p_run_key" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare f record;v_count integer:=0;begin
 for f in select * from public.assurance_findings where status='accepted_risk' and accepted_risk_expires_at<=now() loop
  update public.assurance_findings set status='open',incident_started_at=now(),accepted_risk_at=null,accepted_risk_by=null,accepted_risk_reason=null,accepted_risk_expires_at=null,updated_at=now() where id=f.id;
  insert into public.assurance_events(event_key,finding_id,event_type,metadata) values('risk-expired:'||p_run_key||':'||f.id,f.id,'risk_expired',jsonb_build_object('previous_expiry',f.accepted_risk_expires_at)) on conflict(event_key) do nothing;v_count:=v_count+1;
 end loop;return v_count;end;$$;


ALTER FUNCTION "public"."expire_assurance_risk_acceptances"("p_run_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_or_cancel_action_proposals"("p_run_key" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare r record;v_exp integer:=0;v_cancel integer:=0;begin
 for r in select p.*,a.status as alert_status from public.action_proposals p join public.control_alerts a on a.id=p.alert_id where p.status in ('proposed','simulated','approved') loop
  if r.expires_at<=now() then
   update public.action_proposals set status='expired',updated_at=now() where id=r.id and status in ('proposed','simulated','approved');
   if found then insert into public.action_proposal_events(event_key,proposal_id,event_type,from_status,to_status,metadata) values('expire:'||p_run_key||':'||r.id,r.id,'expired',r.status,'expired','{}') on conflict do nothing;v_exp:=v_exp+1;end if;
  elsif r.alert_status in ('resolved','dismissed') then
   update public.action_proposals set status='cancelled',cancelled_at=now(),updated_at=now() where id=r.id and status in ('proposed','simulated','approved');
   if found then insert into public.action_proposal_events(event_key,proposal_id,event_type,from_status,to_status,metadata) values('cancel:'||p_run_key||':'||r.id,r.id,'cancelled',r.status,'cancelled',jsonb_build_object('reason','source_alert_closed')) on conflict do nothing;v_cancel:=v_cancel+1;end if;
  end if;
 end loop;
 return jsonb_build_object('expired',v_exp,'cancelled',v_cancel);
end;$$;


ALTER FUNCTION "public"."expire_or_cancel_action_proposals"("p_run_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_stale_release_candidates"("p_run_key" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare c record;v_exp integer:=0;begin for c in select * from public.release_candidates where status in('ready','evaluated') loop if c.expires_at<=now() or public.release_candidate_is_stale(c.id) then update public.release_candidates set status='expired',updated_at=now() where id=c.id and status in('ready','evaluated');if found then insert into public.release_events(event_key,candidate_id,event_type,metadata) values('expire:'||p_run_key||':'||c.id,c.id,'expired',jsonb_build_object('reason','stale_or_expired')) on conflict(event_key) do nothing;v_exp:=v_exp+1;end if;end if;end loop;return jsonb_build_object('expired',v_exp);end;$$;


ALTER FUNCTION "public"."expire_stale_release_candidates"("p_run_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fail_communication_job"("p_id" "uuid", "p_claim_token" "uuid", "p_error" "text", "p_retry" boolean DEFAULT true) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$begin update public.communication_jobs set status=case when p_retry and attempts<5 then 'pending' else 'failed' end,last_error=left(p_error,2000),scheduled_at=case when p_retry and attempts<5 then now()+make_interval(mins=>least(60,attempts*5)) else scheduled_at end,claim_token=null,claimed_at=null,updated_at=now() where id=p_id and status='processing' and claim_token=p_claim_token; return found; end$$;


ALTER FUNCTION "public"."fail_communication_job"("p_id" "uuid", "p_claim_token" "uuid", "p_error" "text", "p_retry" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fail_communication_job_v2"("p_instance_id" "uuid", "p_id" "uuid", "p_claim_token" "uuid", "p_error" "text", "p_retry" boolean DEFAULT true) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  update public.communication_jobs set
    status=case when p_retry and attempts<5 then 'pending' else 'failed' end,
    last_error=left(p_error,2000),
    scheduled_at=case when p_retry and attempts<5 then now()+make_interval(mins=>least(60,attempts*5)) else scheduled_at end,
    claim_token=null,claimed_at=null,updated_at=now()
  where instance_id=p_instance_id and id=p_id and status='processing' and claim_token=p_claim_token;
  return found;
end;
$$;


ALTER FUNCTION "public"."fail_communication_job_v2"("p_instance_id" "uuid", "p_id" "uuid", "p_claim_token" "uuid", "p_error" "text", "p_retry" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_customer_loyalty_snapshot"("p_customer_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
 select jsonb_build_object(
  'summary',coalesce((select to_jsonb(s) from public.customer_loyalty_summary s where s.customer_id=p_customer_id),'{}'::jsonb),
  'benefits',coalesce((select jsonb_agg(to_jsonb(b) order by b.rule_key) from public.active_customer_benefits b where b.customer_id=p_customer_id and b.usage_available=true),'[]'::jsonb),
  'ledger',coalesce((select jsonb_agg(to_jsonb(l) order by l.occurred_at desc) from (select id,entry_type,points,reason,occurred_at,order_id from public.loyalty_ledger where customer_id=p_customer_id order by occurred_at desc limit 30) l),'[]'::jsonb)
 );
$$;


ALTER FUNCTION "public"."get_customer_loyalty_snapshot"("p_customer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_customer_loyalty_snapshot_v2"("p_instance_id" "uuid", "p_customer_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$select jsonb_build_object('summary',coalesce((select to_jsonb(s) from public.customer_loyalty_summary s where s.instance_id=p_instance_id and s.customer_id=p_customer_id),'{}'::jsonb),'benefits',coalesce((select jsonb_agg(to_jsonb(b) order by b.rule_key) from public.active_customer_benefits b where b.instance_id=p_instance_id and b.customer_id=p_customer_id and b.usage_available=true),'[]'::jsonb),'ledger',coalesce((select jsonb_agg(to_jsonb(l) order by l.occurred_at desc) from(select id,entry_type,points,reason,occurred_at,order_id from public.loyalty_ledger where instance_id=p_instance_id and customer_id=p_customer_id order by occurred_at desc limit 30)l),'[]'::jsonb));$$;


ALTER FUNCTION "public"."get_customer_loyalty_snapshot_v2"("p_instance_id" "uuid", "p_customer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_order_operation_snapshot"("p_order_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
 select jsonb_build_object(
   'operation',coalesce((select to_jsonb(op) from public.order_operations op where op.order_id=p_order_id),'{}'::jsonb),
   'reservations',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.inventory_reservations x where x.order_id=p_order_id),'[]'::jsonb),
   'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.occurred_at desc) from (select id,event_key,event_type,from_status,to_status,occurred_at,metadata from public.fulfillment_events where order_id=p_order_id order by occurred_at desc limit 50)e),'[]'::jsonb),
   'returns',coalesce((select jsonb_agg(to_jsonb(rc) order by rc.requested_at desc) from (select id,status,refund_amount_gross_huf,requested_at,received_at,refunded_at,inventory_restocked_at from public.return_cases where order_id=p_order_id order by requested_at desc)rc),'[]'::jsonb),
   'support',coalesce((select jsonb_agg(to_jsonb(st) order by st.created_at desc) from (select id,ticket_number,status,priority,category,created_at from public.support_tickets where order_id=p_order_id order by created_at desc)st),'[]'::jsonb)
 );
$$;


ALTER FUNCTION "public"."get_order_operation_snapshot"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_action_policy_identity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin if new.policy_key is distinct from old.policy_key or new.version is distinct from old.version then raise exception 'policy_identity_immutable';end if;return new;end;$$;


ALTER FUNCTION "public"."guard_action_policy_identity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_action_policy_version_definition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin
 if new.policy_key is distinct from old.policy_key or new.version is distinct from old.version or new.name is distinct from old.name or new.category is distinct from old.category or new.alert_type is distinct from old.alert_type or new.min_severity is distinct from old.min_severity or new.action_kind is distinct from old.action_kind or new.impact_class is distinct from old.impact_class or new.approval_mode is distinct from old.approval_mode or new.expires_after_hours is distinct from old.expires_after_hours or new.action_template is distinct from old.action_template or new.conditions is distinct from old.conditions then raise exception 'policy_version_definition_immutable_create_new_version';end if;new.updated_at:=now();return new;end;$$;


ALTER FUNCTION "public"."guard_action_policy_version_definition"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_action_proposal_identity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin if new.proposal_key is distinct from old.proposal_key or new.alert_id is distinct from old.alert_id or new.policy_id is distinct from old.policy_id or new.action_kind is distinct from old.action_kind or new.impact_class is distinct from old.impact_class then raise exception 'proposal_identity_immutable';end if;return new;end;$$;


ALTER FUNCTION "public"."guard_action_proposal_identity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_action_proposal_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin
 if old.status in ('rejected','expired','executed','cancelled') and new.status is distinct from old.status then raise exception 'terminal_proposal_state';end if;
 if new.status='approved' and new.simulated_at is null then raise exception 'approval_requires_simulation';end if;
 if new.status='executed' and old.status<>'approved' then raise exception 'execution_requires_approved_state';end if;
 return new;end;$$;


ALTER FUNCTION "public"."guard_action_proposal_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_assurance_append_only"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin raise exception 'assurance_ledger_append_only';end;$$;


ALTER FUNCTION "public"."guard_assurance_append_only"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_assurance_control_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin
 if new.control_key is distinct from old.control_key or new.version is distinct from old.version or new.name is distinct from old.name or new.category is distinct from old.category or new.severity is distinct from old.severity or new.weight is distinct from old.weight or new.freshness_minutes is distinct from old.freshness_minutes or new.check_kind is distinct from old.check_kind or new.definition is distinct from old.definition then raise exception 'assurance_control_version_immutable';end if;new.updated_at:=now();return new;end;$$;


ALTER FUNCTION "public"."guard_assurance_control_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_assurance_finding_identity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin if new.finding_key is distinct from old.finding_key or new.control_id is distinct from old.control_id or new.subject_key is distinct from old.subject_key or new.first_detected_at is distinct from old.first_detected_at then raise exception 'assurance_finding_identity_immutable';end if;return new;end;$$;


ALTER FUNCTION "public"."guard_assurance_finding_identity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_automation_event_immutable"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin raise exception 'automation_events_append_only';end;$$;


ALTER FUNCTION "public"."guard_automation_event_immutable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_automation_instance_identity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin if new.instance_key is distinct from old.instance_key or new.runbook_id is distinct from old.runbook_id or new.alert_id is distinct from old.alert_id or new.proposal_id is distinct from old.proposal_id then raise exception 'automation_instance_identity_immutable';end if;return new;end;$$;


ALTER FUNCTION "public"."guard_automation_instance_identity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_automation_instance_terminal"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin if old.status in ('completed','failed','cancelled') and new.status is distinct from old.status then raise exception 'terminal_automation_instance_immutable';end if;return new;end;$$;


ALTER FUNCTION "public"."guard_automation_instance_terminal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_automation_runbook_identity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin
 if new.runbook_key is distinct from old.runbook_key or new.version is distinct from old.version or new.name is distinct from old.name or new.category is distinct from old.category or new.min_severity is distinct from old.min_severity or new.risk_class is distinct from old.risk_class or new.requires_action_approval is distinct from old.requires_action_approval or new.max_duration_hours is distinct from old.max_duration_hours or new.max_failures is distinct from old.max_failures or new.definition is distinct from old.definition then raise exception 'runbook_version_definition_immutable_create_new_version';end if;new.updated_at:=now();return new;end;$$;


ALTER FUNCTION "public"."guard_automation_runbook_identity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_automation_runbook_step_immutable"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin raise exception 'runbook_step_definition_immutable_create_new_version';end;$$;


ALTER FUNCTION "public"."guard_automation_runbook_step_immutable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_automation_step_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin
 if new.instance_id is distinct from old.instance_id or new.step_id is distinct from old.step_id then raise exception 'automation_step_identity_immutable';end if;
 if old.status in ('succeeded','skipped','cancelled') and new.status is distinct from old.status then raise exception 'terminal_automation_step_immutable';end if;
 if old.status='pending' and new.status not in ('pending','ready','cancelled') then raise exception 'invalid_step_transition';end if;
 if old.status='ready' and new.status not in ('ready','running','cancelled') then raise exception 'invalid_step_transition';end if;
 if old.status='running' and new.status not in ('running','waiting','succeeded','failed') then raise exception 'invalid_step_transition';end if;
 if old.status='waiting' and new.status not in ('waiting','succeeded','failed','cancelled') then raise exception 'invalid_step_transition';end if;
 if old.status='failed' and new.status not in ('failed','ready','running','cancelled') then raise exception 'invalid_step_transition';end if;return new;end;$$;


ALTER FUNCTION "public"."guard_automation_step_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_automation_step_source_current"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare i public.automation_runbook_instances;a public.control_alerts;begin
 if new.status='running' and old.status is distinct from new.status then
   select * into i from public.automation_runbook_instances where id=new.instance_id;if i.status<>'active' then raise exception 'instance_not_active';end if;select * into a from public.control_alerts where id=i.alert_id;
   if a.status not in ('open','acknowledged') then raise exception 'source_alert_not_active';end if;
   if not(i.source_snapshot ? 'incident_started_at') or (i.source_snapshot->>'incident_started_at')::timestamptz is distinct from a.incident_started_at then raise exception 'source_incident_stale';end if;
 end if;return new;end;$$;


ALTER FUNCTION "public"."guard_automation_step_source_current"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_closed_support_thread"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_status public.support_ticket_status;v_instance uuid;
begin
  select status,instance_id into v_status,v_instance from public.support_tickets where id=new.ticket_id for update;
  if not found then raise exception 'Az ügy nem található.'; end if;
  if v_instance<>new.instance_id then raise exception 'Cross-store support relation is not allowed.'; end if;
  if v_status='closed' then raise exception 'A lezárt ügyhöz nem küldhető új üzenet.'; end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."guard_closed_support_thread"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."guard_closed_support_thread"() IS 'Locks the parent support ticket and rejects message insertion when the thread is closed.';



CREATE OR REPLACE FUNCTION "public"."guard_control_alert_identity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin
  if new.alert_key is distinct from old.alert_key then raise exception 'control_alert_key_immutable'; end if;
  return new;
end;$$;


ALTER FUNCTION "public"."guard_control_alert_identity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_control_task_identity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin
  if new.task_key is distinct from old.task_key or new.alert_id is distinct from old.alert_id then raise exception 'control_task_identity_immutable'; end if;
  return new;
end;$$;


ALTER FUNCTION "public"."guard_control_task_identity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_order_status_against_operations"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_op text;
begin
  if new.status is not distinct from old.status then return new; end if;

  select operational_status into v_op
  from public.order_operations
  where order_id=new.id and instance_id=new.instance_id;

  if new.status='cancelled' and v_op in('handed_over','delivered') then
    raise exception 'A futárnak átadott vagy kézbesített rendelés nem törölhető; használj visszáru/visszatérítés folyamatot.';
  end if;
  if old.status='completed' and new.status not in('completed','refunded') then
    raise exception 'A teljesített rendelés kereskedelmi állapota nem állítható vissza.';
  end if;
  if old.status='shipped' and new.status in('draft','pending','paid','processing') then
    raise exception 'A feladott rendelés nem állítható vissza feldolgozási állapotba.';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."guard_order_status_against_operations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_release_audit_immutable"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin raise exception 'release_audit_append_only';end;$$;


ALTER FUNCTION "public"."guard_release_audit_immutable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_release_candidate_identity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin
 if new.candidate_key is distinct from old.candidate_key or new.version_label is distinct from old.version_label or new.source_ref is distinct from old.source_ref or new.source_sha is distinct from old.source_sha or new.risk_class is distinct from old.risk_class or new.change_summary is distinct from old.change_summary or new.rollback_plan is distinct from old.rollback_plan or new.policy_id is distinct from old.policy_id or new.created_by is distinct from old.created_by then raise exception 'release_candidate_identity_immutable';end if;return new;end;$$;


ALTER FUNCTION "public"."guard_release_candidate_identity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_release_policy_definition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin
 if new.policy_key is distinct from old.policy_key or new.version is distinct from old.version or new.name is distinct from old.name or new.risk_class is distinct from old.risk_class or new.min_assurance_score is distinct from old.min_assurance_score or new.max_stale_controls is distinct from old.max_stale_controls or new.max_high_findings is distinct from old.max_high_findings or new.max_accepted_risks is distinct from old.max_accepted_risks or new.require_ci_green is distinct from old.require_ci_green or new.ci_freshness_minutes is distinct from old.ci_freshness_minutes or new.require_rollback_plan is distinct from old.require_rollback_plan or new.approval_mode is distinct from old.approval_mode or new.evaluation_valid_minutes is distinct from old.evaluation_valid_minutes then raise exception 'release_policy_version_immutable';end if;new.updated_at:=now();return new;end;$$;


ALTER FUNCTION "public"."guard_release_policy_definition"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_feature_entitlement"("p_instance_id" "uuid", "p_feature_code" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$select private.has_feature_entitlement_current(p_instance_id,p_feature_code);$$;


ALTER FUNCTION "public"."has_feature_entitlement"("p_instance_id" "uuid", "p_feature_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_marketing_consent"("p_email" "text", "p_channel" "text" DEFAULT 'email'::"text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$select coalesce((select mc.status='granted' from public.marketing_consents mc where lower(mc.email)=lower(trim(p_email)) and mc.channel=p_channel order by mc.occurred_at desc,mc.id desc limit 1),false);$$;


ALTER FUNCTION "public"."has_marketing_consent"("p_email" "text", "p_channel" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_marketing_consent_v2"("p_instance_id" "uuid", "p_email" "text", "p_channel" "text" DEFAULT 'email'::"text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce((select mc.status='granted' from public.marketing_consents mc
    where mc.instance_id=p_instance_id and lower(mc.email)=lower(trim(p_email)) and mc.channel=p_channel
    order by mc.occurred_at desc,mc.id desc limit 1),false);
$$;


ALTER FUNCTION "public"."has_marketing_consent_v2"("p_instance_id" "uuid", "p_email" "text", "p_channel" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_store_role"("p_instance_id" "uuid", "p_roles" "text"[], "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$select private.has_store_role_current(p_instance_id,p_roles,p_user_id);$$;


ALTER FUNCTION "public"."has_store_role"("p_instance_id" "uuid", "p_roles" "text"[], "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_support_ticket_thread"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.message is not null and char_length(trim(new.message))>0 then
    insert into public.support_ticket_messages(instance_id,ticket_id,author_user_id,author_role,message,created_at)
    values(new.instance_id,new.id,new.user_id,'customer',new.message,new.created_at)
    on conflict do nothing;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."initialize_support_ticket_thread"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_communication_suppressed"("p_email" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$select exists(select 1 from public.communication_suppressions where lower(email)=lower(trim(p_email)) and active=true);$$;


ALTER FUNCTION "public"."is_communication_suppressed"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_communication_suppressed_v2"("p_instance_id" "uuid", "p_email" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists(select 1 from public.communication_suppressions
    where instance_id=p_instance_id and lower(email)=lower(trim(p_email)) and active=true);
$$;


ALTER FUNCTION "public"."is_communication_suppressed_v2"("p_instance_id" "uuid", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_platform_operator"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$select private.is_platform_operator_current(p_user_id);$$;


ALTER FUNCTION "public"."is_platform_operator"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."maintain_control_incident_started_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin
  if new.status='open' and old.status in ('resolved','dismissed') and old.status is distinct from new.status then
    new.incident_started_at:=now();
    new.acknowledged_at:=null;
    new.acknowledged_by:=null;
    new.snoozed_until:=null;
    new.resolved_at:=null;
    new.resolved_by:=null;
    new.dismissed_at:=null;
    new.dismissed_by:=null;
  end if;
  return new;
end;$$;


ALTER FUNCTION "public"."maintain_control_incident_started_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."merchant_intelligence_store_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$ declare v uuid; begin
 if tg_table_name='customer_journey_steps' then select instance_id into v from public.customer_journeys where id=new.journey_id;
 elsif tg_table_name in ('control_alert_events','control_tasks') then select instance_id into v from public.control_alerts where id=new.alert_id;
 elsif tg_table_name in ('action_proposal_events','action_approvals','action_executions') then select instance_id into v from public.action_proposals where id=new.proposal_id;
 elsif tg_table_name='automation_runbook_instances' then select instance_id into v from public.control_alerts where id=new.alert_id; end if;
 if v is null then raise exception 'tenant_parent_missing';end if; if new.instance_id is null then new.instance_id:=v;elsif new.instance_id<>v then raise exception 'tenant_parent_mismatch';end if; return new; end$$;


ALTER FUNCTION "public"."merchant_intelligence_store_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."place_order_idempotent"("p_idempotency_key" "text", "p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text" DEFAULT ''::"text", "p_billing_tax_number" "text" DEFAULT ''::"text", "p_billing_postcode" "text" DEFAULT ''::"text", "p_billing_city" "text" DEFAULT ''::"text", "p_billing_address" "text" DEFAULT ''::"text", "p_shipping_name" "text" DEFAULT ''::"text", "p_shipping_postcode" "text" DEFAULT ''::"text", "p_shipping_city" "text" DEFAULT ''::"text", "p_shipping_address" "text" DEFAULT ''::"text", "p_customer_phone" "text" DEFAULT ''::"text", "p_shipping_method" "text" DEFAULT 'foxpost'::"text", "p_parcel_point_id" "text" DEFAULT ''::"text", "p_payment_method" "text" DEFAULT 'bank_transfer'::"text", "p_note" "text" DEFAULT ''::"text", "p_customer_id" "uuid" DEFAULT NULL::"uuid", "p_coupon_code" "text" DEFAULT ''::"text", "p_items" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_response jsonb;v_request_fingerprint text;v_existing_fingerprint text;begin
 if p_idempotency_key is null or length(trim(p_idempotency_key))<16 or length(p_idempotency_key)>120 then raise exception 'Érvénytelen rendelési kérésazonosító.'; end if;
 v_request_fingerprint:=md5(jsonb_build_object('customer_email',lower(trim(coalesce(p_customer_email,''))),'billing_name',trim(coalesce(p_billing_name,'')),'billing_company',trim(coalesce(p_billing_company,'')),'billing_tax_number',trim(coalesce(p_billing_tax_number,'')),'billing_postcode',trim(coalesce(p_billing_postcode,'')),'billing_city',trim(coalesce(p_billing_city,'')),'billing_address',trim(coalesce(p_billing_address,'')),'shipping_name',trim(coalesce(p_shipping_name,'')),'shipping_postcode',trim(coalesce(p_shipping_postcode,'')),'shipping_city',trim(coalesce(p_shipping_city,'')),'shipping_address',trim(coalesce(p_shipping_address,'')),'customer_phone',trim(coalesce(p_customer_phone,'')),'shipping_method',coalesce(p_shipping_method,''),'parcel_point_id',trim(coalesce(p_parcel_point_id,'')),'payment_method',coalesce(p_payment_method,''),'note',coalesce(p_note,''),'customer_id',p_customer_id,'coupon_code',upper(trim(coalesce(p_coupon_code,''))),'items',coalesce(p_items,'[]'::jsonb))::text);
 begin insert into public.order_request_keys(idempotency_key,request_fingerprint) values(trim(p_idempotency_key),v_request_fingerprint); exception when unique_violation then select response,request_fingerprint into v_response,v_existing_fingerprint from public.order_request_keys where idempotency_key=trim(p_idempotency_key); if v_existing_fingerprint is not null and v_existing_fingerprint<>v_request_fingerprint then raise exception 'A rendelési kérésazonosító már más rendelési adatokhoz lett felhasználva.'; end if; if v_response is null then raise exception 'A rendelés feldolgozása folyamatban van. Kérjük, próbáld újra rövidesen.'; end if; return v_response||jsonb_build_object('idempotency_replayed',true); end;
 v_response:=public.place_order(p_customer_email=>p_customer_email,p_billing_name=>p_billing_name,p_billing_company=>p_billing_company,p_billing_tax_number=>p_billing_tax_number,p_billing_postcode=>p_billing_postcode,p_billing_city=>p_billing_city,p_billing_address=>p_billing_address,p_shipping_name=>p_shipping_name,p_shipping_postcode=>p_shipping_postcode,p_shipping_city=>p_shipping_city,p_shipping_address=>p_shipping_address,p_customer_phone=>p_customer_phone,p_shipping_method=>p_shipping_method,p_parcel_point_id=>p_parcel_point_id,p_payment_method=>p_payment_method,p_note=>p_note,p_customer_id=>p_customer_id,p_coupon_code=>p_coupon_code,p_items=>p_items);
 update public.order_request_keys set response=v_response,request_fingerprint=v_request_fingerprint where idempotency_key=trim(p_idempotency_key); return v_response||jsonb_build_object('idempotency_replayed',false);
end;$$;


ALTER FUNCTION "public"."place_order_idempotent"("p_idempotency_key" "text", "p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text", "p_billing_tax_number" "text", "p_billing_postcode" "text", "p_billing_city" "text", "p_billing_address" "text", "p_shipping_name" "text", "p_shipping_postcode" "text", "p_shipping_city" "text", "p_shipping_address" "text", "p_customer_phone" "text", "p_shipping_method" "text", "p_parcel_point_id" "text", "p_payment_method" "text", "p_note" "text", "p_customer_id" "uuid", "p_coupon_code" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."place_order_provider"("p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text" DEFAULT ''::"text", "p_billing_tax_number" "text" DEFAULT ''::"text", "p_billing_postcode" "text" DEFAULT ''::"text", "p_billing_city" "text" DEFAULT ''::"text", "p_billing_address" "text" DEFAULT ''::"text", "p_shipping_name" "text" DEFAULT ''::"text", "p_shipping_postcode" "text" DEFAULT ''::"text", "p_shipping_city" "text" DEFAULT ''::"text", "p_shipping_address" "text" DEFAULT ''::"text", "p_customer_phone" "text" DEFAULT ''::"text", "p_shipping_provider" "text" DEFAULT 'pickup'::"text", "p_shipping_kind" "text" DEFAULT 'pickup'::"text", "p_shipping_fee_huf" integer DEFAULT 0, "p_parcel_point_id" "text" DEFAULT ''::"text", "p_payment_provider" "text" DEFAULT 'bank_transfer'::"text", "p_note" "text" DEFAULT ''::"text", "p_customer_id" "uuid" DEFAULT NULL::"uuid", "p_coupon_code" "text" DEFAULT ''::"text", "p_items" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare r jsonb;oid uuid;oldnum text;newnum text;base_total integer;
begin
 if p_shipping_provider !~ '^[a-z0-9_-]{2,80}$' or p_payment_provider !~ '^[a-z0-9_-]{2,80}$' then raise exception 'Érvénytelen szolgáltatói azonosító.'; end if;
 if p_shipping_kind not in ('parcel_point','home_delivery','pickup') then raise exception 'Érvénytelen szállítási típus.'; end if;
 if p_shipping_fee_huf<0 or p_shipping_fee_huf>1000000 then raise exception 'Érvénytelen szállítási díj.'; end if;
 if p_shipping_kind='parcel_point' and length(trim(coalesce(p_parcel_point_id,'')))<2 then raise exception 'Átvételi pontot kell választani.'; end if;
 r:=public.place_order(p_customer_email=>p_customer_email,p_billing_name=>p_billing_name,p_billing_company=>p_billing_company,p_billing_tax_number=>p_billing_tax_number,p_billing_postcode=>p_billing_postcode,p_billing_city=>p_billing_city,p_billing_address=>p_billing_address,p_shipping_name=>p_shipping_name,p_shipping_postcode=>p_shipping_postcode,p_shipping_city=>p_shipping_city,p_shipping_address=>p_shipping_address,p_customer_phone=>p_customer_phone,p_shipping_method=>'pickup',p_parcel_point_id=>'',p_payment_method=>'bank_transfer',p_note=>p_note,p_customer_id=>p_customer_id,p_coupon_code=>p_coupon_code,p_items=>p_items);
 oid:=(r->>'order_id')::uuid; oldnum:=r->>'order_number'; base_total:=(r->>'total_gross_huf')::integer; newnum:='ORD-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(oid::text,'-',''),1,8));
 update public.orders set order_number=newnum,shipping_method=p_shipping_provider,parcel_point_id=nullif(trim(p_parcel_point_id),''),payment_method=p_payment_provider,shipping_gross_huf=p_shipping_fee_huf,total_gross_huf=base_total+p_shipping_fee_huf,updated_at=now() where id=oid;
 update public.order_events set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('payment_method',p_payment_provider,'shipping_method',p_shipping_provider,'shipping_kind',p_shipping_kind) where order_id=oid and event_type='order_created';
 update public.inventory_events set metadata=jsonb_set(coalesce(metadata,'{}'::jsonb),'{order_number}',to_jsonb(newnum),true) where order_id=oid;
 return r||jsonb_build_object('order_number',newnum,'shipping_gross_huf',p_shipping_fee_huf,'total_gross_huf',base_total+p_shipping_fee_huf,'payment_provider',p_payment_provider,'shipping_provider',p_shipping_provider);
end;$_$;


ALTER FUNCTION "public"."place_order_provider"("p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text", "p_billing_tax_number" "text", "p_billing_postcode" "text", "p_billing_city" "text", "p_billing_address" "text", "p_shipping_name" "text", "p_shipping_postcode" "text", "p_shipping_city" "text", "p_shipping_address" "text", "p_customer_phone" "text", "p_shipping_provider" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_parcel_point_id" "text", "p_payment_provider" "text", "p_note" "text", "p_customer_id" "uuid", "p_coupon_code" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."place_order_provider_idempotent"("p_idempotency_key" "text", "p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text" DEFAULT ''::"text", "p_billing_tax_number" "text" DEFAULT ''::"text", "p_billing_postcode" "text" DEFAULT ''::"text", "p_billing_city" "text" DEFAULT ''::"text", "p_billing_address" "text" DEFAULT ''::"text", "p_shipping_name" "text" DEFAULT ''::"text", "p_shipping_postcode" "text" DEFAULT ''::"text", "p_shipping_city" "text" DEFAULT ''::"text", "p_shipping_address" "text" DEFAULT ''::"text", "p_customer_phone" "text" DEFAULT ''::"text", "p_shipping_provider" "text" DEFAULT 'pickup'::"text", "p_shipping_kind" "text" DEFAULT 'pickup'::"text", "p_shipping_fee_huf" integer DEFAULT 0, "p_parcel_point_id" "text" DEFAULT ''::"text", "p_payment_provider" "text" DEFAULT 'bank_transfer'::"text", "p_note" "text" DEFAULT ''::"text", "p_customer_id" "uuid" DEFAULT NULL::"uuid", "p_coupon_code" "text" DEFAULT ''::"text", "p_items" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare resp jsonb;fp text;existing_fp text;
begin
 if p_idempotency_key is null or length(trim(p_idempotency_key))<16 or length(p_idempotency_key)>120 then raise exception 'Érvénytelen rendelési kérésazonosító.'; end if;
 fp:=md5(jsonb_build_object('email',lower(trim(coalesce(p_customer_email,''))),'name',trim(coalesce(p_billing_name,'')),'shipping_provider',p_shipping_provider,'shipping_kind',p_shipping_kind,'shipping_fee',p_shipping_fee_huf,'payment_provider',p_payment_provider,'parcel_point',trim(coalesce(p_parcel_point_id,'')),'coupon',upper(trim(coalesce(p_coupon_code,''))),'items',coalesce(p_items,'[]'::jsonb))::text);
 begin insert into public.order_request_keys(idempotency_key,request_fingerprint) values(trim(p_idempotency_key),fp); exception when unique_violation then select response,request_fingerprint into resp,existing_fp from public.order_request_keys where idempotency_key=trim(p_idempotency_key); if existing_fp is not null and existing_fp<>fp then raise exception 'A rendelési kérésazonosító már más rendelési adatokhoz lett felhasználva.'; end if; if resp is null then raise exception 'A rendelés feldolgozása folyamatban van.'; end if; return resp||jsonb_build_object('idempotency_replayed',true); end;
 resp:=public.place_order_provider(p_customer_email,p_billing_name,p_billing_company,p_billing_tax_number,p_billing_postcode,p_billing_city,p_billing_address,p_shipping_name,p_shipping_postcode,p_shipping_city,p_shipping_address,p_customer_phone,p_shipping_provider,p_shipping_kind,p_shipping_fee_huf,p_parcel_point_id,p_payment_provider,p_note,p_customer_id,p_coupon_code,p_items);
 update public.order_request_keys set response=resp,request_fingerprint=fp where idempotency_key=trim(p_idempotency_key); return resp||jsonb_build_object('idempotency_replayed',false);
end;$$;


ALTER FUNCTION "public"."place_order_provider_idempotent"("p_idempotency_key" "text", "p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text", "p_billing_tax_number" "text", "p_billing_postcode" "text", "p_billing_city" "text", "p_billing_address" "text", "p_shipping_name" "text", "p_shipping_postcode" "text", "p_shipping_city" "text", "p_shipping_address" "text", "p_customer_phone" "text", "p_shipping_provider" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_parcel_point_id" "text", "p_payment_provider" "text", "p_note" "text", "p_customer_id" "uuid", "p_coupon_code" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."place_order_provider_v2"("p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text" DEFAULT ''::"text", "p_billing_tax_number" "text" DEFAULT ''::"text", "p_billing_postcode" "text" DEFAULT ''::"text", "p_billing_city" "text" DEFAULT ''::"text", "p_billing_address" "text" DEFAULT ''::"text", "p_shipping_name" "text" DEFAULT ''::"text", "p_shipping_postcode" "text" DEFAULT ''::"text", "p_shipping_city" "text" DEFAULT ''::"text", "p_shipping_address" "text" DEFAULT ''::"text", "p_customer_phone" "text" DEFAULT ''::"text", "p_shipping_provider" "text" DEFAULT 'pickup'::"text", "p_shipping_kind" "text" DEFAULT 'pickup'::"text", "p_shipping_fee_huf" integer DEFAULT 0, "p_free_shipping_threshold_huf" integer DEFAULT 0, "p_parcel_point_id" "text" DEFAULT ''::"text", "p_payment_provider" "text" DEFAULT 'bank_transfer'::"text", "p_note" "text" DEFAULT ''::"text", "p_customer_id" "uuid" DEFAULT NULL::"uuid", "p_coupon_code" "text" DEFAULT ''::"text", "p_items" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare r jsonb;oid uuid;newnum text;base_total integer;actual_fee integer;
begin
 if p_shipping_provider !~ '^[a-z0-9_-]{2,80}$' or p_payment_provider !~ '^[a-z0-9_-]{2,80}$' then raise exception 'Érvénytelen szolgáltatói azonosító.'; end if;
 if p_shipping_kind not in ('parcel_point','home_delivery','pickup') then raise exception 'Érvénytelen szállítási típus.'; end if;
 if p_shipping_fee_huf<0 or p_shipping_fee_huf>1000000 or p_free_shipping_threshold_huf<0 or p_free_shipping_threshold_huf>100000000 then raise exception 'Érvénytelen szállítási díj vagy küszöb.'; end if;
 if p_shipping_kind='parcel_point' and length(trim(coalesce(p_parcel_point_id,'')))<2 then raise exception 'Átvételi pontot kell választani.'; end if;
 r:=public.place_order(p_customer_email=>p_customer_email,p_billing_name=>p_billing_name,p_billing_company=>p_billing_company,p_billing_tax_number=>p_billing_tax_number,p_billing_postcode=>p_billing_postcode,p_billing_city=>p_billing_city,p_billing_address=>p_billing_address,p_shipping_name=>p_shipping_name,p_shipping_postcode=>p_shipping_postcode,p_shipping_city=>p_shipping_city,p_shipping_address=>p_shipping_address,p_customer_phone=>p_customer_phone,p_shipping_method=>'pickup',p_parcel_point_id=>'',p_payment_method=>'bank_transfer',p_note=>p_note,p_customer_id=>p_customer_id,p_coupon_code=>p_coupon_code,p_items=>p_items);
 oid:=(r->>'order_id')::uuid;base_total:=(r->>'total_gross_huf')::integer;actual_fee:=case when p_shipping_kind='pickup' then 0 when p_free_shipping_threshold_huf>0 and base_total>=p_free_shipping_threshold_huf then 0 else p_shipping_fee_huf end;newnum:='ORD-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(oid::text,'-',''),1,8));
 update public.orders set order_number=newnum,shipping_method=p_shipping_provider,parcel_point_id=nullif(trim(p_parcel_point_id),''),payment_method=p_payment_provider,shipping_gross_huf=actual_fee,total_gross_huf=base_total+actual_fee,updated_at=now() where id=oid;
 update public.order_events set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('payment_method',p_payment_provider,'shipping_method',p_shipping_provider,'shipping_kind',p_shipping_kind) where order_id=oid and event_type='order_created';
 update public.inventory_events set metadata=jsonb_set(coalesce(metadata,'{}'::jsonb),'{order_number}',to_jsonb(newnum),true) where order_id=oid;
 return r||jsonb_build_object('order_number',newnum,'shipping_gross_huf',actual_fee,'total_gross_huf',base_total+actual_fee,'payment_provider',p_payment_provider,'shipping_provider',p_shipping_provider);
end;$_$;


ALTER FUNCTION "public"."place_order_provider_v2"("p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text", "p_billing_tax_number" "text", "p_billing_postcode" "text", "p_billing_city" "text", "p_billing_address" "text", "p_shipping_name" "text", "p_shipping_postcode" "text", "p_shipping_city" "text", "p_shipping_address" "text", "p_customer_phone" "text", "p_shipping_provider" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_free_shipping_threshold_huf" integer, "p_parcel_point_id" "text", "p_payment_provider" "text", "p_note" "text", "p_customer_id" "uuid", "p_coupon_code" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."place_order_provider_v2_idempotent"("p_idempotency_key" "text", "p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text" DEFAULT ''::"text", "p_billing_tax_number" "text" DEFAULT ''::"text", "p_billing_postcode" "text" DEFAULT ''::"text", "p_billing_city" "text" DEFAULT ''::"text", "p_billing_address" "text" DEFAULT ''::"text", "p_shipping_name" "text" DEFAULT ''::"text", "p_shipping_postcode" "text" DEFAULT ''::"text", "p_shipping_city" "text" DEFAULT ''::"text", "p_shipping_address" "text" DEFAULT ''::"text", "p_customer_phone" "text" DEFAULT ''::"text", "p_shipping_provider" "text" DEFAULT 'pickup'::"text", "p_shipping_kind" "text" DEFAULT 'pickup'::"text", "p_shipping_fee_huf" integer DEFAULT 0, "p_free_shipping_threshold_huf" integer DEFAULT 0, "p_parcel_point_id" "text" DEFAULT ''::"text", "p_payment_provider" "text" DEFAULT 'bank_transfer'::"text", "p_note" "text" DEFAULT ''::"text", "p_customer_id" "uuid" DEFAULT NULL::"uuid", "p_coupon_code" "text" DEFAULT ''::"text", "p_items" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare resp jsonb;fp text;existing_fp text;
begin
 if p_idempotency_key is null or length(trim(p_idempotency_key))<16 or length(p_idempotency_key)>120 then raise exception 'Érvénytelen rendelési kérésazonosító.'; end if;
 fp:=md5(jsonb_build_object('email',lower(trim(coalesce(p_customer_email,''))),'name',trim(coalesce(p_billing_name,'')),'shipping_provider',p_shipping_provider,'shipping_kind',p_shipping_kind,'shipping_fee',p_shipping_fee_huf,'free_shipping_threshold',p_free_shipping_threshold_huf,'payment_provider',p_payment_provider,'parcel_point',trim(coalesce(p_parcel_point_id,'')),'coupon',upper(trim(coalesce(p_coupon_code,''))),'items',coalesce(p_items,'[]'::jsonb))::text);
 begin insert into public.order_request_keys(idempotency_key,request_fingerprint) values(trim(p_idempotency_key),fp); exception when unique_violation then select response,request_fingerprint into resp,existing_fp from public.order_request_keys where idempotency_key=trim(p_idempotency_key); if existing_fp is not null and existing_fp<>fp then raise exception 'A rendelési kérésazonosító már más rendelési adatokhoz lett felhasználva.'; end if; if resp is null then raise exception 'A rendelés feldolgozása folyamatban van.'; end if; return resp||jsonb_build_object('idempotency_replayed',true); end;
 resp:=public.place_order_provider_v2(p_customer_email,p_billing_name,p_billing_company,p_billing_tax_number,p_billing_postcode,p_billing_city,p_billing_address,p_shipping_name,p_shipping_postcode,p_shipping_city,p_shipping_address,p_customer_phone,p_shipping_provider,p_shipping_kind,p_shipping_fee_huf,p_free_shipping_threshold_huf,p_parcel_point_id,p_payment_provider,p_note,p_customer_id,p_coupon_code,p_items);
 update public.order_request_keys set response=resp,request_fingerprint=fp where idempotency_key=trim(p_idempotency_key); return resp||jsonb_build_object('idempotency_replayed',false);
end;$$;


ALTER FUNCTION "public"."place_order_provider_v2_idempotent"("p_idempotency_key" "text", "p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text", "p_billing_tax_number" "text", "p_billing_postcode" "text", "p_billing_city" "text", "p_billing_address" "text", "p_shipping_name" "text", "p_shipping_postcode" "text", "p_shipping_city" "text", "p_shipping_address" "text", "p_customer_phone" "text", "p_shipping_provider" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_free_shipping_threshold_huf" integer, "p_parcel_point_id" "text", "p_payment_provider" "text", "p_note" "text", "p_customer_id" "uuid", "p_coupon_code" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."place_order_provider_v3_idempotent"("p_instance_id" "uuid", "p_idempotency_key" "text", "p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text" DEFAULT ''::"text", "p_billing_tax_number" "text" DEFAULT ''::"text", "p_billing_postcode" "text" DEFAULT ''::"text", "p_billing_city" "text" DEFAULT ''::"text", "p_billing_address" "text" DEFAULT ''::"text", "p_shipping_name" "text" DEFAULT ''::"text", "p_shipping_postcode" "text" DEFAULT ''::"text", "p_shipping_city" "text" DEFAULT ''::"text", "p_shipping_address" "text" DEFAULT ''::"text", "p_customer_phone" "text" DEFAULT ''::"text", "p_shipping_provider" "text" DEFAULT 'pickup'::"text", "p_shipping_kind" "text" DEFAULT 'pickup'::"text", "p_shipping_fee_huf" integer DEFAULT 0, "p_free_shipping_threshold_huf" integer DEFAULT 0, "p_parcel_point_id" "text" DEFAULT ''::"text", "p_payment_provider" "text" DEFAULT 'bank_transfer'::"text", "p_note" "text" DEFAULT ''::"text", "p_customer_id" "uuid" DEFAULT NULL::"uuid", "p_coupon_code" "text" DEFAULT ''::"text", "p_items" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  response jsonb;
  order_id_value uuid;
  scoped_key text;
  item_count integer;
  valid_item_count integer;
begin
  if not exists(select 1 from public.webshop_instances w where w.id=p_instance_id and w.status in ('pilot','active')) then
    raise exception 'A webshop nem rendelhető.';
  end if;
  if jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array' then raise exception 'Érvénytelen kosár.'; end if;
  select count(*) into item_count from jsonb_array_elements(p_items);
  if item_count<1 then raise exception 'A kosár üres.'; end if;
  select count(*) into valid_item_count
  from jsonb_array_elements(p_items) item
  join public.product_variants v on v.id=(item->>'variant_id')::uuid
  join public.products p on p.id=v.product_id
  where v.instance_id=p_instance_id and p.instance_id=p_instance_id and v.active and p.active;
  if valid_item_count<>item_count then raise exception 'A kosár másik webshophoz tartozó vagy nem elérhető terméket tartalmaz.'; end if;

  scoped_key:=md5(p_instance_id::text||':'||trim(coalesce(p_idempotency_key,'')));
  response:=public.place_order_provider_v2_idempotent(
    p_idempotency_key=>scoped_key,
    p_customer_email=>p_customer_email,
    p_billing_name=>p_billing_name,
    p_billing_company=>p_billing_company,
    p_billing_tax_number=>p_billing_tax_number,
    p_billing_postcode=>p_billing_postcode,
    p_billing_city=>p_billing_city,
    p_billing_address=>p_billing_address,
    p_shipping_name=>p_shipping_name,
    p_shipping_postcode=>p_shipping_postcode,
    p_shipping_city=>p_shipping_city,
    p_shipping_address=>p_shipping_address,
    p_customer_phone=>p_customer_phone,
    p_shipping_provider=>p_shipping_provider,
    p_shipping_kind=>p_shipping_kind,
    p_shipping_fee_huf=>p_shipping_fee_huf,
    p_free_shipping_threshold_huf=>p_free_shipping_threshold_huf,
    p_parcel_point_id=>p_parcel_point_id,
    p_payment_provider=>p_payment_provider,
    p_note=>p_note,
    p_customer_id=>p_customer_id,
    p_coupon_code=>p_coupon_code,
    p_items=>p_items
  );
  order_id_value:=(response->>'order_id')::uuid;

  if exists(select 1 from public.orders where id=order_id_value and instance_id is not null and instance_id<>p_instance_id) then
    raise exception 'A rendelés webshop scope-ja nem egyezik.';
  end if;
  update public.orders set instance_id=p_instance_id where id=order_id_value and instance_id is null;
  update public.order_items set instance_id=p_instance_id where order_id=order_id_value and instance_id is null;
  update public.inventory_events set instance_id=p_instance_id where order_id=order_id_value and instance_id is null;
  update public.inventory_reservations set instance_id=p_instance_id where order_id=order_id_value and instance_id is null;

  return response||jsonb_build_object('instance_id',p_instance_id);
end $$;


ALTER FUNCTION "public"."place_order_provider_v3_idempotent"("p_instance_id" "uuid", "p_idempotency_key" "text", "p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text", "p_billing_tax_number" "text", "p_billing_postcode" "text", "p_billing_city" "text", "p_billing_address" "text", "p_shipping_name" "text", "p_shipping_postcode" "text", "p_shipping_city" "text", "p_shipping_address" "text", "p_customer_phone" "text", "p_shipping_provider" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_free_shipping_threshold_huf" integer, "p_parcel_point_id" "text", "p_payment_provider" "text", "p_note" "text", "p_customer_id" "uuid", "p_coupon_code" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."place_order_provider_v4_idempotent"("p_instance_id" "uuid", "p_idempotency_key" "text", "p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text" DEFAULT ''::"text", "p_billing_tax_number" "text" DEFAULT ''::"text", "p_billing_postcode" "text" DEFAULT ''::"text", "p_billing_city" "text" DEFAULT ''::"text", "p_billing_address" "text" DEFAULT ''::"text", "p_shipping_name" "text" DEFAULT ''::"text", "p_shipping_postcode" "text" DEFAULT ''::"text", "p_shipping_city" "text" DEFAULT ''::"text", "p_shipping_address" "text" DEFAULT ''::"text", "p_customer_phone" "text" DEFAULT ''::"text", "p_shipping_provider" "text" DEFAULT 'pickup'::"text", "p_shipping_kind" "text" DEFAULT 'pickup'::"text", "p_shipping_fee_huf" integer DEFAULT 0, "p_free_shipping_threshold_huf" integer DEFAULT 0, "p_parcel_point_id" "text" DEFAULT ''::"text", "p_payment_provider" "text" DEFAULT 'bank_transfer'::"text", "p_note" "text" DEFAULT ''::"text", "p_customer_id" "uuid" DEFAULT NULL::"uuid", "p_coupon_code" "text" DEFAULT ''::"text", "p_items" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
 v_key text;v_fp text;v_existing_fp text;v_existing jsonb;v_order_id uuid;v_number text;v_item jsonb;v_items jsonb;v_variant record;v_qty integer;v_role public.customer_role;v_reseller boolean:=false;v_price integer;v_prev integer;v_subtotal integer:=0;v_discount integer:=0;v_shipping integer:=0;v_total integer:=0;v_coupon record;v_code text:=upper(trim(coalesce(p_coupon_code,'')));v_response jsonb;
begin
 if not exists(select 1 from public.webshop_instances w where w.id=p_instance_id and w.status in('pilot','active')) then raise exception 'A webshop nem rendelhető.';end if;
 if p_idempotency_key is null or length(trim(p_idempotency_key))<16 or length(p_idempotency_key)>120 then raise exception 'Érvénytelen rendelési kérésazonosító.';end if;
 if p_customer_email is null or length(trim(p_customer_email))<5 or length(p_customer_email)>254 then raise exception 'Érvénytelen e-mail cím.';end if;
 if length(trim(coalesce(p_billing_name,'')))<2 or length(p_billing_name)>150 then raise exception 'A név megadása kötelező.';end if;
 if jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>30 then raise exception 'A kosár tartalma érvénytelen.';end if;
 if p_shipping_provider!~'^[a-z0-9_-]{2,80}$' or p_payment_provider!~'^[a-z0-9_-]{2,80}$' then raise exception 'Érvénytelen szolgáltatói azonosító.';end if;
 if p_shipping_kind not in('parcel_point','home_delivery','pickup') then raise exception 'Érvénytelen szállítási típus.';end if;
 if p_shipping_fee_huf<0 or p_shipping_fee_huf>1000000 or p_free_shipping_threshold_huf<0 or p_free_shipping_threshold_huf>100000000 then raise exception 'Érvénytelen szállítási díj vagy küszöb.';end if;
 if p_shipping_kind='parcel_point' and length(trim(coalesce(p_parcel_point_id,'')))<2 then raise exception 'Átvételi pontot kell választani.';end if;
 begin select jsonb_agg(jsonb_build_object('variant_id',n.variant_id,'quantity',n.quantity) order by n.variant_id) into v_items from(select(e->>'variant_id')::uuid as variant_id,sum((e->>'quantity')::integer)::integer as quantity from jsonb_array_elements(p_items)e group by(e->>'variant_id')::uuid)n;exception when others then raise exception 'A kosár tartalma érvénytelen.';end;
 if v_items is null or exists(select 1 from jsonb_array_elements(v_items)e where(e->>'quantity')::integer<1 or(e->>'quantity')::integer>99) then raise exception 'Érvénytelen mennyiség.';end if;
 v_key:=md5(p_instance_id::text||':'||trim(p_idempotency_key));v_fp:=md5(jsonb_build_object('instance',p_instance_id,'email',lower(trim(p_customer_email)),'name',trim(p_billing_name),'company',trim(coalesce(p_billing_company,'')),'tax',trim(coalesce(p_billing_tax_number,'')),'shipping_provider',p_shipping_provider,'shipping_kind',p_shipping_kind,'shipping_fee',p_shipping_fee_huf,'free_threshold',p_free_shipping_threshold_huf,'payment_provider',p_payment_provider,'parcel_point',trim(coalesce(p_parcel_point_id,'')),'coupon',v_code,'items',v_items)::text);
 begin insert into public.order_request_keys(idempotency_key,request_fingerprint) values(v_key,v_fp);exception when unique_violation then select response,request_fingerprint into v_existing,v_existing_fp from public.order_request_keys where idempotency_key=v_key;if v_existing_fp is not null and v_existing_fp<>v_fp then raise exception 'A rendelési kérésazonosító már más rendelési adatokhoz lett felhasználva.';end if;if v_existing is null then raise exception 'A rendelés feldolgozása folyamatban van.';end if;return v_existing||jsonb_build_object('idempotency_replayed',true);end;
 if p_customer_id is not null then insert into public.customer_instance_roles(instance_id,user_id,role,reseller_approved) values(p_instance_id,p_customer_id,'customer',false) on conflict(instance_id,user_id) do nothing;select role,reseller_approved into v_role,v_reseller from public.customer_instance_roles where instance_id=p_instance_id and user_id=p_customer_id;end if;
 if v_code<>'' then select * into v_coupon from public.coupons where instance_id=p_instance_id and code=v_code for update;if not found or not v_coupon.active then raise exception 'Érvénytelen vagy inaktív kuponkód.';end if;if v_coupon.starts_at is not null and now()<v_coupon.starts_at then raise exception 'A kupon még nem használható.';end if;if v_coupon.ends_at is not null and now()>=v_coupon.ends_at then raise exception 'A kupon lejárt.';end if;if v_coupon.usage_limit is not null and v_coupon.usage_count>=v_coupon.usage_limit then raise exception 'A kupon felhasználási kerete elfogyott.';end if;end if;
 v_order_id:=gen_random_uuid();v_number:='ORD-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(v_order_id::text,'-',''),1,8));
 insert into public.orders(id,instance_id,customer_id,order_number,status,customer_email,customer_phone,billing_name,billing_company,billing_tax_number,billing_postcode,billing_city,billing_address,shipping_name,shipping_postcode,shipping_city,shipping_address,subtotal_gross_huf,shipping_gross_huf,discount_gross_huf,total_gross_huf,shipping_method,parcel_point_id,payment_method,note,coupon_code) values(v_order_id,p_instance_id,p_customer_id,v_number,'pending',trim(p_customer_email),nullif(trim(p_customer_phone),''),trim(p_billing_name),nullif(trim(p_billing_company),''),nullif(trim(p_billing_tax_number),''),trim(p_billing_postcode),trim(p_billing_city),trim(p_billing_address),coalesce(nullif(trim(p_shipping_name),''),trim(p_billing_name)),coalesce(nullif(trim(p_shipping_postcode),''),trim(p_billing_postcode)),coalesce(nullif(trim(p_shipping_city),''),trim(p_billing_city)),coalesce(nullif(trim(p_shipping_address),''),trim(p_billing_address)),0,0,0,0,p_shipping_provider,nullif(trim(p_parcel_point_id),''),p_payment_provider,nullif(trim(p_note),''),nullif(v_code,''));
 for v_item in select value from jsonb_array_elements(v_items) order by(value->>'variant_id')::uuid loop
  v_qty:=(v_item->>'quantity')::integer;
  select pv.id,pv.product_id,pv.sku,pv.label,pv.gross_price_huf,pv.reseller_gross_price_huf,pv.stock_quantity,pv.active,pv.unit_cost_net_huf,p.name product_name,p.active product_active,p.audience product_audience into v_variant from public.product_variants pv join public.products p on p.id=pv.product_id where pv.id=(v_item->>'variant_id')::uuid and pv.instance_id=p_instance_id and p.instance_id=p_instance_id for update of pv;
  if not found or not v_variant.active or not v_variant.product_active then raise exception 'Nem elérhető termék.';end if;if coalesce(v_variant.product_audience,'retail')='professional' and not(v_role='reseller' and v_reseller) then raise exception 'Ez a termék csak jóváhagyott viszonteladói partnernek rendelhető.';end if;if v_variant.stock_quantity<v_qty then raise exception 'Nincs elegendő készlet: %',v_variant.label;end if;
  v_price:=case when v_role='reseller' and v_reseller and v_variant.reseller_gross_price_huf is not null then v_variant.reseller_gross_price_huf else v_variant.gross_price_huf end;
  insert into public.order_items(instance_id,order_id,variant_id,product_name,variant_label,sku,quantity,unit_gross_huf,line_total_gross_huf,unit_cost_net_huf_snapshot,cost_snapshot_source) values(p_instance_id,v_order_id,v_variant.id,v_variant.product_name,v_variant.label,v_variant.sku,v_qty,v_price,v_price*v_qty,v_variant.unit_cost_net_huf,case when v_variant.unit_cost_net_huf is null then null else 'variant' end);
  v_prev:=v_variant.stock_quantity;update public.product_variants set stock_quantity=stock_quantity-v_qty,updated_at=now() where id=v_variant.id and instance_id=p_instance_id;
  insert into public.inventory_events(instance_id,variant_id,order_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata) values(p_instance_id,v_variant.id,v_order_id,-v_qty,v_prev,v_prev-v_qty,'order_created',p_customer_id,jsonb_build_object('sku',v_variant.sku,'order_number',v_number,'unit_gross_huf',v_price));v_subtotal:=v_subtotal+v_price*v_qty;
 end loop;
 if v_code<>'' then if v_subtotal<v_coupon.min_subtotal_huf then raise exception 'A kuponhoz szükséges minimum kosárérték nincs elérve.';end if;if v_coupon.discount_type='percent' then v_discount:=floor(v_subtotal*(least(v_coupon.discount_value,100)::numeric/100))::integer;else v_discount:=least(v_coupon.discount_value,v_subtotal);end if;if v_coupon.max_discount_huf is not null then v_discount:=least(v_discount,v_coupon.max_discount_huf);end if;v_discount:=greatest(0,least(v_discount,v_subtotal));update public.coupons set usage_count=usage_count+1,updated_at=now() where id=v_coupon.id and instance_id=p_instance_id;end if;
 v_shipping:=case when p_shipping_kind='pickup' then 0 when p_free_shipping_threshold_huf>0 and(v_subtotal-v_discount)>=p_free_shipping_threshold_huf then 0 else p_shipping_fee_huf end;v_total:=greatest(0,v_subtotal-v_discount)+v_shipping;
 update public.orders set subtotal_gross_huf=v_subtotal,shipping_gross_huf=v_shipping,discount_gross_huf=v_discount,total_gross_huf=v_total,updated_at=now() where id=v_order_id and instance_id=p_instance_id;
 insert into public.order_events(instance_id,order_id,event_type,to_status,actor_user_id,metadata) values(p_instance_id,v_order_id,'order_created','pending',p_customer_id,jsonb_build_object('payment_method',p_payment_provider,'shipping_method',p_shipping_provider,'shipping_kind',p_shipping_kind));if v_code<>'' then insert into public.order_events(instance_id,order_id,event_type,to_status,actor_user_id,metadata) values(p_instance_id,v_order_id,'coupon_applied','pending',p_customer_id,jsonb_build_object('code',v_code,'discount_gross_huf',v_discount));end if;
 v_response:=jsonb_build_object('order_id',v_order_id,'order_number',v_number,'instance_id',p_instance_id,'subtotal_gross_huf',v_subtotal,'discount_gross_huf',v_discount,'shipping_gross_huf',v_shipping,'total_gross_huf',v_total,'coupon_code',nullif(v_code,''),'payment_provider',p_payment_provider,'shipping_provider',p_shipping_provider,'idempotency_replayed',false);update public.order_request_keys set response=v_response,request_fingerprint=v_fp where idempotency_key=v_key;return v_response;
end$_$;


ALTER FUNCTION "public"."place_order_provider_v4_idempotent"("p_instance_id" "uuid", "p_idempotency_key" "text", "p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text", "p_billing_tax_number" "text", "p_billing_postcode" "text", "p_billing_city" "text", "p_billing_address" "text", "p_shipping_name" "text", "p_shipping_postcode" "text", "p_shipping_city" "text", "p_shipping_address" "text", "p_customer_phone" "text", "p_shipping_provider" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_free_shipping_threshold_huf" integer, "p_parcel_point_id" "text", "p_payment_provider" "text", "p_note" "text", "p_customer_id" "uuid", "p_coupon_code" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."place_order_provider_v5_idempotent"("p_instance_id" "uuid", "p_idempotency_key" "text", "p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text" DEFAULT ''::"text", "p_billing_tax_number" "text" DEFAULT ''::"text", "p_billing_postcode" "text" DEFAULT ''::"text", "p_billing_city" "text" DEFAULT ''::"text", "p_billing_address" "text" DEFAULT ''::"text", "p_shipping_name" "text" DEFAULT ''::"text", "p_shipping_postcode" "text" DEFAULT ''::"text", "p_shipping_city" "text" DEFAULT ''::"text", "p_shipping_address" "text" DEFAULT ''::"text", "p_customer_phone" "text" DEFAULT ''::"text", "p_shipping_provider" "text" DEFAULT 'pickup'::"text", "p_shipping_kind" "text" DEFAULT 'pickup'::"text", "p_shipping_fee_huf" integer DEFAULT 0, "p_free_shipping_threshold_huf" integer DEFAULT 0, "p_parcel_point_id" "text" DEFAULT ''::"text", "p_payment_provider" "text" DEFAULT 'bank_transfer'::"text", "p_note" "text" DEFAULT ''::"text", "p_customer_id" "uuid" DEFAULT NULL::"uuid", "p_coupon_code" "text" DEFAULT ''::"text", "p_items" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
 v_key text;v_fp text;v_existing_fp text;v_existing jsonb;v_order_id uuid;v_number text;v_item jsonb;v_items jsonb;v_variant record;v_qty integer;v_role public.customer_role;v_reseller boolean:=false;v_channel text:='b2c';v_price integer;v_prev integer;v_has_channel boolean:=false;v_channel_visible boolean;v_channel_gross integer;v_channel_min integer;v_channel_discount numeric;v_min_qty integer;v_multiple integer;v_active_variant_count integer;v_explicit_channel_price boolean:=false;v_subtotal integer:=0;v_discount integer:=0;v_shipping integer:=0;v_total integer:=0;v_coupon record;v_code text:=upper(trim(coalesce(p_coupon_code,'')));v_response jsonb;
begin
 if not exists(select 1 from public.webshop_instances w where w.id=p_instance_id and w.status in('pilot','active')) then raise exception 'A webshop nem rendelhető.';end if;
 if p_idempotency_key is null or length(trim(p_idempotency_key))<16 or length(p_idempotency_key)>120 then raise exception 'Érvénytelen rendelési kérésazonosító.';end if;
 if p_customer_email is null or length(trim(p_customer_email))<5 or length(p_customer_email)>254 then raise exception 'Érvénytelen e-mail cím.';end if;
 if length(trim(coalesce(p_billing_name,'')))<2 or length(p_billing_name)>150 then raise exception 'A név megadása kötelező.';end if;
 if jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>30 then raise exception 'A kosár tartalma érvénytelen.';end if;
 if p_shipping_provider!~'^[a-z0-9_-]{2,80}$' or p_payment_provider!~'^[a-z0-9_-]{2,80}$' then raise exception 'Érvénytelen szolgáltatói azonosító.';end if;
 if p_shipping_kind not in('parcel_point','home_delivery','pickup') then raise exception 'Érvénytelen szállítási típus.';end if;
 if p_shipping_fee_huf<0 or p_shipping_fee_huf>1000000 or p_free_shipping_threshold_huf<0 or p_free_shipping_threshold_huf>100000000 then raise exception 'Érvénytelen szállítási díj vagy küszöb.';end if;
 if p_shipping_kind='parcel_point' and length(trim(coalesce(p_parcel_point_id,'')))<2 then raise exception 'Átvételi pontot kell választani.';end if;
 begin select jsonb_agg(jsonb_build_object('variant_id',n.variant_id,'quantity',n.quantity) order by n.variant_id) into v_items from(select(e->>'variant_id')::uuid as variant_id,sum((e->>'quantity')::integer)::integer as quantity from jsonb_array_elements(p_items)e group by(e->>'variant_id')::uuid)n;exception when others then raise exception 'A kosár tartalma érvénytelen.';end;
 if v_items is null or exists(select 1 from jsonb_array_elements(v_items)e where(e->>'quantity')::integer<1 or(e->>'quantity')::integer>99) then raise exception 'Érvénytelen mennyiség.';end if;
 v_key:=md5(p_instance_id::text||':'||trim(p_idempotency_key));v_fp:=md5(jsonb_build_object('instance',p_instance_id,'email',lower(trim(p_customer_email)),'name',trim(p_billing_name),'company',trim(coalesce(p_billing_company,'')),'tax',trim(coalesce(p_billing_tax_number,'')),'shipping_provider',p_shipping_provider,'shipping_kind',p_shipping_kind,'shipping_fee',p_shipping_fee_huf,'free_threshold',p_free_shipping_threshold_huf,'payment_provider',p_payment_provider,'parcel_point',trim(coalesce(p_parcel_point_id,'')),'coupon',v_code,'items',v_items)::text);
 begin insert into public.order_request_keys(idempotency_key,request_fingerprint) values(v_key,v_fp);exception when unique_violation then select response,request_fingerprint into v_existing,v_existing_fp from public.order_request_keys where idempotency_key=v_key;if v_existing_fp is not null and v_existing_fp<>v_fp then raise exception 'A rendelési kérésazonosító már más rendelési adatokhoz lett felhasználva.';end if;if v_existing is null then raise exception 'A rendelés feldolgozása folyamatban van.';end if;return v_existing||jsonb_build_object('idempotency_replayed',true);end;
 if p_customer_id is not null then insert into public.customer_instance_roles(instance_id,user_id,role,reseller_approved) values(p_instance_id,p_customer_id,'customer',false) on conflict(instance_id,user_id) do nothing;select role,reseller_approved into v_role,v_reseller from public.customer_instance_roles where instance_id=p_instance_id and user_id=p_customer_id;end if;if v_role='reseller' and v_reseller then v_channel:='b2b';end if;
 if v_code<>'' then select * into v_coupon from public.coupons where instance_id=p_instance_id and code=v_code for update;if not found or not v_coupon.active then raise exception 'Érvénytelen vagy inaktív kuponkód.';end if;if v_coupon.starts_at is not null and now()<v_coupon.starts_at then raise exception 'A kupon még nem használható.';end if;if v_coupon.ends_at is not null and now()>=v_coupon.ends_at then raise exception 'A kupon lejárt.';end if;if v_coupon.usage_limit is not null and v_coupon.usage_count>=v_coupon.usage_limit then raise exception 'A kupon felhasználási kerete elfogyott.';end if;end if;
 v_order_id:=gen_random_uuid();v_number:='ORD-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(v_order_id::text,'-',''),1,8));
 insert into public.orders(id,instance_id,customer_id,order_number,status,customer_email,customer_phone,billing_name,billing_company,billing_tax_number,billing_postcode,billing_city,billing_address,shipping_name,shipping_postcode,shipping_city,shipping_address,subtotal_gross_huf,shipping_gross_huf,discount_gross_huf,total_gross_huf,shipping_method,parcel_point_id,payment_method,note,coupon_code) values(v_order_id,p_instance_id,p_customer_id,v_number,'pending',trim(p_customer_email),nullif(trim(p_customer_phone),''),trim(p_billing_name),nullif(trim(p_billing_company),''),nullif(trim(p_billing_tax_number),''),trim(p_billing_postcode),trim(p_billing_city),trim(p_billing_address),coalesce(nullif(trim(p_shipping_name),''),trim(p_billing_name)),coalesce(nullif(trim(p_shipping_postcode),''),trim(p_billing_postcode)),coalesce(nullif(trim(p_shipping_city),''),trim(p_billing_city)),coalesce(nullif(trim(p_shipping_address),''),trim(p_billing_address)),0,0,0,0,p_shipping_provider,nullif(trim(p_parcel_point_id),''),p_payment_provider,nullif(trim(p_note),''),nullif(v_code,''));
 for v_item in select value from jsonb_array_elements(v_items) order by(value->>'variant_id')::uuid loop
  v_qty:=(v_item->>'quantity')::integer;
  select pv.id,pv.product_id,pv.sku,pv.label,pv.gross_price_huf,pv.reseller_gross_price_huf,pv.stock_quantity,pv.active,pv.unit_cost_net_huf,pv.minimum_order_quantity,pv.order_multiple,p.name product_name,p.active product_active,p.audience product_audience into v_variant from public.product_variants pv join public.products p on p.id=pv.product_id where pv.id=(v_item->>'variant_id')::uuid and pv.instance_id=p_instance_id and p.instance_id=p_instance_id for update of pv;
  if not found or not v_variant.active or not v_variant.product_active then raise exception 'Nem elérhető termék.';end if;
  select pcs.visible,pcs.gross_price,pcs.minimum_quantity,pcs.discount_percent into v_channel_visible,v_channel_gross,v_channel_min,v_channel_discount from public.product_channel_settings pcs where pcs.instance_id=p_instance_id and pcs.product_id=v_variant.product_id and pcs.channel_code=v_channel;v_has_channel:=found;
  if v_has_channel then if not coalesce(v_channel_visible,true) then raise exception 'A termék ezen az értékesítési csatornán nem elérhető.';end if;elsif coalesce(v_variant.product_audience,'retail')='professional' and v_channel<>'b2b' then raise exception 'Ez a termék csak jóváhagyott viszonteladói partnernek rendelhető.';end if;
  v_min_qty:=greatest(coalesce(v_variant.minimum_order_quantity,1),case when v_has_channel then coalesce(v_channel_min,1) else 1 end);v_multiple:=greatest(coalesce(v_variant.order_multiple,1),1);v_min_qty:=(ceil(v_min_qty::numeric/v_multiple)::integer)*v_multiple;
  if v_qty<v_min_qty then raise exception 'Minimum rendelési mennyiség: % db',v_min_qty;end if;if mod(v_qty,v_multiple)<>0 then raise exception 'A rendelési mennyiség csak % db-os lépésekben adható meg.',v_multiple;end if;if v_variant.stock_quantity<v_qty then raise exception 'Nincs elegendő készlet: %',v_variant.label;end if;
  v_price:=case when v_channel='b2b' and v_variant.reseller_gross_price_huf is not null then v_variant.reseller_gross_price_huf else v_variant.gross_price_huf end;
  select count(*)::integer into v_active_variant_count from public.product_variants x where x.instance_id=p_instance_id and x.product_id=v_variant.product_id and x.active=true;
  v_explicit_channel_price:=v_has_channel and v_channel_gross is not null and v_active_variant_count=1 and not(v_channel='b2b' and v_variant.reseller_gross_price_huf is not null);
  if v_explicit_channel_price then v_price:=greatest(0,v_channel_gross);elsif v_has_channel and v_channel_discount is not null then v_price:=greatest(0,round(v_price*(1-(least(greatest(v_channel_discount,0),100)/100.0)))::integer);end if;
  insert into public.order_items(instance_id,order_id,variant_id,product_name,variant_label,sku,quantity,unit_gross_huf,line_total_gross_huf,unit_cost_net_huf_snapshot,cost_snapshot_source) values(p_instance_id,v_order_id,v_variant.id,v_variant.product_name,v_variant.label,v_variant.sku,v_qty,v_price,v_price*v_qty,v_variant.unit_cost_net_huf,case when v_variant.unit_cost_net_huf is null then null else 'variant' end);
  v_prev:=v_variant.stock_quantity;update public.product_variants set stock_quantity=stock_quantity-v_qty,updated_at=now() where id=v_variant.id and instance_id=p_instance_id;
  insert into public.inventory_events(instance_id,variant_id,order_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata) values(p_instance_id,v_variant.id,v_order_id,-v_qty,v_prev,v_prev-v_qty,'order_created',p_customer_id,jsonb_build_object('sku',v_variant.sku,'order_number',v_number,'unit_gross_huf',v_price,'channel',v_channel,'minimum_quantity',v_min_qty,'order_multiple',v_multiple));v_subtotal:=v_subtotal+v_price*v_qty;
 end loop;
 if v_code<>'' then if v_subtotal<v_coupon.min_subtotal_huf then raise exception 'A kuponhoz szükséges minimum kosárérték nincs elérve.';end if;if v_coupon.discount_type='percent' then v_discount:=floor(v_subtotal*(least(v_coupon.discount_value,100)::numeric/100))::integer;else v_discount:=least(v_coupon.discount_value,v_subtotal);end if;if v_coupon.max_discount_huf is not null then v_discount:=least(v_discount,v_coupon.max_discount_huf);end if;v_discount:=greatest(0,least(v_discount,v_subtotal));update public.coupons set usage_count=usage_count+1,updated_at=now() where id=v_coupon.id and instance_id=p_instance_id;end if;
 v_shipping:=case when p_shipping_kind='pickup' then 0 when p_free_shipping_threshold_huf>0 and(v_subtotal-v_discount)>=p_free_shipping_threshold_huf then 0 else p_shipping_fee_huf end;v_total:=greatest(0,v_subtotal-v_discount)+v_shipping;
 update public.orders set subtotal_gross_huf=v_subtotal,shipping_gross_huf=v_shipping,discount_gross_huf=v_discount,total_gross_huf=v_total,updated_at=now() where id=v_order_id and instance_id=p_instance_id;
 insert into public.order_events(instance_id,order_id,event_type,to_status,actor_user_id,metadata) values(p_instance_id,v_order_id,'order_created','pending',p_customer_id,jsonb_build_object('payment_method',p_payment_provider,'shipping_method',p_shipping_provider,'shipping_kind',p_shipping_kind));if v_code<>'' then insert into public.order_events(instance_id,order_id,event_type,to_status,actor_user_id,metadata) values(p_instance_id,v_order_id,'coupon_applied','pending',p_customer_id,jsonb_build_object('code',v_code,'discount_gross_huf',v_discount));end if;
 v_response:=jsonb_build_object('order_id',v_order_id,'order_number',v_number,'instance_id',p_instance_id,'subtotal_gross_huf',v_subtotal,'discount_gross_huf',v_discount,'shipping_gross_huf',v_shipping,'total_gross_huf',v_total,'coupon_code',nullif(v_code,''),'payment_provider',p_payment_provider,'shipping_provider',p_shipping_provider,'idempotency_replayed',false);update public.order_request_keys set response=v_response,request_fingerprint=v_fp where idempotency_key=v_key;return v_response;
end$_$;


ALTER FUNCTION "public"."place_order_provider_v5_idempotent"("p_instance_id" "uuid", "p_idempotency_key" "text", "p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text", "p_billing_tax_number" "text", "p_billing_postcode" "text", "p_billing_city" "text", "p_billing_address" "text", "p_shipping_name" "text", "p_shipping_postcode" "text", "p_shipping_city" "text", "p_shipping_address" "text", "p_customer_phone" "text", "p_shipping_provider" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_free_shipping_threshold_huf" integer, "p_parcel_point_id" "text", "p_payment_provider" "text", "p_note" "text", "p_customer_id" "uuid", "p_coupon_code" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."plan_action_proposals"("p_run_key" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare a record;p record;v_count integer:=0;v_rank integer;v_min integer;v_min_priority integer;v_incident text;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;
 for a in select * from public.control_alerts where status in ('open','acknowledged','snoozed') loop
  v_rank:=case a.severity when 'critical' then 4 when 'high' then 3 when 'warning' then 2 else 1 end;v_incident:=to_char(a.incident_started_at at time zone 'UTC','YYYYMMDDHH24MISSUS');
  for p in select distinct on(policy_key) * from public.action_policies where enabled and category=a.category and(alert_type is null or alert_type=a.alert_type) order by policy_key,version desc loop
   v_min:=case p.min_severity when 'critical' then 4 when 'high' then 3 when 'warning' then 2 else 1 end;v_min_priority:=coalesce((p.conditions->>'min_priority_score')::integer,0);if v_rank<v_min or a.priority_score<v_min_priority then continue;end if;
   insert into public.action_proposals(proposal_key,alert_id,policy_id,action_kind,impact_class,risk_score,rationale,proposed_payload,source_snapshot,expires_at)
   values('alert:'||a.id::text||':incident:'||v_incident||':policy:'||p.policy_key||':v'||p.version,a.id,p.id,p.action_kind,p.impact_class,least(100,greatest(a.priority_score,case p.impact_class when 'high_impact' then 85 when 'reversible' then 60 else 30 end)),'V15 incident-aware policy '||p.policy_key||' matched active V13 alert '||a.alert_key,p.action_template,jsonb_build_object('alert_key',a.alert_key,'alert_status',a.status,'severity',a.severity,'priority_score',a.priority_score,'last_detected_at',a.last_detected_at,'incident_started_at',a.incident_started_at,'evidence',a.evidence),now()+(p.expires_after_hours||' hours')::interval)
   on conflict(proposal_key) do update set risk_score=excluded.risk_score,rationale=excluded.rationale,source_snapshot=excluded.source_snapshot,updated_at=now() where public.action_proposals.status in ('proposed','simulated');if found then v_count:=v_count+1;end if;
  end loop;
 end loop;return jsonb_build_object('proposals_upserted',v_count,'incident_aware',true);end;$$;


ALTER FUNCTION "public"."plan_action_proposals"("p_run_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."plan_automation_runbooks"("p_run_key" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare a record;r public.automation_runbooks;v_proposal uuid;v_instance uuid;v_created integer:=0;v_existing integer:=0;v_waiting integer:=0;v_key text;v_incident text;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;
 for a in select * from public.control_alerts where status in ('open','acknowledged') and severity in ('warning','high','critical') loop
   select rb.* into r from public.automation_runbooks rb where rb.enabled=true and rb.category=a.category and(case rb.min_severity when 'critical' then 4 when 'high' then 3 when 'warning' then 2 else 1 end)<=(case a.severity when 'critical' then 4 when 'high' then 3 when 'warning' then 2 else 1 end) order by rb.version desc limit 1;if not found then continue;end if;
   v_proposal:=null;select ap.id into v_proposal from public.action_proposals ap where ap.alert_id=a.id and ap.created_at>=a.incident_started_at and ap.status in ('simulated','approved','executed') order by ap.created_at desc limit 1;
   if r.requires_action_approval and v_proposal is null then v_waiting:=v_waiting+1;continue;end if;
   v_incident:=to_char(a.incident_started_at at time zone 'UTC','YYYYMMDDHH24MISSUS');v_key:='alert:'||a.id::text||':incident:'||v_incident||':runbook:'||r.runbook_key||':v'||r.version::text;
   if exists(select 1 from public.automation_runbook_instances where instance_key=v_key) then v_existing:=v_existing+1;continue;end if;
   insert into public.automation_runbook_instances(instance_key,runbook_id,alert_id,proposal_id,status,source_snapshot,deadline_at) values(v_key,r.id,a.id,v_proposal,'planned',jsonb_build_object('alert_status',a.status,'severity',a.severity,'priority_score',a.priority_score,'last_detected_at',a.last_detected_at,'incident_started_at',a.incident_started_at,'proposal_id',v_proposal),now()+make_interval(hours=>r.max_duration_hours)) returning id into v_instance;
   insert into public.automation_step_runs(instance_id,step_id,status) select v_instance,s.id,case when s.step_order=1 then 'ready' else 'pending' end from public.automation_runbook_steps s where s.runbook_id=r.id order by s.step_order;
   insert into public.automation_events(event_key,instance_id,event_type,metadata) values('planned:'||p_run_key||':'||v_instance::text,v_instance,'planned',jsonb_build_object('runbook_key',r.runbook_key,'runbook_version',r.version,'source_alert_id',a.id,'incident_started_at',a.incident_started_at));v_created:=v_created+1;
 end loop;return jsonb_build_object('created',v_created,'existing',v_existing,'waiting_for_proposal',v_waiting,'incident_aware',true);end;$$;


ALTER FUNCTION "public"."plan_automation_runbooks"("p_run_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."plan_commercial_opportunities"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_b2c integer := 0;
  v_b2b integer := 0;
begin
  update public.commercial_opportunities o
     set status='dismissed',closed_at=now(),updated_at=now(),
         source=o.source||jsonb_build_object('auto_closed_reason','segment_no_longer_actionable')
   where o.channel='b2c'
     and o.kind in ('retention','winback')
     and o.status in ('open','in_progress')
     and not exists (
       select 1
       from public.customer_commercial_metrics c
       where c.segment in ('at_risk','winback','dormant')
         and (
           (o.customer_id is not null and c.customer_id=o.customer_id)
           or
           (o.customer_id is null and o.customer_email is not null and c.email_key=lower(trim(o.customer_email)))
         )
     );

  update public.commercial_opportunities o
     set opportunity_key='b2c:'||c.customer_key||':active',
         customer_id=c.customer_id,
         customer_email=c.email_key,
         kind=case when c.segment in ('winback','dormant') then 'winback' else 'retention' end,
         priority_score=case when c.segment='at_risk' then 80 when c.segment='winback' then 90 when c.segment='dormant' then 70 else 50 end,
         expected_value_net_huf=round(greatest(coalesce(c.aov_gross_huf,0),0)::numeric/1.27,2),
         probability_percent=case when c.segment='at_risk' then 45 when c.segment='winback' then 30 else 20 end,
         due_at=now(),
         reason='V9 customer segment: '||c.segment,
         recommended_action=case when c.segment='at_risk' then 'Személyre szabott megtartási ajánlat' else 'Visszanyerési ajánlat előkészítése' end,
         source=jsonb_build_object(
           'segment',c.segment,
           'revenue_gross_huf',c.revenue_gross_huf,
           'aov_gross_huf',c.aov_gross_huf,
           'days_since_last_order',c.days_since_last_order,
           'value_basis','gross_div_1_27_estimate'
         ),
         updated_at=now()
    from public.customer_commercial_metrics c
   where o.channel='b2c'
     and o.kind in ('retention','winback')
     and o.status in ('open','in_progress')
     and c.segment in ('at_risk','winback','dormant')
     and (
       (o.customer_id is not null and c.customer_id=o.customer_id)
       or
       (o.customer_id is null and o.customer_email is not null and c.email_key=lower(trim(o.customer_email)))
     );

  insert into public.commercial_opportunities(
    opportunity_key,channel,customer_id,customer_email,kind,priority_score,
    expected_value_net_huf,probability_percent,due_at,reason,recommended_action,source
  )
  select
    'b2c:'||c.customer_key||':active','b2c',c.customer_id,c.email_key,
    case when c.segment in ('winback','dormant') then 'winback' else 'retention' end,
    case when c.segment='at_risk' then 80 when c.segment='winback' then 90 when c.segment='dormant' then 70 else 50 end,
    round(greatest(coalesce(c.aov_gross_huf,0),0)::numeric/1.27,2),
    case when c.segment='at_risk' then 45 when c.segment='winback' then 30 else 20 end,
    now(),
    'V9 customer segment: '||c.segment,
    case when c.segment='at_risk' then 'Személyre szabott megtartási ajánlat' else 'Visszanyerési ajánlat előkészítése' end,
    jsonb_build_object(
      'segment',c.segment,
      'revenue_gross_huf',c.revenue_gross_huf,
      'aov_gross_huf',c.aov_gross_huf,
      'days_since_last_order',c.days_since_last_order,
      'value_basis','gross_div_1_27_estimate'
    )
  from public.customer_commercial_metrics c
  where c.segment in ('at_risk','winback','dormant')
    and not exists (
      select 1
      from public.commercial_opportunities o
      where o.channel='b2c'
        and o.kind in ('retention','winback')
        and o.status in ('open','in_progress')
        and (
          (c.customer_id is not null and o.customer_id=c.customer_id)
          or
          (c.customer_id is null and o.customer_id is null and o.customer_email is not null and lower(trim(o.customer_email))=c.email_key)
        )
    )
  on conflict (opportunity_key) do nothing;
  get diagnostics v_b2c = row_count;

  update public.commercial_opportunities o
     set status='dismissed',closed_at=now(),updated_at=now(),
         source=o.source||jsonb_build_object('auto_closed_reason','reorder_no_longer_actionable')
   where o.channel='b2b'
     and o.kind='reorder'
     and o.status in ('open','in_progress')
     and o.reseller_id is not null
     and not exists (
       select 1
       from public.reseller_growth_priorities r
       where r.customer_id=o.reseller_id
         and r.priority_band in ('critical','high','medium')
     );

  insert into public.commercial_opportunities(
    opportunity_key,channel,reseller_id,kind,priority_score,expected_value_net_huf,
    probability_percent,due_at,reason,recommended_action,source
  )
  select
    'b2b:'||r.customer_id::text||':reorder','b2b',r.customer_id,'reorder',r.priority_score,
    round(greatest(coalesce(r.estimated_reorder_value_gross_huf,0),0)::numeric/1.27,2),
    case when r.priority_band='critical' then 70 when r.priority_band='high' then 55 when r.priority_band='medium' then 35 else 20 end,
    case
      when r.avg_reorder_days is not null then r.last_order_at + make_interval(days => greatest(1,r.avg_reorder_days))
      else r.last_order_at
    end,
    'V9 reseller priority: '||r.priority_band,
    r.recommended_action,
    jsonb_build_object(
      'priority_band',r.priority_band,
      'reorder_signal',r.reorder_signal,
      'days_since_last_order',r.days_since_last_order,
      'avg_reorder_days',r.avg_reorder_days,
      'days_overdue',case when r.avg_reorder_days is null then null else greatest(0,r.days_since_last_order-r.avg_reorder_days) end,
      'inactivity_risk',r.inactivity_risk,
      'estimated_reorder_value_gross_huf',r.estimated_reorder_value_gross_huf,
      'value_basis','gross_div_1_27_estimate'
    )
  from public.reseller_growth_priorities r
  where r.customer_id is not null
    and r.priority_band in ('critical','high','medium')
  on conflict (opportunity_key) do update set
    reseller_id=excluded.reseller_id,
    priority_score=excluded.priority_score,
    expected_value_net_huf=excluded.expected_value_net_huf,
    probability_percent=excluded.probability_percent,
    due_at=excluded.due_at,
    reason=excluded.reason,
    recommended_action=excluded.recommended_action,
    source=excluded.source,
    updated_at=now()
  where public.commercial_opportunities.status in ('open','in_progress');
  get diagnostics v_b2b = row_count;

  return jsonb_build_object('b2c_inserts',v_b2c,'b2b_upserts',v_b2b);
end;
$$;


ALTER FUNCTION "public"."plan_commercial_opportunities"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."plan_commercial_opportunities_v2"("p_instance_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$declare v_b2c int:=0;v_b2b int:=0;begin
 insert into public.commercial_opportunities(instance_id,opportunity_key,channel,customer_id,customer_email,kind,priority_score,expected_value_net_huf,probability_percent,due_at,reason,recommended_action,source)
 select p_instance_id,'b2c:'||c.customer_key||':active','b2c',c.customer_id,c.email_key,case when c.segment in('winback','dormant') then 'winback' else 'retention' end,case when c.segment='at_risk' then 80 when c.segment='winback' then 90 else 70 end,round(greatest(coalesce(c.aov_gross_huf,0),0)::numeric/1.27,2),case when c.segment='at_risk' then 45 when c.segment='winback' then 30 else 20 end,now(),'Customer segment: '||c.segment,case when c.segment='at_risk' then 'Személyre szabott megtartási ajánlat' else 'Visszanyerési ajánlat előkészítése' end,jsonb_build_object('segment',c.segment) from public.customer_commercial_metrics c where c.instance_id=p_instance_id and c.segment in('at_risk','winback','dormant') on conflict(instance_id,opportunity_key) do nothing;get diagnostics v_b2c=row_count;
 insert into public.commercial_opportunities(instance_id,opportunity_key,channel,reseller_id,kind,priority_score,expected_value_net_huf,probability_percent,due_at,reason,recommended_action,source)
 select p_instance_id,'b2b:'||r.customer_id::text||':reorder','b2b',r.customer_id,'reorder',r.priority_score,round(greatest(coalesce(r.estimated_reorder_value_gross_huf,0),0)::numeric/1.27,2),case when r.priority_band='critical' then 70 when r.priority_band='high' then 55 else 35 end,coalesce(r.last_order_at,now()),'Reseller priority: '||r.priority_band,r.recommended_action,jsonb_build_object('priority_band',r.priority_band) from public.reseller_growth_priorities r where r.instance_id=p_instance_id and r.customer_id is not null and r.priority_band in('critical','high','medium') on conflict(instance_id,opportunity_key) do update set priority_score=excluded.priority_score,expected_value_net_huf=excluded.expected_value_net_huf,probability_percent=excluded.probability_percent,due_at=excluded.due_at,reason=excluded.reason,recommended_action=excluded.recommended_action,source=excluded.source,updated_at=now() where public.commercial_opportunities.status in('open','in_progress');get diagnostics v_b2b=row_count;return jsonb_build_object('b2c_inserts',v_b2c,'b2b_upserts',v_b2b);end$$;


ALTER FUNCTION "public"."plan_commercial_opportunities_v2"("p_instance_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."plan_control_tasks"("p_run_key" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare a record;t public.control_tasks;v_created integer:=0;v_reopened integer:=0;v_old_task_status text;begin
  if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required'; end if;
  for a in
    select * from public.control_alerts where status in ('open','acknowledged') and (severity in ('high','critical') or priority_score>=80)
    order by priority_score desc,last_detected_at
  loop
    select * into t from public.control_tasks where task_key='alert:'||a.id::text||':primary' for update;
    if not found then
      insert into public.control_tasks(task_key,alert_id,priority_score,title,recommended_action,due_at,metadata)
      values('alert:'||a.id::text||':primary',a.id,a.priority_score,'Kontrollfeladat · '||a.title,a.recommended_action,
        now()+case when a.severity='critical' then interval '2 hours' when a.severity='high' then interval '8 hours' else interval '24 hours' end,
        jsonb_build_object('source','v13_task_planner','created_run_key',p_run_key,'severity',a.severity)) returning * into t;
      insert into public.control_alert_events(event_key,alert_id,event_type,to_status,metadata)
      values('task-create:'||p_run_key||':'||t.id::text,a.id,'task_created','open',jsonb_build_object('task_id',t.id,'priority_score',t.priority_score)) on conflict(event_key) do nothing;
      v_created:=v_created+1;
    elsif t.status in ('completed','cancelled') and a.last_detected_at>coalesce(t.completed_at,t.updated_at) then
      v_old_task_status:=t.status;
      update public.control_tasks set status='open',priority_score=a.priority_score,recommended_action=a.recommended_action,
        due_at=now()+case when a.severity='critical' then interval '2 hours' when a.severity='high' then interval '8 hours' else interval '24 hours' end,
        owner_user_id=null,started_at=null,completed_at=null,completed_by=null,outcome=null,updated_at=now(),metadata=metadata||jsonb_build_object('reopened_run_key',p_run_key,'severity',a.severity)
      where id=t.id returning * into t;
      insert into public.control_alert_events(event_key,alert_id,event_type,from_status,to_status,metadata)
      values('task-reopen:'||p_run_key||':'||t.id::text,a.id,'task_created',v_old_task_status,'open',jsonb_build_object('task_id',t.id,'reason','condition_still_active')) on conflict(event_key) do nothing;
      v_reopened:=v_reopened+1;
    elsif t.status in ('open','in_progress') then
      update public.control_tasks set priority_score=a.priority_score,recommended_action=a.recommended_action,updated_at=now() where id=t.id;
    end if;
  end loop;
  return jsonb_build_object('created',v_created,'reopened',v_reopened);
end;$$;


ALTER FUNCTION "public"."plan_control_tasks"("p_run_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."plan_customer_lifecycle_milestones"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_total integer:=0;v_rows integer:=0;begin
 insert into public.customer_lifecycle_milestones(customer_id,milestone_key,milestone_type,source)
 select p.customer_id,'first-order','first_order',jsonb_build_object('paid_orders',p.paid_orders,'value_tier',p.value_tier) from public.customer_value_profiles p where p.paid_orders>=1
 on conflict(customer_id,milestone_key) do nothing; get diagnostics v_rows=row_count;v_total:=v_total+v_rows;
 insert into public.customer_lifecycle_milestones(customer_id,milestone_key,milestone_type,source)
 select p.customer_id,'repeat-order','repeat_order',jsonb_build_object('paid_orders',p.paid_orders,'value_tier',p.value_tier) from public.customer_value_profiles p where p.paid_orders>=2
 on conflict(customer_id,milestone_key) do nothing; get diagnostics v_rows=row_count;v_total:=v_total+v_rows;
 insert into public.customer_lifecycle_milestones(customer_id,milestone_key,milestone_type,source)
 select p.customer_id,'high-value:'||p.value_tier,'high_value',jsonb_build_object('value_score',p.value_score,'value_tier',p.value_tier,'revenue_gross_huf',p.revenue_gross_huf) from public.customer_value_profiles p where p.value_tier in ('gold','platinum')
 on conflict(customer_id,milestone_key) do nothing; get diagnostics v_rows=row_count;v_total:=v_total+v_rows;
 insert into public.customer_lifecycle_milestones(customer_id,milestone_key,milestone_type,source)
 select p.customer_id,'at-risk:'||to_char(current_date,'YYYY-MM'),'at_risk',jsonb_build_object('days_since_last_order',p.days_since_last_order,'value_score',p.value_score) from public.customer_value_profiles p where p.lifecycle_segment='at_risk'
 on conflict(customer_id,milestone_key) do nothing; get diagnostics v_rows=row_count;v_total:=v_total+v_rows;
 insert into public.customer_lifecycle_milestones(customer_id,milestone_key,milestone_type,source)
 select p.customer_id,'winback:'||to_char(current_date,'YYYY-MM'),'winback',jsonb_build_object('days_since_last_order',p.days_since_last_order,'value_score',p.value_score) from public.customer_value_profiles p where p.lifecycle_segment in ('winback','dormant')
 on conflict(customer_id,milestone_key) do nothing; get diagnostics v_rows=row_count;v_total:=v_total+v_rows;
 return v_total;
end;$$;


ALTER FUNCTION "public"."plan_customer_lifecycle_milestones"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."plan_customer_retention_journeys"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  m record;
  r record;
  v_journey uuid;
  v_created integer:=0;
  v_steps integer:=0;
begin
  for m in
    select * from public.customer_commercial_metrics
    where segment in ('at_risk','winback','dormant')
  loop
    select public.create_customer_journey(
      case when m.segment='at_risk' then 'replenishment'::public.customer_journey_kind else 'winback'::public.customer_journey_kind end,
      m.customer_id,
      m.email_key,
      concat(m.customer_key,':',m.segment),
      jsonb_build_object('segment',m.segment,'paidOrders',m.paid_orders,'revenueGrossHuf',m.revenue_gross_huf,'lastOrderAt',m.last_order_at)
    ) into v_journey;
    v_created:=v_created+1;
    insert into public.customer_journey_steps(journey_id,step_key,purpose,template_key,scheduled_at)
    values(
      v_journey,
      case when m.segment='at_risk' then 'replenishment-reminder' else 'winback-reminder' end,
      'marketing',
      case when m.segment='at_risk' then 'repeat_30d' else 'winback_90d' end,
      now()
    ) on conflict(journey_id,step_key) do nothing;
    if found then v_steps:=v_steps+1; end if;
  end loop;

  for r in
    select id,user_id,email,recovery_token,last_seen_at,expires_at
    from public.checkout_recovery_intents
    where status='open'
      and expires_at>now()
      and last_seen_at<=now()-interval '2 hours'
  loop
    select public.create_customer_journey(
      'abandoned_checkout'::public.customer_journey_kind,
      r.user_id,
      r.email,
      r.id::text,
      jsonb_build_object('checkoutRecoveryId',r.id,'recoveryToken',r.recovery_token,'lastSeenAt',r.last_seen_at,'expiresAt',r.expires_at)
    ) into v_journey;
    v_created:=v_created+1;
    insert into public.customer_journey_steps(journey_id,step_key,purpose,template_key,scheduled_at)
    values(v_journey,'checkout-recovery','marketing','abandoned_checkout',now())
    on conflict(journey_id,step_key) do nothing;
    if found then v_steps:=v_steps+1; end if;
  end loop;

  update public.checkout_recovery_intents
  set status='expired',updated_at=now()
  where status='open' and expires_at<=now();

  return jsonb_build_object('journeysSeen',v_created,'stepsCreated',v_steps);
end;$$;


ALTER FUNCTION "public"."plan_customer_retention_journeys"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."plan_customer_retention_journeys"() IS 'V9 idempotent planner for retention, winback and abandoned-checkout journey steps.';



CREATE OR REPLACE FUNCTION "public"."plan_customer_retention_journeys_v2"("p_instance_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  m record;
  r record;
  v_journey uuid;
  v_created integer:=0;
  v_steps integer:=0;
begin
  if p_instance_id is null then raise exception 'instance_required'; end if;

  for m in
    select *
    from public.customer_commercial_metrics
    where instance_id=p_instance_id
      and segment in('at_risk','winback','dormant')
  loop
    select public.create_customer_journey_v2(
      p_instance_id,
      case when m.segment='at_risk'
        then 'replenishment'::public.customer_journey_kind
        else 'winback'::public.customer_journey_kind end,
      m.customer_id,
      m.email_key,
      concat(m.customer_key,':',m.segment),
      jsonb_build_object(
        'segment',m.segment,
        'paidOrders',m.paid_orders,
        'revenueGrossHuf',m.revenue_gross_huf,
        'lastOrderAt',m.last_order_at
      )
    ) into v_journey;

    v_created:=v_created+1;
    insert into public.customer_journey_steps(
      instance_id,journey_id,step_key,purpose,template_key,scheduled_at
    ) values(
      p_instance_id,
      v_journey,
      case when m.segment='at_risk' then 'replenishment-reminder' else 'winback-reminder' end,
      'marketing',
      case when m.segment='at_risk' then 'repeat_30d' else 'winback_90d' end,
      now()
    )
    on conflict(journey_id,step_key) do nothing;
    if found then v_steps:=v_steps+1; end if;
  end loop;

  for r in
    select id,user_id,email,recovery_token,last_seen_at,expires_at
    from public.checkout_recovery_intents
    where instance_id=p_instance_id
      and status='open'
      and expires_at>now()
      and last_seen_at<=now()-interval '2 hours'
  loop
    select public.create_customer_journey_v2(
      p_instance_id,
      'abandoned_checkout'::public.customer_journey_kind,
      r.user_id,
      r.email,
      r.id::text,
      jsonb_build_object(
        'checkoutRecoveryId',r.id,
        'recoveryToken',r.recovery_token,
        'lastSeenAt',r.last_seen_at,
        'expiresAt',r.expires_at
      )
    ) into v_journey;

    v_created:=v_created+1;
    insert into public.customer_journey_steps(
      instance_id,journey_id,step_key,purpose,template_key,scheduled_at
    ) values(
      p_instance_id,v_journey,'checkout-recovery','marketing','abandoned_checkout',now()
    )
    on conflict(journey_id,step_key) do nothing;
    if found then v_steps:=v_steps+1; end if;
  end loop;

  update public.checkout_recovery_intents
  set status='expired',updated_at=now()
  where instance_id=p_instance_id
    and status='open'
    and expires_at<=now();

  return jsonb_build_object('journeysSeen',v_created,'stepsCreated',v_steps);
end;
$$;


ALTER FUNCTION "public"."plan_customer_retention_journeys_v2"("p_instance_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."plan_high_value_sales_tasks"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_count integer:=0;begin
  update public.sales_tasks t
     set status='cancelled',
         outcome=coalesce(t.outcome,'Automatikusan lezárva: a kereskedelmi lehetőség már nem aktív.'),
         updated_at=now()
   where t.task_key like 'opportunity:%'
     and t.status in ('open','in_progress')
     and exists(select 1 from public.commercial_opportunities o where o.id=t.opportunity_id and o.status not in ('open','in_progress'));

  insert into public.sales_tasks(opportunity_id,task_key,title,description,priority,due_at)
  select o.id,'opportunity:'||o.id::text,
         case when o.channel='b2b' then 'Viszonteladói lehetőség kezelése' else 'Nagy értékű ügyféllehetőség kezelése' end,
         o.reason||coalesce(' · '||o.recommended_action,''),o.priority_score,coalesce(o.due_at,now())
    from public.commercial_opportunities o
   where o.status in ('open','in_progress')
     and (o.priority_score>=80 or o.expected_value_net_huf>=100000)
  on conflict(task_key) do update
     set priority=excluded.priority,due_at=excluded.due_at,description=excluded.description,updated_at=now()
   where public.sales_tasks.status in ('open','in_progress');
  get diagnostics v_count=row_count;
  return v_count;
end;$$;


ALTER FUNCTION "public"."plan_high_value_sales_tasks"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."plan_high_value_sales_tasks_v2"("p_instance_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$declare v_count int:=0;begin insert into public.sales_tasks(instance_id,opportunity_id,task_key,title,description,priority,due_at) select p_instance_id,o.id,'opportunity:'||o.id::text,case when o.channel='b2b' then 'Viszonteladói lehetőség kezelése' else 'Nagy értékű ügyféllehetőség kezelése' end,o.reason||coalesce(' · '||o.recommended_action,''),o.priority_score,coalesce(o.due_at,now()) from public.commercial_opportunities o where o.instance_id=p_instance_id and o.status in('open','in_progress') and(o.priority_score>=80 or o.expected_value_net_huf>=100000) on conflict(instance_id,task_key) do update set priority=excluded.priority,due_at=excluded.due_at,description=excluded.description,updated_at=now() where public.sales_tasks.status in('open','in_progress');get diagnostics v_count=row_count;return v_count;end$$;


ALTER FUNCTION "public"."plan_high_value_sales_tasks_v2"("p_instance_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."plan_loyalty_retention_opportunities"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_count integer:=0;v_inserted integer:=0;v_updated integer:=0;begin
  update public.commercial_opportunities o
     set status='dismissed',closed_at=now(),updated_at=now(),source=o.source||jsonb_build_object('auto_closed_reason','v11_lifecycle_no_longer_actionable')
   where o.channel='b2c' and o.kind in ('retention','winback') and o.status in ('open','in_progress')
     and coalesce(o.source->>'source','')='v11_loyalty' and o.customer_id is not null
     and not exists(select 1 from public.customer_value_profiles p where p.customer_id=o.customer_id and p.lifecycle_segment in ('at_risk','winback','dormant'));

  update public.commercial_opportunities o
     set kind=case when p.lifecycle_segment in ('winback','dormant') then 'winback' else 'retention' end,
         priority_score=greatest(o.priority_score,case when p.value_tier='platinum' then 95 when p.value_tier='gold' then 85 when p.lifecycle_segment in ('winback','dormant') then 80 else 70 end),
         expected_value_net_huf=greatest(o.expected_value_net_huf,round(greatest(coalesce(p.aov_gross_huf,0),0)::numeric/1.27,2)),
         probability_percent=greatest(o.probability_percent,case when p.value_tier='platinum' then 55 when p.value_tier='gold' then 45 when p.lifecycle_segment='at_risk' then 35 else 25 end),
         due_at=least(coalesce(o.due_at,now()),now()),
         reason='V11 lifecycle: '||p.lifecycle_segment||' · tier: '||p.value_tier,
         recommended_action=case when p.lifecycle_segment='at_risk' then 'Megtartási lehetőség felülvizsgálata' else 'Win-back lehetőség felülvizsgálata' end,
         source=o.source||jsonb_build_object('source','v11_loyalty','value_score',p.value_score,'value_tier',p.value_tier,'points_balance',coalesce(b.points_balance,0),'lifecycle_segment',p.lifecycle_segment,'aov_gross_huf',p.aov_gross_huf,'value_basis','gross_div_1_27_estimate'),
         updated_at=now()
    from public.customer_value_profiles p left join public.loyalty_balances b on b.customer_id=p.customer_id
   where o.customer_id=p.customer_id and o.channel='b2c' and o.kind in ('retention','winback') and o.status in ('open','in_progress')
     and p.lifecycle_segment in ('at_risk','winback','dormant');
  get diagnostics v_updated=row_count;

  insert into public.commercial_opportunities(opportunity_key,channel,customer_id,customer_email,kind,status,priority_score,expected_value_net_huf,probability_percent,due_at,reason,recommended_action,source)
  select 'b2c:'||p.customer_id::text||':active','b2c',p.customer_id,p.email_key,
    case when p.lifecycle_segment in ('winback','dormant') then 'winback' else 'retention' end,'open',
    case when p.value_tier='platinum' then 95 when p.value_tier='gold' then 85 when p.lifecycle_segment in ('winback','dormant') then 80 else 70 end,
    round(greatest(coalesce(p.aov_gross_huf,0),0)::numeric/1.27,2),
    case when p.value_tier='platinum' then 55 when p.value_tier='gold' then 45 when p.lifecycle_segment='at_risk' then 35 else 25 end,
    now(),'V11 lifecycle: '||p.lifecycle_segment||' · tier: '||p.value_tier,
    case when p.lifecycle_segment='at_risk' then 'Megtartási lehetőség felülvizsgálata' else 'Win-back lehetőség felülvizsgálata' end,
    jsonb_build_object('source','v11_loyalty','value_score',p.value_score,'value_tier',p.value_tier,'points_balance',coalesce(b.points_balance,0),'lifecycle_segment',p.lifecycle_segment,'aov_gross_huf',p.aov_gross_huf,'value_basis','gross_div_1_27_estimate')
  from public.customer_value_profiles p left join public.loyalty_balances b on b.customer_id=p.customer_id
  where p.lifecycle_segment in ('at_risk','winback','dormant')
    and not exists(select 1 from public.commercial_opportunities o where o.customer_id=p.customer_id and o.channel='b2c' and o.kind in ('retention','winback') and o.status in ('open','in_progress'))
  on conflict(opportunity_key) do nothing;
  get diagnostics v_inserted=row_count;
  v_count:=v_updated+v_inserted; return v_count;
end;$$;


ALTER FUNCTION "public"."plan_loyalty_retention_opportunities"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_owner_claim_available"("p_email" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists(
    select 1
    from private.platform_owner_claims
    where email=lower(trim(p_email))
      and claimed_at is null
  );
$$;


ALTER FUNCTION "public"."platform_owner_claim_available"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prepare_admin_audit_entry"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
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


ALTER FUNCTION "public"."prepare_admin_audit_entry"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_admin_audit_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  raise exception 'Admin audit log is append-only.';
end $$;


ALTER FUNCTION "public"."prevent_admin_audit_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_control_event_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin raise exception 'control_alert_events_append_only'; end;$$;


ALTER FUNCTION "public"."prevent_control_event_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preview_promotion_margin"("p_variant_id" "uuid", "p_discount_percent" numeric, "p_min_margin_percent" numeric DEFAULT 20) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v record;
  v_discount numeric;
  v_net_after numeric;
  v_margin numeric;
  v_margin_pct numeric;
  v_safe boolean;
begin
  if p_discount_percent < 0 or p_discount_percent > 100 then raise exception 'invalid discount percent'; end if;
  if p_min_margin_percent < 0 or p_min_margin_percent > 100 then raise exception 'invalid minimum margin percent'; end if;
  select id,sku,label,net_price_huf,unit_cost_net_huf into v from public.product_variants where id=p_variant_id;
  if not found then raise exception 'variant not found'; end if;
  if v.unit_cost_net_huf is null then
    return jsonb_build_object('safe',false,'reason','missing_unit_cost','variantId',v.id,'sku',v.sku);
  end if;
  v_discount:=v.net_price_huf*(p_discount_percent/100);
  v_net_after:=greatest(0,v.net_price_huf-v_discount);
  v_margin:=v_net_after-v.unit_cost_net_huf;
  v_margin_pct:=case when v_net_after>0 then (v_margin/v_net_after)*100 else -100 end;
  v_safe:=v_margin>=0 and v_margin_pct>=p_min_margin_percent;
  return jsonb_build_object(
    'safe',v_safe,'variantId',v.id,'sku',v.sku,'label',v.label,
    'discountPercent',round(p_discount_percent,2),'netPriceBefore',v.net_price_huf,
    'netPriceAfter',round(v_net_after,2),'unitCostNet',v.unit_cost_net_huf,
    'marginNet',round(v_margin,2),'marginPercent',round(v_margin_pct,2),
    'minimumMarginPercent',round(p_min_margin_percent,2)
  );
end;$$;


ALTER FUNCTION "public"."preview_promotion_margin"("p_variant_id" "uuid", "p_discount_percent" numeric, "p_min_margin_percent" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."preview_promotion_margin"("p_variant_id" "uuid", "p_discount_percent" numeric, "p_min_margin_percent" numeric) IS 'V9 decision guard for planned percentage promotions using current net price and net unit cost.';



CREATE OR REPLACE FUNCTION "public"."preview_promotion_margin_v2"("p_instance_id" "uuid", "p_variant_id" "uuid", "p_discount_percent" numeric, "p_min_margin_percent" numeric DEFAULT 20) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v record;
  v_discount numeric;
  v_net_after numeric;
  v_margin numeric;
  v_margin_pct numeric;
  v_safe boolean;
begin
  if p_instance_id is null then raise exception 'instance_required'; end if;
  if p_discount_percent<0 or p_discount_percent>100 then raise exception 'invalid discount percent'; end if;
  if p_min_margin_percent<0 or p_min_margin_percent>100 then raise exception 'invalid minimum margin percent'; end if;

  select id,sku,label,net_price_huf,unit_cost_net_huf
  into v
  from public.product_variants
  where id=p_variant_id and instance_id=p_instance_id;

  if not found then raise exception 'variant not found in webshop'; end if;
  if v.unit_cost_net_huf is null then
    return jsonb_build_object('safe',false,'reason','missing_unit_cost','variantId',v.id,'sku',v.sku);
  end if;

  v_discount:=v.net_price_huf*(p_discount_percent/100);
  v_net_after:=greatest(0,v.net_price_huf-v_discount);
  v_margin:=v_net_after-v.unit_cost_net_huf;
  v_margin_pct:=case when v_net_after>0 then (v_margin/v_net_after)*100 else -100 end;
  v_safe:=v_margin>=0 and v_margin_pct>=p_min_margin_percent;

  return jsonb_build_object(
    'safe',v_safe,'variantId',v.id,'sku',v.sku,'label',v.label,
    'discountPercent',round(p_discount_percent,2),'netPriceBefore',v.net_price_huf,
    'netPriceAfter',round(v_net_after,2),'unitCostNet',v.unit_cost_net_huf,
    'marginNet',round(v_margin,2),'marginPercent',round(v_margin_pct,2),
    'minimumMarginPercent',round(p_min_margin_percent,2)
  );
end;
$$;


ALTER FUNCTION "public"."preview_promotion_margin_v2"("p_instance_id" "uuid", "p_variant_id" "uuid", "p_discount_percent" numeric, "p_min_margin_percent" numeric) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."action_processing_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_key" "text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "plan_result" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "cleanup_result" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "instance_id" "uuid" NOT NULL
);


ALTER TABLE "public"."action_processing_runs" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_action_cycle"("p_run_key" "text") RETURNS "public"."action_processing_runs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare r public.action_processing_runs;v_plan jsonb;v_clean jsonb;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('action-cycle:'||p_run_key,0));
 select * into r from public.action_processing_runs where run_key=p_run_key;if found and r.completed_at is not null then return r;end if;
 if not found then insert into public.action_processing_runs(run_key) values(p_run_key) returning * into r;end if;
 select public.expire_or_cancel_action_proposals(p_run_key) into v_clean;select public.plan_action_proposals(p_run_key) into v_plan;
 update public.action_processing_runs set cleanup_result=v_clean,plan_result=v_plan,completed_at=now(),metadata=jsonb_build_object('sequence',jsonb_build_array('expire_cancel','plan')) where id=r.id returning * into r;return r;end;$$;


ALTER FUNCTION "public"."process_action_cycle"("p_run_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_action_cycle_v2"("p_instance_id" "uuid", "p_run_key" "text") RETURNS "public"."action_processing_runs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare r public.action_processing_runs;v_active int;begin update public.action_proposals set status='cancelled',cancelled_at=now(),updated_at=now()where instance_id=p_instance_id and status in('proposed','simulated')and expires_at<=now();select count(*)into v_active from public.action_proposals where instance_id=p_instance_id and status in('proposed','simulated','approved');insert into public.action_processing_runs(instance_id,run_key,plan_result,cleanup_result,completed_at,metadata)values(p_instance_id,p_run_key,jsonb_build_object('active_proposals',v_active),jsonb_build_object('expired_cleaned',true),now(),jsonb_build_object('tenant_safe',true,'global_planner_disabled',true))on conflict(instance_id,run_key)do update set completed_at=excluded.completed_at,plan_result=excluded.plan_result,cleanup_result=excluded.cleanup_result,metadata=excluded.metadata returning * into r;return r;end$$;


ALTER FUNCTION "public"."process_action_cycle_v2"("p_instance_id" "uuid", "p_run_key" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assurance_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_key" "text" NOT NULL,
    "status" "text" DEFAULT 'running'::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "controls_checked" integer DEFAULT 0 NOT NULL,
    "controls_passed" integer DEFAULT 0 NOT NULL,
    "controls_failed" integer DEFAULT 0 NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "assurance_runs_status_check" CHECK (("status" = ANY (ARRAY['running'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."assurance_runs" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_assurance_cycle"("p_run_key" "text") RETURNS "public"."assurance_runs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare r public.assurance_runs;c public.assurance_controls;v jsonb;e public.assurance_evidence;v_checked integer:=0;v_pass integer:=0;v_fail integer:=0;v_subject text:='global';v_key text;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('assurance-run:'||p_run_key,0));
 select * into r from public.assurance_runs where run_key=p_run_key;if found and r.completed_at is not null then return r;end if;if not found then insert into public.assurance_runs(run_key) values(p_run_key) returning * into r;end if;
 for c in select distinct on(control_key) * from public.assurance_controls where enabled order by control_key,version desc loop
  v_key:='run:'||r.id::text||':control:'||c.control_key||':v'||c.version::text;
  select * into e from public.assurance_evidence where evidence_key=v_key;
  if found then v_checked:=v_checked+1;if e.status='pass' then v_pass:=v_pass+1;else v_fail:=v_fail+1;end if;continue;end if;
  begin
   v:=public.evaluate_assurance_control(c.id);v_checked:=v_checked+1;
   insert into public.assurance_evidence(evidence_key,run_id,control_id,status,subject_key,evidence,evidence_hash,source_observed_at)
   values(v_key,r.id,c.id,case when (v->>'passed')::boolean then 'pass' else 'fail' end,v_subject,v,md5(v::text),(v->>'source_observed_at')::timestamptz) returning * into e;
   if e.status='pass' then v_pass:=v_pass+1;else v_fail:=v_fail+1;end if;
  exception when others then
   v_checked:=v_checked+1;v_fail:=v_fail+1;v:=jsonb_build_object('passed',false,'error',sqlerrm,'source_observed_at',now());
   insert into public.assurance_evidence(evidence_key,run_id,control_id,status,subject_key,evidence,evidence_hash,source_observed_at)
   values(v_key,r.id,c.id,'error',v_subject,v,md5(v::text),now()) returning * into e;
  end;
 end loop;
 update public.assurance_runs set status='completed',completed_at=now(),controls_checked=v_checked,controls_passed=v_pass,controls_failed=v_fail,metadata=metadata||jsonb_build_object('engine_version','v16-replay-safe') where id=r.id returning * into r;
 insert into public.assurance_events(event_key,run_id,event_type,metadata) values('run-complete:'||r.id::text,r.id,'run_completed',jsonb_build_object('checked',v_checked,'passed',v_pass,'failed',v_fail)) on conflict(event_key) do nothing;return r;
end;$$;


ALTER FUNCTION "public"."process_assurance_cycle"("p_run_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_assurance_readiness_cycle"("p_run_key" "text") RETURNS "public"."assurance_runs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare r public.assurance_runs;v_expired integer;v_reconcile jsonb;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('assurance-readiness:'||p_run_key,0));
 select * into r from public.assurance_runs where run_key=p_run_key;if found and r.completed_at is not null then return r;end if;
 v_expired:=public.expire_assurance_risk_acceptances(p_run_key);r:=public.process_assurance_cycle(p_run_key);v_reconcile:=public.reconcile_assurance_findings(r.id);
 update public.assurance_runs set metadata=metadata||jsonb_build_object('expired_risk_acceptances',v_expired,'reconciliation',v_reconcile) where id=r.id returning * into r;return r;end;$$;


ALTER FUNCTION "public"."process_assurance_readiness_cycle"("p_run_key" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automation_processing_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_key" "text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "planned" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "reconciled" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "instance_id" "uuid" NOT NULL
);


ALTER TABLE "public"."automation_processing_runs" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_automation_cycle"("p_run_key" "text") RETURNS "public"."automation_processing_runs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare x public.automation_processing_runs;v_stale integer;v_sync jsonb;v_plan jsonb;v_rec jsonb;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('automation-cycle:'||p_run_key,0));select * into x from public.automation_processing_runs where run_key=p_run_key;if found and x.completed_at is not null then return x;end if;if not found then insert into public.automation_processing_runs(run_key) values(p_run_key) returning * into x;end if;
 select public.cancel_stale_automation_incidents(p_run_key) into v_stale;select public.refresh_automation_ready_steps(p_run_key) into v_sync;select public.plan_automation_runbooks(p_run_key) into v_plan;select public.reconcile_automation_runbooks(p_run_key) into v_rec;v_rec:=v_rec||jsonb_build_object('stale_incidents_cancelled',v_stale,'step_sync',v_sync);
 update public.automation_processing_runs set planned=v_plan,reconciled=v_rec,completed_at=now(),metadata=jsonb_build_object('sequence',jsonb_build_array('cancel_stale_incidents','sync_human_steps','plan','reconcile')) where id=x.id returning * into x;return x;end;$$;


ALTER FUNCTION "public"."process_automation_cycle"("p_run_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_automation_cycle_v2"("p_instance_id" "uuid", "p_run_key" "text") RETURNS "public"."automation_processing_runs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare r public.automation_processing_runs;v_active int;begin select count(*)into v_active from public.automation_runbook_instances where instance_id=p_instance_id and status in('planned','active','paused');insert into public.automation_processing_runs(instance_id,run_key,planned,reconciled,completed_at,metadata)values(p_instance_id,p_run_key,jsonb_build_object('active_instances',v_active),jsonb_build_object('safe_reconcile',true),now(),jsonb_build_object('tenant_safe',true,'global_planner_disabled',true))on conflict(instance_id,run_key)do update set completed_at=excluded.completed_at,planned=excluded.planned,reconciled=excluded.reconciled,metadata=excluded.metadata returning * into r;return r;end$$;


ALTER FUNCTION "public"."process_automation_cycle_v2"("p_instance_id" "uuid", "p_run_key" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."control_processing_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_key" "text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "detector_result" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "task_result" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "instance_id" "uuid" NOT NULL
);


ALTER TABLE "public"."control_processing_runs" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_control_tower_cycle"("p_run_key" "text") RETURNS "public"."control_processing_runs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  run public.control_processing_runs;v_started timestamptz;v_domain jsonb;v_customer jsonb;v_system jsonb;v_resolved integer;v_tasks jsonb;
begin
  if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('control-cycle:'||p_run_key,0));
  select * into run from public.control_processing_runs where run_key=p_run_key for update;
  if found and run.completed_at is not null then return run; end if;
  if not found then insert into public.control_processing_runs(run_key) values(p_run_key) returning * into run; end if;
  v_started:=run.started_at;
  select public.detect_control_tower_alerts(p_run_key) into v_domain;
  select public.detect_customer_value_control_alerts(p_run_key) into v_customer;
  select public.detect_system_control_alerts(p_run_key) into v_system;
  select public.resolve_stale_control_alerts(v_started,p_run_key) into v_resolved;
  select public.plan_control_tasks(p_run_key) into v_tasks;
  update public.control_processing_runs set detector_result=jsonb_build_object('domain',v_domain,'customer',v_customer,'system',v_system,'auto_resolved',v_resolved),task_result=v_tasks,completed_at=now(),metadata=jsonb_build_object('safety','control_plane_only','sequence',jsonb_build_array('detect_domain','detect_customer_value','detect_system','resolve_stale','plan_human_tasks')) where id=run.id returning * into run;
  return run;
end;$$;


ALTER FUNCTION "public"."process_control_tower_cycle"("p_run_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_control_tower_cycle_v2"("p_instance_id" "uuid", "p_run_key" "text") RETURNS "public"."control_processing_runs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare r public.control_processing_runs;v_open int;v_tasks int;begin if nullif(trim(p_run_key),'')is null then raise exception 'run_key_required';end if;select count(*)into v_open from public.control_alerts where instance_id=p_instance_id and status in('open','acknowledged','snoozed');select count(*)into v_tasks from public.control_tasks where instance_id=p_instance_id and status in('open','in_progress');insert into public.control_processing_runs(instance_id,run_key,detector_result,task_result,completed_at,metadata)values(p_instance_id,p_run_key,jsonb_build_object('active_alerts',v_open),jsonb_build_object('active_tasks',v_tasks),now(),jsonb_build_object('tenant_safe',true,'global_detectors_disabled',true))on conflict(instance_id,run_key)do update set completed_at=excluded.completed_at,detector_result=excluded.detector_result,task_result=excluded.task_result,metadata=excluded.metadata returning * into r;return r;end$$;


ALTER FUNCTION "public"."process_control_tower_cycle_v2"("p_instance_id" "uuid", "p_run_key" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_processing_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_key" "text" NOT NULL,
    "accrued_points_entries" integer DEFAULT 0 NOT NULL,
    "reversed_points_entries" integer DEFAULT 0 NOT NULL,
    "refreshed_profiles" integer DEFAULT 0 NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "instance_id" "uuid" NOT NULL
);


ALTER TABLE "public"."loyalty_processing_runs" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_loyalty_lifecycle"("p_run_key" "text") RETURNS "public"."loyalty_processing_runs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v public.loyalty_processing_runs;v_accrued integer:=0;v_reversed integer:=0;v_profiles integer:=0;v_bonus integer:=0;v_milestones integer:=0;v_opportunities integer:=0;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'A futási kulcs kötelező.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('loyalty-lifecycle:'||p_run_key,0));
 select * into v from public.loyalty_processing_runs where run_key=p_run_key;
 if found and v.completed_at is not null then return v; end if;
 if not found then insert into public.loyalty_processing_runs(run_key) values(p_run_key) returning * into v; end if;
 select public.accrue_loyalty_points_from_paid_orders() into v_accrued;
 select public.refresh_customer_value_profiles() into v_profiles;
 select public.apply_loyalty_tier_bonus_points() into v_bonus;
 select public.reverse_loyalty_points_for_ineligible_orders() into v_reversed;
 select public.plan_customer_lifecycle_milestones() into v_milestones;
 select public.plan_loyalty_retention_opportunities() into v_opportunities;
 update public.loyalty_processing_runs set accrued_points_entries=v_accrued,reversed_points_entries=v_reversed,refreshed_profiles=v_profiles,completed_at=now(),metadata=jsonb_build_object('sequence',jsonb_build_array('accrue','refresh_profiles','tier_bonus','reverse','milestones','retention_opportunities'),'tier_bonus_entries',v_bonus,'milestones',v_milestones,'opportunity_upserts',v_opportunities) where id=v.id returning * into v;
 return v;
end;$$;


ALTER FUNCTION "public"."process_loyalty_lifecycle"("p_run_key" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."operations_processing_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_key" "text" NOT NULL,
    "reconciled" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "priorities_refreshed" integer DEFAULT 0 NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."operations_processing_runs" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_operations_cycle"("p_run_key" "text") RETURNS "public"."operations_processing_runs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v public.operations_processing_runs;
  v_reconciled jsonb;
  v_priorities integer;
begin
  if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('operations-cycle:'||p_run_key,0));
  select * into v from public.operations_processing_runs where run_key=p_run_key;
  if found and v.completed_at is not null then return v; end if;
  if not found then insert into public.operations_processing_runs(run_key) values(p_run_key) returning * into v; end if;
  select public.reconcile_inventory_reservations() into v_reconciled;
  select public.refresh_order_operation_priorities() into v_priorities;
  update public.operations_processing_runs
     set reconciled=v_reconciled,
         priorities_refreshed=v_priorities,
         completed_at=now(),
         metadata=jsonb_build_object(
           'sequence',jsonb_build_array('reconcile_inventory','refresh_priorities'),
           'refund_inventory_policy','return_case_only'
         )
   where id=v.id
   returning * into v;
  return v;
end $$;


ALTER FUNCTION "public"."process_operations_cycle"("p_run_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_post_release_cycle"("p_run_key" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare s record;v_count int:=0;v_result jsonb;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'Run key kötelező.';end if;
 for s in select id from public.post_release_sessions where status not in('closed','cancelled') order by started_at loop
   v_result:=public.reconcile_post_release_session(s.id,p_run_key);v_count:=v_count+1;
 end loop;
 return jsonb_build_object('processed',v_count,'run_key',p_run_key);end;$$;


ALTER FUNCTION "public"."process_post_release_cycle"("p_run_key" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."release_governance_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_key" "text" NOT NULL,
    "status" "text" DEFAULT 'running'::"text" NOT NULL,
    "invalidated_candidates" integer DEFAULT 0 NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "release_governance_runs_status_check" CHECK (("status" = ANY (ARRAY['running'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."release_governance_runs" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_release_governance_cycle"("p_run_key" "text") RETURNS "public"."release_governance_runs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare r public.release_governance_runs;v jsonb;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'run_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('release-governance:'||p_run_key,0));select * into r from public.release_governance_runs where run_key=p_run_key;if found and r.status='completed' then return r;end if;if not found then insert into public.release_governance_runs(run_key) values(p_run_key) returning * into r;end if;v:=public.reconcile_release_candidates(p_run_key);update public.release_governance_runs set status='completed',invalidated_candidates=coalesce((v->>'invalidated')::integer,0),completed_at=now(),metadata=jsonb_build_object('reconcile',v) where id=r.id returning * into r;return r;end;$$;


ALTER FUNCTION "public"."process_release_governance_cycle"("p_run_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purge_observability_events"("p_retention_days" integer DEFAULT 30) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare n integer;begin if p_retention_days<7 or p_retention_days>365 then raise exception 'invalid_retention';end if;delete from public.observability_events where occurred_at<now()-make_interval(days=>p_retention_days);get diagnostics n=row_count;return n;end;$$;


ALTER FUNCTION "public"."purge_observability_events"("p_retention_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."queue_abandoned_checkout_recoveries"("p_limit" integer DEFAULT 50, "p_min_age_minutes" integer DEFAULT 60) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare r record;j uuid;n integer:=0;
begin
 for r in select i.id,i.user_id,i.email,i.recovery_token,i.cart from public.checkout_recovery_intents i where i.status='open' and i.expires_at>now() and i.communication_job_id is null and i.last_seen_at<=now()-make_interval(mins=>greatest(p_min_age_minutes,15)) order by i.last_seen_at asc for update of i skip locked limit greatest(1,least(p_limit,200)) loop
  if public.has_marketing_consent(r.email,'email') is not true then continue;end if;
  insert into public.communication_jobs(recipient_email,user_id,purpose,template_key,payload,idempotency_key,requires_approval,approved_at) values(lower(trim(r.email)),r.user_id,'marketing','abandoned_checkout',jsonb_build_object('recoveryUrl','/kosar/visszaallitas?token='||r.recovery_token::text,'itemCount',jsonb_array_length(r.cart),'recoveryIntentId',r.id),'checkout-recovery:'||r.id::text,false,now()) on conflict(idempotency_key) do update set updated_at=now() returning id into j;
  update public.checkout_recovery_intents set communication_job_id=j,updated_at=now() where id=r.id;n:=n+1;
 end loop;return n;
end;$$;


ALTER FUNCTION "public"."queue_abandoned_checkout_recoveries"("p_limit" integer, "p_min_age_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."queue_abandoned_checkout_recoveries_v2"("p_instance_id" "uuid", "p_limit" integer DEFAULT 50, "p_min_age_minutes" integer DEFAULT 60) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare r record;j uuid;n integer:=0;
begin
  for r in select i.id,i.user_id,i.email,i.recovery_token,i.cart from public.checkout_recovery_intents i
    where i.instance_id=p_instance_id and i.status='open' and i.expires_at>now() and i.communication_job_id is null
      and i.last_seen_at<=now()-make_interval(mins=>greatest(p_min_age_minutes,15))
    order by i.last_seen_at asc for update of i skip locked limit greatest(1,least(p_limit,200))
  loop
    if public.has_marketing_consent_v2(p_instance_id,r.email,'email') is not true then continue; end if;
    insert into public.communication_jobs(instance_id,recipient_email,user_id,purpose,template_key,payload,idempotency_key,requires_approval,approved_at)
    values(p_instance_id,lower(trim(r.email)),r.user_id,'marketing','abandoned_checkout',
      jsonb_build_object('recoveryUrl','/kosar/visszaallitas?token='||r.recovery_token::text,'itemCount',jsonb_array_length(r.cart),'recoveryIntentId',r.id),
      'checkout-recovery:'||r.id::text,true,null)
    on conflict(instance_id,idempotency_key) do update set updated_at=now()
    returning id into j;
    update public.checkout_recovery_intents set communication_job_id=j,updated_at=now() where id=r.id and instance_id=p_instance_id;
    n:=n+1;
  end loop;
  return n;
end;
$$;


ALTER FUNCTION "public"."queue_abandoned_checkout_recoveries_v2"("p_instance_id" "uuid", "p_limit" integer, "p_min_age_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."queue_available_stock_notifications"("p_limit" integer DEFAULT 50) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare r record; v_job_id uuid; v_count integer:=0;
begin
  for r in
    select sn.id,sn.variant_id,sn.user_id,sn.email,p.name as product_name,p.slug,pv.label
    from public.stock_notifications sn
    join public.product_variants pv on pv.id=sn.variant_id
    join public.products p on p.id=pv.product_id
    where sn.status='waiting' and pv.active=true and pv.stock_quantity>0 and p.active=true
    order by sn.created_at
    for update of sn skip locked
    limit greatest(1,least(coalesce(p_limit,50),200))
  loop
    insert into public.communication_jobs(recipient_email,user_id,purpose,template_key,payload,idempotency_key,requires_approval,approved_at)
    values(lower(r.email),r.user_id,'transactional','stock_available',jsonb_build_object('productName',r.product_name,'variantLabel',r.label,'productUrl','/termek/'||r.slug,'stockNotificationId',r.id),'stock-notification:'||r.id::text,false,now())
    on conflict(idempotency_key) do update set updated_at=now()
    returning id into v_job_id;
    update public.stock_notifications set status='queued',communication_job_id=v_job_id where id=r.id;
    v_count:=v_count+1;
  end loop;
  return v_count;
end;$$;


ALTER FUNCTION "public"."queue_available_stock_notifications"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."queue_available_stock_notifications_v2"("p_instance_id" "uuid", "p_limit" integer DEFAULT 50) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare r record;v_job_id uuid;v_count integer:=0;
begin
  for r in
    select sn.id,sn.variant_id,sn.user_id,sn.email,p.name product_name,p.slug,pv.label
    from public.stock_notifications sn
    join public.product_variants pv on pv.id=sn.variant_id and pv.instance_id=p_instance_id
    join public.products p on p.id=pv.product_id and p.instance_id=p_instance_id
    where sn.instance_id=p_instance_id and sn.status='waiting' and pv.active=true and pv.stock_quantity>0 and p.active=true
    order by sn.created_at for update of sn skip locked limit greatest(1,least(coalesce(p_limit,50),200))
  loop
    insert into public.communication_jobs(instance_id,recipient_email,user_id,purpose,template_key,payload,idempotency_key,requires_approval,approved_at)
    values(p_instance_id,lower(r.email),r.user_id,'transactional','stock_available',
      jsonb_build_object('productName',r.product_name,'variantLabel',r.label,'productUrl','/termek/'||r.slug,'stockNotificationId',r.id),
      'stock-notification:'||r.id::text,false,now())
    on conflict(instance_id,idempotency_key) do update set updated_at=now()
    returning id into v_job_id;
    update public.stock_notifications set status='queued',communication_job_id=v_job_id where id=r.id and instance_id=p_instance_id;
    v_count:=v_count+1;
  end loop;
  return v_count;
end;
$$;


ALTER FUNCTION "public"."queue_available_stock_notifications_v2"("p_instance_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."queue_due_customer_journey_steps"("p_limit" integer DEFAULT 50) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare s record;j public.customer_journeys%rowtype;v_job uuid;v_queued integer:=0;v_blocked integer:=0;begin
  for s in
    select id,journey_id,step_key,purpose,template_key,scheduled_at
    from public.customer_journey_steps
    where status='pending' and scheduled_at<=now()
    order by scheduled_at,id
    for update skip locked
    limit greatest(1,least(p_limit,200))
  loop
    select * into j from public.customer_journeys where id=s.journey_id for update;
    if not found or j.status<>'active' then
      update public.customer_journey_steps set status='cancelled' where id=s.id;
      continue;
    end if;
    begin
      v_job:=public.enqueue_communication(
        j.email,j.user_id,s.purpose,s.template_key,
        coalesce(j.metadata,'{}'::jsonb)||jsonb_build_object('journeyId',j.id,'journeyKind',j.kind,'stepKey',s.step_key),
        concat('journey:',j.id,':',s.step_key),s.scheduled_at
      );
      update public.customer_journey_steps set status='queued',communication_job_id=v_job where id=s.id;
      v_queued:=v_queued+1;
    exception when others then
      update public.customer_journey_steps set status='blocked' where id=s.id;
      v_blocked:=v_blocked+1;
    end;
  end loop;
  return jsonb_build_object('queued',v_queued,'blocked',v_blocked);
end;$$;


ALTER FUNCTION "public"."queue_due_customer_journey_steps"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."quote_tenant_checkout_v1"("p_instance_id" "uuid", "p_customer_id" "uuid" DEFAULT NULL::"uuid", "p_coupon_code" "text" DEFAULT ''::"text", "p_shipping_kind" "text" DEFAULT 'pickup'::"text", "p_shipping_fee_huf" integer DEFAULT 0, "p_free_shipping_threshold_huf" integer DEFAULT 0, "p_items" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_item jsonb;v_items jsonb;v_variant record;v_qty integer;v_subtotal integer:=0;v_discount integer:=0;v_shipping integer:=0;
  v_coupon record;v_code text:=upper(trim(coalesce(p_coupon_code,'')));v_role public.customer_role;v_reseller boolean:=false;v_price integer;v_lines jsonb:='[]'::jsonb;
begin
  if not exists(select 1 from public.webshop_instances w where w.id=p_instance_id and w.status in('pilot','active')) then raise exception 'A webshop nem rendelhető.';end if;
  if jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>30 then raise exception 'A kosár tartalma érvénytelen.';end if;
  begin
    select jsonb_agg(jsonb_build_object('variant_id',n.variant_id,'quantity',n.quantity) order by n.variant_id) into v_items
    from(select (e->>'variant_id')::uuid as variant_id,sum((e->>'quantity')::integer)::integer as quantity from jsonb_array_elements(p_items)e group by(e->>'variant_id')::uuid)n;
  exception when others then raise exception 'A kosár tartalma érvénytelen.';end;
  if v_items is null or exists(select 1 from jsonb_array_elements(v_items)e where(e->>'quantity')::integer<1 or(e->>'quantity')::integer>99) then raise exception 'Érvénytelen mennyiség.';end if;
  if p_customer_id is not null then select role,reseller_approved into v_role,v_reseller from public.customer_instance_roles where instance_id=p_instance_id and user_id=p_customer_id;end if;
  for v_item in select value from jsonb_array_elements(v_items) order by(value->>'variant_id')::uuid loop
    v_qty:=(v_item->>'quantity')::integer;
    select pv.id,pv.product_id,pv.sku,pv.label,pv.gross_price_huf,pv.reseller_gross_price_huf,pv.stock_quantity,pv.active,p.name product_name,p.active product_active,p.audience product_audience
    into v_variant from public.product_variants pv join public.products p on p.id=pv.product_id
    where pv.id=(v_item->>'variant_id')::uuid and pv.instance_id=p_instance_id and p.instance_id=p_instance_id;
    if not found or not v_variant.active or not v_variant.product_active then raise exception 'Nem elérhető termék.';end if;
    if coalesce(v_variant.product_audience,'retail')='professional' and not(v_role='reseller' and v_reseller) then raise exception 'Ez a termék csak jóváhagyott viszonteladói partnernek rendelhető.';end if;
    if v_variant.stock_quantity<v_qty then raise exception 'Nincs elegendő készlet: %',v_variant.label;end if;
    v_price:=case when v_role='reseller' and v_reseller and v_variant.reseller_gross_price_huf is not null then v_variant.reseller_gross_price_huf else v_variant.gross_price_huf end;
    v_subtotal:=v_subtotal+v_price*v_qty;
    v_lines:=v_lines||jsonb_build_array(jsonb_build_object('variantId',v_variant.id,'productId',v_variant.product_id,'sku',v_variant.sku,'name',v_variant.product_name,'variantLabel',v_variant.label,'quantity',v_qty,'unitGrossHuf',v_price,'lineGrossHuf',v_price*v_qty,'availableQuantity',v_variant.stock_quantity));
  end loop;
  if v_code<>'' then
    select * into v_coupon from public.coupons where instance_id=p_instance_id and code=v_code;
    if not found or not v_coupon.active then raise exception 'Érvénytelen vagy inaktív kuponkód.';end if;
    if v_coupon.starts_at is not null and now()<v_coupon.starts_at then raise exception 'A kupon még nem használható.';end if;
    if v_coupon.ends_at is not null and now()>=v_coupon.ends_at then raise exception 'A kupon lejárt.';end if;
    if v_coupon.usage_limit is not null and v_coupon.usage_count>=v_coupon.usage_limit then raise exception 'A kupon felhasználási kerete elfogyott.';end if;
    if v_subtotal<v_coupon.min_subtotal_huf then raise exception 'A kuponhoz szükséges minimum kosárérték nincs elérve.';end if;
    if v_coupon.discount_type='percent' then v_discount:=floor(v_subtotal*(least(v_coupon.discount_value,100)::numeric/100))::integer;else v_discount:=least(v_coupon.discount_value,v_subtotal);end if;
    if v_coupon.max_discount_huf is not null then v_discount:=least(v_discount,v_coupon.max_discount_huf);end if;v_discount:=greatest(0,least(v_discount,v_subtotal));
  end if;
  if p_shipping_kind='pickup' or((v_subtotal-v_discount)>=greatest(0,p_free_shipping_threshold_huf) and p_free_shipping_threshold_huf>0) then v_shipping:=0;else v_shipping:=greatest(0,p_shipping_fee_huf);end if;
  return jsonb_build_object('items',v_lines,'subtotal_gross_huf',v_subtotal,'discount_gross_huf',v_discount,'shipping_gross_huf',v_shipping,'total_gross_huf',greatest(0,v_subtotal-v_discount)+v_shipping,'coupon_code',nullif(v_code,''));
end$$;


ALTER FUNCTION "public"."quote_tenant_checkout_v1"("p_instance_id" "uuid", "p_customer_id" "uuid", "p_coupon_code" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_free_shipping_threshold_huf" integer, "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."quote_tenant_checkout_v2"("p_instance_id" "uuid", "p_customer_id" "uuid" DEFAULT NULL::"uuid", "p_coupon_code" "text" DEFAULT ''::"text", "p_shipping_kind" "text" DEFAULT 'pickup'::"text", "p_shipping_fee_huf" integer DEFAULT 0, "p_free_shipping_threshold_huf" integer DEFAULT 0, "p_items" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_item jsonb;v_items jsonb;v_variant record;v_qty integer;v_subtotal integer:=0;v_discount integer:=0;v_shipping integer:=0;
  v_coupon record;v_code text:=upper(trim(coalesce(p_coupon_code,'')));v_role public.customer_role;v_reseller boolean:=false;v_channel text:='b2c';v_price integer;v_lines jsonb:='[]'::jsonb;v_has_channel boolean:=false;v_channel_visible boolean;v_channel_gross integer;v_channel_min integer;v_channel_discount numeric;v_min_qty integer;v_multiple integer;v_active_variant_count integer;v_explicit_channel_price boolean:=false;
begin
  if not exists(select 1 from public.webshop_instances w where w.id=p_instance_id and w.status in('pilot','active')) then raise exception 'A webshop nem rendelhető.';end if;
  if jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>30 then raise exception 'A kosár tartalma érvénytelen.';end if;
  begin
    select jsonb_agg(jsonb_build_object('variant_id',n.variant_id,'quantity',n.quantity) order by n.variant_id) into v_items
    from(select (e->>'variant_id')::uuid as variant_id,sum((e->>'quantity')::integer)::integer as quantity from jsonb_array_elements(p_items)e group by(e->>'variant_id')::uuid)n;
  exception when others then raise exception 'A kosár tartalma érvénytelen.';end;
  if v_items is null or exists(select 1 from jsonb_array_elements(v_items)e where(e->>'quantity')::integer<1 or(e->>'quantity')::integer>99) then raise exception 'Érvénytelen mennyiség.';end if;
  if p_customer_id is not null then select role,reseller_approved into v_role,v_reseller from public.customer_instance_roles where instance_id=p_instance_id and user_id=p_customer_id;end if;if v_role='reseller' and v_reseller then v_channel:='b2b';end if;
  for v_item in select value from jsonb_array_elements(v_items) order by(value->>'variant_id')::uuid loop
    v_qty:=(v_item->>'quantity')::integer;
    select pv.id,pv.product_id,pv.sku,pv.label,pv.gross_price_huf,pv.reseller_gross_price_huf,pv.stock_quantity,pv.active,pv.minimum_order_quantity,pv.order_multiple,p.name product_name,p.active product_active,p.audience product_audience
    into v_variant from public.product_variants pv join public.products p on p.id=pv.product_id
    where pv.id=(v_item->>'variant_id')::uuid and pv.instance_id=p_instance_id and p.instance_id=p_instance_id;
    if not found or not v_variant.active or not v_variant.product_active then raise exception 'Nem elérhető termék.';end if;
    select pcs.visible,pcs.gross_price,pcs.minimum_quantity,pcs.discount_percent into v_channel_visible,v_channel_gross,v_channel_min,v_channel_discount from public.product_channel_settings pcs where pcs.instance_id=p_instance_id and pcs.product_id=v_variant.product_id and pcs.channel_code=v_channel;v_has_channel:=found;
    if v_has_channel then if not coalesce(v_channel_visible,true) then raise exception 'A termék ezen az értékesítési csatornán nem elérhető.';end if;elsif coalesce(v_variant.product_audience,'retail')='professional' and v_channel<>'b2b' then raise exception 'Ez a termék csak jóváhagyott viszonteladói partnernek rendelhető.';end if;
    v_min_qty:=greatest(coalesce(v_variant.minimum_order_quantity,1),case when v_has_channel then coalesce(v_channel_min,1) else 1 end);v_multiple:=greatest(coalesce(v_variant.order_multiple,1),1);v_min_qty:=(ceil(v_min_qty::numeric/v_multiple)::integer)*v_multiple;
    if v_qty<v_min_qty then raise exception 'Minimum rendelési mennyiség: % db',v_min_qty;end if;if mod(v_qty,v_multiple)<>0 then raise exception 'A rendelési mennyiség csak % db-os lépésekben adható meg.',v_multiple;end if;
    if v_variant.stock_quantity<v_qty then raise exception 'Nincs elegendő készlet: %',v_variant.label;end if;
    v_price:=case when v_channel='b2b' and v_variant.reseller_gross_price_huf is not null then v_variant.reseller_gross_price_huf else v_variant.gross_price_huf end;
    select count(*)::integer into v_active_variant_count from public.product_variants x where x.instance_id=p_instance_id and x.product_id=v_variant.product_id and x.active=true;
    v_explicit_channel_price:=v_has_channel and v_channel_gross is not null and v_active_variant_count=1 and not(v_channel='b2b' and v_variant.reseller_gross_price_huf is not null);
    if v_explicit_channel_price then v_price:=greatest(0,v_channel_gross);elsif v_has_channel and v_channel_discount is not null then v_price:=greatest(0,round(v_price*(1-(least(greatest(v_channel_discount,0),100)/100.0)))::integer);end if;
    v_subtotal:=v_subtotal+v_price*v_qty;
    v_lines:=v_lines||jsonb_build_array(jsonb_build_object('variantId',v_variant.id,'productId',v_variant.product_id,'sku',v_variant.sku,'name',v_variant.product_name,'variantLabel',v_variant.label,'quantity',v_qty,'unitGrossHuf',v_price,'lineGrossHuf',v_price*v_qty,'availableQuantity',v_variant.stock_quantity,'minimumQuantity',v_min_qty,'orderMultiple',v_multiple,'channel',v_channel));
  end loop;
  if v_code<>'' then
    select * into v_coupon from public.coupons where instance_id=p_instance_id and code=v_code;
    if not found or not v_coupon.active then raise exception 'Érvénytelen vagy inaktív kuponkód.';end if;
    if v_coupon.starts_at is not null and now()<v_coupon.starts_at then raise exception 'A kupon még nem használható.';end if;
    if v_coupon.ends_at is not null and now()>=v_coupon.ends_at then raise exception 'A kupon lejárt.';end if;
    if v_coupon.usage_limit is not null and v_coupon.usage_count>=v_coupon.usage_limit then raise exception 'A kupon felhasználási kerete elfogyott.';end if;
    if v_subtotal<v_coupon.min_subtotal_huf then raise exception 'A kuponhoz szükséges minimum kosárérték nincs elérve.';end if;
    if v_coupon.discount_type='percent' then v_discount:=floor(v_subtotal*(least(v_coupon.discount_value,100)::numeric/100))::integer;else v_discount:=least(v_coupon.discount_value,v_subtotal);end if;
    if v_coupon.max_discount_huf is not null then v_discount:=least(v_discount,v_coupon.max_discount_huf);end if;v_discount:=greatest(0,least(v_discount,v_subtotal));
  end if;
  if p_shipping_kind='pickup' or((v_subtotal-v_discount)>=greatest(0,p_free_shipping_threshold_huf) and p_free_shipping_threshold_huf>0) then v_shipping:=0;else v_shipping:=greatest(0,p_shipping_fee_huf);end if;
  return jsonb_build_object('items',v_lines,'subtotal_gross_huf',v_subtotal,'discount_gross_huf',v_discount,'shipping_gross_huf',v_shipping,'total_gross_huf',greatest(0,v_subtotal-v_discount)+v_shipping,'coupon_code',nullif(v_code,''));
end$$;


ALTER FUNCTION "public"."quote_tenant_checkout_v2"("p_instance_id" "uuid", "p_customer_id" "uuid", "p_coupon_code" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_free_shipping_threshold_huf" integer, "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."receive_purchase_order"("p_purchase_order_id" "uuid", "p_actor" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  po record;
  item record;
  previous_qty integer;
  add_qty integer;
  received_lines integer:=0;
  received_units integer:=0;
begin
  select id,order_number,status into po
  from public.purchase_orders
  where id=p_purchase_order_id
  for update;

  if not found then raise exception 'A beszerzés nem található.'; end if;
  if po.status not in ('ordered','partially_received') then
    raise exception 'Csak megrendelt beszerzés vételezhető be.';
  end if;

  for item in
    select id,variant_id,quantity,received_quantity
    from public.purchase_order_items
    where purchase_order_id=p_purchase_order_id
    order by id
    for update
  loop
    add_qty:=item.quantity-item.received_quantity;
    if add_qty<=0 then continue; end if;

    select stock_quantity into previous_qty
    from public.product_variants
    where id=item.variant_id
    for update;
    if not found then raise exception 'A beszerzési termékváltozat nem található.'; end if;

    update public.product_variants
      set stock_quantity=stock_quantity+add_qty,updated_at=now()
      where id=item.variant_id;

    update public.purchase_order_items
      set received_quantity=quantity
      where id=item.id;

    insert into public.inventory_events(
      variant_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata
    ) values(
      item.variant_id,add_qty,previous_qty,previous_qty+add_qty,'purchase_receipt',p_actor,
      jsonb_build_object('purchase_order_id',po.id,'order_number',po.order_number,'received_quantity',add_qty)
    );

    received_lines:=received_lines+1;
    received_units:=received_units+add_qty;
  end loop;

  if received_lines=0 then raise exception 'A beszerzés minden tétele már be lett vételezve.'; end if;

  update public.purchase_orders
    set status='received',updated_at=now()
    where id=p_purchase_order_id;

  return jsonb_build_object('received_lines',received_lines,'received_units',received_units,'status','received');
end;
$$;


ALTER FUNCTION "public"."receive_purchase_order"("p_purchase_order_id" "uuid", "p_actor" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."receive_purchase_order"("p_purchase_order_id" "uuid", "p_actor" "uuid") IS 'Atomically receives all outstanding quantities of one ordered purchase order and updates inventory.';



CREATE OR REPLACE FUNCTION "public"."receive_purchase_order_items"("p_purchase_order_id" "uuid", "p_actor" "uuid", "p_items" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  po record;
  req jsonb;
  poi record;
  previous_qty integer;
  add_qty integer;
  remaining integer;
  received_lines integer:=0;
  received_units integer:=0;
  final_status text;
begin
  select id,order_number,status into po
  from public.purchase_orders where id=p_purchase_order_id for update;
  if not found then raise exception 'A beszerzés nem található.'; end if;
  if po.status not in ('ordered','partially_received') then
    raise exception 'Csak megrendelt beszerzés vételezhető be.';
  end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then
    raise exception 'Legalább egy bevételezendő tétel szükséges.';
  end if;

  for req in select value from jsonb_array_elements(p_items) loop
    add_qty:=(req->>'quantity')::integer;
    if add_qty<=0 then raise exception 'A bevételezett mennyiségnek pozitívnak kell lennie.'; end if;

    select id,variant_id,quantity,received_quantity into poi
    from public.purchase_order_items
    where id=(req->>'itemId')::uuid and purchase_order_id=p_purchase_order_id
    for update;
    if not found then raise exception 'A beszerzési tétel nem található.'; end if;
    if poi.received_quantity+add_qty>poi.quantity then
      raise exception 'A bevételezett mennyiség meghaladná a megrendelt mennyiséget.';
    end if;

    select stock_quantity into previous_qty
    from public.product_variants where id=poi.variant_id for update;
    if not found then raise exception 'A beszerzési termékváltozat nem található.'; end if;

    update public.product_variants
      set stock_quantity=stock_quantity+add_qty,updated_at=now()
      where id=poi.variant_id;
    update public.purchase_order_items
      set received_quantity=received_quantity+add_qty
      where id=poi.id;

    insert into public.inventory_events(
      variant_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata
    ) values(
      poi.variant_id,add_qty,previous_qty,previous_qty+add_qty,'purchase_receipt',p_actor,
      jsonb_build_object('purchase_order_id',po.id,'order_number',po.order_number,'purchase_order_item_id',poi.id,'received_quantity',add_qty,'partial',true)
    );
    received_lines:=received_lines+1;
    received_units:=received_units+add_qty;
  end loop;

  select coalesce(sum(quantity-received_quantity),0)::integer into remaining
  from public.purchase_order_items where purchase_order_id=p_purchase_order_id;
  final_status:=case when remaining=0 then 'received' else 'partially_received' end;
  update public.purchase_orders set status=final_status,updated_at=now() where id=p_purchase_order_id;

  return jsonb_build_object('received_lines',received_lines,'received_units',received_units,'remaining_units',remaining,'status',final_status);
end;$$;


ALTER FUNCTION "public"."receive_purchase_order_items"("p_purchase_order_id" "uuid", "p_actor" "uuid", "p_items" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."receive_purchase_order_items"("p_purchase_order_id" "uuid", "p_actor" "uuid", "p_items" "jsonb") IS 'Atomically receives selected quantities and sets purchase order to partially_received or received.';



CREATE OR REPLACE FUNCTION "public"."receive_purchase_order_items_v2"("p_instance_id" "uuid", "p_purchase_order_id" "uuid", "p_actor" "uuid", "p_items" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare po record;req jsonb;poi record;previous_qty integer;add_qty integer;remaining integer;received_lines integer:=0;received_units integer:=0;final_status text;
begin
  select id,order_number,status into po from public.purchase_orders where id=p_purchase_order_id and instance_id=p_instance_id for update;
  if not found then raise exception 'A beszerzés nem található ebben a webshopban.'; end if;
  if po.status not in ('ordered','partially_received') then raise exception 'Csak megrendelt beszerzés vételezhető be.'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Legalább egy bevételezendő tétel szükséges.';end if;
  for req in select value from jsonb_array_elements(p_items) loop
    add_qty:=(req->>'quantity')::integer;if add_qty<=0 then raise exception 'A bevételezett mennyiségnek pozitívnak kell lennie.';end if;
    select id,variant_id,quantity,received_quantity into poi from public.purchase_order_items where id=(req->>'itemId')::uuid and purchase_order_id=p_purchase_order_id and instance_id=p_instance_id for update;
    if not found then raise exception 'A beszerzési tétel nem található.';end if;
    if poi.received_quantity+add_qty>poi.quantity then raise exception 'A bevételezett mennyiség meghaladná a megrendelt mennyiséget.';end if;
    select stock_quantity into previous_qty from public.product_variants where id=poi.variant_id and instance_id=p_instance_id for update;if not found then raise exception 'A termékváltozat nem található ebben a webshopban.';end if;
    update public.product_variants set stock_quantity=stock_quantity+add_qty,updated_at=now() where id=poi.variant_id and instance_id=p_instance_id;
    update public.purchase_order_items set received_quantity=received_quantity+add_qty where id=poi.id and instance_id=p_instance_id;
    insert into public.inventory_events(instance_id,variant_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata) values(p_instance_id,poi.variant_id,add_qty,previous_qty,previous_qty+add_qty,'purchase_receipt',p_actor,jsonb_build_object('purchase_order_id',po.id,'order_number',po.order_number,'purchase_order_item_id',poi.id,'received_quantity',add_qty,'partial',true));
    received_lines:=received_lines+1;received_units:=received_units+add_qty;
  end loop;
  select coalesce(sum(quantity-received_quantity),0)::integer into remaining from public.purchase_order_items where purchase_order_id=p_purchase_order_id and instance_id=p_instance_id;
  final_status:=case when remaining=0 then 'received' else 'partially_received' end;
  update public.purchase_orders set status=final_status,updated_at=now() where id=p_purchase_order_id and instance_id=p_instance_id;
  return jsonb_build_object('received_lines',received_lines,'received_units',received_units,'remaining_units',remaining,'status',final_status);
end $$;


ALTER FUNCTION "public"."receive_purchase_order_items_v2"("p_instance_id" "uuid", "p_purchase_order_id" "uuid", "p_actor" "uuid", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."receive_purchase_order_v2"("p_instance_id" "uuid", "p_purchase_order_id" "uuid", "p_actor" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare po record;item record;previous_qty integer;add_qty integer;received_lines integer:=0;received_units integer:=0;
begin
  select id,order_number,status into po from public.purchase_orders where id=p_purchase_order_id and instance_id=p_instance_id for update;
  if not found then raise exception 'A beszerzés nem található ebben a webshopban.';end if;
  if po.status not in ('ordered','partially_received') then raise exception 'Csak megrendelt beszerzés vételezhető be.';end if;
  for item in select id,variant_id,quantity,received_quantity from public.purchase_order_items where purchase_order_id=p_purchase_order_id and instance_id=p_instance_id order by id for update loop
    add_qty:=item.quantity-item.received_quantity;if add_qty<=0 then continue;end if;
    select stock_quantity into previous_qty from public.product_variants where id=item.variant_id and instance_id=p_instance_id for update;if not found then raise exception 'A termékváltozat nem található ebben a webshopban.';end if;
    update public.product_variants set stock_quantity=stock_quantity+add_qty,updated_at=now() where id=item.variant_id and instance_id=p_instance_id;
    update public.purchase_order_items set received_quantity=quantity where id=item.id and instance_id=p_instance_id;
    insert into public.inventory_events(instance_id,variant_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata) values(p_instance_id,item.variant_id,add_qty,previous_qty,previous_qty+add_qty,'purchase_receipt',p_actor,jsonb_build_object('purchase_order_id',po.id,'order_number',po.order_number,'received_quantity',add_qty));
    received_lines:=received_lines+1;received_units:=received_units+add_qty;
  end loop;
  if received_lines=0 then raise exception 'A beszerzés minden tétele már be lett vételezve.';end if;
  update public.purchase_orders set status='received',updated_at=now() where id=p_purchase_order_id and instance_id=p_instance_id;
  return jsonb_build_object('received_lines',received_lines,'received_units',received_units,'status','received');
end $$;


ALTER FUNCTION "public"."receive_purchase_order_v2"("p_instance_id" "uuid", "p_purchase_order_id" "uuid", "p_actor" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reconcile_assurance_findings"("p_run_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare e record;f public.assurance_findings;v_opened integer:=0;v_resolved integer:=0;begin
 for e in select ev.*,c.control_key,c.name,c.severity from public.assurance_evidence ev join public.assurance_controls c on c.id=ev.control_id where ev.run_id=p_run_id loop
  select * into f from public.assurance_findings where finding_key=e.control_key||':'||e.subject_key;
  if found and f.last_evidence_id=e.id then continue;end if;
  if e.status='pass' then
   if found and f.status in('open','acknowledged','accepted_risk') then
    update public.assurance_findings set status='resolved',resolved_at=now(),resolved_by=null,last_evidence_id=e.id,accepted_risk_at=null,accepted_risk_by=null,accepted_risk_reason=null,accepted_risk_expires_at=null,updated_at=now() where id=f.id returning * into f;
    insert into public.assurance_events(event_key,finding_id,run_id,event_type,metadata) values('reconcile-resolve:'||p_run_id::text||':'||f.id::text,f.id,p_run_id,'resolved',jsonb_build_object('evidence_id',e.id,'automatic',true)) on conflict(event_key) do nothing;v_resolved:=v_resolved+1;
   end if;
  else
   if found then
    update public.assurance_findings set control_id=e.control_id,severity=e.severity,last_evidence_id=e.id,last_detected_at=now(),occurrence_count=occurrence_count+1,
     status=case when status='resolved' then 'open' when status='accepted_risk' and accepted_risk_expires_at<=now() then 'open' else status end,
     incident_started_at=case when status='resolved' or(status='accepted_risk' and accepted_risk_expires_at<=now()) then now() else incident_started_at end,updated_at=now() where id=f.id returning * into f;
   else
    insert into public.assurance_findings(finding_key,control_id,subject_key,severity,title,description,last_evidence_id)
    values(e.control_key||':'||e.subject_key,e.control_id,e.subject_key,e.severity,e.name,case when e.status='error' then 'A biztosítéki ellenőrzés végrehajtási hibába futott.' else 'A biztosítéki ellenőrzés eltérést talált.' end,e.id) returning * into f;
   end if;
   insert into public.assurance_events(event_key,finding_id,run_id,event_type,metadata) values('reconcile-detect:'||p_run_id::text||':'||f.id::text,f.id,p_run_id,case when f.occurrence_count>1 then 'redetected' else 'detected' end,jsonb_build_object('evidence_id',e.id,'evidence_status',e.status)) on conflict(event_key) do nothing;v_opened:=v_opened+1;
  end if;
 end loop;return jsonb_build_object('opened_or_updated',v_opened,'resolved',v_resolved);end;$$;


ALTER FUNCTION "public"."reconcile_assurance_findings"("p_run_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reconcile_automation_runbooks"("p_run_key" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare rec record;r public.automation_runbooks;v_cancelled integer:=0;v_failed integer:=0;v_escalated integer:=0;v_ready integer:=0;v_task uuid;begin
 for rec in select ai.*,ca.status alert_status,ca.priority_score,ca.title alert_title,ap.status proposal_status
          from public.automation_runbook_instances ai join public.control_alerts ca on ca.id=ai.alert_id left join public.action_proposals ap on ap.id=ai.proposal_id
          where ai.status in ('planned','active','paused') loop
   select * into r from public.automation_runbooks where id=rec.runbook_id;
   if rec.alert_status not in ('open','acknowledged') or (r.requires_action_approval and coalesce(rec.proposal_status,'') in ('rejected','expired','cancelled')) then
     update public.automation_runbook_instances set status='cancelled',cancelled_at=now(),updated_at=now() where id=rec.id;
     update public.automation_step_runs set status='cancelled',finished_at=coalesce(finished_at,now()),updated_at=now() where instance_id=rec.id and status in ('pending','ready','failed');
     insert into public.automation_events(event_key,instance_id,event_type,metadata) values('reconcile-cancel:'||p_run_key||':'||rec.id::text,rec.id,'cancelled',jsonb_build_object('reason','source_condition_closed_or_proposal_invalid')) on conflict(event_key) do nothing;
     v_cancelled:=v_cancelled+1;continue;
   end if;
   if rec.failure_count>=r.max_failures then
     update public.automation_runbook_instances set status='failed',updated_at=now() where id=rec.id;
     insert into public.control_tasks(task_key,alert_id,status,priority_score,title,recommended_action,due_at,metadata)
     values('automation-failed:'||rec.id::text,rec.alert_id,'open',greatest(90,rec.priority_score),'Automatizálási hiba · '||rec.alert_title,'Vizsgáld meg a runbook ismétlődő hibáit és csak igazolt ok után indíts újra.',now()+interval '2 hours',jsonb_build_object('source','v15_runbook_failure','instance_id',rec.id))
     on conflict(task_key) do update set priority_score=greatest(public.control_tasks.priority_score,excluded.priority_score),updated_at=now() returning id into v_task;
     insert into public.automation_events(event_key,instance_id,event_type,metadata) values('reconcile-failed:'||p_run_key||':'||rec.id::text,rec.id,'failed',jsonb_build_object('failure_count',rec.failure_count,'max_failures',r.max_failures,'control_task_id',v_task)) on conflict(event_key) do nothing;
     v_failed:=v_failed+1;continue;
   end if;
   if rec.deadline_at<=now() and rec.escalation_level<5 then
     update public.automation_runbook_instances set escalation_level=least(5,escalation_level+1),updated_at=now() where id=rec.id;
     insert into public.control_tasks(task_key,alert_id,status,priority_score,title,recommended_action,due_at,metadata)
     values('automation-overdue:'||rec.id::text,rec.alert_id,'open',least(100,greatest(80,rec.priority_score)+rec.escalation_level*3),'Lejárt automatizálási SLA · '||rec.alert_title,'Ellenőrizd a lejárt runbookot és jelölj ki következő emberi lépést.',now()+interval '2 hours',jsonb_build_object('source','v15_runbook_escalation','instance_id',rec.id,'escalation_level',rec.escalation_level+1))
     on conflict(task_key) do update set priority_score=greatest(public.control_tasks.priority_score,excluded.priority_score),due_at=least(public.control_tasks.due_at,excluded.due_at),updated_at=now() returning id into v_task;
     insert into public.automation_events(event_key,instance_id,event_type,metadata) values('escalate:'||p_run_key||':'||rec.id::text||':'||(rec.escalation_level+1)::text,rec.id,'escalated',jsonb_build_object('level',rec.escalation_level+1,'control_task_id',v_task)) on conflict(event_key) do nothing;
     v_escalated:=v_escalated+1;
   end if;
 end loop;
 update public.automation_step_runs sr set status='ready',ready_at=coalesce(ready_at,now()),updated_at=now()
 where sr.status='failed' and sr.next_attempt_at<=now() and sr.attempt_count<(select s.max_attempts from public.automation_runbook_steps s where s.id=sr.step_id)
   and exists(select 1 from public.automation_runbook_instances inst where inst.id=sr.instance_id and inst.status='active');
 get diagnostics v_ready=row_count;
 return jsonb_build_object('cancelled',v_cancelled,'failed',v_failed,'escalated',v_escalated,'retries_ready',v_ready);
end;$$;


ALTER FUNCTION "public"."reconcile_automation_runbooks"("p_run_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reconcile_inventory_reservations"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_released integer:=0;
  v_reserved integer:=0;
  v_blocked integer:=0;
  r record;
  v_result jsonb;
begin
  update public.inventory_reservations ir
     set status='released',
         released_at=coalesce(ir.released_at,now()),
         reason=coalesce(ir.reason,'Rendelés törölve'),
         updated_at=now()
    from public.orders o
   where o.id=ir.order_id
     and o.instance_id=ir.instance_id
     and o.status='cancelled'
     and ir.status='active';
  get diagnostics v_released=row_count;

  update public.order_operations op
     set operational_status='cancelled',exception_code=null,updated_at=now()
    from public.orders o
   where o.id=op.order_id
     and o.instance_id=op.instance_id
     and o.status='cancelled'
     and op.operational_status not in ('handed_over','delivered','cancelled');

  -- Refunded orders are deliberately not restocked here. Physical returns are
  -- handled by the item-level return-case restock ledger.
  for r in
    select o.id
      from public.orders o
      left join public.order_operations op on op.order_id=o.id and op.instance_id=o.instance_id
     where o.status in ('pending','paid','processing','shipped','completed')
       and (op.order_id is null or not exists(
         select 1 from public.inventory_reservations ir
          where ir.order_id=o.id and ir.instance_id=o.instance_id
       ))
     order by o.created_at
  loop
    begin
      select public.reserve_inventory_for_order(r.id) into v_result;
      v_reserved:=v_reserved+coalesce((v_result->>'created_reservations')::integer,0);
    exception when others then
      v_blocked:=v_blocked+1;
      update public.order_operations
         set operational_status='blocked',
             exception_code='reservation_reconciliation_failed',
             blocked_at=coalesce(blocked_at,now()),
             updated_at=now(),
             metadata=metadata||jsonb_build_object('last_reconciliation_error',sqlerrm)
       where order_id=r.id;
    end;
  end loop;

  return jsonb_build_object(
    'released_reservations',v_released,
    'created_reservations',v_reserved,
    'blocked_orders',v_blocked,
    'refund_restored_units',0,
    'refund_inventory_policy','return_case_only'
  );
end $$;


ALTER FUNCTION "public"."reconcile_inventory_reservations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reconcile_post_release_session"("p_session_id" "uuid", "p_run_key" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare s public.post_release_sessions;p public.post_release_policies;e record;v_open_high int;v_open_critical int;v_trusted_pass int;v_trusted_fail int;v_target text;v_event text;begin
 select * into s from public.post_release_sessions where id=p_session_id for update;if not found then raise exception 'Ismeretlen utóellenőrzés.';end if;
 if s.status in('closed','cancelled') then return jsonb_build_object('status',s.status,'noop',true);end if;
 select * into p from public.post_release_policies where id=s.policy_id;
 for e in select * from public.post_release_evidence where session_id=s.id and status in('fail','error') loop
   insert into public.post_release_findings(finding_key,session_id,severity,title,description,last_evidence_id)
   values('finding:'||s.id::text||':'||e.check_kind,s.id,case when e.trusted and e.status='error' then 'critical' when e.trusted then 'high' else 'warning' end,'Utóellenőrzési eltérés: '||e.check_kind,'A kiadás utáni ellenőrzés hibát jelzett. Forrás: '||e.source,e.id)
   on conflict(finding_key) do update set occurrence_count=case when public.post_release_findings.last_evidence_id is distinct from excluded.last_evidence_id then public.post_release_findings.occurrence_count+1 else public.post_release_findings.occurrence_count end,last_detected_at=case when public.post_release_findings.last_evidence_id is distinct from excluded.last_evidence_id then now() else public.post_release_findings.last_detected_at end,last_evidence_id=excluded.last_evidence_id,status=case when public.post_release_findings.status='resolved' then 'open' else public.post_release_findings.status end,updated_at=now();
 end loop;
 update public.post_release_findings f set status='resolved',resolved_by=null,updated_at=now() where f.session_id=s.id and f.status in('open','acknowledged') and exists(select 1 from public.post_release_evidence pass join public.post_release_evidence fail on fail.id=f.last_evidence_id where pass.session_id=s.id and pass.check_kind=fail.check_kind and pass.trusted and pass.status='pass' and pass.observed_at>fail.observed_at);
 select count(*) filter(where status in('open','acknowledged') and severity='critical'),count(*) filter(where status in('open','acknowledged') and severity='high') into v_open_critical,v_open_high from public.post_release_findings where session_id=s.id;
 select count(*) filter(where trusted and status='pass'),count(*) filter(where trusted and status in('fail','error')) into v_trusted_pass,v_trusted_fail from public.post_release_evidence where session_id=s.id;
 if v_open_critical>0 then v_target:='rollback_recommended';elsif v_open_high>0 or v_trusted_fail>0 then v_target:='degraded';elsif now()>=s.observation_ends_at and v_trusted_pass>=p.min_trusted_checks then v_target:='stable';else v_target:='observing';end if;
 if s.status<>v_target then
   update public.post_release_sessions set status=v_target,stable_at=case when v_target='stable' then now() else stable_at end,updated_at=now() where id=s.id;
   v_event:=case v_target when 'rollback_recommended' then 'rollback_recommended' when 'degraded' then 'degraded' when 'stable' then 'stable' else null end;
   if v_event is not null then insert into public.post_release_events(event_key,session_id,event_type,metadata) values('reconcile:'||p_run_key||':'||s.id::text||':'||v_target,s.id,v_event,jsonb_build_object('critical',v_open_critical,'high',v_open_high,'trusted_pass',v_trusted_pass,'trusted_fail',v_trusted_fail)) on conflict(event_key) do nothing;end if;
 end if;
 return jsonb_build_object('status',v_target,'critical',v_open_critical,'high',v_open_high,'trusted_pass',v_trusted_pass,'trusted_fail',v_trusted_fail);end;$$;


ALTER FUNCTION "public"."reconcile_post_release_session"("p_session_id" "uuid", "p_run_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reconcile_release_candidates"("p_run_key" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare c record;v_invalid integer:=0;begin for c in select * from public.release_candidates where status in('evaluated','ready','approved') loop if public.release_candidate_is_stale(c.id) then update public.release_candidates set status='expired',updated_at=now() where id=c.id and status in('evaluated','ready','approved');if found then insert into public.release_events(event_key,candidate_id,event_type,metadata) values('invalidate:'||p_run_key||':'||c.id,c.id,case when c.status='approved' then 'evaluation_invalidated' else 'expired' end,jsonb_build_object('previous_status',c.status,'reason','stale_evidence')) on conflict(event_key) do nothing;v_invalid:=v_invalid+1;end if;end if;end loop;return jsonb_build_object('invalidated',v_invalid);end;$$;


ALTER FUNCTION "public"."reconcile_release_candidates"("p_run_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_coupon_redemption_v1"("p_instance_id" "uuid", "p_order_id" "uuid", "p_coupon_code" "text", "p_discount_gross_huf" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_order public.orders%rowtype;v_coupon public.coupons%rowtype;v_existing public.coupon_redemptions%rowtype;begin
  if nullif(trim(p_coupon_code),'') is null then return jsonb_build_object('recorded',false,'reason','no_coupon'); end if;
  select * into v_order from public.orders where id=p_order_id and instance_id=p_instance_id for update;
  if not found then raise exception 'order_not_found'; end if;
  select * into v_coupon from public.coupons where instance_id=p_instance_id and code=upper(trim(p_coupon_code)) for update;
  if not found then raise exception 'coupon_not_found'; end if;
  select * into v_existing from public.coupon_redemptions where instance_id=p_instance_id and order_id=p_order_id and coupon_id=v_coupon.id for update;
  if found then
    if v_existing.status='released' then
      update public.coupon_redemptions set status='redeemed',released_at=null,release_reason=null,discount_gross_huf=p_discount_gross_huf,updated_at=now() where id=v_existing.id;
      update public.coupons set usage_count=usage_count+1,updated_at=now() where id=v_coupon.id;
      return jsonb_build_object('recorded',true,'replayed',false,'reactivated',true,'redemption_id',v_existing.id);
    end if;
    return jsonb_build_object('recorded',false,'replayed',true,'redemption_id',v_existing.id);
  end if;
  insert into public.coupon_redemptions(instance_id,coupon_id,order_id,customer_id,customer_email,coupon_code,discount_gross_huf,metadata)
  values(p_instance_id,v_coupon.id,p_order_id,v_order.customer_id,lower(trim(v_order.customer_email)),v_coupon.code,greatest(0,p_discount_gross_huf),jsonb_build_object('source','core_checkout')) returning * into v_existing;
  return jsonb_build_object('recorded',true,'replayed',false,'redemption_id',v_existing.id);
end $$;


ALTER FUNCTION "public"."record_coupon_redemption_v1"("p_instance_id" "uuid", "p_order_id" "uuid", "p_coupon_code" "text", "p_discount_gross_huf" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_observability_event"("p_event_key" "text", "p_correlation_id" "text", "p_category" "text", "p_severity" "text", "p_event_name" "text", "p_duration_ms" integer, "p_status_code" integer, "p_source" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare v_id bigint;v_existing public.observability_events;v_meta jsonb;begin if nullif(trim(p_event_key),'') is null or nullif(trim(p_correlation_id),'') is null then raise exception 'observability_key_required';end if;if p_category not in('http','commerce','integration','payment','database','security','system') then raise exception 'invalid_category';end if;if p_severity not in('debug','info','warning','error','critical') then raise exception 'invalid_severity';end if;select * into v_existing from public.observability_events where event_key=p_event_key;if found then if v_existing.correlation_id<>p_correlation_id or v_existing.event_name<>p_event_name or v_existing.category<>p_category then raise exception 'event_key_conflict';end if;return v_existing.id;end if;v_meta:=coalesce(p_metadata,'{}'::jsonb)-array['email','phone','password','token','authorization','cookie','address','name','full_name'];insert into public.observability_events(event_key,correlation_id,category,severity,event_name,duration_ms,status_code,source,metadata) values(p_event_key,p_correlation_id,p_category,p_severity,p_event_name,p_duration_ms,p_status_code,p_source,v_meta) returning id into v_id;return v_id;end;$$;


ALTER FUNCTION "public"."record_observability_event"("p_event_key" "text", "p_correlation_id" "text", "p_category" "text", "p_severity" "text", "p_event_name" "text", "p_duration_ms" integer, "p_status_code" integer, "p_source" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_release_evidence" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "evidence_key" "text" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "check_kind" "text" NOT NULL,
    "status" "text" NOT NULL,
    "trusted" boolean DEFAULT false NOT NULL,
    "source" "text" NOT NULL,
    "observed_at" timestamp with time zone NOT NULL,
    "evidence" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "evidence_hash" "text" NOT NULL,
    "captured_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "post_release_evidence_check_kind_check" CHECK (("check_kind" = ANY (ARRAY['smoke'::"text", 'health'::"text", 'business'::"text", 'integration'::"text", 'manual'::"text"]))),
    CONSTRAINT "post_release_evidence_status_check" CHECK (("status" = ANY (ARRAY['pass'::"text", 'fail'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."post_release_evidence" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_post_release_evidence"("p_session_id" "uuid", "p_check_kind" "text", "p_status" "text", "p_source" "text", "p_observed_at" timestamp with time zone, "p_evidence" "jsonb", "p_event_key" "text") RETURNS "public"."post_release_evidence"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare s public.post_release_sessions;e public.post_release_evidence;v_trusted boolean;v_key text;begin
 select * into s from public.post_release_sessions where id=p_session_id for share;if not found then raise exception 'Ismeretlen utóellenőrzés.';end if;
 if s.status in('closed','cancelled') then raise exception 'Lezárt utóellenőrzéshez nem rögzíthető evidence.';end if;
 if p_check_kind not in('smoke','health','business','integration','manual') or p_status not in('pass','fail','error') then raise exception 'Érvénytelen evidence.';end if;
 v_trusted:=p_source in('github_actions','vercel','system_health');v_key:='evidence:'||s.id::text||':'||p_event_key;
 select * into e from public.post_release_evidence where evidence_key=v_key;if found then return e;end if;
 insert into public.post_release_evidence(evidence_key,session_id,check_kind,status,trusted,source,observed_at,evidence,evidence_hash)
 values(v_key,s.id,p_check_kind,p_status,v_trusted,p_source,p_observed_at,coalesce(p_evidence,'{}'::jsonb),md5(coalesce(p_evidence,'{}'::jsonb)::text||'|'||p_status||'|'||p_source||'|'||p_observed_at::text)) returning * into e;
 insert into public.post_release_events(event_key,session_id,event_type,metadata) values('event:'||v_key,s.id,'evidence_recorded',jsonb_build_object('evidence_id',e.id,'trusted',v_trusted,'status',p_status));
 return e;end;$$;


ALTER FUNCTION "public"."record_post_release_evidence"("p_session_id" "uuid", "p_check_kind" "text", "p_status" "text", "p_source" "text", "p_observed_at" timestamp with time zone, "p_evidence" "jsonb", "p_event_key" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rollout_checks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "check_key" "text" NOT NULL,
    "environment_key" "text" NOT NULL,
    "source_sha" "text" NOT NULL,
    "check_kind" "text" NOT NULL,
    "status" "text" NOT NULL,
    "trusted" boolean DEFAULT false NOT NULL,
    "evidence_hash" "text" NOT NULL,
    "source" "text" NOT NULL,
    "observed_at" timestamp with time zone NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rollout_checks_check_kind_check" CHECK (("check_kind" = ANY (ARRAY['ci'::"text", 'environment'::"text", 'migration'::"text", 'smoke'::"text", 'security'::"text", 'integration'::"text", 'rollback'::"text"]))),
    CONSTRAINT "rollout_checks_status_check" CHECK (("status" = ANY (ARRAY['pass'::"text", 'fail'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."rollout_checks" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_rollout_check"("p_check_key" "text", "p_environment_key" "text", "p_source_sha" "text", "p_check_kind" "text", "p_status" "text", "p_trusted" boolean, "p_evidence_hash" "text", "p_source" "text", "p_observed_at" timestamp with time zone, "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "public"."rollout_checks"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare r public.rollout_checks;begin if nullif(trim(p_check_key),'') is null or nullif(trim(p_source_sha),'') is null or nullif(trim(p_evidence_hash),'') is null or nullif(trim(p_source),'') is null then raise exception 'rollout_evidence_required'; end if;if p_environment_key='production' and not p_trusted then raise exception 'Production rollout check csak trusted evidence lehet.';end if;select * into r from public.rollout_checks where check_key=p_check_key;if found then if r.environment_key<>p_environment_key or r.source_sha<>p_source_sha or r.check_kind<>p_check_kind or r.evidence_hash<>p_evidence_hash then raise exception 'A rollout check kulcs már más evidence-hez tartozik.';end if;return r;end if;insert into public.rollout_checks(check_key,environment_key,source_sha,check_kind,status,trusted,evidence_hash,source,observed_at,metadata) values(trim(p_check_key),p_environment_key,trim(p_source_sha),p_check_kind,p_status,p_trusted,trim(p_evidence_hash),trim(p_source),p_observed_at,coalesce(p_metadata,'{}'::jsonb)) returning * into r;return r;end;$$;


ALTER FUNCTION "public"."record_rollout_check"("p_check_key" "text", "p_environment_key" "text", "p_source_sha" "text", "p_check_kind" "text", "p_status" "text", "p_trusted" boolean, "p_evidence_hash" "text", "p_source" "text", "p_observed_at" timestamp with time zone, "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recover_stale_communication_jobs"("p_stale_minutes" integer DEFAULT 15) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare v_count integer; begin update public.communication_jobs set status=case when attempts<5 then 'pending' else 'failed' end,scheduled_at=case when attempts<5 then now()+interval '5 minutes' else scheduled_at end,last_error=case when attempts<5 then 'STALE_WORKER_CLAIM_RECOVERED' else 'STALE_WORKER_CLAIM_MAX_ATTEMPTS' end,claim_token=null,claimed_at=null,updated_at=now() where status='processing' and claimed_at is not null and claimed_at<now()-make_interval(mins=>greatest(5,p_stale_minutes)); get diagnostics v_count=row_count; return v_count; end$$;


ALTER FUNCTION "public"."recover_stale_communication_jobs"("p_stale_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recover_stale_communication_jobs_v2"("p_instance_id" "uuid", "p_stale_minutes" integer DEFAULT 15) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_count integer;
begin
  update public.communication_jobs set
    status=case when attempts<5 then 'pending' else 'failed' end,
    scheduled_at=case when attempts<5 then now()+interval '5 minutes' else scheduled_at end,
    last_error=case when attempts<5 then 'STALE_WORKER_CLAIM_RECOVERED' else 'STALE_WORKER_CLAIM_MAX_ATTEMPTS' end,
    claim_token=null,claimed_at=null,updated_at=now()
  where instance_id=p_instance_id and status='processing' and claimed_at is not null
    and claimed_at<now()-make_interval(mins=>greatest(5,p_stale_minutes));
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;


ALTER FUNCTION "public"."recover_stale_communication_jobs_v2"("p_instance_id" "uuid", "p_stale_minutes" integer) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "event_key" "text" NOT NULL,
    "entry_type" "text" NOT NULL,
    "points" integer NOT NULL,
    "order_id" "uuid",
    "reverses_entry_id" "uuid",
    "reason" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "loyalty_ledger_check" CHECK (((("entry_type" = ANY (ARRAY['redeem'::"text", 'expire'::"text", 'reversal'::"text"])) AND ("points" < 0)) OR (("entry_type" = ANY (ARRAY['earn'::"text", 'adjust'::"text"])) AND ("points" <> 0)))),
    CONSTRAINT "loyalty_ledger_entry_type_check" CHECK (("entry_type" = ANY (ARRAY['earn'::"text", 'redeem'::"text", 'expire'::"text", 'adjust'::"text", 'reversal'::"text"]))),
    CONSTRAINT "loyalty_ledger_points_check" CHECK (("points" <> 0))
);


ALTER TABLE "public"."loyalty_ledger" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_loyalty_points"("p_customer_id" "uuid", "p_points" integer, "p_event_key" "text", "p_reason" "text", "p_order_id" "uuid" DEFAULT NULL::"uuid") RETURNS "public"."loyalty_ledger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_raw_balance bigint;v_row public.loyalty_ledger;begin
 if p_points<=0 then raise exception 'A beváltandó pontok száma pozitív kell legyen.'; end if;
 if nullif(trim(p_event_key),'') is null then raise exception 'Az eseménykulcs kötelező.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_customer_id::text,0));
 select * into v_row from public.loyalty_ledger where event_key=p_event_key;
 if found then
   if v_row.customer_id<>p_customer_id or v_row.entry_type<>'redeem' or v_row.points<>-p_points or coalesce(v_row.order_id,'00000000-0000-0000-0000-000000000000'::uuid)<>coalesce(p_order_id,'00000000-0000-0000-0000-000000000000'::uuid) then
     raise exception 'Az eseménykulcs már más hűségművelethez tartozik.';
   end if;
   return v_row;
 end if;
 select coalesce(sum(points),0) into v_raw_balance from public.loyalty_ledger where customer_id=p_customer_id;
 if v_raw_balance<=0 or v_raw_balance<p_points then raise exception 'Nincs elegendő felhasználható hűségpont.'; end if;
 if p_order_id is not null and not exists(select 1 from public.orders where id=p_order_id and customer_id=p_customer_id) then raise exception 'A rendelés nem ehhez az ügyfélhez tartozik.'; end if;
 insert into public.loyalty_ledger(customer_id,event_key,entry_type,points,order_id,reason,metadata)
 values(p_customer_id,p_event_key,'redeem',-p_points,p_order_id,coalesce(nullif(trim(p_reason),''),'Hűségpont beváltás'),jsonb_build_object('balance_before',v_raw_balance,'balance_after',v_raw_balance-p_points)) returning * into v_row;
 return v_row;
end;$$;


ALTER FUNCTION "public"."redeem_loyalty_points"("p_customer_id" "uuid", "p_points" integer, "p_event_key" "text", "p_reason" "text", "p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_automation_ready_steps"("p_run_key" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare x record;v_completed_tasks integer:=0;v_cancelled_tasks integer:=0;v_ready integer:=0;v_instances integer:=0;begin
 for x in select sr.id,sr.instance_id,sr.result,ct.status task_status from public.automation_step_runs sr left join public.control_tasks ct on ct.id=(sr.result->>'control_task_id')::uuid where sr.status='waiting' loop
   if x.task_status='completed' then
     update public.automation_step_runs set status='succeeded',finished_at=now(),updated_at=now(),result=result||jsonb_build_object('human_task_completed',true) where id=x.id;
     insert into public.automation_events(event_key,instance_id,step_run_id,event_type,metadata) values('human-complete:'||p_run_key||':'||x.id::text,x.instance_id,x.id,'step_succeeded',jsonb_build_object('reason','control_task_completed')) on conflict(event_key) do nothing;v_completed_tasks:=v_completed_tasks+1;
   elsif x.task_status='cancelled' then
     update public.automation_step_runs set status='failed',finished_at=now(),last_error='control_task_cancelled',next_attempt_at=null,updated_at=now() where id=x.id;
     update public.automation_runbook_instances set failure_count=failure_count+1,updated_at=now() where id=x.instance_id;
     insert into public.automation_events(event_key,instance_id,step_run_id,event_type,metadata) values('human-cancel:'||p_run_key||':'||x.id::text,x.instance_id,x.id,'step_failed',jsonb_build_object('reason','control_task_cancelled')) on conflict(event_key) do nothing;v_cancelled_tasks:=v_cancelled_tasks+1;
   end if;
 end loop;
 update public.automation_step_runs sr set status='ready',ready_at=coalesce(ready_at,now()),updated_at=now()
 from public.automation_runbook_steps st,public.automation_runbook_instances i
 where sr.step_id=st.id and sr.instance_id=i.id and i.status='active' and sr.status='pending' and(
   st.requires_previous_success=false or not exists(
    select 1 from public.automation_step_runs prev join public.automation_runbook_steps ps on ps.id=prev.step_id
    where prev.instance_id=sr.instance_id and ps.step_order<st.step_order and prev.status not in ('succeeded','skipped')
   )
 );get diagnostics v_ready=row_count;
 for x in select i.id from public.automation_runbook_instances i where i.status='active' and not exists(select 1 from public.automation_step_runs sr where sr.instance_id=i.id and sr.status not in ('succeeded','skipped')) loop
   update public.automation_runbook_instances set status='completed',completed_at=now(),updated_at=now() where id=x.id;
   insert into public.automation_events(event_key,instance_id,event_type,metadata) values('auto-complete:'||p_run_key||':'||x.id::text,x.id,'completed',jsonb_build_object('reason','all_steps_succeeded')) on conflict(event_key) do nothing;v_instances:=v_instances+1;
 end loop;
 return jsonb_build_object('human_tasks_completed',v_completed_tasks,'human_tasks_cancelled',v_cancelled_tasks,'steps_ready',v_ready,'instances_completed',v_instances);end;$$;


ALTER FUNCTION "public"."refresh_automation_ready_steps"("p_run_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_customer_value_profiles"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_count integer:=0;begin
  insert into public.customer_value_profiles(customer_id,email_key,paid_orders,revenue_gross_huf,aov_gross_huf,days_since_last_order,lifecycle_segment,value_score,value_tier,first_order_at,last_order_at,recalculated_at)
  select m.customer_id,m.email_key,m.paid_orders,m.revenue_gross_huf,m.aov_gross_huf,m.days_since_last_order,m.segment,
         least(100,greatest(0,
           least(40,m.paid_orders*8)+
           least(40,(m.revenue_gross_huf/25000)::integer)+
           case when m.days_since_last_order<=30 then 20 when m.days_since_last_order<=90 then 10 else 0 end
         )) as value_score,
         case
           when (least(40,m.paid_orders*8)+least(40,(m.revenue_gross_huf/25000)::integer)+case when m.days_since_last_order<=30 then 20 when m.days_since_last_order<=90 then 10 else 0 end)>=85 then 'platinum'
           when (least(40,m.paid_orders*8)+least(40,(m.revenue_gross_huf/25000)::integer)+case when m.days_since_last_order<=30 then 20 when m.days_since_last_order<=90 then 10 else 0 end)>=65 then 'gold'
           when (least(40,m.paid_orders*8)+least(40,(m.revenue_gross_huf/25000)::integer)+case when m.days_since_last_order<=30 then 20 when m.days_since_last_order<=90 then 10 else 0 end)>=40 then 'silver'
           else 'standard' end,
         m.first_order_at,m.last_order_at,now()
  from public.customer_commercial_metrics m
  where m.customer_id is not null
  on conflict(customer_id) do update set
    email_key=excluded.email_key,paid_orders=excluded.paid_orders,revenue_gross_huf=excluded.revenue_gross_huf,
    aov_gross_huf=excluded.aov_gross_huf,days_since_last_order=excluded.days_since_last_order,
    lifecycle_segment=excluded.lifecycle_segment,value_score=excluded.value_score,value_tier=excluded.value_tier,
    first_order_at=excluded.first_order_at,last_order_at=excluded.last_order_at,recalculated_at=now();
  get diagnostics v_count=row_count;
  return v_count;
end;$$;


ALTER FUNCTION "public"."refresh_customer_value_profiles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_customer_value_profiles_v2"("p_instance_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$declare v_count int:=0;begin
 insert into public.customer_value_profiles(instance_id,customer_id,email_key,paid_orders,revenue_gross_huf,aov_gross_huf,days_since_last_order,lifecycle_segment,value_score,value_tier,first_order_at,last_order_at,recalculated_at)
 select p_instance_id,m.customer_id,m.email_key,m.paid_orders,m.revenue_gross_huf,m.aov_gross_huf,m.days_since_last_order,m.segment,least(100,greatest(0,least(40,m.paid_orders*8)+least(40,(m.revenue_gross_huf/25000)::int)+case when m.days_since_last_order<=30 then 20 when m.days_since_last_order<=90 then 10 else 0 end)),case when(least(40,m.paid_orders*8)+least(40,(m.revenue_gross_huf/25000)::int)+case when m.days_since_last_order<=30 then 20 when m.days_since_last_order<=90 then 10 else 0 end)>=85 then 'platinum' when(least(40,m.paid_orders*8)+least(40,(m.revenue_gross_huf/25000)::int)+case when m.days_since_last_order<=30 then 20 when m.days_since_last_order<=90 then 10 else 0 end)>=65 then 'gold' when(least(40,m.paid_orders*8)+least(40,(m.revenue_gross_huf/25000)::int)+case when m.days_since_last_order<=30 then 20 when m.days_since_last_order<=90 then 10 else 0 end)>=40 then 'silver' else 'standard' end,m.first_order_at,m.last_order_at,now()
 from public.customer_commercial_metrics m where m.instance_id=p_instance_id and m.customer_id is not null
 on conflict(instance_id,customer_id) do update set email_key=excluded.email_key,paid_orders=excluded.paid_orders,revenue_gross_huf=excluded.revenue_gross_huf,aov_gross_huf=excluded.aov_gross_huf,days_since_last_order=excluded.days_since_last_order,lifecycle_segment=excluded.lifecycle_segment,value_score=excluded.value_score,value_tier=excluded.value_tier,first_order_at=excluded.first_order_at,last_order_at=excluded.last_order_at,recalculated_at=now();get diagnostics v_count=row_count;return v_count;end$$;


ALTER FUNCTION "public"."refresh_customer_value_profiles_v2"("p_instance_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_order_operation_priorities"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_count integer:=0;begin
 update public.order_operations op set
   priority_score=least(100,greatest(0,
     40
     +case when op.operational_status='blocked' then 30 else 0 end
     +case when q.age_hours>=48 then 20 when q.age_hours>=24 then 10 else 0 end
     +case when q.customer_value_tier='platinum' then 15 when q.customer_value_tier='gold' then 8 else 0 end
     +case when so.urgent_support_count>0 then 15 when so.open_support_count>0 then 7 else 0 end
     +case when so.open_return_count>0 then 8 else 0 end
   )),updated_at=now(),metadata=op.metadata||jsonb_build_object('priority_refreshed_at',now(),'priority_basis','operations_not_customer_penalty')
 from public.order_operations_queue q
 join public.order_service_operations so on so.order_id=q.order_id
 where q.order_id=op.order_id and op.operational_status not in ('delivered','cancelled');
 get diagnostics v_count=row_count;
 return v_count;
end;$$;


ALTER FUNCTION "public"."refresh_order_operation_priorities"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_append_only_action_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$begin raise exception 'append_only_ledger';end;$$;


ALTER FUNCTION "public"."reject_append_only_action_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_cancelled_order_coupon_redemption"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.status='cancelled' and old.status is distinct from new.status and nullif(trim(new.coupon_code),'') is not null then
    perform public.release_coupon_redemption_v1(new.instance_id,new.id,'order_cancelled');
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."release_cancelled_order_coupon_redemption"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_candidate_is_stale"("p_candidate_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$with c as(select * from public.release_candidates where id=p_candidate_id),pol as(select p.* from public.release_policies p join c on c.policy_id=p.id),latest as(select * from public.assurance_recent_runs where status='completed' order by completed_at desc nulls last limit 1),r as(select * from public.assurance_readiness),w as(select public.release_window_status(p_candidate_id) s)
select case when c.evaluated_at is null then true when c.expires_at<=now() then true when not pol.enabled then true when latest.id is null then true when c.assurance_bundle_hash is distinct from latest.evidence_bundle_hash then true when c.change_set_hash is distinct from public.release_change_set_hash(c.id) then true when r.readiness_status<>'ready' or r.assurance_score<pol.min_assurance_score or r.stale_controls>pol.max_stale_controls or r.critical_open>0 or r.high_open>pol.max_high_findings or r.accepted_risks>pol.max_accepted_risks then true when pol.require_ci_green and(not public.release_ci_is_trusted(c.id) or c.ci_observed_at is null or c.ci_observed_at<now()-make_interval(mins=>pol.ci_freshness_minutes)) then true when coalesce((w.s->>'allowed')::boolean,false)=false then true else false end from c join pol on true left join latest on true cross join r cross join w$$;


ALTER FUNCTION "public"."release_candidate_is_stale"("p_candidate_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_change_set_hash"("p_candidate_id" "uuid") RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$select md5(coalesce(string_agg(ch.change_key||'|'||ch.category||'|'||ch.risk_level||'|'||ch.title||'|'||ch.description,'||' order by ch.change_key),'')) from public.release_changes ch where ch.candidate_id=p_candidate_id$$;


ALTER FUNCTION "public"."release_change_set_hash"("p_candidate_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_ci_is_trusted"("p_candidate_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$select coalesce(c.ci_status='success' and c.ci_observed_at is not null and c.ci_evidence->>'source' in('github_actions','vercel') and c.ci_evidence->>'verification'='trusted',false) from public.release_candidates c where c.id=p_candidate_id$$;


ALTER FUNCTION "public"."release_ci_is_trusted"("p_candidate_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_coupon_redemption_v1"("p_instance_id" "uuid", "p_order_id" "uuid", "p_reason" "text" DEFAULT 'order_cancelled'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_redemption public.coupon_redemptions%rowtype;begin
  select * into v_redemption from public.coupon_redemptions where instance_id=p_instance_id and order_id=p_order_id and status='redeemed' order by redeemed_at limit 1 for update;
  if not found then return jsonb_build_object('released',false,'replayed',true); end if;
  update public.coupon_redemptions set status='released',released_at=now(),release_reason=coalesce(nullif(trim(p_reason),''),'order_cancelled'),updated_at=now() where id=v_redemption.id;
  update public.coupons set usage_count=greatest(0,usage_count-1),updated_at=now() where id=v_redemption.coupon_id and instance_id=p_instance_id;
  return jsonb_build_object('released',true,'replayed',false,'redemption_id',v_redemption.id);
end $$;


ALTER FUNCTION "public"."release_coupon_redemption_v1"("p_instance_id" "uuid", "p_order_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_inventory_for_order"("p_order_id" "uuid", "p_reason" "text" DEFAULT 'order_released'::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_count integer:=0;begin
 perform pg_advisory_xact_lock(hashtextextended('reserve-order:'||p_order_id::text,0));
 update public.inventory_reservations set status='released',released_at=now(),reason=coalesce(nullif(trim(p_reason),''),reason),updated_at=now() where order_id=p_order_id and status='active';
 get diagnostics v_count=row_count;
 update public.order_operations set operational_status=case when exists(select 1 from public.orders where id=p_order_id and status='cancelled') then 'cancelled' else 'awaiting_reservation' end,updated_at=now() where order_id=p_order_id;
 return v_count;
end;$$;


ALTER FUNCTION "public"."release_inventory_for_order"("p_order_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_window_status"("p_candidate_id" "uuid", "p_at" timestamp with time zone DEFAULT "now"()) RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$with c as(select risk_class from public.release_candidates where id=p_candidate_id),f as(select count(*)::integer n from public.release_windows w,c where w.enabled and w.mode='freeze' and p_at>=w.starts_at and p_at<w.ends_at and(w.risk_class is null or w.risk_class=c.risk_class)),a as(select count(*)::integer n from public.release_windows w,c where w.enabled and w.mode='allow' and p_at>=w.starts_at and p_at<w.ends_at and(w.risk_class is null or w.risk_class=c.risk_class)),any_allow as(select count(*)::integer n from public.release_windows w,c where w.enabled and w.mode='allow' and(w.risk_class is null or w.risk_class=c.risk_class)) select jsonb_build_object('allowed',case when f.n>0 then false when any_allow.n>0 then a.n>0 else true end,'freeze_matches',f.n,'allow_matches',a.n,'evaluated_at',p_at) from f,a,any_allow$$;


ALTER FUNCTION "public"."release_window_status"("p_candidate_id" "uuid", "p_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reserve_inventory_for_order"("p_order_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_order_status public.order_status;
  v_created integer:=0;
  v_existing integer:=0;
  v_item record;
  v_rowcount integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('reserve-order:'||p_order_id::text,0));
  select status into v_order_status from public.orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order_status in ('cancelled','refunded') then raise exception 'order_not_reservable'; end if;
  if not exists(select 1 from public.order_items where order_id=p_order_id) then raise exception 'order_has_no_items'; end if;
  if exists(select 1 from public.order_items where order_id=p_order_id and variant_id is null) then raise exception 'order_item_variant_missing'; end if;
  insert into public.order_operations(order_id) values(p_order_id) on conflict(order_id) do nothing;
  for v_item in
    select oi.id as order_item_id,oi.variant_id,oi.quantity
    from public.order_items oi where oi.order_id=p_order_id order by oi.variant_id,oi.id
  loop
    perform pg_advisory_xact_lock(hashtextextended('variant-stock:'||v_item.variant_id::text,0));
    if not exists(select 1 from public.product_variants where id=v_item.variant_id for update) then raise exception 'variant_not_found'; end if;
    if exists(select 1 from public.inventory_reservations where order_item_id=v_item.order_item_id and status in ('active','consumed')) then
      v_existing:=v_existing+1; continue;
    end if;
    insert into public.inventory_reservations(reservation_key,order_id,order_item_id,variant_id,quantity,status,reason,metadata)
    values('order-item:'||v_item.order_item_id::text,p_order_id,v_item.order_item_id,v_item.variant_id,v_item.quantity,
      case when v_order_status in ('shipped','completed') then 'consumed' else 'active' end,
      'Operációs foglalás; a készletet a checkout már levonta',
      jsonb_build_object('stock_semantics','checkout_decremented','commerce_status_at_creation',v_order_status))
    on conflict(order_item_id) do nothing;
    get diagnostics v_rowcount=row_count;
    v_created:=v_created+v_rowcount;
  end loop;
  update public.order_operations set
    operational_status=case when v_order_status='completed' then 'delivered' when v_order_status='shipped' then 'handed_over' else 'reserved' end,
    reservation_completed_at=coalesce(reservation_completed_at,now()),
    handed_over_at=case when v_order_status='shipped' then coalesce(handed_over_at,now()) else handed_over_at end,
    delivered_at=case when v_order_status='completed' then coalesce(delivered_at,now()) else delivered_at end,
    exception_code=null,blocked_at=null,updated_at=now(),
    metadata=metadata||jsonb_build_object('stock_semantics','checkout_decremented')
  where order_id=p_order_id;
  insert into public.fulfillment_events(event_key,order_id,event_type,from_status,to_status,metadata)
  values('reservation-complete:'||p_order_id::text,p_order_id,'reserved',null,
    case when v_order_status='completed' then 'delivered' when v_order_status='shipped' then 'handed_over' else 'reserved' end,
    jsonb_build_object('created_reservations',v_created,'existing_reservations',v_existing,'stock_semantics','checkout_decremented'))
  on conflict(event_key) do nothing;
  return jsonb_build_object('order_id',p_order_id,'created_reservations',v_created,'existing_reservations',v_existing,'status',case when v_order_status='completed' then 'delivered' when v_order_status='shipped' then 'handed_over' else 'reserved' end);
end;$$;


ALTER FUNCTION "public"."reserve_inventory_for_order"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_stale_control_alerts"("p_cycle_started_at" timestamp with time zone, "p_run_key" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ declare r record;v_count integer:=0;begin for r in select * from public.control_alerts where status in ('open','acknowledged','snoozed') and evidence->>'source'='v13_detector' and last_detected_at<p_cycle_started_at loop update public.control_alerts set status='resolved',resolved_at=now(),resolved_by=null,updated_at=now(),evidence=evidence||jsonb_build_object('auto_resolved',true,'auto_resolved_run_key',p_run_key) where id=r.id; update public.control_tasks set status='cancelled',updated_at=now(),outcome=coalesce(outcome,'A detektor szerint a kiváltó feltétel megszűnt') where alert_id=r.id and status in ('open','in_progress'); insert into public.control_alert_events(event_key,alert_id,event_type,from_status,to_status,metadata) values('auto-resolve:'||p_run_key||':'||r.id::text,r.id,'resolved',r.status,'resolved',jsonb_build_object('reason','condition_not_redetected')) on conflict(event_key) do nothing; v_count:=v_count+1; end loop; return v_count; end;$$;


ALTER FUNCTION "public"."resolve_stale_control_alerts"("p_cycle_started_at" timestamp with time zone, "p_run_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restock_return_case"("p_case_id" "uuid", "p_actor" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare c public.return_cases%rowtype;i record;v_result jsonb;v_count integer:=0;v_units integer:=0;
begin
 select * into c from public.return_cases where id=p_case_id for update;if not found then raise exception 'A visszáru ügy nem található.';end if;
 if c.status not in('received','refund_pending','refunded','closed') then raise exception 'Csak visszaérkezett termék készletezhető vissza.';end if;if c.inventory_restocked_at is not null then raise exception 'A visszáru készlete már vissza lett állítva.';end if;
 for i in select rci.order_item_id,rci.quantity from public.return_case_items rci join public.order_items oi on oi.id=rci.order_item_id where rci.return_case_id=p_case_id and rci.instance_id=c.instance_id and oi.order_id=c.order_id and oi.instance_id=c.instance_id and oi.variant_id is not null loop
  if i.quantity<=0 then continue;end if;select public.restore_order_item_inventory_v1(c.instance_id,c.order_id,i.order_item_id,'return_case',c.id,i.quantity,p_actor) into v_result;if coalesce((v_result->>'restored')::boolean,false) then v_count:=v_count+1;v_units:=v_units+i.quantity;end if;
 end loop;
 if v_count=0 then raise exception 'Nincs készletre visszahelyezhető tétel ebben az ügyben.';end if;update public.return_cases set inventory_restocked_at=now(),inventory_restocked_by=p_actor,updated_at=now() where id=c.id and instance_id=c.instance_id;return jsonb_build_object('restocked_lines',v_count,'restocked_units',v_units);
end $$;


ALTER FUNCTION "public"."restock_return_case"("p_case_id" "uuid", "p_actor" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_cancelled_order_inventory"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  r record;
  v_already integer;
  v_remaining integer;
begin
  if new.status='cancelled' and old.status is distinct from new.status then
    for r in
      select oi.id,oi.quantity
      from public.order_items oi
      where oi.order_id=new.id and oi.instance_id=new.instance_id and oi.variant_id is not null
      order by oi.id
      for update
    loop
      select coalesce(sum(x.quantity),0)::integer into v_already
      from public.order_inventory_restorations x
      where x.instance_id=new.instance_id and x.order_item_id=r.id;
      v_remaining:=greatest(0,r.quantity-v_already);
      if v_remaining>0 then
        perform public.restore_order_item_inventory_v1(new.instance_id,new.id,r.id,'order_cancelled',new.id,v_remaining,null);
      end if;
    end loop;
    -- Coupon usage is released exclusively by orders_coupon_redemption_sync.
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."restore_cancelled_order_inventory"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."restore_cancelled_order_inventory"() IS 'Atomically releases reserved stock and coupon usage when an order first transitions to cancelled.';



CREATE OR REPLACE FUNCTION "public"."restore_order_item_inventory_v1"("p_instance_id" "uuid", "p_order_id" "uuid", "p_order_item_id" "uuid", "p_source_type" "text", "p_source_id" "uuid", "p_quantity" integer, "p_actor" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_item record;v_restored integer:=0;v_prev integer;v_inserted uuid;
begin
 if p_source_type not in('order_cancelled','return_case') then raise exception 'Készlet csak teljesítés előtti törlésből vagy fizikailag visszaérkezett visszáruból állítható vissza.';end if;
 if p_quantity is null or p_quantity<=0 then raise exception 'Érvénytelen visszaállítási mennyiség.';end if;
 select oi.id,oi.variant_id,oi.quantity,oi.sku into v_item from public.order_items oi where oi.id=p_order_item_id and oi.order_id=p_order_id and oi.instance_id=p_instance_id for update;
 if not found or v_item.variant_id is null then raise exception 'A rendelési tétel nem állítható vissza.';end if;
 select coalesce(sum(r.quantity),0)::integer into v_restored from public.order_inventory_restorations r where r.instance_id=p_instance_id and r.order_item_id=p_order_item_id;
 if v_restored+p_quantity>v_item.quantity then raise exception 'A készlet-visszaállítás meghaladná az eredetileg rendelt mennyiséget.';end if;
 insert into public.order_inventory_restorations(instance_id,order_id,order_item_id,source_type,source_id,quantity,actor_user_id) values(p_instance_id,p_order_id,p_order_item_id,p_source_type,p_source_id,p_quantity,p_actor) on conflict(instance_id,order_item_id,source_type,source_id) do nothing returning id into v_inserted;
 if v_inserted is null then return jsonb_build_object('restored',false,'replayed',true,'quantity',0);end if;
 select stock_quantity into v_prev from public.product_variants where id=v_item.variant_id and instance_id=p_instance_id for update;if not found then raise exception 'A termékváltozat nem található ebben a webshopban.';end if;
 update public.product_variants set stock_quantity=stock_quantity+p_quantity,updated_at=now() where id=v_item.variant_id and instance_id=p_instance_id;
 insert into public.inventory_events(instance_id,variant_id,order_id,change_quantity,previous_stock,new_stock,reason,actor_user_id,metadata) values(p_instance_id,v_item.variant_id,p_order_id,p_quantity,v_prev,v_prev+p_quantity,'inventory_restored',p_actor,jsonb_build_object('order_item_id',p_order_item_id,'source_type',p_source_type,'source_id',p_source_id,'sku',v_item.sku));
 return jsonb_build_object('restored',true,'replayed',false,'quantity',p_quantity);
end $$;


ALTER FUNCTION "public"."restore_order_item_inventory_v1"("p_instance_id" "uuid", "p_order_id" "uuid", "p_order_item_id" "uuid", "p_source_type" "text", "p_source_id" "uuid", "p_quantity" integer, "p_actor" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_refunded_pre_fulfillment_inventory"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  -- Compatibility no-op. Kept because older operations-cycle code may still call it.
  -- A financial refund is not evidence that goods physically returned to stock.
  return 0;
end $$;


ALTER FUNCTION "public"."restore_refunded_pre_fulfillment_inventory"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reverse_loyalty_points_for_ineligible_orders"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_count integer:=0;begin
 insert into public.loyalty_ledger(customer_id,event_key,entry_type,points,order_id,reverses_entry_id,reason,metadata,occurred_at)
 select e.customer_id,'order-reversal:'||e.id::text,'reversal',-abs(e.points),e.order_id,e.id,
        'Törölt vagy teljesen visszatérített rendelés pontjóváírásának visszavonása',jsonb_build_object('source_event_key',e.event_key,'reason','order_ineligible_after_accrual'),now()
 from public.loyalty_ledger e join public.orders o on o.id=e.order_id
 where e.entry_type='earn' and e.order_id is not null and (e.event_key like 'order-earn:%' or e.event_key like 'tier-bonus:%')
   and (o.status='cancelled' or exists(select 1 from public.return_cases rc where rc.order_id=o.id group by rc.order_id having coalesce(sum(rc.refund_amount_gross_huf) filter(where rc.status='refunded'),0)>=o.total_gross_huf))
   and not exists(select 1 from public.loyalty_ledger r where r.reverses_entry_id=e.id and r.entry_type='reversal')
 on conflict(event_key) do nothing;
 get diagnostics v_count=row_count; return v_count;
end;$$;


ALTER FUNCTION "public"."reverse_loyalty_points_for_ineligible_orders"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automation_control" (
    "singleton" boolean DEFAULT true NOT NULL,
    "global_paused" boolean DEFAULT false NOT NULL,
    "pause_reason" "text",
    "consecutive_failures" integer DEFAULT 0 NOT NULL,
    "circuit_open_until" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "automation_control_consecutive_failures_check" CHECK (("consecutive_failures" >= 0)),
    CONSTRAINT "automation_control_singleton_check" CHECK ("singleton")
);


ALTER TABLE "public"."automation_control" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_automation_global_pause"("p_actor_id" "uuid", "p_paused" boolean, "p_reason" "text", "p_event_key" "text") RETURNS "public"."automation_control"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare c public.automation_control;e public.automation_control_events;begin
 if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('automation-global-control',0));
 select * into e from public.automation_control_events where event_key=p_event_key;if found then if e.paused<>p_paused then raise exception 'event_key_conflict';end if;select * into c from public.automation_control where singleton=true;return c;end if;
 update public.automation_control set global_paused=p_paused,pause_reason=case when p_paused then coalesce(nullif(trim(p_reason),''),'Kézi szüneteltetés') else null end,updated_at=now() where singleton=true returning * into c;
 insert into public.automation_control_events(event_key,paused,actor_id,reason) values(p_event_key,p_paused,p_actor_id,p_reason);return c;end;$$;


ALTER FUNCTION "public"."set_automation_global_pause"("p_actor_id" "uuid", "p_paused" boolean, "p_reason" "text", "p_event_key" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_release_findings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "finding_key" "text" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "severity" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "first_detected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_detected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "occurrence_count" integer DEFAULT 1 NOT NULL,
    "last_evidence_id" "uuid",
    "acknowledged_by" "uuid",
    "resolved_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "post_release_findings_occurrence_count_check" CHECK (("occurrence_count" > 0)),
    CONSTRAINT "post_release_findings_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "post_release_findings_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."post_release_findings" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_post_release_finding_state"("p_finding_id" "uuid", "p_actor_id" "uuid", "p_action" "text", "p_event_key" "text") RETURNS "public"."post_release_findings"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare f public.post_release_findings;begin
 select * into f from public.post_release_findings where id=p_finding_id for update;if not found then raise exception 'Ismeretlen finding.';end if;
 if p_action='acknowledge' then
   if f.status='resolved' then raise exception 'Megoldott finding nem vehető át.';end if;
   update public.post_release_findings set status='acknowledged',acknowledged_by=p_actor_id,updated_at=now() where id=f.id returning * into f;
 elsif p_action='resolve' then
   update public.post_release_findings set status='resolved',resolved_by=p_actor_id,updated_at=now() where id=f.id returning * into f;
 else raise exception 'Érvénytelen finding művelet.';end if;
 insert into public.post_release_events(event_key,session_id,event_type,actor_id,metadata) values(p_event_key,f.session_id,case when p_action='resolve' then 'finding_resolved' else 'finding_opened' end,p_actor_id,jsonb_build_object('finding_id',f.id,'action',p_action)) on conflict(event_key) do nothing;
 return f;end;$$;


ALTER FUNCTION "public"."set_post_release_finding_state"("p_finding_id" "uuid", "p_actor_id" "uuid", "p_action" "text", "p_event_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_store_automation_pause_v2"("p_instance_id" "uuid", "p_actor_id" "uuid", "p_paused" boolean, "p_reason" "text", "p_event_key" "text") RETURNS "public"."automation_control"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare c public.automation_control;begin insert into public.automation_control(instance_id,singleton,global_paused,pause_reason,consecutive_failures,updated_at)values(p_instance_id,true,p_paused,case when p_paused then coalesce(nullif(trim(p_reason),''),'Kézi szüneteltetés')end,0,now())on conflict(instance_id)do update set global_paused=excluded.global_paused,pause_reason=excluded.pause_reason,updated_at=now() returning * into c;insert into public.automation_control_events(instance_id,event_key,paused,actor_id,reason)values(p_instance_id,p_instance_id::text||':'||p_event_key,p_paused,p_actor_id,p_reason);return c;end$$;


ALTER FUNCTION "public"."set_store_automation_pause_v2"("p_instance_id" "uuid", "p_actor_id" "uuid", "p_paused" boolean, "p_reason" "text", "p_event_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."simulate_action_proposal"("p_proposal_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") RETURNS "public"."action_proposals"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare p public.action_proposals;a public.control_alerts;pol public.action_policies;ev record;v_hash text;v_snapshot jsonb;v_from text;begin
 if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required';end if;perform pg_advisory_xact_lock(hashtextextended('action-proposal:'||p_proposal_id::text,0));
 select proposal_id into ev from public.action_proposal_events where event_key=p_event_key;if found then if ev.proposal_id<>p_proposal_id then raise exception 'event_key_conflict';end if;select * into p from public.action_proposals where id=p_proposal_id;return p;end if;
 select * into p from public.action_proposals where id=p_proposal_id for update;if not found then raise exception 'proposal_not_found';end if;if p.status not in ('proposed','simulated') then raise exception 'proposal_not_simulatable';end if;if p.expires_at<=now() then raise exception 'proposal_expired';end if;
 select * into a from public.control_alerts where id=p.alert_id;select * into pol from public.action_policies where id=p.policy_id;if a.status in ('resolved','dismissed') or not pol.enabled or p.created_at<a.incident_started_at then raise exception 'source_or_policy_stale';end if;v_from:=p.status;
 v_snapshot:=jsonb_build_object('alert_id',a.id,'alert_key',a.alert_key,'status',a.status,'severity',a.severity,'priority_score',a.priority_score,'last_detected_at',a.last_detected_at,'incident_started_at',a.incident_started_at,'evidence',a.evidence,'policy_id',pol.id,'policy_version',pol.version,'proposal_payload',p.proposed_payload,'simulated_at',now());v_hash:=md5(v_snapshot::text);
 update public.action_proposals set status='simulated',simulation_snapshot=v_snapshot,simulation_hash=v_hash,simulated_at=now(),updated_at=now() where id=p.id returning * into p;
 insert into public.action_proposal_events(event_key,proposal_id,event_type,from_status,to_status,actor_id,metadata) values(p_event_key,p.id,'simulated',v_from,'simulated',p_actor_id,jsonb_build_object('simulation_hash',v_hash,'incident_started_at',a.incident_started_at));return p;end;$$;


ALTER FUNCTION "public"."simulate_action_proposal"("p_proposal_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."simulate_action_proposal_v2"("p_instance_id" "uuid", "p_proposal_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") RETURNS "public"."action_proposals"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$begin if not exists(select 1 from public.action_proposals where id=p_proposal_id and instance_id=p_instance_id)then raise exception 'proposal_not_found';end if;return public.simulate_action_proposal(p_proposal_id,p_actor_id,p_instance_id::text||':'||p_event_key);end$$;


ALTER FUNCTION "public"."simulate_action_proposal_v2"("p_instance_id" "uuid", "p_proposal_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."single_runtime_instance_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select case when count(*)=1 then min(id::text)::uuid else null end
  from public.webshop_instances
  where status in ('pilot','active');
$$;


ALTER FUNCTION "public"."single_runtime_instance_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."single_runtime_instance_id"() IS 'Migration/backfill helper only. Runtime business operations must carry explicit instance_id.';



CREATE OR REPLACE FUNCTION "public"."start_post_release_session"("p_release_candidate_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") RETURNS "public"."post_release_sessions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare c public.release_candidates;p public.post_release_policies;s public.post_release_sessions;begin
 select * into c from public.release_candidates where id=p_release_candidate_id for share;
 if not found then raise exception 'Ismeretlen kiadási jelölt.';end if;
 if c.status<>'approved' then raise exception 'Csak jóváhagyott kiadás indítható utóellenőrzésre.';end if;
 select * into p from public.post_release_policies where enabled order by version desc limit 1;
 if not found then raise exception 'Nincs aktív utóellenőrzési policy.';end if;
 select * into s from public.post_release_sessions where release_candidate_id=c.id and source_sha=c.source_sha;
 if found then return s;end if;
 insert into public.post_release_sessions(session_key,release_candidate_id,policy_id,source_sha,observation_ends_at,created_by)
 values('post:'||c.id::text||':'||left(c.source_sha,16),c.id,p.id,c.source_sha,now()+make_interval(mins=>p.observation_minutes),p_actor_id) returning * into s;
 insert into public.post_release_events(event_key,session_id,event_type,actor_id,metadata) values(p_event_key,s.id,'started',p_actor_id,jsonb_build_object('source_sha',c.source_sha,'policy_version',p.version));
 return s;end;$$;


ALTER FUNCTION "public"."start_post_release_session"("p_release_candidate_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_campaign_child_instance"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare parent_instance uuid;
begin
  select instance_id into parent_instance from public.marketing_campaigns where id=new.campaign_id;
  if parent_instance is null then return new; end if;
  if new.instance_id is not null and new.instance_id<>parent_instance then raise exception 'Cross-store campaign child is not allowed.'; end if;
  new.instance_id:=parent_instance;
  return new;
end $$;


ALTER FUNCTION "public"."sync_campaign_child_instance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_coupon_redemption_from_order_v1"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_coupon public.coupons%rowtype;
  v_existing public.coupon_redemptions%rowtype;
begin
  if tg_op='INSERT' then
    if nullif(trim(new.coupon_code),'') is null then return new; end if;
    select * into v_coupon from public.coupons where instance_id=new.instance_id and code=upper(trim(new.coupon_code)) for update;
    if not found then return new; end if;
    -- Checkout inserts the order before the final discount is known; ledger creation is deferred
    -- to the totals update below.
    return new;
  end if;

  if tg_op='UPDATE' then
    if nullif(trim(new.coupon_code),'') is not null and new.discount_gross_huf>0
       and (old.discount_gross_huf is distinct from new.discount_gross_huf or old.coupon_code is distinct from new.coupon_code) then
      select * into v_coupon from public.coupons where instance_id=new.instance_id and code=upper(trim(new.coupon_code)) for update;
      if found then
        select * into v_existing from public.coupon_redemptions where instance_id=new.instance_id and order_id=new.id and coupon_id=v_coupon.id for update;
        if not found then
          insert into public.coupon_redemptions(instance_id,coupon_id,order_id,customer_id,customer_email,coupon_code,discount_gross_huf,metadata)
          values(new.instance_id,v_coupon.id,new.id,new.customer_id,lower(trim(new.customer_email)),v_coupon.code,new.discount_gross_huf,jsonb_build_object('source','atomic_checkout'));
        elsif v_existing.status='redeemed' then
          update public.coupon_redemptions set discount_gross_huf=new.discount_gross_huf,updated_at=now() where id=v_existing.id;
        end if;
      end if;
    end if;

    if new.status='cancelled' and old.status is distinct from new.status then
      perform public.release_coupon_redemption_v1(new.instance_id,new.id,'order_cancelled');
    end if;
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."sync_coupon_redemption_from_order_v1"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_inventory_event_instance"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare variant_instance uuid; order_instance uuid;
begin
  select instance_id into variant_instance from public.product_variants where id=new.variant_id;
  if new.order_id is not null then select instance_id into order_instance from public.orders where id=new.order_id; end if;
  if variant_instance is not null and order_instance is not null and variant_instance<>order_instance then raise exception 'Cross-store inventory event is not allowed.'; end if;
  if new.instance_id is not null and coalesce(order_instance,variant_instance) is not null and new.instance_id<>coalesce(order_instance,variant_instance) then raise exception 'Inventory event store scope mismatch.'; end if;
  new.instance_id:=coalesce(order_instance,variant_instance,new.instance_id);
  return new;
end $$;


ALTER FUNCTION "public"."sync_inventory_event_instance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_inventory_reservation_instance"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare variant_instance uuid; order_instance uuid;
begin
  select instance_id into variant_instance from public.product_variants where id=new.variant_id;
  select instance_id into order_instance from public.orders where id=new.order_id;
  if variant_instance is not null and order_instance is not null and variant_instance<>order_instance then raise exception 'Cross-store inventory reservation is not allowed.'; end if;
  if new.instance_id is not null and order_instance is not null and new.instance_id<>order_instance then raise exception 'Inventory reservation store scope mismatch.'; end if;
  new.instance_id:=coalesce(order_instance,variant_instance,new.instance_id);
  return new;
end $$;


ALTER FUNCTION "public"."sync_inventory_reservation_instance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_order_item_instance"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare parent_instance uuid; variant_instance uuid;
begin
  select instance_id into parent_instance from public.orders where id=new.order_id;
  if new.variant_id is not null then select instance_id into variant_instance from public.product_variants where id=new.variant_id; end if;
  if parent_instance is not null and variant_instance is not null and parent_instance<>variant_instance then raise exception 'Cross-store order item is not allowed.'; end if;
  if new.instance_id is not null and coalesce(parent_instance,variant_instance) is not null and new.instance_id<>coalesce(parent_instance,variant_instance) then raise exception 'Order item store scope mismatch.'; end if;
  new.instance_id:=coalesce(parent_instance,variant_instance,new.instance_id);
  return new;
end $$;


ALTER FUNCTION "public"."sync_order_item_instance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_product_variant_instance"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare parent_instance uuid;
begin
  select instance_id into parent_instance from public.products where id=new.product_id;
  if parent_instance is null then return new; end if;
  if new.instance_id is not null and new.instance_id<>parent_instance then raise exception 'Cross-store product variant is not allowed.'; end if;
  new.instance_id:=parent_instance;
  return new;
end $$;


ALTER FUNCTION "public"."sync_product_variant_instance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_support_ticket_from_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.author_role='customer' then
    update public.support_tickets set status='open',updated_at=greatest(updated_at,new.created_at)
    where id=new.ticket_id and instance_id=new.instance_id and status<>'closed';
  elsif new.author_role='admin' then
    update public.support_tickets set status='waiting_customer',updated_at=greatest(updated_at,new.created_at)
    where id=new.ticket_id and instance_id=new.instance_id and status<>'closed';
  else
    update public.support_tickets set updated_at=greatest(updated_at,new.created_at)
    where id=new.ticket_id and instance_id=new.instance_id;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."sync_support_ticket_from_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_variant_child_instance"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare parent_instance uuid;
begin
  select instance_id into parent_instance from public.product_variants where id=new.variant_id;
  if parent_instance is null then return new; end if;
  if new.instance_id is not null and new.instance_id<>parent_instance then raise exception 'Cross-store variant child is not allowed.'; end if;
  new.instance_id:=parent_instance;
  return new;
end $$;


ALTER FUNCTION "public"."sync_variant_child_instance"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assurance_findings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "finding_key" "text" NOT NULL,
    "control_id" "uuid" NOT NULL,
    "subject_key" "text" DEFAULT 'global'::"text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "severity" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "occurrence_count" integer DEFAULT 1 NOT NULL,
    "first_detected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "incident_started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_detected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_evidence_id" "uuid",
    "acknowledged_at" timestamp with time zone,
    "acknowledged_by" "uuid",
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "accepted_risk_at" timestamp with time zone,
    "accepted_risk_by" "uuid",
    "accepted_risk_reason" "text",
    "accepted_risk_expires_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "assurance_findings_occurrence_count_check" CHECK (("occurrence_count" > 0)),
    CONSTRAINT "assurance_findings_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "assurance_findings_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text", 'resolved'::"text", 'accepted_risk'::"text"])))
);


ALTER TABLE "public"."assurance_findings" OWNER TO "postgres";


COMMENT ON TABLE "public"."assurance_findings" IS 'Deduplicated V16 assurance findings linked to failed controls.';



CREATE OR REPLACE FUNCTION "public"."transition_assurance_finding"("p_finding_id" "uuid", "p_actor_id" "uuid", "p_target" "text", "p_reason" "text", "p_risk_expires_at" timestamp with time zone, "p_event_key" "text") RETURNS "public"."assurance_findings"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare f public.assurance_findings;ev public.assurance_events;v_type text;begin
 if p_target not in ('acknowledged','resolved','accepted_risk') then raise exception 'invalid_target';end if;
 if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('assurance-finding:'||p_finding_id::text,0));
 select * into ev from public.assurance_events where event_key=p_event_key;
 if found then if ev.finding_id<>p_finding_id then raise exception 'event_key_conflict';end if;select * into f from public.assurance_findings where id=p_finding_id;return f;end if;
 select * into f from public.assurance_findings where id=p_finding_id for update;if not found then raise exception 'finding_not_found';end if;
 if p_target='acknowledged' then
  if f.status<>'open' then raise exception 'finding_not_acknowledgeable';end if;
  update public.assurance_findings set status='acknowledged',acknowledged_at=now(),acknowledged_by=p_actor_id,updated_at=now() where id=f.id returning * into f;v_type:='acknowledged';
 elsif p_target='resolved' then
  if f.status not in ('open','acknowledged','accepted_risk') then raise exception 'finding_not_resolvable';end if;
  update public.assurance_findings set status='resolved',resolved_at=now(),resolved_by=p_actor_id,accepted_risk_at=null,accepted_risk_by=null,accepted_risk_reason=null,accepted_risk_expires_at=null,updated_at=now() where id=f.id returning * into f;v_type:='resolved';
 else
  if f.status not in ('open','acknowledged') then raise exception 'finding_not_risk_acceptable';end if;
  if nullif(trim(p_reason),'') is null then raise exception 'risk_reason_required';end if;
  if p_risk_expires_at is null or p_risk_expires_at<=now() or p_risk_expires_at>now()+interval '90 days' then raise exception 'risk_expiry_invalid';end if;
  if f.severity='critical' then raise exception 'critical_risk_cannot_be_accepted';end if;
  update public.assurance_findings set status='accepted_risk',accepted_risk_at=now(),accepted_risk_by=p_actor_id,accepted_risk_reason=trim(p_reason),accepted_risk_expires_at=p_risk_expires_at,updated_at=now() where id=f.id returning * into f;v_type:='risk_accepted';
 end if;
 insert into public.assurance_events(event_key,finding_id,event_type,actor_id,metadata) values(p_event_key,f.id,v_type,p_actor_id,jsonb_build_object('reason',p_reason,'risk_expires_at',p_risk_expires_at));
 return f;
end;$$;


ALTER FUNCTION "public"."transition_assurance_finding"("p_finding_id" "uuid", "p_actor_id" "uuid", "p_target" "text", "p_reason" "text", "p_risk_expires_at" timestamp with time zone, "p_event_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_automation_instance"("p_instance_id" "uuid", "p_actor_id" "uuid", "p_target" "text", "p_event_key" "text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "public"."automation_runbook_instances"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare i public.automation_runbook_instances;r public.automation_runbooks;a public.control_alerts;p public.action_proposals;c public.automation_control;e public.automation_events;begin
 if p_target not in ('paused','active','cancelled') then raise exception 'invalid_target';end if;if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('automation-instance:'||p_instance_id::text,0));
 select * into e from public.automation_events where event_key=p_event_key;if found then if e.instance_id<>p_instance_id or e.event_type<>p_target then raise exception 'event_key_conflict';end if;select * into i from public.automation_runbook_instances where id=p_instance_id;return i;end if;
 select * into i from public.automation_runbook_instances where id=p_instance_id for update;if not found then raise exception 'instance_not_found';end if;
 if p_target='paused' and i.status<>'active' then raise exception 'instance_not_pausable';end if;
 if p_target='active' then
   if i.status<>'paused' then raise exception 'instance_not_resumable';end if;select * into c from public.automation_control where singleton=true;if c.global_paused or(c.circuit_open_until is not null and c.circuit_open_until>now()) then raise exception 'automation_circuit_open';end if;
   select * into r from public.automation_runbooks where id=i.runbook_id;if not r.enabled then raise exception 'runbook_disabled';end if;select * into a from public.control_alerts where id=i.alert_id;if a.status not in ('open','acknowledged') then raise exception 'source_alert_not_active';end if;
   if r.requires_action_approval then if i.proposal_id is null then raise exception 'approved_action_required';end if;select * into p from public.action_proposals where id=i.proposal_id;if p.status not in ('approved','executed') or public.action_proposal_is_stale(p.id) then raise exception 'approved_action_stale_or_missing';end if;end if;
 end if;
 if p_target='cancelled' and i.status not in ('planned','active','paused') then raise exception 'instance_not_cancellable';end if;
 update public.automation_runbook_instances set status=p_target,paused_at=case when p_target='paused' then now() when p_target='active' then null else paused_at end,cancelled_at=case when p_target='cancelled' then now() else cancelled_at end,updated_at=now() where id=i.id returning * into i;
 if p_target='cancelled' then update public.automation_step_runs set status='cancelled',finished_at=coalesce(finished_at,now()),updated_at=now() where instance_id=i.id and status in ('pending','ready','failed');end if;
 insert into public.automation_events(event_key,instance_id,event_type,actor_id,metadata) values(p_event_key,i.id,p_target,p_actor_id,jsonb_build_object('reason',p_reason));return i;
end;$$;


ALTER FUNCTION "public"."transition_automation_instance"("p_instance_id" "uuid", "p_actor_id" "uuid", "p_target" "text", "p_event_key" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_automation_instance_v2"("p_store_instance_id" "uuid", "p_runbook_instance_id" "uuid", "p_actor_id" "uuid", "p_target" "text", "p_event_key" "text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "public"."automation_runbook_instances"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$begin if not exists(select 1 from public.automation_runbook_instances where id=p_runbook_instance_id and instance_id=p_store_instance_id)then raise exception 'automation_instance_not_found';end if;return public.transition_automation_instance(p_runbook_instance_id,p_actor_id,p_target,p_store_instance_id::text||':'||p_event_key,p_reason);end$$;


ALTER FUNCTION "public"."transition_automation_instance_v2"("p_store_instance_id" "uuid", "p_runbook_instance_id" "uuid", "p_actor_id" "uuid", "p_target" "text", "p_event_key" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_commercial_offer"("p_offer_id" "uuid", "p_status" "text") RETURNS "public"."commercial_offers"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v public.commercial_offers;begin
 select * into v from public.commercial_offers where id=p_offer_id for update;
 if not found then raise exception 'offer_not_found'; end if;
 if p_status not in ('sent','accepted','expired','cancelled') then raise exception 'invalid_target_status'; end if;
 if p_status='sent' and v.status<>'approved' then raise exception 'offer_not_approved'; end if;
 if p_status='accepted' and v.status not in ('approved','sent') then raise exception 'offer_not_acceptible'; end if;
 if p_status in ('expired','cancelled') and v.status in ('accepted','expired','cancelled') then raise exception 'offer_already_closed'; end if;
 update public.commercial_offers set status=p_status,sent_at=case when p_status='sent' then coalesce(sent_at,now()) else sent_at end,accepted_at=case when p_status='accepted' then now() else accepted_at end,updated_at=now() where id=p_offer_id returning * into v;
 if p_status='accepted' then
   update public.commercial_offers set status='cancelled',updated_at=now()
    where opportunity_id=v.opportunity_id and id<>v.id and status in ('draft','approved','sent');
   update public.commercial_opportunities set status='won',closed_at=now(),updated_at=now() where id=v.opportunity_id and status in ('open','in_progress');
 end if;
 return v;
end;$$;


ALTER FUNCTION "public"."transition_commercial_offer"("p_offer_id" "uuid", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_commercial_offer_v2"("p_instance_id" "uuid", "p_offer_id" "uuid", "p_status" "text") RETURNS "public"."commercial_offers"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v public.commercial_offers;
begin
 select * into v from public.commercial_offers where id=p_offer_id and instance_id=p_instance_id for update;if not found then raise exception 'offer_not_found';end if;
 if p_status not in('sent','accepted','expired','cancelled') then raise exception 'invalid_target_status';end if;
 if p_status='sent' and v.status<>'approved' then raise exception 'offer_not_approved';end if;
 if p_status='accepted' and v.status not in('approved','sent') then raise exception 'offer_not_acceptible';end if;
 if p_status in('expired','cancelled') and v.status in('accepted','expired','cancelled') then raise exception 'offer_already_closed';end if;
 update public.commercial_offers set status=p_status,sent_at=case when p_status='sent' then coalesce(sent_at,now()) else sent_at end,accepted_at=case when p_status='accepted' then now() else accepted_at end,updated_at=now() where id=p_offer_id and instance_id=p_instance_id returning * into v;
 if p_status='accepted' then
  update public.commercial_offers set status='cancelled',updated_at=now() where instance_id=p_instance_id and opportunity_id=v.opportunity_id and id<>v.id and status in('draft','approved','sent');
  update public.commercial_opportunities set status='won',closed_at=now(),updated_at=now() where instance_id=p_instance_id and id=v.opportunity_id and status in('open','in_progress');
 end if;
 return v;
end$$;


ALTER FUNCTION "public"."transition_commercial_offer_v2"("p_instance_id" "uuid", "p_offer_id" "uuid", "p_status" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."control_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alert_key" "text" NOT NULL,
    "category" "text" NOT NULL,
    "alert_type" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "priority_score" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "recommended_action" "text",
    "order_id" "uuid",
    "customer_id" "uuid",
    "reseller_id" "uuid",
    "variant_id" "uuid",
    "opportunity_id" "uuid",
    "evidence" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "occurrence_count" integer DEFAULT 1 NOT NULL,
    "detected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_detected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "acknowledged_at" timestamp with time zone,
    "acknowledged_by" "uuid",
    "snoozed_until" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "dismissed_at" timestamp with time zone,
    "dismissed_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "incident_started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "control_alerts_category_check" CHECK (("category" = ANY (ARRAY['operations'::"text", 'inventory'::"text", 'service'::"text", 'commercial'::"text", 'customer'::"text", 'system'::"text"]))),
    CONSTRAINT "control_alerts_occurrence_count_check" CHECK (("occurrence_count" > 0)),
    CONSTRAINT "control_alerts_priority_score_check" CHECK ((("priority_score" >= 0) AND ("priority_score" <= 100))),
    CONSTRAINT "control_alerts_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "control_alerts_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text", 'snoozed'::"text", 'resolved'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."control_alerts" OWNER TO "postgres";


COMMENT ON TABLE "public"."control_alerts" IS 'V13 persistent cross-domain management alerts. Alerts recommend action but do not autonomously mutate commerce/customer state.';



CREATE OR REPLACE FUNCTION "public"."transition_control_alert"("p_alert_id" "uuid", "p_target_status" "text", "p_event_key" "text", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_snoozed_until" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_note" "text" DEFAULT NULL::"text") RETURNS "public"."control_alerts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ declare a public.control_alerts;e public.control_alert_events;v_from text;v_event_type text; begin if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required'; end if; if p_target_status not in ('open','acknowledged','snoozed','resolved','dismissed') then raise exception 'unsupported_control_status'; end if; perform pg_advisory_xact_lock(hashtextextended('control-alert:'||p_alert_id::text,0)); select * into a from public.control_alerts where id=p_alert_id for update; if not found then raise exception 'control_alert_not_found'; end if; select * into e from public.control_alert_events where event_key=p_event_key; if found then if e.alert_id<>p_alert_id or coalesce(e.to_status,'')<>p_target_status then raise exception 'event_key_conflict'; end if; return a; end if; v_from:=a.status; if p_target_status='open' and v_from<>'snoozed' then raise exception 'invalid_control_transition'; end if; if p_target_status='acknowledged' and v_from not in ('open','snoozed') then raise exception 'invalid_control_transition'; end if; if p_target_status='snoozed' and v_from not in ('open','acknowledged') then raise exception 'invalid_control_transition'; end if; if p_target_status in ('resolved','dismissed') and v_from not in ('open','acknowledged','snoozed') then raise exception 'invalid_control_transition'; end if; if p_target_status='snoozed' and (p_snoozed_until is null or p_snoozed_until<=now()) then raise exception 'future_snooze_required'; end if; v_event_type:=case p_target_status when 'open' then 'reopened' when 'acknowledged' then 'acknowledged' when 'snoozed' then 'snoozed' when 'resolved' then 'resolved' when 'dismissed' then 'dismissed' end; update public.control_alerts set status=p_target_status,acknowledged_at=case when p_target_status='acknowledged' then coalesce(acknowledged_at,now()) else acknowledged_at end,acknowledged_by=case when p_target_status='acknowledged' then p_actor_id else acknowledged_by end,snoozed_until=case when p_target_status='snoozed' then p_snoozed_until when p_target_status='open' then null else snoozed_until end,resolved_at=case when p_target_status='resolved' then coalesce(resolved_at,now()) when p_target_status='open' then null else resolved_at end,resolved_by=case when p_target_status='resolved' then p_actor_id when p_target_status='open' then null else resolved_by end,dismissed_at=case when p_target_status='dismissed' then coalesce(dismissed_at,now()) when p_target_status='open' then null else dismissed_at end,dismissed_by=case when p_target_status='dismissed' then p_actor_id when p_target_status='open' then null else dismissed_by end,updated_at=now() where id=p_alert_id returning * into a; insert into public.control_alert_events(event_key,alert_id,event_type,from_status,to_status,actor_id,metadata) values(p_event_key,p_alert_id,v_event_type,v_from,p_target_status,p_actor_id,jsonb_build_object('note',nullif(trim(p_note),''),'snoozed_until',p_snoozed_until)); if p_target_status in ('resolved','dismissed') then update public.control_tasks set status='cancelled',updated_at=now(),outcome=coalesce(outcome,'Alert lezárása miatt automatikusan lezárt kontrollfeladat') where alert_id=p_alert_id and status in ('open','in_progress'); end if; return a; end;$$;


ALTER FUNCTION "public"."transition_control_alert"("p_alert_id" "uuid", "p_target_status" "text", "p_event_key" "text", "p_actor_id" "uuid", "p_snoozed_until" timestamp with time zone, "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_control_alert_v2"("p_instance_id" "uuid", "p_alert_id" "uuid", "p_target_status" "text", "p_event_key" "text", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_snoozed_until" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_note" "text" DEFAULT NULL::"text") RETURNS "public"."control_alerts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$begin if not exists(select 1 from public.control_alerts where id=p_alert_id and instance_id=p_instance_id)then raise exception 'control_alert_not_found';end if;return public.transition_control_alert(p_alert_id,p_target_status,p_instance_id::text||':'||p_event_key,p_actor_id,p_snoozed_until,p_note);end$$;


ALTER FUNCTION "public"."transition_control_alert_v2"("p_instance_id" "uuid", "p_alert_id" "uuid", "p_target_status" "text", "p_event_key" "text", "p_actor_id" "uuid", "p_snoozed_until" timestamp with time zone, "p_note" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."control_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_key" "text" NOT NULL,
    "alert_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "priority_score" integer DEFAULT 0 NOT NULL,
    "title" "text" NOT NULL,
    "recommended_action" "text",
    "owner_user_id" "uuid",
    "due_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "completed_by" "uuid",
    "outcome" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "control_tasks_priority_score_check" CHECK ((("priority_score" >= 0) AND ("priority_score" <= 100))),
    CONSTRAINT "control_tasks_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."control_tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."control_tasks" IS 'Human-in-the-loop decision tasks linked to V13 control alerts.';



CREATE OR REPLACE FUNCTION "public"."transition_control_task"("p_task_id" "uuid", "p_target_status" "text", "p_event_key" "text", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_outcome" "text" DEFAULT NULL::"text") RETURNS "public"."control_tasks"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  t public.control_tasks;
  existing public.control_alert_events;
  v_from text;
  v_event_type text;
begin
  if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required'; end if;
  if p_target_status not in ('in_progress','completed','cancelled') then raise exception 'unsupported_task_status'; end if;
  perform pg_advisory_xact_lock(hashtextextended('control-task:'||p_task_id::text,0));
  select * into t from public.control_tasks where id=p_task_id for update;
  if not found then raise exception 'control_task_not_found'; end if;
  perform 1 from public.control_alerts where id=t.alert_id for update;
  if not found then raise exception 'control_alert_not_found'; end if;

  select * into existing from public.control_alert_events where event_key=p_event_key;
  if found then
    if existing.alert_id<>t.alert_id then raise exception 'event_key_conflict'; end if;
    return t;
  end if;

  v_from:=t.status;
  if p_target_status='in_progress' and v_from<>'open' then raise exception 'invalid_task_transition'; end if;
  if p_target_status='completed' and v_from not in ('open','in_progress') then raise exception 'invalid_task_transition'; end if;
  if p_target_status='cancelled' and v_from not in ('open','in_progress') then raise exception 'invalid_task_transition'; end if;
  if p_target_status='completed' and nullif(trim(p_outcome),'') is null then raise exception 'task_outcome_required'; end if;

  update public.control_tasks set
    status=p_target_status,
    owner_user_id=case when p_target_status='in_progress' then coalesce(owner_user_id,p_actor_id) when p_target_status='completed' then coalesce(owner_user_id,p_actor_id) else owner_user_id end,
    started_at=case when p_target_status='in_progress' then coalesce(started_at,now()) when p_target_status='completed' then coalesce(started_at,now()) else started_at end,
    completed_at=case when p_target_status='completed' then coalesce(completed_at,now()) else completed_at end,
    completed_by=case when p_target_status='completed' then p_actor_id else completed_by end,
    outcome=case when p_target_status in ('completed','cancelled') then nullif(trim(p_outcome),'') else outcome end,
    updated_at=now()
  where id=p_task_id returning * into t;

  v_event_type:=case p_target_status when 'in_progress' then 'task_started' when 'completed' then 'task_completed' else 'task_cancelled' end;
  insert into public.control_alert_events(event_key,alert_id,event_type,from_status,to_status,actor_id,metadata)
  values(p_event_key,t.alert_id,v_event_type,v_from,p_target_status,p_actor_id,jsonb_build_object('task_id',t.id,'owner_user_id',t.owner_user_id,'outcome',nullif(trim(p_outcome),'')));
  return t;
end;$$;


ALTER FUNCTION "public"."transition_control_task"("p_task_id" "uuid", "p_target_status" "text", "p_event_key" "text", "p_actor_id" "uuid", "p_outcome" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_control_task_v2"("p_instance_id" "uuid", "p_task_id" "uuid", "p_target_status" "text", "p_event_key" "text", "p_actor_id" "uuid" DEFAULT NULL::"uuid", "p_outcome" "text" DEFAULT NULL::"text") RETURNS "public"."control_tasks"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$begin if not exists(select 1 from public.control_tasks where id=p_task_id and instance_id=p_instance_id)then raise exception 'control_task_not_found';end if;return public.transition_control_task(p_task_id,p_target_status,p_instance_id::text||':'||p_event_key,p_actor_id,p_outcome);end$$;


ALTER FUNCTION "public"."transition_control_task_v2"("p_instance_id" "uuid", "p_task_id" "uuid", "p_target_status" "text", "p_event_key" "text", "p_actor_id" "uuid", "p_outcome" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_operations" (
    "order_id" "uuid" NOT NULL,
    "operational_status" "text" DEFAULT 'awaiting_reservation'::"text" NOT NULL,
    "priority_score" integer DEFAULT 50 NOT NULL,
    "exception_code" "text",
    "reservation_completed_at" timestamp with time zone,
    "ready_to_pack_at" timestamp with time zone,
    "packed_at" timestamp with time zone,
    "handed_over_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "blocked_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "order_operations_operational_status_check" CHECK (("operational_status" = ANY (ARRAY['awaiting_reservation'::"text", 'reserved'::"text", 'ready_to_pack'::"text", 'packed'::"text", 'handed_over'::"text", 'delivered'::"text", 'blocked'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "order_operations_priority_score_check" CHECK ((("priority_score" >= 0) AND ("priority_score" <= 100)))
);


ALTER TABLE "public"."order_operations" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_order_operation"("p_order_id" "uuid", "p_target_status" "text", "p_event_key" "text", "p_actor_id" "uuid" DEFAULT NULL::"uuid") RETURNS "public"."order_operations"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  op public.order_operations;
  v_from text;
  v_event_type text;
  v_existing public.fulfillment_events;
  v_commerce public.order_status;
begin
  if nullif(trim(p_event_key),'') is null then raise exception 'event_key_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('ops-order:'||p_order_id::text,0));
  select * into op from public.order_operations where order_id=p_order_id for update;
  if not found then raise exception 'order_operations_not_initialized'; end if;
  select status into v_commerce from public.orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  v_event_type:=case p_target_status when 'ready_to_pack' then 'ready_to_pack' when 'packed' then 'packed' when 'handed_over' then 'handed_over' when 'delivered' then 'delivered' else null end;
  if v_event_type is null then raise exception 'unsupported_transition'; end if;
  select * into v_existing from public.fulfillment_events where event_key=p_event_key;
  if found then
    if v_existing.order_id<>p_order_id or v_existing.event_type<>v_event_type or coalesce(v_existing.to_status,'')<>p_target_status then raise exception 'event_key_conflict'; end if;
    return op;
  end if;
  v_from:=op.operational_status;
  if p_target_status='ready_to_pack' and (v_from<>'reserved' or v_commerce not in ('paid','processing')) then raise exception 'invalid_transition'; end if;
  if p_target_status='packed' and v_from<>'ready_to_pack' then raise exception 'invalid_transition'; end if;
  if p_target_status='handed_over' and v_from<>'packed' then raise exception 'invalid_transition'; end if;
  if p_target_status='delivered' and v_from<>'handed_over' then raise exception 'invalid_transition'; end if;
  if p_target_status='packed' then
    if not exists(select 1 from public.inventory_reservations where order_id=p_order_id and status='active') then raise exception 'no_active_reservations'; end if;
    update public.inventory_reservations set status='consumed',consumed_at=coalesce(consumed_at,now()),updated_at=now(),metadata=metadata||jsonb_build_object('consumed_at_operation','packed') where order_id=p_order_id and status='active';
  elsif p_target_status='handed_over' then
    update public.orders set status='shipped',updated_at=now() where id=p_order_id and status in ('paid','processing');
  elsif p_target_status='delivered' then
    update public.orders set status='completed',updated_at=now() where id=p_order_id and status='shipped';
  end if;
  update public.order_operations set operational_status=p_target_status,
    ready_to_pack_at=case when p_target_status='ready_to_pack' then coalesce(ready_to_pack_at,now()) else ready_to_pack_at end,
    packed_at=case when p_target_status='packed' then coalesce(packed_at,now()) else packed_at end,
    handed_over_at=case when p_target_status='handed_over' then coalesce(handed_over_at,now()) else handed_over_at end,
    delivered_at=case when p_target_status='delivered' then coalesce(delivered_at,now()) else delivered_at end,
    exception_code=null,blocked_at=null,updated_at=now(),metadata=metadata||jsonb_build_object('stock_semantics','checkout_decremented')
  where order_id=p_order_id returning * into op;
  insert into public.fulfillment_events(event_key,order_id,event_type,from_status,to_status,actor_id,metadata)
  values(p_event_key,p_order_id,v_event_type,v_from,p_target_status,p_actor_id,jsonb_build_object('source','v12_transition','stock_changed',false));
  return op;
end;$$;


ALTER FUNCTION "public"."transition_order_operation"("p_order_id" "uuid", "p_target_status" "text", "p_event_key" "text", "p_actor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_purchase_order"("p_purchase_order_id" "uuid", "p_target_status" "text", "p_actor" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare p record;v_now timestamptz:=now();v_remaining integer;begin
 select * into p from public.purchase_orders where id=p_purchase_order_id for update;
 if not found then raise exception 'A beszerzés nem található.'; end if;
 if p_target_status not in ('approved','ordered','cancelled') then raise exception 'Érvénytelen célállapot.'; end if;
 if not ((p.status='draft' and p_target_status in ('approved','cancelled')) or (p.status='approved' and p_target_status in ('ordered','cancelled')) or (p.status in ('ordered','partially_received') and p_target_status='cancelled')) then raise exception 'Ez az állapotváltás nem engedélyezett.'; end if;
 if p_target_status='ordered' then
  perform 1 from public.purchase_order_items where purchase_order_id=p.id;
  if not found then raise exception 'Üres beszerzési rendelés nem küldhető el.'; end if;
  update public.purchase_orders set status='ordered',ordered_at=coalesce(ordered_at,v_now),updated_at=v_now where id=p.id;
 elsif p_target_status='cancelled' then
  select coalesce(sum(quantity-received_quantity),0) into v_remaining from public.purchase_order_items where purchase_order_id=p.id;
  update public.purchase_orders set status='cancelled',updated_at=v_now,notes=case when p.status='partially_received' then concat_ws(E'\n',notes,'Részleges bevételezés után törölve; nyitott mennyiség: '||v_remaining||' db.') else notes end where id=p.id;
 else
  update public.purchase_orders set status='approved',updated_at=v_now where id=p.id;
 end if;
 return jsonb_build_object('previous_status',p.status,'status',p_target_status,'order_number',p.order_number);
end;$$;


ALTER FUNCTION "public"."transition_purchase_order"("p_purchase_order_id" "uuid", "p_target_status" "text", "p_actor" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_purchase_order_v2"("p_instance_id" "uuid", "p_purchase_order_id" "uuid", "p_target_status" "text", "p_actor" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare p record;v_now timestamptz:=now();v_remaining integer;
begin
  select * into p from public.purchase_orders where id=p_purchase_order_id and instance_id=p_instance_id for update;
  if not found then raise exception 'A beszerzés nem található ebben a webshopban.'; end if;
  if p_target_status not in ('approved','ordered','cancelled') then raise exception 'Érvénytelen célállapot.'; end if;
  if not ((p.status='draft' and p_target_status in ('approved','cancelled')) or (p.status='approved' and p_target_status in ('ordered','cancelled')) or (p.status in ('ordered','partially_received') and p_target_status='cancelled')) then raise exception 'Ez az állapotváltás nem engedélyezett.'; end if;
  if p_target_status='ordered' then
    perform 1 from public.purchase_order_items where purchase_order_id=p.id and instance_id=p_instance_id;if not found then raise exception 'Üres beszerzési rendelés nem küldhető el.';end if;
    update public.purchase_orders set status='ordered',ordered_at=coalesce(ordered_at,v_now),updated_at=v_now where id=p.id and instance_id=p_instance_id;
  elsif p_target_status='cancelled' then
    select coalesce(sum(quantity-received_quantity),0) into v_remaining from public.purchase_order_items where purchase_order_id=p.id and instance_id=p_instance_id;
    update public.purchase_orders set status='cancelled',updated_at=v_now,notes=case when p.status='partially_received' then concat_ws(E'\n',notes,'Részleges bevételezés után törölve; nyitott mennyiség: '||v_remaining||' db.') else notes end where id=p.id and instance_id=p_instance_id;
  else update public.purchase_orders set status='approved',updated_at=v_now where id=p.id and instance_id=p_instance_id;end if;
  return jsonb_build_object('previous_status',p.status,'status',p_target_status,'order_number',p.order_number);
end $$;


ALTER FUNCTION "public"."transition_purchase_order_v2"("p_instance_id" "uuid", "p_purchase_order_id" "uuid", "p_target_status" "text", "p_actor" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_return_case"("p_case_id" "uuid", "p_actor" "uuid", "p_target_status" "text", "p_refund_amount" integer, "p_refund_reference" "text", "p_admin_note" "text", "p_restock" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  c record;
  o record;
  v_now timestamptz:=now();
  v_previous_refunds integer:=0;
  v_total_refunded integer:=0;
  v_restock jsonb:=null;
  v_allowed boolean:=false;
begin
  select * into c from public.return_cases where id=p_case_id for update;
  if not found then raise exception 'Az ügy nem található.'; end if;

  if p_target_status not in ('requested','approved','rejected','received','refund_pending','refunded','closed') then
    raise exception 'Érvénytelen visszáru állapot.';
  end if;

  v_allowed := p_target_status=c.status::text
    or (c.status='requested' and p_target_status in ('approved','rejected'))
    or (c.status='approved' and p_target_status in ('received','closed'))
    or (c.status='rejected' and p_target_status='closed')
    or (c.status='received' and p_target_status in ('refund_pending','refunded','closed'))
    or (c.status='refund_pending' and p_target_status in ('refunded','closed'))
    or (c.status='refunded' and p_target_status='closed');
  if not v_allowed then
    raise exception 'Érvénytelen állapotváltás: % → %.',c.status,p_target_status;
  end if;

  select id,total_gross_huf,status into o from public.orders where id=c.order_id for update;
  if not found then raise exception 'A kapcsolódó rendelés nem található.'; end if;

  if p_refund_amount is not null and (p_refund_amount<0 or p_refund_amount>o.total_gross_huf) then
    raise exception 'A visszatérítés összege nem lehet nagyobb a rendelés teljes összegénél.';
  end if;
  if p_target_status='refunded' and p_refund_amount is null then
    raise exception 'A visszatérített állapothoz add meg a visszatérítés összegét.';
  end if;

  if p_target_status='refunded' then
    select coalesce(sum(refund_amount_gross_huf),0)::integer into v_previous_refunds
    from public.return_cases
    where order_id=c.order_id and status='refunded' and id<>c.id;
    if v_previous_refunds+p_refund_amount>o.total_gross_huf then
      raise exception 'A korábbi visszatérítésekkel együtt legfeljebb % Ft téríthető még vissza ehhez a rendeléshez.',greatest(0,o.total_gross_huf-v_previous_refunds);
    end if;
  end if;

  update public.return_cases set
    status=p_target_status::public.return_case_status,
    refund_amount_gross_huf=p_refund_amount,
    refund_reference=nullif(trim(p_refund_reference),''),
    admin_note=nullif(trim(p_admin_note),''),
    approved_at=case when p_target_status='approved' then coalesce(approved_at,v_now) else approved_at end,
    received_at=case when p_target_status='received' then coalesce(received_at,v_now) else received_at end,
    refunded_at=case when p_target_status='refunded' then coalesce(refunded_at,v_now) else refunded_at end,
    closed_at=case when p_target_status='closed' then coalesce(closed_at,v_now) else closed_at end,
    updated_at=v_now
  where id=c.id;

  if p_restock then
    if p_target_status not in ('received','refund_pending','refunded','closed') then
      raise exception 'Készletre csak visszaérkezett termék tehető.';
    end if;
    select public.restock_return_case(c.id,p_actor) into v_restock;
  end if;

  if p_target_status='refunded' then
    select coalesce(sum(refund_amount_gross_huf),0)::integer into v_total_refunded
    from public.return_cases where order_id=c.order_id and status='refunded';
    if v_total_refunded>=o.total_gross_huf and o.status<>'refunded' then
      update public.orders set status='refunded',updated_at=v_now where id=o.id;
    end if;
  end if;

  return jsonb_build_object(
    'previous_status',c.status,
    'status',p_target_status,
    'refund_amount_gross_huf',p_refund_amount,
    'refund_reference',nullif(trim(p_refund_reference),''),
    'admin_note',nullif(trim(p_admin_note),''),
    'restock',v_restock
  );
end;$$;


ALTER FUNCTION "public"."transition_return_case"("p_case_id" "uuid", "p_actor" "uuid", "p_target_status" "text", "p_refund_amount" integer, "p_refund_reference" "text", "p_admin_note" "text", "p_restock" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_tenant_order_v1"("p_instance_id" "uuid", "p_order_id" "uuid", "p_actor" "uuid", "p_target_status" "text", "p_tracking_number" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_order public.orders%rowtype;v_allowed boolean:=false;v_restore boolean:=false;v_line record;v_already integer;v_remaining integer;v_result jsonb;
begin
 select * into v_order from public.orders where id=p_order_id and instance_id=p_instance_id for update;if not found then raise exception 'A rendelés nem található ebben a webshopban.';end if;
 if v_order.status=p_target_status then return jsonb_build_object('order_id',v_order.id,'status',v_order.status,'replayed',true,'inventory_restored',false);end if;
 v_allowed:=case v_order.status when 'draft' then p_target_status=any(array['pending','pending_payment','pending_transfer','cancelled']) when 'pending' then p_target_status=any(array['paid','processing','cancelled']) when 'pending_payment' then p_target_status=any(array['paid','cancelled']) when 'pending_transfer' then p_target_status=any(array['paid','cancelled']) when 'paid' then p_target_status=any(array['processing','refunded']) when 'processing' then p_target_status=any(array['shipped','refunded']) when 'shipped' then p_target_status=any(array['completed','refunded']) when 'completed' then p_target_status='refunded' else false end;
 if not v_allowed then raise exception 'Nem engedélyezett rendelési állapotváltás: % -> %',v_order.status,p_target_status;end if;
 if p_target_status='shipped' and coalesce(v_order.shipping_method,'')<>'pickup' and coalesce(nullif(trim(p_tracking_number),''),v_order.tracking_number) is null then raise exception 'Feladott rendeléshez csomagkövetési azonosító szükséges.';end if;
 -- Only cancellation before fulfillment returns inventory automatically. A financial refund never implies physical return.
 if p_target_status='cancelled' then
  for v_line in select oi.id,oi.quantity from public.order_items oi where oi.order_id=p_order_id and oi.instance_id=p_instance_id and oi.variant_id is not null order by oi.id for update loop
   select coalesce(sum(r.quantity),0)::integer into v_already from public.order_inventory_restorations r where r.instance_id=p_instance_id and r.order_item_id=v_line.id;v_remaining:=greatest(0,v_line.quantity-v_already);
   if v_remaining>0 then select public.restore_order_item_inventory_v1(p_instance_id,p_order_id,v_line.id,'order_cancelled',p_order_id,v_remaining,p_actor) into v_result;if coalesce((v_result->>'restored')::boolean,false) then v_restore:=true;end if;end if;
  end loop;
 end if;
 update public.orders set status=p_target_status,tracking_number=case when p_tracking_number is null then tracking_number else nullif(trim(p_tracking_number),'') end,paid_at=case when p_target_status='paid' and paid_at is null then now() else paid_at end,updated_at=now() where id=p_order_id and instance_id=p_instance_id;
 insert into public.order_events(instance_id,order_id,event_type,from_status,to_status,actor_user_id,metadata) values(p_instance_id,p_order_id,'status_changed',v_order.status,p_target_status,p_actor,jsonb_build_object('inventory_restored',v_restore,'refund_inventory_policy',case when p_target_status='refunded' then 'return_case_only' else null end,'tracking_number',coalesce(p_tracking_number,v_order.tracking_number)));
 return jsonb_build_object('order_id',p_order_id,'status',p_target_status,'inventory_restored',v_restore,'replayed',false);
end $$;


ALTER FUNCTION "public"."transition_tenant_order_v1"("p_instance_id" "uuid", "p_order_id" "uuid", "p_actor" "uuid", "p_target_status" "text", "p_tracking_number" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_release_ci_evidence"("p_candidate_id" "uuid", "p_actor_id" "uuid", "p_ci_status" "text", "p_observed_at" timestamp with time zone, "p_evidence" "jsonb", "p_event_key" "text") RETURNS "public"."release_candidates"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare c public.release_candidates;ev public.release_events;begin
 if p_ci_status not in('success','failure','cancelled','pending') then raise exception 'invalid_ci_status';end if;perform pg_advisory_xact_lock(hashtextextended('release:'||p_candidate_id::text,0));
 select * into ev from public.release_events where event_key=p_event_key;if found then if ev.candidate_id<>p_candidate_id then raise exception 'event_key_conflict';end if;select * into c from public.release_candidates where id=p_candidate_id;return c;end if;
 select * into c from public.release_candidates where id=p_candidate_id for update;if not found then raise exception 'candidate_not_found';end if;if c.status in('approved','rejected','expired','cancelled') then raise exception 'candidate_terminal';end if;
 update public.release_candidates set ci_status=p_ci_status,ci_observed_at=p_observed_at,ci_evidence=coalesce(p_evidence,'{}'::jsonb),status='draft',gate_snapshot=null,gate_hash=null,evaluated_at=null,updated_at=now() where id=c.id returning * into c;
 insert into public.release_events(event_key,candidate_id,event_type,actor_id,metadata) values(p_event_key,c.id,'ci_updated',p_actor_id,jsonb_build_object('ci_status',p_ci_status,'observed_at',p_observed_at));return c;end;$$;


ALTER FUNCTION "public"."update_release_ci_evidence"("p_candidate_id" "uuid", "p_actor_id" "uuid", "p_ci_status" "text", "p_observed_at" timestamp with time zone, "p_evidence" "jsonb", "p_event_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_checkout_recovery_intent"("p_user_id" "uuid", "p_email" "text", "p_cart" "jsonb", "p_checkout" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare r public.checkout_recovery_intents%rowtype;begin if p_user_id is null or length(trim(p_email))<5 then raise exception 'invalid recovery identity'; end if; if p_cart is null or jsonb_typeof(p_cart)<>'array' or jsonb_array_length(p_cart)=0 then raise exception 'empty cart'; end if; select * into r from public.checkout_recovery_intents where user_id=p_user_id and status='open' for update; if found then update public.checkout_recovery_intents set email=lower(trim(p_email)),cart=p_cart,checkout=coalesce(p_checkout,'{}'::jsonb),expires_at=now()+interval '7 days',last_seen_at=now(),updated_at=now() where id=r.id returning * into r; else insert into public.checkout_recovery_intents(user_id,email,cart,checkout) values(p_user_id,lower(trim(p_email)),p_cart,coalesce(p_checkout,'{}'::jsonb)) returning * into r; end if; return jsonb_build_object('id',r.id,'token',r.recovery_token,'expiresAt',r.expires_at);end;$$;


ALTER FUNCTION "public"."upsert_checkout_recovery_intent"("p_user_id" "uuid", "p_email" "text", "p_cart" "jsonb", "p_checkout" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_checkout_recovery_intent_v2"("p_instance_id" "uuid", "p_user_id" "uuid", "p_email" "text", "p_cart" "jsonb", "p_checkout" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare r public.checkout_recovery_intents%rowtype;
begin
  if not exists(select 1 from public.webshop_instances where id=p_instance_id) then raise exception 'invalid tenant'; end if;
  if p_user_id is null or length(trim(p_email))<5 then raise exception 'invalid recovery identity'; end if;
  if p_cart is null or jsonb_typeof(p_cart)<>'array' or jsonb_array_length(p_cart)=0 then raise exception 'empty cart'; end if;
  select * into r from public.checkout_recovery_intents
    where instance_id=p_instance_id and user_id=p_user_id and status='open' for update;
  if found then
    update public.checkout_recovery_intents set email=lower(trim(p_email)),cart=p_cart,checkout=coalesce(p_checkout,'{}'::jsonb),
      expires_at=now()+interval '7 days',last_seen_at=now(),updated_at=now()
    where id=r.id and instance_id=p_instance_id returning * into r;
  else
    insert into public.checkout_recovery_intents(instance_id,user_id,email,cart,checkout)
    values(p_instance_id,p_user_id,lower(trim(p_email)),p_cart,coalesce(p_checkout,'{}'::jsonb)) returning * into r;
  end if;
  return jsonb_build_object('id',r.id,'token',r.recovery_token,'expiresAt',r.expires_at);
end;
$$;


ALTER FUNCTION "public"."upsert_checkout_recovery_intent_v2"("p_instance_id" "uuid", "p_user_id" "uuid", "p_email" "text", "p_cart" "jsonb", "p_checkout" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_control_alert"("p_alert_key" "text", "p_category" "text", "p_alert_type" "text", "p_severity" "text", "p_priority_score" integer, "p_title" "text", "p_description" "text", "p_recommended_action" "text", "p_run_key" "text", "p_order_id" "uuid" DEFAULT NULL::"uuid", "p_customer_id" "uuid" DEFAULT NULL::"uuid", "p_reseller_id" "uuid" DEFAULT NULL::"uuid", "p_variant_id" "uuid" DEFAULT NULL::"uuid", "p_opportunity_id" "uuid" DEFAULT NULL::"uuid", "p_evidence" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "public"."control_alerts"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ declare a public.control_alerts;v_old_status text;v_old_severity text;v_new_status text;v_event_type text;v_old_rank integer;v_new_rank integer; begin if nullif(trim(p_alert_key),'') is null or nullif(trim(p_run_key),'') is null then raise exception 'alert_key_and_run_key_required'; end if; if p_category not in ('operations','inventory','service','commercial','customer','system') then raise exception 'invalid_alert_category'; end if; if p_severity not in ('info','warning','high','critical') then raise exception 'invalid_alert_severity'; end if; perform pg_advisory_xact_lock(hashtextextended('control-alert-key:'||p_alert_key,0)); select * into a from public.control_alerts where alert_key=p_alert_key for update; if not found then insert into public.control_alerts(alert_key,category,alert_type,severity,priority_score,title,description,recommended_action,order_id,customer_id,reseller_id,variant_id,opportunity_id,evidence) values(p_alert_key,p_category,p_alert_type,p_severity,greatest(0,least(100,p_priority_score)),p_title,p_description,p_recommended_action,p_order_id,p_customer_id,p_reseller_id,p_variant_id,p_opportunity_id,coalesce(p_evidence,'{}'::jsonb)||jsonb_build_object('source','v13_detector','detector_run_key',p_run_key)) returning * into a; insert into public.control_alert_events(event_key,alert_id,event_type,to_status,metadata) values('detect:'||p_run_key||':'||p_alert_key,a.id,'detected','open',jsonb_build_object('severity',p_severity,'priority_score',p_priority_score)); return a; end if; v_old_status:=a.status;v_old_severity:=a.severity; v_old_rank:=case a.severity when 'critical' then 4 when 'high' then 3 when 'warning' then 2 else 1 end; v_new_rank:=case p_severity when 'critical' then 4 when 'high' then 3 when 'warning' then 2 else 1 end; v_new_status:=a.status; if a.status='resolved' then v_new_status:='open'; elsif a.status='snoozed' and a.snoozed_until is not null and a.snoozed_until<=now() then v_new_status:='open'; elsif a.status='dismissed' and v_new_rank>v_old_rank then v_new_status:='open'; end if; update public.control_alerts set category=p_category,alert_type=p_alert_type,severity=p_severity,priority_score=greatest(0,least(100,p_priority_score)),title=p_title,description=p_description,recommended_action=p_recommended_action,order_id=coalesce(p_order_id,order_id),customer_id=coalesce(p_customer_id,customer_id),reseller_id=coalesce(p_reseller_id,reseller_id),variant_id=coalesce(p_variant_id,variant_id),opportunity_id=coalesce(p_opportunity_id,opportunity_id),evidence=coalesce(p_evidence,'{}'::jsonb)||jsonb_build_object('source','v13_detector','detector_run_key',p_run_key),occurrence_count=occurrence_count+1,last_detected_at=now(),status=v_new_status,snoozed_until=case when v_new_status='open' then null else snoozed_until end,resolved_at=case when v_new_status='open' then null else resolved_at end,resolved_by=case when v_new_status='open' then null else resolved_by end,dismissed_at=case when v_new_status='open' then null else dismissed_at end,dismissed_by=case when v_new_status='open' then null else dismissed_by end,updated_at=now() where id=a.id returning * into a; v_event_type:=case when v_old_status<>v_new_status and v_new_status='open' then 'reopened' else 'redetected' end; insert into public.control_alert_events(event_key,alert_id,event_type,from_status,to_status,metadata) values('detect:'||p_run_key||':'||p_alert_key,a.id,v_event_type,v_old_status,v_new_status,jsonb_build_object('old_severity',v_old_severity,'severity',p_severity,'priority_score',p_priority_score)) on conflict(event_key) do nothing; return a; end;$$;


ALTER FUNCTION "public"."upsert_control_alert"("p_alert_key" "text", "p_category" "text", "p_alert_type" "text", "p_severity" "text", "p_priority_score" integer, "p_title" "text", "p_description" "text", "p_recommended_action" "text", "p_run_key" "text", "p_order_id" "uuid", "p_customer_id" "uuid", "p_reseller_id" "uuid", "p_variant_id" "uuid", "p_opportunity_id" "uuid", "p_evidence" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_benefit_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "usage_key" "text" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "rule_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "benefit_snapshot" "jsonb" NOT NULL,
    "used_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL
);


ALTER TABLE "public"."loyalty_benefit_usage" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."use_discount_loyalty_benefit"("p_customer_id" "uuid", "p_rule_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_usage_key" "text", "p_order_id" "uuid" DEFAULT NULL::"uuid") RETURNS "public"."loyalty_benefit_usage"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare r public.loyalty_benefit_rules;p public.customer_value_profiles;v_uses integer;v_order_total integer;v_preview jsonb;v_row public.loyalty_benefit_usage;begin
 if p_quantity<=0 then raise exception 'A mennyiség pozitív kell legyen.'; end if;
 if nullif(trim(p_usage_key),'') is null then raise exception 'A használati kulcs kötelező.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_customer_id::text||':'||p_rule_id::text,0));
 select * into v_row from public.loyalty_benefit_usage where usage_key=p_usage_key;
 if found then
   if v_row.customer_id<>p_customer_id or v_row.rule_id<>p_rule_id or coalesce(v_row.order_id,'00000000-0000-0000-0000-000000000000'::uuid)<>coalesce(p_order_id,'00000000-0000-0000-0000-000000000000'::uuid)
      or coalesce(v_row.benefit_snapshot->>'variant_id','')<>p_variant_id::text
      or coalesce((v_row.benefit_snapshot->>'quantity')::integer,0)<>p_quantity then
     raise exception 'A használati kulcs már más kedvezményes benefit-művelethez tartozik.';
   end if;
   return v_row;
 end if;
 select * into r from public.loyalty_benefit_rules where id=p_rule_id;
 if not found or not r.active or r.benefit_type<>'discount_percent' then raise exception 'Nem használható kedvezményes előny.'; end if;
 if r.benefit_value is null or r.benefit_value<=0 or r.benefit_value>100 then raise exception 'Érvénytelen kedvezményérték.'; end if;
 if r.minimum_margin_percent is null then raise exception 'A kedvezményes előnyhöz minimum margin kötelező.'; end if;
 if r.valid_from is not null and r.valid_from>now() then raise exception 'Az előny még nem érvényes.'; end if;
 if r.valid_until is not null and r.valid_until<=now() then raise exception 'Az előny lejárt.'; end if;
 select * into p from public.customer_value_profiles where customer_id=p_customer_id;
 if not found or p.value_tier<>r.value_tier then raise exception 'Az ügyfél nem jogosult erre az előnyre.'; end if;
 select count(*)::integer into v_uses from public.loyalty_benefit_usage where customer_id=p_customer_id and rule_id=p_rule_id;
 if r.max_uses_per_customer is not null and v_uses>=r.max_uses_per_customer then raise exception 'Az előny felhasználási limitje elfogyott.'; end if;
 if p_order_id is not null then
   select total_gross_huf into v_order_total from public.orders where id=p_order_id and customer_id=p_customer_id;
   if not found then raise exception 'A rendelés nem ehhez az ügyfélhez tartozik.'; end if;
   if v_order_total<r.min_order_gross_huf then raise exception 'A rendelés értéke nem éri el az előny minimumát.'; end if;
 elsif r.min_order_gross_huf>0 then raise exception 'Ehhez az előnyhöz rendelés szükséges.'; end if;
 select public.preview_promotion_margin(p_variant_id,r.benefit_value,r.minimum_margin_percent) into v_preview;
 if coalesce((v_preview->>'safe')::boolean,false) is not true then raise exception 'A kedvezmény nem teljesíti a margin-védelmet.'; end if;
 insert into public.loyalty_benefit_usage(usage_key,customer_id,rule_id,order_id,benefit_snapshot)
 values(p_usage_key,p_customer_id,p_rule_id,p_order_id,jsonb_build_object('rule_key',r.rule_key,'value_tier',r.value_tier,'benefit_type',r.benefit_type,'benefit_value',r.benefit_value,'minimum_margin_percent',r.minimum_margin_percent,'variant_id',p_variant_id,'quantity',p_quantity,'margin_preview',v_preview)) returning * into v_row;
 return v_row;
end;$$;


ALTER FUNCTION "public"."use_discount_loyalty_benefit"("p_customer_id" "uuid", "p_rule_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_usage_key" "text", "p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."use_loyalty_benefit"("p_customer_id" "uuid", "p_rule_id" "uuid", "p_usage_key" "text", "p_order_id" "uuid" DEFAULT NULL::"uuid") RETURNS "public"."loyalty_benefit_usage"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare r public.loyalty_benefit_rules;p public.customer_value_profiles;v_uses integer;v_order_total integer;v_row public.loyalty_benefit_usage;begin
 if nullif(trim(p_usage_key),'') is null then raise exception 'A használati kulcs kötelező.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_customer_id::text||':'||p_rule_id::text,0));
 select * into v_row from public.loyalty_benefit_usage where usage_key=p_usage_key;
 if found then
   if v_row.customer_id<>p_customer_id or v_row.rule_id<>p_rule_id or coalesce(v_row.order_id,'00000000-0000-0000-0000-000000000000'::uuid)<>coalesce(p_order_id,'00000000-0000-0000-0000-000000000000'::uuid) then
     raise exception 'A használati kulcs már más benefit-művelethez tartozik.';
   end if;
   return v_row;
 end if;
 select * into r from public.loyalty_benefit_rules where id=p_rule_id;
 if not found or not r.active then raise exception 'Az előny nem aktív.'; end if;
 if r.valid_from is not null and r.valid_from>now() then raise exception 'Az előny még nem érvényes.'; end if;
 if r.valid_until is not null and r.valid_until<=now() then raise exception 'Az előny lejárt.'; end if;
 if r.benefit_type='discount_percent' then raise exception 'A százalékos kedvezmény csak margin-ellenőrzött benefit-függvényen keresztül használható.'; end if;
 select * into p from public.customer_value_profiles where customer_id=p_customer_id;
 if not found or p.value_tier<>r.value_tier then raise exception 'Az ügyfél nem jogosult erre az előnyre.'; end if;
 select count(*)::integer into v_uses from public.loyalty_benefit_usage where customer_id=p_customer_id and rule_id=p_rule_id;
 if r.max_uses_per_customer is not null and v_uses>=r.max_uses_per_customer then raise exception 'Az előny felhasználási limitje elfogyott.'; end if;
 if p_order_id is not null then
   select total_gross_huf into v_order_total from public.orders where id=p_order_id and customer_id=p_customer_id;
   if not found then raise exception 'A rendelés nem ehhez az ügyfélhez tartozik.'; end if;
   if v_order_total<r.min_order_gross_huf then raise exception 'A rendelés értéke nem éri el az előny minimumát.'; end if;
 elsif r.min_order_gross_huf>0 then raise exception 'Ehhez az előnyhöz rendelés szükséges.'; end if;
 insert into public.loyalty_benefit_usage(usage_key,customer_id,rule_id,order_id,benefit_snapshot)
 values(p_usage_key,p_customer_id,p_rule_id,p_order_id,jsonb_build_object('rule_key',r.rule_key,'value_tier',r.value_tier,'benefit_type',r.benefit_type,'benefit_value',r.benefit_value,'minimum_margin_percent',r.minimum_margin_percent,'min_order_gross_huf',r.min_order_gross_huf)) returning * into v_row;
 return v_row;
end;$$;


ALTER FUNCTION "public"."use_loyalty_benefit"("p_customer_id" "uuid", "p_rule_id" "uuid", "p_usage_key" "text", "p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_refund_total"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_order_total integer;
  v_other_refunded integer;
begin
  select total_gross_huf into v_order_total
  from public.orders
  where id=new.order_id and instance_id=new.instance_id;

  if not found then
    raise exception 'Cross-store refund relation is not allowed.';
  end if;

  if new.refund_amount_gross_huf is not null
     and new.refund_amount_gross_huf>coalesce(v_order_total,0) then
    raise exception 'A visszatérítés nem lehet nagyobb a rendelés értékénél.';
  end if;

  if new.status='refunded' then
    if new.refund_amount_gross_huf is null then
      raise exception 'A visszatérített állapothoz visszatérítési összeg szükséges.';
    end if;
    select coalesce(sum(refund_amount_gross_huf),0) into v_other_refunded
    from public.return_cases
    where instance_id=new.instance_id
      and order_id=new.order_id
      and status='refunded'
      and id<>new.id;

    if v_other_refunded+new.refund_amount_gross_huf>coalesce(v_order_total,0) then
      raise exception 'A visszatérítések összege meghaladná a rendelés teljes értékét.';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_refund_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_return_case_item_quantity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_order_item record;
  v_case record;
  v_already integer;
begin
  select id,instance_id,order_id,quantity into v_order_item
  from public.order_items
  where id=new.order_item_id and instance_id=new.instance_id;
  if not found then raise exception 'A rendelési tétel nem található ebben a webshopban.'; end if;

  select id,instance_id,order_id,status into v_case
  from public.return_cases
  where id=new.return_case_id and instance_id=new.instance_id;
  if not found then raise exception 'A visszáru ügy nem található ebben a webshopban.'; end if;

  if v_case.order_id<>v_order_item.order_id then
    raise exception 'A visszáru tétel nem ehhez a rendeléshez tartozik.';
  end if;

  select coalesce(sum(rci.quantity),0) into v_already
  from public.return_case_items rci
  join public.return_cases rc
    on rc.id=rci.return_case_id
   and rc.instance_id=rci.instance_id
  where rci.instance_id=new.instance_id
    and rci.order_item_id=new.order_item_id
    and rc.status<>'rejected'
    and (tg_op='INSERT' or rci.id<>new.id);

  if v_already+new.quantity>v_order_item.quantity then
    raise exception 'A visszaküldött összmennyiség meghaladná a megvásárolt mennyiséget.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_return_case_item_quantity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_admin_audit_chain"("p_instance_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("audit_scope" "text", "entries" bigint, "invalid_links" bigint, "invalid_hashes" bigint, "valid" boolean)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'extensions'
    AS $$
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


ALTER FUNCTION "public"."verify_admin_audit_chain"("p_instance_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."verify_admin_audit_chain"("p_instance_id" "uuid") IS 'Verifies visible audit-chain links and hashes; RLS applies because the function is security invoker.';



CREATE TABLE IF NOT EXISTS "private"."platform_owner_claims" (
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "claimed_at" timestamp with time zone,
    "claimed_by_user_id" "uuid",
    CONSTRAINT "platform_owner_claims_normalized_email_check" CHECK (("email" = "lower"(TRIM(BOTH FROM "email"))))
);


ALTER TABLE "private"."platform_owner_claims" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."stock_notification_rate_limits" (
    "id" bigint NOT NULL,
    "email" "text" NOT NULL,
    "ip" "text" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "private"."stock_notification_rate_limits" OWNER TO "postgres";


ALTER TABLE "private"."stock_notification_rate_limits" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "private"."stock_notification_rate_limits_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."action_approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "proposal_id" "uuid" NOT NULL,
    "slot" integer NOT NULL,
    "approver_id" "uuid" NOT NULL,
    "decision" "text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "action_approvals_decision_check" CHECK (("decision" = ANY (ARRAY['approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "action_approvals_slot_check" CHECK (("slot" = ANY (ARRAY[1, 2])))
);


ALTER TABLE "public"."action_approvals" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."action_center_kpis" WITH ("security_invoker"='true') AS
 SELECT ("count"(*))::integer AS "active_proposals",
    ("count"(*) FILTER (WHERE ("status" = 'proposed'::"text")))::integer AS "proposed_count",
    ("count"(*) FILTER (WHERE ("status" = 'simulated'::"text")))::integer AS "simulated_count",
    ("count"(*) FILTER (WHERE ("status" = 'approved'::"text")))::integer AS "approved_count",
    ("count"(*) FILTER (WHERE ("impact_class" = 'high_impact'::"text")))::integer AS "high_impact_count",
    ("count"(*) FILTER (WHERE ("expires_at" < ("now"() + '04:00:00'::interval))))::integer AS "expiring_soon_count",
    ("count"(*) FILTER (WHERE "public"."action_proposal_is_stale"("id")))::integer AS "stale_count"
   FROM "public"."action_proposals"
  WHERE ("status" = ANY (ARRAY['proposed'::"text", 'simulated'::"text", 'approved'::"text"]));


ALTER VIEW "public"."action_center_kpis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."action_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "policy_key" "text" NOT NULL,
    "version" integer NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "alert_type" "text",
    "min_severity" "text" DEFAULT 'warning'::"text" NOT NULL,
    "action_kind" "text" NOT NULL,
    "impact_class" "text" NOT NULL,
    "approval_mode" "text" DEFAULT 'single'::"text" NOT NULL,
    "expires_after_hours" integer DEFAULT 48 NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "action_template" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "conditions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid",
    CONSTRAINT "action_policies_action_kind_check" CHECK (("action_kind" = ANY (ARRAY['human_task'::"text", 'notify_admin'::"text", 'record_decision'::"text"]))),
    CONSTRAINT "action_policies_approval_mode_check" CHECK (("approval_mode" = ANY (ARRAY['none'::"text", 'single'::"text", 'dual'::"text"]))),
    CONSTRAINT "action_policies_category_check" CHECK (("category" = ANY (ARRAY['operations'::"text", 'inventory'::"text", 'service'::"text", 'commercial'::"text", 'customer'::"text", 'system'::"text"]))),
    CONSTRAINT "action_policies_check" CHECK ((NOT (("impact_class" = 'high_impact'::"text") AND ("approval_mode" = 'none'::"text")))),
    CONSTRAINT "action_policies_expires_after_hours_check" CHECK ((("expires_after_hours" >= 1) AND ("expires_after_hours" <= 720))),
    CONSTRAINT "action_policies_impact_class_check" CHECK (("impact_class" = ANY (ARRAY['advisory'::"text", 'reversible'::"text", 'high_impact'::"text"]))),
    CONSTRAINT "action_policies_min_severity_check" CHECK (("min_severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "action_policies_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."action_policies" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."action_center_queue" WITH ("security_invoker"='true') AS
 SELECT "p"."id" AS "proposal_id",
    "p"."proposal_key",
    "p"."status",
    "p"."action_kind",
    "p"."impact_class",
    "p"."risk_score",
    "p"."rationale",
    "p"."expires_at",
    "p"."simulated_at",
    "p"."approved_at",
    "p"."executed_at",
    "a"."id" AS "alert_id",
    "a"."alert_key",
    "a"."category",
    "a"."alert_type",
    "a"."severity",
    "a"."priority_score" AS "alert_priority",
    "a"."title" AS "alert_title",
    "a"."status" AS "alert_status",
    "pol"."policy_key",
    "pol"."version" AS "policy_version",
    "pol"."name" AS "policy_name",
    "pol"."approval_mode",
    (( SELECT "count"(*) AS "count"
           FROM "public"."action_approvals" "x"
          WHERE (("x"."proposal_id" = "p"."id") AND ("x"."decision" = 'approved'::"text"))))::integer AS "approval_count",
    "public"."action_proposal_is_stale"("p"."id") AS "simulation_stale"
   FROM (("public"."action_proposals" "p"
     JOIN "public"."control_alerts" "a" ON (("a"."id" = "p"."alert_id")))
     JOIN "public"."action_policies" "pol" ON (("pol"."id" = "p"."policy_id")))
  WHERE ("p"."status" = ANY (ARRAY['proposed'::"text", 'simulated'::"text", 'approved'::"text"]));


ALTER VIEW "public"."action_center_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."action_proposal_events" (
    "id" bigint NOT NULL,
    "event_key" "text" NOT NULL,
    "proposal_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "from_status" "text",
    "to_status" "text",
    "actor_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "action_proposal_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['proposed'::"text", 'simulated'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text", 'executed'::"text", 'cancelled'::"text", 'approval_added'::"text", 'simulation_invalidated'::"text"])))
);


ALTER TABLE "public"."action_proposal_events" OWNER TO "postgres";


ALTER TABLE "public"."action_proposal_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."action_proposal_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."customer_value_profiles" (
    "customer_id" "uuid" NOT NULL,
    "email_key" "text",
    "paid_orders" integer DEFAULT 0 NOT NULL,
    "revenue_gross_huf" bigint DEFAULT 0 NOT NULL,
    "aov_gross_huf" integer DEFAULT 0 NOT NULL,
    "days_since_last_order" integer,
    "lifecycle_segment" "text" DEFAULT 'new'::"text" NOT NULL,
    "value_score" integer DEFAULT 0 NOT NULL,
    "value_tier" "text" DEFAULT 'standard'::"text" NOT NULL,
    "first_order_at" timestamp with time zone,
    "last_order_at" timestamp with time zone,
    "recalculated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "customer_value_profiles_aov_gross_huf_check" CHECK (("aov_gross_huf" >= 0)),
    CONSTRAINT "customer_value_profiles_paid_orders_check" CHECK (("paid_orders" >= 0)),
    CONSTRAINT "customer_value_profiles_revenue_gross_huf_check" CHECK (("revenue_gross_huf" >= 0)),
    CONSTRAINT "customer_value_profiles_value_score_check" CHECK ((("value_score" >= 0) AND ("value_score" <= 100))),
    CONSTRAINT "customer_value_profiles_value_tier_check" CHECK (("value_tier" = ANY (ARRAY['standard'::"text", 'silver'::"text", 'gold'::"text", 'platinum'::"text"])))
);


ALTER TABLE "public"."customer_value_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_benefit_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rule_key" "text" NOT NULL,
    "value_tier" "text" NOT NULL,
    "benefit_type" "text" NOT NULL,
    "benefit_value" numeric(12,2),
    "min_order_gross_huf" integer DEFAULT 0 NOT NULL,
    "max_uses_per_customer" integer,
    "minimum_margin_percent" numeric(5,2),
    "active" boolean DEFAULT true NOT NULL,
    "valid_from" timestamp with time zone,
    "valid_until" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "loyalty_benefit_rules_benefit_type_check" CHECK (("benefit_type" = ANY (ARRAY['points_multiplier'::"text", 'fixed_points'::"text", 'discount_percent'::"text", 'free_shipping'::"text", 'manual_review'::"text"]))),
    CONSTRAINT "loyalty_benefit_rules_check" CHECK ((("valid_until" IS NULL) OR ("valid_from" IS NULL) OR ("valid_until" > "valid_from"))),
    CONSTRAINT "loyalty_benefit_rules_max_uses_per_customer_check" CHECK ((("max_uses_per_customer" IS NULL) OR ("max_uses_per_customer" > 0))),
    CONSTRAINT "loyalty_benefit_rules_min_order_gross_huf_check" CHECK (("min_order_gross_huf" >= 0)),
    CONSTRAINT "loyalty_benefit_rules_minimum_margin_percent_check" CHECK ((("minimum_margin_percent" IS NULL) OR (("minimum_margin_percent" >= (0)::numeric) AND ("minimum_margin_percent" <= (100)::numeric)))),
    CONSTRAINT "loyalty_benefit_rules_value_tier_check" CHECK (("value_tier" = ANY (ARRAY['standard'::"text", 'silver'::"text", 'gold'::"text", 'platinum'::"text"])))
);


ALTER TABLE "public"."loyalty_benefit_rules" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."active_customer_benefits" WITH ("security_invoker"='true') AS
 SELECT "p"."customer_id",
    "p"."value_tier",
    "r"."id" AS "rule_id",
    "r"."rule_key",
    "r"."benefit_type",
    "r"."benefit_value",
    "r"."min_order_gross_huf",
    "r"."max_uses_per_customer",
    "r"."minimum_margin_percent",
    "r"."metadata",
    COALESCE("u"."use_count", 0) AS "use_count",
        CASE
            WHEN ("r"."max_uses_per_customer" IS NULL) THEN true
            ELSE (COALESCE("u"."use_count", 0) < "r"."max_uses_per_customer")
        END AS "usage_available",
    "p"."instance_id"
   FROM (("public"."customer_value_profiles" "p"
     JOIN "public"."loyalty_benefit_rules" "r" ON ((("r"."instance_id" = "p"."instance_id") AND ("r"."value_tier" = "p"."value_tier") AND ("r"."active" = true))))
     LEFT JOIN LATERAL ( SELECT ("count"(*))::integer AS "use_count"
           FROM "public"."loyalty_benefit_usage" "x"
          WHERE (("x"."instance_id" = "p"."instance_id") AND ("x"."customer_id" = "p"."customer_id") AND ("x"."rule_id" = "r"."id"))) "u" ON (true))
  WHERE ((("r"."valid_from" IS NULL) OR ("r"."valid_from" <= "now"())) AND (("r"."valid_until" IS NULL) OR ("r"."valid_until" > "now"())));


ALTER VIEW "public"."active_customer_benefits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text",
    "summary" "text" NOT NULL,
    "before_state" "jsonb",
    "after_state" "jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" "uuid",
    "instance_id" "uuid",
    "actor_roles" "text"[] NOT NULL,
    "audit_scope" "text" NOT NULL,
    "chain_seq" bigint NOT NULL,
    "prev_hash" "text",
    "entry_hash" "text" NOT NULL
);


ALTER TABLE "public"."admin_audit_log" OWNER TO "postgres";


COMMENT ON COLUMN "public"."admin_audit_log"."entry_hash" IS 'SHA-256 hash over the canonical audit entry and previous hash.';



CREATE SEQUENCE IF NOT EXISTS "public"."admin_audit_chain_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."admin_audit_chain_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."admin_audit_chain_seq" OWNED BY "public"."admin_audit_log"."chain_seq";



CREATE TABLE IF NOT EXISTS "public"."assurance_controls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "control_key" "text" NOT NULL,
    "version" integer NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "severity" "text" DEFAULT 'warning'::"text" NOT NULL,
    "weight" integer DEFAULT 10 NOT NULL,
    "freshness_minutes" integer DEFAULT 60 NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "check_kind" "text" NOT NULL,
    "definition" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "assurance_controls_category_check" CHECK (("category" = ANY (ARRAY['control'::"text", 'action'::"text", 'automation'::"text", 'security'::"text", 'operations'::"text", 'system'::"text"]))),
    CONSTRAINT "assurance_controls_check_kind_check" CHECK (("check_kind" = ANY (ARRAY['sql_invariant'::"text", 'freshness'::"text", 'queue_health'::"text", 'governance'::"text"]))),
    CONSTRAINT "assurance_controls_freshness_minutes_check" CHECK ((("freshness_minutes" >= 5) AND ("freshness_minutes" <= 10080))),
    CONSTRAINT "assurance_controls_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "assurance_controls_version_check" CHECK (("version" > 0)),
    CONSTRAINT "assurance_controls_weight_check" CHECK ((("weight" >= 1) AND ("weight" <= 100)))
);


ALTER TABLE "public"."assurance_controls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assurance_events" (
    "id" bigint NOT NULL,
    "event_key" "text" NOT NULL,
    "finding_id" "uuid",
    "run_id" "uuid",
    "event_type" "text" NOT NULL,
    "actor_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "assurance_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['detected'::"text", 'redetected'::"text", 'acknowledged'::"text", 'resolved'::"text", 'reopened'::"text", 'risk_accepted'::"text", 'risk_expired'::"text", 'run_completed'::"text", 'run_failed'::"text"])))
);


ALTER TABLE "public"."assurance_events" OWNER TO "postgres";


ALTER TABLE "public"."assurance_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."assurance_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."assurance_evidence" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "evidence_key" "text" NOT NULL,
    "run_id" "uuid" NOT NULL,
    "control_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "subject_key" "text" DEFAULT 'global'::"text" NOT NULL,
    "evidence" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "evidence_hash" "text" NOT NULL,
    "source_observed_at" timestamp with time zone,
    "captured_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "assurance_evidence_status_check" CHECK (("status" = ANY (ARRAY['pass'::"text", 'fail'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."assurance_evidence" OWNER TO "postgres";


COMMENT ON TABLE "public"."assurance_evidence" IS 'Append-only V16 evidence snapshots proving control outcomes without mutating commerce state.';



CREATE OR REPLACE VIEW "public"."assurance_finding_queue" WITH ("security_invoker"='true') AS
 SELECT "f"."id" AS "finding_id",
    "f"."finding_key",
    "f"."status",
    "f"."severity",
    "f"."title",
    "f"."description",
    "f"."occurrence_count",
    "f"."first_detected_at",
    "f"."incident_started_at",
    "f"."last_detected_at",
    "round"((EXTRACT(epoch FROM ("now"() - "f"."incident_started_at")) / (3600)::numeric), 1) AS "age_hours",
    "f"."accepted_risk_reason",
    "f"."accepted_risk_expires_at",
    "c"."control_key",
    "c"."version" AS "control_version",
    "c"."name" AS "control_name",
    "c"."category",
    "c"."weight",
    "e"."evidence",
    "e"."evidence_hash",
    "e"."captured_at" AS "evidence_captured_at"
   FROM (("public"."assurance_findings" "f"
     JOIN "public"."assurance_controls" "c" ON (("c"."id" = "f"."control_id")))
     LEFT JOIN "public"."assurance_evidence" "e" ON (("e"."id" = "f"."last_evidence_id")))
  WHERE ("f"."status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text", 'accepted_risk'::"text"]));


ALTER VIEW "public"."assurance_finding_queue" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."assurance_latest_control_results" WITH ("security_invoker"='true') AS
 SELECT DISTINCT ON ("c"."control_key") "c"."control_key",
    "c"."version",
    "c"."name",
    "c"."category",
    "c"."severity",
    "c"."weight",
    "c"."freshness_minutes",
    "e"."status",
    "e"."captured_at",
    "e"."source_observed_at",
    "e"."evidence",
    "e"."evidence_hash",
        CASE
            WHEN (("e"."captured_at" IS NULL) OR ("e"."captured_at" < ("now"() - "make_interval"("mins" => "c"."freshness_minutes")))) THEN true
            ELSE false
        END AS "stale"
   FROM ("public"."assurance_controls" "c"
     LEFT JOIN "public"."assurance_evidence" "e" ON (("e"."control_id" = "c"."id")))
  WHERE "c"."enabled"
  ORDER BY "c"."control_key", "c"."version" DESC, "e"."captured_at" DESC NULLS LAST;


ALTER VIEW "public"."assurance_latest_control_results" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."assurance_readiness" WITH ("security_invoker"='true') AS
 WITH "latest" AS (
         SELECT "assurance_latest_control_results"."control_key",
            "assurance_latest_control_results"."version",
            "assurance_latest_control_results"."name",
            "assurance_latest_control_results"."category",
            "assurance_latest_control_results"."severity",
            "assurance_latest_control_results"."weight",
            "assurance_latest_control_results"."freshness_minutes",
            "assurance_latest_control_results"."status",
            "assurance_latest_control_results"."captured_at",
            "assurance_latest_control_results"."source_observed_at",
            "assurance_latest_control_results"."evidence",
            "assurance_latest_control_results"."evidence_hash",
            "assurance_latest_control_results"."stale"
           FROM "public"."assurance_latest_control_results"
        ), "score" AS (
         SELECT COALESCE("sum"("latest"."weight"), (0)::bigint) AS "total_weight",
            COALESCE("sum"("latest"."weight") FILTER (WHERE (("latest"."status" = 'pass'::"text") AND (NOT "latest"."stale"))), (0)::bigint) AS "passed_weight",
            ("count"(*))::integer AS "controls",
            ("count"(*) FILTER (WHERE (("latest"."status" = 'pass'::"text") AND (NOT "latest"."stale"))))::integer AS "fresh_passes",
            ("count"(*) FILTER (WHERE "latest"."stale"))::integer AS "stale_controls",
            ("count"(*) FILTER (WHERE ("latest"."status" = ANY (ARRAY['fail'::"text", 'error'::"text"]))))::integer AS "failing_controls"
           FROM "latest"
        ), "findings" AS (
         SELECT ("count"(*) FILTER (WHERE (("assurance_findings"."status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text"])) AND ("assurance_findings"."severity" = 'critical'::"text"))))::integer AS "critical_open",
            ("count"(*) FILTER (WHERE (("assurance_findings"."status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text"])) AND ("assurance_findings"."severity" = 'high'::"text"))))::integer AS "high_open",
            ("count"(*) FILTER (WHERE ("assurance_findings"."status" = 'accepted_risk'::"text")))::integer AS "accepted_risks"
           FROM "public"."assurance_findings"
        )
 SELECT (
        CASE
            WHEN ("score"."total_weight" = 0) THEN (0)::numeric
            ELSE "round"(((100.0 * ("score"."passed_weight")::numeric) / ("score"."total_weight")::numeric))
        END)::integer AS "assurance_score",
    "score"."controls",
    "score"."fresh_passes",
    "score"."stale_controls",
    "score"."failing_controls",
    "findings"."critical_open",
    "findings"."high_open",
    "findings"."accepted_risks",
        CASE
            WHEN (("findings"."critical_open" > 0) OR (EXISTS ( SELECT 1
               FROM "latest"
              WHERE (("latest"."status" = ANY (ARRAY['fail'::"text", 'error'::"text"])) AND ("latest"."severity" = 'critical'::"text"))))) THEN 'blocked'::"text"
            WHEN (("score"."stale_controls" > 0) OR ("score"."failing_controls" > 0) OR ("findings"."high_open" > 0)) THEN 'degraded'::"text"
            WHEN ("score"."total_weight" = 0) THEN 'unknown'::"text"
            ELSE 'ready'::"text"
        END AS "readiness_status"
   FROM ("score"
     CROSS JOIN "findings");


ALTER VIEW "public"."assurance_readiness" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."assurance_recent_runs" WITH ("security_invoker"='true') AS
 SELECT "id",
    "run_key",
    "status",
    "started_at",
    "completed_at",
    "controls_checked",
    "controls_passed",
    "controls_failed",
    "md5"(COALESCE(( SELECT "string_agg"("e"."evidence_hash", '|'::"text" ORDER BY ("e"."control_id")::"text", "e"."evidence_key") AS "string_agg"
           FROM "public"."assurance_evidence" "e"
          WHERE ("e"."run_id" = "r"."id")), ''::"text")) AS "evidence_bundle_hash"
   FROM "public"."assurance_runs" "r"
  ORDER BY "started_at" DESC;


ALTER VIEW "public"."assurance_recent_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automation_control_events" (
    "id" bigint NOT NULL,
    "event_key" "text" NOT NULL,
    "paused" boolean NOT NULL,
    "actor_id" "uuid",
    "reason" "text",
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL
);


ALTER TABLE "public"."automation_control_events" OWNER TO "postgres";


ALTER TABLE "public"."automation_control_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."automation_control_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."automation_events" (
    "id" bigint NOT NULL,
    "event_key" "text" NOT NULL,
    "instance_id" "uuid" NOT NULL,
    "step_run_id" "uuid",
    "event_type" "text" NOT NULL,
    "actor_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "store_instance_id" "uuid" NOT NULL
);


ALTER TABLE "public"."automation_events" OWNER TO "postgres";


ALTER TABLE "public"."automation_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."automation_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."automation_health" WITH ("security_invoker"='true') AS
 SELECT "global_paused",
    "pause_reason",
    "consecutive_failures",
    "circuit_open_until",
        CASE
            WHEN "global_paused" THEN 'paused'::"text"
            WHEN ("circuit_open_until" > "now"()) THEN 'circuit_open'::"text"
            WHEN ("consecutive_failures" >= 3) THEN 'degraded'::"text"
            ELSE 'healthy'::"text"
        END AS "health_status",
    ( SELECT "max"("automation_processing_runs"."completed_at") AS "max"
           FROM "public"."automation_processing_runs") AS "last_cycle_at"
   FROM "public"."automation_control" "c"
  WHERE ("singleton" = true);


ALTER VIEW "public"."automation_health" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."automation_runbook_queue" AS
SELECT
    NULL::"uuid" AS "instance_id",
    NULL::"text" AS "instance_key",
    NULL::"text" AS "status",
    NULL::integer AS "escalation_level",
    NULL::integer AS "failure_count",
    NULL::timestamp with time zone AS "deadline_at",
    NULL::timestamp with time zone AS "started_at",
    NULL::timestamp with time zone AS "created_at",
    NULL::"text" AS "runbook_key",
    NULL::integer AS "runbook_version",
    NULL::"text" AS "runbook_name",
    NULL::"text" AS "category",
    NULL::"text" AS "risk_class",
    NULL::boolean AS "requires_action_approval",
    NULL::integer AS "max_failures",
    NULL::"uuid" AS "alert_id",
    NULL::"text" AS "alert_title",
    NULL::"text" AS "severity",
    NULL::integer AS "priority_score",
    NULL::"text" AS "alert_status",
    NULL::"uuid" AS "proposal_id",
    NULL::"text" AS "proposal_status",
    NULL::bigint AS "total_steps",
    NULL::bigint AS "succeeded_steps",
    NULL::bigint AS "failed_steps",
    NULL::bigint AS "executable_steps",
    NULL::numeric AS "age_hours",
    NULL::boolean AS "overdue";


ALTER VIEW "public"."automation_runbook_queue" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."automation_kpis" WITH ("security_invoker"='true') AS
 SELECT ("count"(*) FILTER (WHERE ("status" = 'planned'::"text")))::integer AS "planned",
    ("count"(*) FILTER (WHERE ("status" = 'active'::"text")))::integer AS "active",
    ("count"(*) FILTER (WHERE ("status" = 'paused'::"text")))::integer AS "paused",
    ("count"(*) FILTER (WHERE ("status" = 'failed'::"text")))::integer AS "failed",
    ("count"(*) FILTER (WHERE "overdue"))::integer AS "overdue",
    ("count"(*) FILTER (WHERE ("escalation_level" > 0)))::integer AS "escalated",
    (COALESCE("sum"("failed_steps"), (0)::numeric))::integer AS "failed_steps",
    COALESCE("avg"("age_hours") FILTER (WHERE ("status" = ANY (ARRAY['planned'::"text", 'active'::"text", 'paused'::"text"]))), (0)::numeric) AS "avg_open_age_hours"
   FROM "public"."automation_runbook_queue";


ALTER VIEW "public"."automation_kpis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automation_runbook_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "runbook_id" "uuid" NOT NULL,
    "step_key" "text" NOT NULL,
    "step_order" integer NOT NULL,
    "name" "text" NOT NULL,
    "action_kind" "text" NOT NULL,
    "timeout_minutes" integer DEFAULT 60 NOT NULL,
    "max_attempts" integer DEFAULT 1 NOT NULL,
    "retry_backoff_minutes" integer DEFAULT 15 NOT NULL,
    "requires_previous_success" boolean DEFAULT true NOT NULL,
    "payload_template" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "automation_runbook_steps_action_kind_check" CHECK (("action_kind" = ANY (ARRAY['human_task'::"text", 'notify_admin'::"text", 'record_decision'::"text"]))),
    CONSTRAINT "automation_runbook_steps_max_attempts_check" CHECK ((("max_attempts" >= 1) AND ("max_attempts" <= 10))),
    CONSTRAINT "automation_runbook_steps_retry_backoff_minutes_check" CHECK ((("retry_backoff_minutes" >= 1) AND ("retry_backoff_minutes" <= 1440))),
    CONSTRAINT "automation_runbook_steps_step_order_check" CHECK (("step_order" > 0)),
    CONSTRAINT "automation_runbook_steps_timeout_minutes_check" CHECK ((("timeout_minutes" >= 1) AND ("timeout_minutes" <= 10080)))
);


ALTER TABLE "public"."automation_runbook_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automation_runbooks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "runbook_key" "text" NOT NULL,
    "version" integer NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "min_severity" "text" DEFAULT 'warning'::"text" NOT NULL,
    "risk_class" "text" DEFAULT 'advisory'::"text" NOT NULL,
    "requires_action_approval" boolean DEFAULT false NOT NULL,
    "max_duration_hours" integer DEFAULT 48 NOT NULL,
    "max_failures" integer DEFAULT 3 NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "definition" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "automation_runbooks_category_check" CHECK (("category" = ANY (ARRAY['operations'::"text", 'inventory'::"text", 'service'::"text", 'commercial'::"text", 'customer'::"text", 'system'::"text"]))),
    CONSTRAINT "automation_runbooks_check" CHECK ((NOT (("risk_class" = 'high_impact'::"text") AND ("requires_action_approval" = false)))),
    CONSTRAINT "automation_runbooks_max_duration_hours_check" CHECK ((("max_duration_hours" >= 1) AND ("max_duration_hours" <= 720))),
    CONSTRAINT "automation_runbooks_max_failures_check" CHECK ((("max_failures" >= 1) AND ("max_failures" <= 20))),
    CONSTRAINT "automation_runbooks_min_severity_check" CHECK (("min_severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "automation_runbooks_risk_class_check" CHECK (("risk_class" = ANY (ARRAY['advisory'::"text", 'controlled'::"text", 'high_impact'::"text"]))),
    CONSTRAINT "automation_runbooks_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."automation_runbooks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checkout_recovery_intents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "cart" "jsonb" NOT NULL,
    "checkout" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "recovery_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "converted_order_id" "uuid",
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "communication_job_id" "uuid",
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "checkout_recovery_intents_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'converted'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."checkout_recovery_intents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."commerce_provider_catalog" (
    "code" "text" NOT NULL,
    "provider_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "connection_mode" "text" DEFAULT 'api'::"text" NOT NULL,
    "adapter_key" "text" NOT NULL,
    "fulfillment_kind" "text",
    "is_available" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_flow" "text",
    CONSTRAINT "commerce_provider_catalog_connection_mode_check" CHECK (("connection_mode" = ANY (ARRAY['builtin'::"text", 'api'::"text", 'manual'::"text", 'custom'::"text"]))),
    CONSTRAINT "commerce_provider_catalog_fulfillment_kind_check" CHECK (("fulfillment_kind" = ANY (ARRAY['parcel_point'::"text", 'home_delivery'::"text", 'pickup'::"text"]))),
    CONSTRAINT "commerce_provider_catalog_payment_flow_check" CHECK ((("payment_flow" IS NULL) OR ("payment_flow" = ANY (ARRAY['online_redirect'::"text", 'bank_transfer'::"text", 'cash_on_delivery'::"text"])))),
    CONSTRAINT "commerce_provider_catalog_provider_type_check" CHECK (("provider_type" = ANY (ARRAY['payment'::"text", 'shipping'::"text", 'invoice'::"text"])))
);


ALTER TABLE "public"."commerce_provider_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."commercial_opportunities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "opportunity_key" "text" NOT NULL,
    "channel" "text" NOT NULL,
    "customer_id" "uuid",
    "customer_email" "text",
    "reseller_id" "uuid",
    "kind" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "priority_score" integer DEFAULT 0 NOT NULL,
    "expected_value_net_huf" numeric(14,2) DEFAULT 0 NOT NULL,
    "probability_percent" numeric(5,2) DEFAULT 25 NOT NULL,
    "due_at" timestamp with time zone,
    "reason" "text" NOT NULL,
    "recommended_action" "text",
    "source" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_at" timestamp with time zone,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "commercial_opportunities_channel_check" CHECK (("channel" = ANY (ARRAY['b2c'::"text", 'b2b'::"text"]))),
    CONSTRAINT "commercial_opportunities_check" CHECK ((("customer_id" IS NOT NULL) OR ("customer_email" IS NOT NULL) OR ("reseller_id" IS NOT NULL))),
    CONSTRAINT "commercial_opportunities_expected_value_net_huf_check" CHECK (("expected_value_net_huf" >= (0)::numeric)),
    CONSTRAINT "commercial_opportunities_kind_check" CHECK (("kind" = ANY (ARRAY['retention'::"text", 'winback'::"text", 'checkout_recovery'::"text", 'reorder'::"text", 'manual'::"text"]))),
    CONSTRAINT "commercial_opportunities_priority_score_check" CHECK ((("priority_score" >= 0) AND ("priority_score" <= 100))),
    CONSTRAINT "commercial_opportunities_probability_percent_check" CHECK ((("probability_percent" >= (0)::numeric) AND ("probability_percent" <= (100)::numeric))),
    CONSTRAINT "commercial_opportunities_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'won'::"text", 'lost'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."commercial_opportunities" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."commercial_conversion_metrics" WITH ("security_invoker"='true') AS
 SELECT "channel",
    "count"(*) AS "total_opportunities",
    "count"(*) FILTER (WHERE ("status" = 'won'::"text")) AS "won_opportunities",
    "count"(*) FILTER (WHERE ("status" = 'lost'::"text")) AS "lost_opportunities",
    "count"(*) FILTER (WHERE ("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text"]))) AS "active_opportunities",
    "round"(((100.0 * ("count"(*) FILTER (WHERE ("status" = 'won'::"text")))::numeric) / (NULLIF("count"(*) FILTER (WHERE ("status" = ANY (ARRAY['won'::"text", 'lost'::"text"]))), 0))::numeric), 2) AS "win_rate_percent",
    COALESCE("sum"("expected_value_net_huf") FILTER (WHERE ("status" = 'won'::"text")), (0)::numeric) AS "won_expected_value_net_huf",
    COALESCE("avg"((EXTRACT(epoch FROM ("closed_at" - "created_at")) / (86400)::numeric)) FILTER (WHERE (("status" = 'won'::"text") AND ("closed_at" IS NOT NULL))), (0)::numeric) AS "avg_days_to_win"
   FROM "public"."commercial_opportunities"
  GROUP BY "channel";


ALTER VIEW "public"."commercial_conversion_metrics" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."commercial_offer_forecast" WITH ("security_invoker"='true') AS
 SELECT "o"."channel",
    "count"("f"."id") FILTER (WHERE ("f"."status" = ANY (ARRAY['approved'::"text", 'sent'::"text"]))) AS "active_offer_count",
    COALESCE("sum"("f"."total_net_huf") FILTER (WHERE ("f"."status" = ANY (ARRAY['approved'::"text", 'sent'::"text"]))), (0)::numeric) AS "active_offer_net_huf",
    COALESCE("sum"((("f"."total_net_huf" * "o"."probability_percent") / (100)::numeric)) FILTER (WHERE ("f"."status" = ANY (ARRAY['approved'::"text", 'sent'::"text"]))), (0)::numeric) AS "weighted_offer_net_huf",
    "count"("f"."id") FILTER (WHERE ("f"."status" = 'accepted'::"text")) AS "accepted_offer_count",
    COALESCE("sum"("f"."total_net_huf") FILTER (WHERE ("f"."status" = 'accepted'::"text")), (0)::numeric) AS "accepted_offer_net_huf"
   FROM ("public"."commercial_opportunities" "o"
     JOIN "public"."commercial_offers" "f" ON (("f"."opportunity_id" = "o"."id")))
  GROUP BY "o"."channel";


ALTER VIEW "public"."commercial_offer_forecast" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."commercial_pipeline_summary" WITH ("security_invoker"='true') AS
 SELECT "channel",
    "count"(*) FILTER (WHERE ("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text"]))) AS "open_count",
    COALESCE("sum"("expected_value_net_huf") FILTER (WHERE ("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text"]))), (0)::numeric) AS "pipeline_net_huf",
    COALESCE("sum"((("expected_value_net_huf" * "probability_percent") / (100)::numeric)) FILTER (WHERE ("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text"]))), (0)::numeric) AS "weighted_pipeline_net_huf",
    COALESCE("sum"("expected_value_net_huf") FILTER (WHERE (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text"])) AND ("due_at" < "now"()))), (0)::numeric) AS "overdue_pipeline_net_huf",
    "count"(*) FILTER (WHERE ("status" = 'won'::"text")) AS "won_count",
    "count"(*) FILTER (WHERE ("status" = 'lost'::"text")) AS "lost_count",
    "instance_id"
   FROM "public"."commercial_opportunities"
  GROUP BY "instance_id", "channel";


ALTER VIEW "public"."commercial_pipeline_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."commercial_executive_forecast" WITH ("security_invoker"='true') AS
 SELECT "p"."channel",
    "p"."open_count",
    "p"."pipeline_net_huf",
    "p"."weighted_pipeline_net_huf",
    "p"."overdue_pipeline_net_huf",
    COALESCE("f"."active_offer_count", (0)::bigint) AS "active_offer_count",
    COALESCE("f"."active_offer_net_huf", (0)::numeric) AS "active_offer_net_huf",
    COALESCE("f"."weighted_offer_net_huf", (0)::numeric) AS "weighted_offer_net_huf",
    COALESCE("f"."accepted_offer_count", (0)::bigint) AS "accepted_offer_count",
    COALESCE("f"."accepted_offer_net_huf", (0)::numeric) AS "accepted_offer_net_huf",
    COALESCE("c"."win_rate_percent", (0)::numeric) AS "historical_win_rate_percent",
    COALESCE("c"."avg_days_to_win", (0)::numeric) AS "avg_days_to_win"
   FROM (("public"."commercial_pipeline_summary" "p"
     LEFT JOIN "public"."commercial_offer_forecast" "f" ON (("f"."channel" = "p"."channel")))
     LEFT JOIN "public"."commercial_conversion_metrics" "c" ON (("c"."channel" = "p"."channel")));


ALTER VIEW "public"."commercial_executive_forecast" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."commercial_pipeline_decision_support" WITH ("security_invoker"='true') AS
 SELECT "channel",
        CASE
            WHEN ("status" <> ALL (ARRAY['open'::"text", 'in_progress'::"text"])) THEN 'closed'::"text"
            WHEN (("due_at" IS NOT NULL) AND ("due_at" < "now"())) THEN 'overdue'::"text"
            WHEN ("created_at" < ("now"() - '30 days'::interval)) THEN '30d_plus'::"text"
            WHEN ("created_at" < ("now"() - '14 days'::interval)) THEN '14_29d'::"text"
            WHEN ("created_at" < ("now"() - '7 days'::interval)) THEN '7_13d'::"text"
            ELSE '0_6d'::"text"
        END AS "aging_bucket",
    "count"(*) AS "opportunity_count",
    COALESCE("sum"("expected_value_net_huf"), (0)::numeric) AS "pipeline_net_huf",
    COALESCE("sum"((("expected_value_net_huf" * "probability_percent") / (100)::numeric)), (0)::numeric) AS "weighted_pipeline_net_huf",
    COALESCE("avg"("priority_score"), (0)::numeric) AS "avg_priority_score"
   FROM "public"."commercial_opportunities" "o"
  GROUP BY "channel",
        CASE
            WHEN ("status" <> ALL (ARRAY['open'::"text", 'in_progress'::"text"])) THEN 'closed'::"text"
            WHEN (("due_at" IS NOT NULL) AND ("due_at" < "now"())) THEN 'overdue'::"text"
            WHEN ("created_at" < ("now"() - '30 days'::interval)) THEN '30d_plus'::"text"
            WHEN ("created_at" < ("now"() - '14 days'::interval)) THEN '14_29d'::"text"
            WHEN ("created_at" < ("now"() - '7 days'::interval)) THEN '7_13d'::"text"
            ELSE '0_6d'::"text"
        END;


ALTER VIEW "public"."commercial_pipeline_decision_support" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."communication_job_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "actor_user_id" "uuid",
    "action" "text" NOT NULL,
    "previous_status" "text",
    "new_status" "text",
    "previous_scheduled_at" timestamp with time zone,
    "new_scheduled_at" timestamp with time zone,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "communication_job_events_action_check" CHECK (("action" = ANY (ARRAY['cancel'::"text", 'reschedule'::"text", 'approve'::"text", 'retry'::"text"])))
);


ALTER TABLE "public"."communication_job_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."communication_suppression_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "suppression_id" "uuid",
    "email" "text" NOT NULL,
    "actor_user_id" "uuid",
    "action" "text" NOT NULL,
    "reason" "text",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "communication_suppression_events_action_check" CHECK (("action" = ANY (ARRAY['block'::"text", 'release'::"text"])))
);


ALTER TABLE "public"."communication_suppression_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."communication_suppressions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "source" "text" NOT NULL,
    "provider_event_id" "text",
    "note" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "released_at" timestamp with time zone,
    "released_by" "uuid",
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "communication_suppressions_reason_check" CHECK (("reason" = ANY (ARRAY['hard_bounce'::"text", 'complaint'::"text", 'manual'::"text", 'invalid'::"text"])))
);


ALTER TABLE "public"."communication_suppressions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."communication_worker_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source" "text" NOT NULL,
    "status" "text" NOT NULL,
    "recovered" integer DEFAULT 0 NOT NULL,
    "claimed" integer DEFAULT 0 NOT NULL,
    "sent" integer DEFAULT 0 NOT NULL,
    "failed" integer DEFAULT 0 NOT NULL,
    "blocked" integer DEFAULT 0 NOT NULL,
    "error_message" "text",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finished_at" timestamp with time zone,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "communication_worker_runs_source_check" CHECK (("source" = ANY (ARRAY['cron'::"text", 'manual'::"text", 'internal'::"text"]))),
    CONSTRAINT "communication_worker_runs_status_check" CHECK (("status" = ANY (ARRAY['running'::"text", 'success'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."communication_worker_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kind" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "excerpt" "text",
    "body" "text" DEFAULT ''::"text" NOT NULL,
    "hero_title" "text",
    "hero_subtitle" "text",
    "cta_label" "text",
    "cta_href" "text",
    "seo_title" "text",
    "seo_description" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "content_pages_kind_check" CHECK (("kind" = ANY (ARRAY['blog'::"text", 'landing'::"text", 'page'::"text"]))),
    CONSTRAINT "content_pages_slug_check" CHECK (("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text")),
    CONSTRAINT "content_pages_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text"])))
);


ALTER TABLE "public"."content_pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."control_alert_events" (
    "id" bigint NOT NULL,
    "event_key" "text" NOT NULL,
    "alert_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "from_status" "text",
    "to_status" "text",
    "actor_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "control_alert_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['detected'::"text", 'redetected'::"text", 'acknowledged'::"text", 'snoozed'::"text", 'reopened'::"text", 'resolved'::"text", 'dismissed'::"text", 'task_created'::"text", 'task_started'::"text", 'task_completed'::"text", 'task_cancelled'::"text"])))
);


ALTER TABLE "public"."control_alert_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."control_alert_events" IS 'Append-only audit events for V13 control alert/task lifecycle.';



ALTER TABLE "public"."control_alert_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."control_alert_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."integration_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "kind" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "result" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "last_error" "text",
    "next_attempt_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processing_token" "uuid",
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "integration_jobs_kind_check" CHECK (("kind" = ANY (ARRAY['payment_create'::"text", 'payment_callback'::"text", 'shipment_create'::"text", 'invoice_create'::"text", 'email_send'::"text"]))),
    CONSTRAINT "integration_jobs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'succeeded'::"text", 'failed'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."integration_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "external_event_id" "text",
    "signature_valid" boolean DEFAULT false NOT NULL,
    "payload_hash" "text",
    "status" "text" DEFAULT 'received'::"text" NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone,
    "instance_id" "uuid",
    CONSTRAINT "webhook_events_status_check" CHECK (("status" = ANY (ARRAY['received'::"text", 'processed'::"text", 'ignored'::"text", 'rejected'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."webhook_events" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."control_system_health" WITH ("security_invoker"='true') AS
 SELECT ("count"(*) FILTER (WHERE (("category" = 'system'::"text") AND ("status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text", 'snoozed'::"text"])))))::integer AS "open_system_alerts",
    ("count"(*) FILTER (WHERE (("category" = 'system'::"text") AND ("severity" = 'critical'::"text") AND ("status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text", 'snoozed'::"text"])))))::integer AS "critical_system_alerts",
    (( SELECT "count"(*) AS "count"
           FROM "public"."integration_jobs"
          WHERE ("integration_jobs"."status" = ANY (ARRAY['failed'::"text", 'blocked'::"text"]))))::integer AS "failed_or_blocked_integration_jobs",
    (( SELECT "count"(*) AS "count"
           FROM "public"."webhook_events"
          WHERE (("webhook_events"."status" = 'failed'::"text") AND ("webhook_events"."created_at" >= ("now"() - '7 days'::interval)))))::integer AS "failed_webhooks_7d",
    ( SELECT "max"("control_processing_runs"."completed_at") AS "max"
           FROM "public"."control_processing_runs") AS "last_control_cycle_at"
   FROM "public"."control_alerts";


ALTER VIEW "public"."control_system_health" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webshop_instances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "subscription_plan" "text" DEFAULT 'alap'::"text" NOT NULL,
    "status" "text" DEFAULT 'pilot'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "brand_name" "text",
    "brand_tagline" "text",
    "logo_url" "text",
    "primary_color" "text",
    "support_email" "text",
    "support_phone" "text",
    "public_site_url" "text",
    "email_from_name" "text",
    "storefront_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "organization_id" "uuid",
    CONSTRAINT "webshop_instances_primary_color_check" CHECK ((("primary_color" IS NULL) OR ("primary_color" ~ '^#[0-9A-Fa-f]{6}$'::"text"))),
    CONSTRAINT "webshop_instances_status_check" CHECK (("status" = ANY (ARRAY['pilot'::"text", 'active'::"text", 'suspended'::"text", 'archived'::"text"]))),
    CONSTRAINT "webshop_instances_storefront_config_object_check" CHECK (("jsonb_typeof"("storefront_config") = 'object'::"text")),
    CONSTRAINT "webshop_instances_subscription_plan_check" CHECK (("subscription_plan" = ANY (ARRAY['alap'::"text", 'pro'::"text"])))
);


ALTER TABLE "public"."webshop_instances" OWNER TO "postgres";


COMMENT ON COLUMN "public"."webshop_instances"."subscription_plan" IS 'Shoperation webshop package. Defaults fail closed to Alap; Pro requires explicit assignment.';



CREATE OR REPLACE VIEW "public"."control_system_health_v2" WITH ("security_invoker"='true') AS
 SELECT "id" AS "instance_id",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."control_alerts" "a"
          WHERE (("a"."instance_id" = "w"."id") AND ("a"."category" = 'system'::"text") AND ("a"."status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text", 'snoozed'::"text"])))) AS "open_system_alerts",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."control_alerts" "a"
          WHERE (("a"."instance_id" = "w"."id") AND ("a"."category" = 'system'::"text") AND ("a"."severity" = 'critical'::"text") AND ("a"."status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text", 'snoozed'::"text"])))) AS "critical_system_alerts",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."integration_jobs" "j"
          WHERE (("j"."instance_id" = "w"."id") AND ("j"."status" = ANY (ARRAY['failed'::"text", 'blocked'::"text"])))) AS "failed_or_blocked_integration_jobs",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."webhook_events" "e"
          WHERE (("e"."instance_id" = "w"."id") AND ("e"."status" = ANY (ARRAY['failed'::"text", 'rejected'::"text"])) AND ("e"."created_at" >= ("now"() - '7 days'::interval)))) AS "failed_webhooks_7d",
    ( SELECT "max"("r"."completed_at") AS "max"
           FROM "public"."control_processing_runs" "r"
          WHERE ("r"."instance_id" = "w"."id")) AS "last_control_cycle_at"
   FROM "public"."webshop_instances" "w"
  WHERE ("status" = ANY (ARRAY['pilot'::"text", 'active'::"text"]));


ALTER VIEW "public"."control_system_health_v2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."control_tower_category_summary" WITH ("security_invoker"='true') AS
 SELECT "category",
    "severity",
    ("count"(*))::integer AS "alert_count",
    "max"("priority_score") AS "max_priority",
    "round"("avg"((EXTRACT(epoch FROM ("now"() - "incident_started_at")) / (3600)::numeric)), 1) AS "avg_age_hours"
   FROM "public"."control_alerts"
  WHERE ("status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text", 'snoozed'::"text"]))
  GROUP BY "category", "severity";


ALTER VIEW "public"."control_tower_category_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."control_tower_category_summary_v2" WITH ("security_invoker"='true') AS
 SELECT "instance_id",
    "category",
    "severity",
    ("count"(*))::integer AS "alert_count",
    "max"("priority_score") AS "max_priority",
    "round"("avg"((EXTRACT(epoch FROM ("now"() - "incident_started_at")) / (3600)::numeric)), 1) AS "avg_age_hours"
   FROM "public"."control_alerts"
  WHERE ("status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text", 'snoozed'::"text"]))
  GROUP BY "instance_id", "category", "severity";


ALTER VIEW "public"."control_tower_category_summary_v2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."control_tower_queue" WITH ("security_invoker"='true') AS
 SELECT "a"."id" AS "alert_id",
    "a"."alert_key",
    "a"."category",
    "a"."alert_type",
    "a"."severity",
    "a"."priority_score",
    "a"."status",
    "a"."title",
    "a"."description",
    "a"."recommended_action",
    "a"."order_id",
    "a"."customer_id",
    "a"."reseller_id",
    "a"."variant_id",
    "a"."opportunity_id",
    "a"."evidence",
    "a"."occurrence_count",
    "a"."detected_at",
    "a"."last_detected_at",
    "a"."snoozed_until",
    "round"((EXTRACT(epoch FROM ("now"() - "a"."incident_started_at")) / (3600)::numeric), 1) AS "age_hours",
    "t"."id" AS "task_id",
    "t"."status" AS "task_status",
    "t"."owner_user_id",
    "t"."due_at" AS "task_due_at",
    "t"."outcome" AS "task_outcome",
        CASE
            WHEN (("t"."status" = ANY (ARRAY['open'::"text", 'in_progress'::"text"])) AND ("t"."due_at" < "now"())) THEN true
            ELSE false
        END AS "task_overdue",
    "a"."incident_started_at"
   FROM ("public"."control_alerts" "a"
     LEFT JOIN "public"."control_tasks" "t" ON ((("t"."alert_id" = "a"."id") AND ("t"."task_key" = (('alert:'::"text" || ("a"."id")::"text") || ':primary'::"text")))))
  WHERE ("a"."status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text", 'snoozed'::"text"]));


ALTER VIEW "public"."control_tower_queue" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."control_tower_kpis" WITH ("security_invoker"='true') AS
 WITH "q" AS (
         SELECT "control_tower_queue"."alert_id",
            "control_tower_queue"."alert_key",
            "control_tower_queue"."category",
            "control_tower_queue"."alert_type",
            "control_tower_queue"."severity",
            "control_tower_queue"."priority_score",
            "control_tower_queue"."status",
            "control_tower_queue"."title",
            "control_tower_queue"."description",
            "control_tower_queue"."recommended_action",
            "control_tower_queue"."order_id",
            "control_tower_queue"."customer_id",
            "control_tower_queue"."reseller_id",
            "control_tower_queue"."variant_id",
            "control_tower_queue"."opportunity_id",
            "control_tower_queue"."evidence",
            "control_tower_queue"."occurrence_count",
            "control_tower_queue"."detected_at",
            "control_tower_queue"."last_detected_at",
            "control_tower_queue"."snoozed_until",
            "control_tower_queue"."age_hours",
            "control_tower_queue"."task_id",
            "control_tower_queue"."task_status",
            "control_tower_queue"."owner_user_id",
            "control_tower_queue"."task_due_at",
            "control_tower_queue"."task_outcome",
            "control_tower_queue"."task_overdue"
           FROM "public"."control_tower_queue"
        ), "x" AS (
         SELECT ("count"(*))::integer AS "open_alerts",
            ("count"(*) FILTER (WHERE ("q"."severity" = 'critical'::"text")))::integer AS "critical_alerts",
            ("count"(*) FILTER (WHERE ("q"."severity" = 'high'::"text")))::integer AS "high_alerts",
            ("count"(*) FILTER (WHERE ("q"."age_hours" >= (24)::numeric)))::integer AS "over_24h_alerts",
            ("count"(*) FILTER (WHERE "q"."task_overdue"))::integer AS "overdue_tasks",
            ("count"(*) FILTER (WHERE ("q"."category" = 'operations'::"text")))::integer AS "operations_alerts",
            ("count"(*) FILTER (WHERE ("q"."category" = 'inventory'::"text")))::integer AS "inventory_alerts",
            ("count"(*) FILTER (WHERE ("q"."category" = 'commercial'::"text")))::integer AS "commercial_alerts",
            ("count"(*) FILTER (WHERE ("q"."category" = 'service'::"text")))::integer AS "service_alerts",
            COALESCE("sum"((("q"."evidence" ->> 'expected_value_net_huf'::"text"))::numeric) FILTER (WHERE (("q"."category" = 'commercial'::"text") AND ("q"."evidence" ? 'expected_value_net_huf'::"text"))), (0)::numeric) AS "commercial_value_at_risk_net_huf",
            COALESCE("avg"("q"."age_hours"), (0)::numeric) AS "avg_alert_age_hours"
           FROM "q"
        )
 SELECT "open_alerts",
    "critical_alerts",
    "high_alerts",
    "over_24h_alerts",
    "overdue_tasks",
    "operations_alerts",
    "inventory_alerts",
    "commercial_alerts",
    "service_alerts",
    "commercial_value_at_risk_net_huf",
    "avg_alert_age_hours",
    GREATEST(0, LEAST(100, ((((100 - ("critical_alerts" * 15)) - ("high_alerts" * 7)) - ("overdue_tasks" * 5)) - ("over_24h_alerts" * 2)))) AS "control_health_score"
   FROM "x";


ALTER VIEW "public"."control_tower_kpis" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."control_tower_queue_v2" WITH ("security_invoker"='true') AS
 SELECT "a"."instance_id",
    "a"."id" AS "alert_id",
    "a"."alert_key",
    "a"."category",
    "a"."alert_type",
    "a"."severity",
    "a"."priority_score",
    "a"."status",
    "a"."title",
    "a"."description",
    "a"."recommended_action",
    "a"."order_id",
    "a"."customer_id",
    "a"."reseller_id",
    "a"."variant_id",
    "a"."opportunity_id",
    "a"."evidence",
    "a"."occurrence_count",
    "a"."detected_at",
    "a"."last_detected_at",
    "a"."snoozed_until",
    "round"((EXTRACT(epoch FROM ("now"() - "a"."incident_started_at")) / (3600)::numeric), 1) AS "age_hours",
    "t"."id" AS "task_id",
    "t"."status" AS "task_status",
    "t"."owner_user_id",
    "t"."due_at" AS "task_due_at",
    "t"."outcome" AS "task_outcome",
        CASE
            WHEN (("t"."status" = ANY (ARRAY['open'::"text", 'in_progress'::"text"])) AND ("t"."due_at" < "now"())) THEN true
            ELSE false
        END AS "task_overdue",
    "a"."incident_started_at"
   FROM ("public"."control_alerts" "a"
     LEFT JOIN "public"."control_tasks" "t" ON ((("t"."instance_id" = "a"."instance_id") AND ("t"."alert_id" = "a"."id") AND ("t"."task_key" = (('alert:'::"text" || ("a"."id")::"text") || ':primary'::"text")))))
  WHERE ("a"."status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text", 'snoozed'::"text"]));


ALTER VIEW "public"."control_tower_queue_v2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."control_tower_kpis_v2" WITH ("security_invoker"='true') AS
 SELECT "instance_id",
    ("count"(*))::integer AS "open_alerts",
    ("count"(*) FILTER (WHERE ("severity" = 'critical'::"text")))::integer AS "critical_alerts",
    ("count"(*) FILTER (WHERE ("severity" = 'high'::"text")))::integer AS "high_alerts",
    ("count"(*) FILTER (WHERE ("age_hours" >= (24)::numeric)))::integer AS "over_24h_alerts",
    ("count"(*) FILTER (WHERE "task_overdue"))::integer AS "overdue_tasks",
    ("count"(*) FILTER (WHERE ("category" = 'operations'::"text")))::integer AS "operations_alerts",
    ("count"(*) FILTER (WHERE ("category" = 'inventory'::"text")))::integer AS "inventory_alerts",
    ("count"(*) FILTER (WHERE ("category" = 'commercial'::"text")))::integer AS "commercial_alerts",
    ("count"(*) FILTER (WHERE ("category" = 'service'::"text")))::integer AS "service_alerts",
    COALESCE("sum"((("evidence" ->> 'expected_value_net_huf'::"text"))::numeric) FILTER (WHERE (("category" = 'commercial'::"text") AND ("evidence" ? 'expected_value_net_huf'::"text"))), (0)::numeric) AS "commercial_value_at_risk_net_huf",
    COALESCE("avg"("age_hours"), (0)::numeric) AS "avg_alert_age_hours",
    GREATEST(0, LEAST(100, ((((100 - (("count"(*) FILTER (WHERE ("severity" = 'critical'::"text")))::integer * 15)) - (("count"(*) FILTER (WHERE ("severity" = 'high'::"text")))::integer * 7)) - (("count"(*) FILTER (WHERE "task_overdue"))::integer * 5)) - (("count"(*) FILTER (WHERE ("age_hours" >= (24)::numeric)))::integer * 2)))) AS "control_health_score"
   FROM "public"."control_tower_queue_v2"
  GROUP BY "instance_id";


ALTER VIEW "public"."control_tower_kpis_v2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupon_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    "coupon_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "customer_email" "text" NOT NULL,
    "coupon_code" "text" NOT NULL,
    "discount_gross_huf" integer NOT NULL,
    "status" "text" DEFAULT 'redeemed'::"text" NOT NULL,
    "redeemed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "released_at" timestamp with time zone,
    "release_reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "coupon_redemptions_discount_gross_huf_check" CHECK (("discount_gross_huf" >= 0)),
    CONSTRAINT "coupon_redemptions_status_check" CHECK (("status" = ANY (ARRAY['redeemed'::"text", 'released'::"text"])))
);


ALTER TABLE "public"."coupon_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "discount_type" "text" NOT NULL,
    "discount_value" integer NOT NULL,
    "min_subtotal_huf" integer DEFAULT 0 NOT NULL,
    "max_discount_huf" integer,
    "usage_limit" integer,
    "usage_count" integer DEFAULT 0 NOT NULL,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "coupons_code_format" CHECK ((("code" = "upper"("code")) AND ("code" ~ '^[A-Z0-9_-]{3,32}$'::"text"))),
    CONSTRAINT "coupons_date_window" CHECK ((("ends_at" IS NULL) OR ("starts_at" IS NULL) OR ("ends_at" > "starts_at"))),
    CONSTRAINT "coupons_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percent'::"text", 'fixed'::"text"]))),
    CONSTRAINT "coupons_discount_value_check" CHECK (("discount_value" > 0)),
    CONSTRAINT "coupons_max_discount_huf_check" CHECK ((("max_discount_huf" IS NULL) OR ("max_discount_huf" > 0))),
    CONSTRAINT "coupons_min_subtotal_huf_check" CHECK (("min_subtotal_huf" >= 0)),
    CONSTRAINT "coupons_usage_count_check" CHECK (("usage_count" >= 0)),
    CONSTRAINT "coupons_usage_limit_check" CHECK ((("usage_limit" IS NULL) OR ("usage_limit" > 0)))
);


ALTER TABLE "public"."coupons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "variant_id" "uuid",
    "product_name" "text" NOT NULL,
    "variant_label" "text" NOT NULL,
    "sku" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "unit_gross_huf" integer NOT NULL,
    "line_total_gross_huf" integer NOT NULL,
    "unit_cost_net_huf_snapshot" numeric(12,2),
    "cost_snapshot_source" "text",
    "unit_net_huf_snapshot" integer,
    "line_total_net_huf_snapshot" integer,
    "vat_rate_percent_snapshot" numeric(6,3),
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "order_items_line_total_gross_huf_check" CHECK (("line_total_gross_huf" >= 0)),
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "order_items_unit_cost_snapshot_check" CHECK ((("unit_cost_net_huf_snapshot" IS NULL) OR ("unit_cost_net_huf_snapshot" >= (0)::numeric))),
    CONSTRAINT "order_items_unit_gross_huf_check" CHECK (("unit_gross_huf" >= 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."order_items"."unit_cost_net_huf_snapshot" IS 'Frozen net unit cost at order creation; historical COGS basis.';



COMMENT ON COLUMN "public"."order_items"."cost_snapshot_source" IS 'order_created for exact snapshots; current_cost_backfill for historical seeded rows.';



CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "order_number" "text" NOT NULL,
    "status" "public"."order_status" DEFAULT 'pending'::"public"."order_status" NOT NULL,
    "customer_email" "text" NOT NULL,
    "billing_name" "text" NOT NULL,
    "billing_company" "text",
    "billing_tax_number" "text",
    "billing_postcode" "text",
    "billing_city" "text",
    "billing_address" "text",
    "shipping_name" "text",
    "shipping_postcode" "text",
    "shipping_city" "text",
    "shipping_address" "text",
    "subtotal_gross_huf" integer DEFAULT 0 NOT NULL,
    "shipping_gross_huf" integer DEFAULT 0 NOT NULL,
    "total_gross_huf" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "customer_phone" "text",
    "shipping_method" "text",
    "parcel_point_id" "text",
    "payment_method" "text",
    "note" "text",
    "external_payment_id" "text",
    "tracking_number" "text",
    "invoice_number" "text",
    "invoice_url" "text",
    "invoiced_at" timestamp with time zone,
    "coupon_code" "text",
    "discount_gross_huf" integer DEFAULT 0 NOT NULL,
    "confirmation_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "utm_content" "text",
    "utm_term" "text",
    "attributed_at" timestamp with time zone,
    CONSTRAINT "orders_discount_gross_huf_check" CHECK (("discount_gross_huf" >= 0))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."customer_commercial_metrics" WITH ("security_invoker"='true') AS
 WITH "paid_orders" AS (
         SELECT "o"."instance_id",
            "o"."id",
            "o"."customer_id",
            "lower"(TRIM(BOTH FROM "o"."customer_email")) AS "email_key",
            "o"."total_gross_huf",
            "o"."created_at",
            (COALESCE("sum"(("oi"."unit_cost_net_huf_snapshot" * ("oi"."quantity")::numeric)), (0)::numeric))::numeric(14,2) AS "cogs_net_huf"
           FROM ("public"."orders" "o"
             LEFT JOIN "public"."order_items" "oi" ON ((("oi"."order_id" = "o"."id") AND ("oi"."instance_id" = "o"."instance_id"))))
          WHERE ("o"."status" = ANY (ARRAY['paid'::"public"."order_status", 'processing'::"public"."order_status", 'shipped'::"public"."order_status", 'completed'::"public"."order_status"]))
          GROUP BY "o"."instance_id", "o"."id", "o"."customer_id", "o"."customer_email", "o"."total_gross_huf", "o"."created_at"
        ), "g" AS (
         SELECT "paid_orders"."instance_id",
            COALESCE(("paid_orders"."customer_id")::"text", "paid_orders"."email_key") AS "customer_key",
            ("max"(("paid_orders"."customer_id")::"text"))::"uuid" AS "customer_id",
            "paid_orders"."email_key",
            ("count"(*))::integer AS "paid_orders",
            "sum"("paid_orders"."total_gross_huf") AS "revenue_gross_huf",
            ("round"("avg"("paid_orders"."total_gross_huf")))::integer AS "aov_gross_huf",
            "min"("paid_orders"."created_at") AS "first_order_at",
            "max"("paid_orders"."created_at") AS "last_order_at",
            ("sum"("paid_orders"."cogs_net_huf"))::numeric(14,2) AS "cogs_net_huf"
           FROM "paid_orders"
          GROUP BY "paid_orders"."instance_id", COALESCE(("paid_orders"."customer_id")::"text", "paid_orders"."email_key"), "paid_orders"."email_key"
        )
 SELECT "customer_key",
    "customer_id",
    "email_key",
    "paid_orders",
    "revenue_gross_huf",
    "aov_gross_huf",
    "first_order_at",
    "last_order_at",
    ("floor"((EXTRACT(epoch FROM ("now"() - "last_order_at")) / (86400)::numeric)))::integer AS "days_since_last_order",
        CASE
            WHEN (("paid_orders" = 1) AND (("now"() - "last_order_at") < '30 days'::interval)) THEN 'first_time'::"text"
            WHEN (("paid_orders" >= 3) AND ("revenue_gross_huf" >= 100000) AND (("now"() - "last_order_at") < '90 days'::interval)) THEN 'vip'::"text"
            WHEN (("paid_orders" >= 2) AND (("now"() - "last_order_at") < '30 days'::interval)) THEN 'repeat'::"text"
            WHEN (("now"() - "last_order_at") >= '180 days'::interval) THEN 'dormant'::"text"
            WHEN (("now"() - "last_order_at") >= '90 days'::interval) THEN 'winback'::"text"
            WHEN (("now"() - "last_order_at") >= '30 days'::interval) THEN 'at_risk'::"text"
            ELSE 'active'::"text"
        END AS "segment",
    "cogs_net_huf",
        CASE
            WHEN ("revenue_gross_huf" > 0) THEN "round"((("cogs_net_huf" / ("revenue_gross_huf")::numeric) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS "cogs_to_revenue_pct",
    "instance_id"
   FROM "g";


ALTER VIEW "public"."customer_commercial_metrics" OWNER TO "postgres";


COMMENT ON VIEW "public"."customer_commercial_metrics" IS 'V9 customer LTV/AOV/recency segmentation read model using paid-order history and frozen order-item cost snapshots.';



CREATE TABLE IF NOT EXISTS "public"."customer_instance_roles" (
    "instance_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."customer_role" DEFAULT 'customer'::"public"."customer_role" NOT NULL,
    "reseller_approved" boolean DEFAULT false NOT NULL,
    "reseller_requested_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_instance_roles_approval_chk" CHECK ((("role" = 'reseller'::"public"."customer_role") OR (("reseller_approved" = false) AND ("approved_at" IS NULL)))),
    CONSTRAINT "customer_instance_roles_approved_at_chk" CHECK ((("reseller_approved" = false) OR ("approved_at" IS NOT NULL))),
    CONSTRAINT "customer_instance_roles_customer_role_chk" CHECK (("role" = ANY (ARRAY['customer'::"public"."customer_role", 'reseller'::"public"."customer_role"])))
);


ALTER TABLE "public"."customer_instance_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_journey_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "journey_id" "uuid" NOT NULL,
    "step_key" "text" NOT NULL,
    "purpose" "text" NOT NULL,
    "template_key" "text" NOT NULL,
    "scheduled_at" timestamp with time zone NOT NULL,
    "communication_job_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "customer_journey_steps_purpose_check" CHECK (("purpose" = ANY (ARRAY['transactional'::"text", 'marketing'::"text"]))),
    CONSTRAINT "customer_journey_steps_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'queued'::"text", 'blocked'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."customer_journey_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_journeys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kind" "public"."customer_journey_kind" NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "source_key" "text" NOT NULL,
    "status" "public"."customer_journey_status" DEFAULT 'active'::"public"."customer_journey_status" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL
);


ALTER TABLE "public"."customer_journeys" OWNER TO "postgres";


COMMENT ON TABLE "public"."customer_journeys" IS 'V9 idempotent retention/recovery journey enrollments.';



CREATE TABLE IF NOT EXISTS "public"."customer_lifecycle_milestones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "milestone_key" "text" NOT NULL,
    "milestone_type" "text" NOT NULL,
    "source_order_id" "uuid",
    "source" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "customer_lifecycle_milestones_milestone_type_check" CHECK (("milestone_type" = ANY (ARRAY['first_order'::"text", 'repeat_order'::"text", 'high_value'::"text", 'at_risk'::"text", 'winback'::"text"])))
);


ALTER TABLE "public"."customer_lifecycle_milestones" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."loyalty_balances" WITH ("security_invoker"='true') AS
 SELECT "customer_id",
    GREATEST(COALESCE("sum"("points"), (0)::bigint), (0)::bigint) AS "points_balance",
    COALESCE("sum"("points") FILTER (WHERE ("points" > 0)), (0)::bigint) AS "lifetime_earned_points",
    "abs"(COALESCE("sum"("points") FILTER (WHERE ("entry_type" = 'redeem'::"text")), (0)::bigint)) AS "lifetime_redeemed_points",
    "max"("occurred_at") AS "last_activity_at",
    "abs"(LEAST(COALESCE("sum"("points"), (0)::bigint), (0)::bigint)) AS "points_debt",
    "instance_id"
   FROM "public"."loyalty_ledger"
  GROUP BY "instance_id", "customer_id";


ALTER VIEW "public"."loyalty_balances" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."customer_loyalty_summary" WITH ("security_invoker"='true') AS
 SELECT "p"."customer_id",
    "p"."value_score",
    "p"."value_tier",
    "p"."lifecycle_segment",
    "p"."paid_orders",
    "p"."revenue_gross_huf",
    "p"."last_order_at",
    COALESCE("b"."points_balance", (0)::bigint) AS "points_balance",
    COALESCE("b"."lifetime_earned_points", (0)::bigint) AS "lifetime_earned_points",
    COALESCE("b"."lifetime_redeemed_points", (0)::bigint) AS "lifetime_redeemed_points",
    ( SELECT "count"(*) AS "count"
           FROM "public"."active_customer_benefits" "a"
          WHERE (("a"."instance_id" = "p"."instance_id") AND ("a"."customer_id" = "p"."customer_id") AND ("a"."usage_available" = true))) AS "available_benefits",
    COALESCE("b"."points_debt", (0)::bigint) AS "points_debt",
    "p"."instance_id"
   FROM ("public"."customer_value_profiles" "p"
     LEFT JOIN "public"."loyalty_balances" "b" ON ((("b"."instance_id" = "p"."instance_id") AND ("b"."customer_id" = "p"."customer_id"))));


ALTER VIEW "public"."customer_loyalty_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_entitlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "instance_id" "uuid",
    "feature_code" "text" NOT NULL,
    "source" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "valid_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "valid_until" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feature_entitlements_check" CHECK ((("valid_until" IS NULL) OR ("valid_until" > "valid_from"))),
    CONSTRAINT "feature_entitlements_source_check" CHECK (("source" = ANY (ARRAY['plan'::"text", 'addon'::"text", 'manual'::"text", 'trial'::"text", 'platform'::"text"])))
);


ALTER TABLE "public"."feature_entitlements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fulfillment_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_key" "text" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "from_status" "text",
    "to_status" "text",
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actor_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "fulfillment_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['reserved'::"text", 'ready_to_pack'::"text", 'packed'::"text", 'stock_consumed'::"text", 'handed_over'::"text", 'delivered'::"text", 'released'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."fulfillment_events" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."order_operations_queue" WITH ("security_invoker"='true') AS
 SELECT "o"."id" AS "order_id",
    "o"."order_number",
    "o"."status" AS "commerce_status",
    "o"."created_at",
    "o"."total_gross_huf",
    "o"."customer_id",
    COALESCE("op"."operational_status", 'awaiting_reservation'::"text") AS "operational_status",
    COALESCE("op"."priority_score", 50) AS "priority_score",
    "op"."exception_code",
    COALESCE("c"."value_tier", 'standard'::"text") AS "customer_value_tier",
    COALESCE("c"."value_score", 0) AS "customer_value_score",
    (EXTRACT(epoch FROM ("now"() - "o"."created_at")) / 3600.0) AS "age_hours"
   FROM (("public"."orders" "o"
     LEFT JOIN "public"."order_operations" "op" ON (("op"."order_id" = "o"."id")))
     LEFT JOIN "public"."customer_value_profiles" "c" ON (("c"."customer_id" = "o"."customer_id")))
  WHERE ("o"."status" <> ALL (ARRAY['completed'::"public"."order_status", 'cancelled'::"public"."order_status", 'refunded'::"public"."order_status"]));


ALTER VIEW "public"."order_operations_queue" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."fulfillment_sla_summary" WITH ("security_invoker"='true') AS
 SELECT "count"(*) FILTER (WHERE ("operational_status" = 'awaiting_reservation'::"text")) AS "awaiting_reservation_count",
    "count"(*) FILTER (WHERE ("operational_status" = 'reserved'::"text")) AS "reserved_count",
    "count"(*) FILTER (WHERE ("operational_status" = 'ready_to_pack'::"text")) AS "ready_to_pack_count",
    "count"(*) FILTER (WHERE ("operational_status" = 'packed'::"text")) AS "packed_count",
    "count"(*) FILTER (WHERE ("operational_status" = 'blocked'::"text")) AS "blocked_count",
    COALESCE("avg"("age_hours") FILTER (WHERE ("operational_status" <> ALL (ARRAY['delivered'::"text", 'cancelled'::"text"]))), (0)::numeric) AS "avg_open_age_hours",
    "count"(*) FILTER (WHERE (("age_hours" >= (24)::numeric) AND ("operational_status" <> ALL (ARRAY['delivered'::"text", 'cancelled'::"text"])))) AS "over_24h_count"
   FROM "public"."order_operations_queue";


ALTER VIEW "public"."fulfillment_sla_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_key" "text" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "order_item_id" "uuid" NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "reserved_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "consumed_at" timestamp with time zone,
    "released_at" timestamp with time zone,
    "reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "inventory_reservations_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "inventory_reservations_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'consumed'::"text", 'released'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."inventory_reservations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "sku" "text" NOT NULL,
    "label" "text" NOT NULL,
    "net_price_huf" integer NOT NULL,
    "gross_price_huf" integer NOT NULL,
    "stock_quantity" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reseller_net_price_huf" integer,
    "reseller_gross_price_huf" integer,
    "unit_cost_net_huf" integer,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "supplier_lead_time_days" integer DEFAULT 7 NOT NULL,
    "safety_stock_days" integer DEFAULT 7 NOT NULL,
    "minimum_order_quantity" integer DEFAULT 1 NOT NULL,
    "order_multiple" integer DEFAULT 1 NOT NULL,
    "supplier_id" "uuid",
    "weight_grams" integer,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "product_variants_gross_price_huf_check" CHECK (("gross_price_huf" >= 0)),
    CONSTRAINT "product_variants_minimum_order_quantity_check" CHECK (("minimum_order_quantity" >= 1)),
    CONSTRAINT "product_variants_net_price_huf_check" CHECK (("net_price_huf" >= 0)),
    CONSTRAINT "product_variants_order_multiple_check" CHECK (("order_multiple" >= 1)),
    CONSTRAINT "product_variants_reseller_gross_price_huf_check" CHECK ((("reseller_gross_price_huf" IS NULL) OR ("reseller_gross_price_huf" >= 0))),
    CONSTRAINT "product_variants_reseller_net_price_huf_check" CHECK ((("reseller_net_price_huf" IS NULL) OR ("reseller_net_price_huf" >= 0))),
    CONSTRAINT "product_variants_safety_stock_days_check" CHECK ((("safety_stock_days" >= 0) AND ("safety_stock_days" <= 365))),
    CONSTRAINT "product_variants_stock_quantity_check" CHECK (("stock_quantity" >= 0)),
    CONSTRAINT "product_variants_supplier_lead_time_days_check" CHECK ((("supplier_lead_time_days" >= 0) AND ("supplier_lead_time_days" <= 365))),
    CONSTRAINT "product_variants_unit_cost_net_huf_check" CHECK ((("unit_cost_net_huf" IS NULL) OR ("unit_cost_net_huf" >= 0))),
    CONSTRAINT "product_variants_weight_grams_check" CHECK ((("weight_grams" IS NULL) OR ("weight_grams" > 0)))
);


ALTER TABLE "public"."product_variants" OWNER TO "postgres";


COMMENT ON COLUMN "public"."product_variants"."unit_cost_net_huf" IS 'Nettó beszerzési/előállítási egységköltség HUF-ban. Admin fedezet- és készletbefektetés számítás alapja.';



CREATE OR REPLACE VIEW "public"."inventory_available_to_promise" WITH ("security_invoker"='true') AS
 SELECT "v"."id" AS "variant_id",
    "v"."sku",
    "v"."label",
    ("v"."stock_quantity" + COALESCE("r"."reserved_quantity", 0)) AS "on_hand_quantity",
    COALESCE("r"."reserved_quantity", 0) AS "reserved_quantity",
    GREATEST("v"."stock_quantity", 0) AS "available_to_promise_quantity",
    GREATEST((- "v"."stock_quantity"), 0) AS "oversold_quantity"
   FROM ("public"."product_variants" "v"
     LEFT JOIN LATERAL ( SELECT (COALESCE("sum"("ir"."quantity"), (0)::bigint))::integer AS "reserved_quantity"
           FROM "public"."inventory_reservations" "ir"
          WHERE (("ir"."variant_id" = "v"."id") AND ("ir"."status" = 'active'::"text"))) "r" ON (true));


ALTER VIEW "public"."inventory_available_to_promise" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "change_quantity" integer NOT NULL,
    "previous_stock" integer NOT NULL,
    "new_stock" integer NOT NULL,
    "reason" "text" NOT NULL,
    "actor_user_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL
);


ALTER TABLE "public"."inventory_events" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."inventory_pressure" WITH ("security_invoker"='true') AS
 SELECT "variant_id",
    "sku",
    "label",
    "on_hand_quantity",
    "reserved_quantity",
    "available_to_promise_quantity",
    "oversold_quantity",
        CASE
            WHEN ("available_to_promise_quantity" = 0) THEN 'critical'::"text"
            WHEN ("available_to_promise_quantity" <= GREATEST(2, ("ceil"((("on_hand_quantity")::numeric * 0.20)))::integer)) THEN 'low'::"text"
            ELSE 'healthy'::"text"
        END AS "pressure_level",
        CASE
            WHEN ("on_hand_quantity" > 0) THEN "round"(((("reserved_quantity")::numeric / ("on_hand_quantity")::numeric) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS "reservation_pressure_percent"
   FROM "public"."inventory_available_to_promise" "a";


ALTER VIEW "public"."inventory_pressure" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_snapshots" (
    "id" bigint NOT NULL,
    "snapshot_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "stock_quantity" integer NOT NULL,
    "unit_cost_net_huf" numeric(12,2),
    "inventory_cost_net_huf" numeric(14,2),
    "retail_net_price_huf" numeric(12,2) NOT NULL,
    "inventory_retail_net_huf" numeric(14,2) NOT NULL,
    "captured_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "inventory_snapshots_stock_quantity_check" CHECK (("stock_quantity" >= 0))
);


ALTER TABLE "public"."inventory_snapshots" OWNER TO "postgres";


ALTER TABLE "public"."inventory_snapshots" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."inventory_snapshots_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."loyalty_program_settings" (
    "singleton" boolean DEFAULT true NOT NULL,
    "tier_bonus_cutover_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "loyalty_program_settings_singleton_check" CHECK (("singleton" = true))
);


ALTER TABLE "public"."loyalty_program_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketing_campaign_recipients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "customer_key" "text" NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "customer_name" "text",
    "orders_count" integer DEFAULT 0 NOT NULL,
    "revenue_gross_huf" integer DEFAULT 0 NOT NULL,
    "last_order_at" timestamp with time zone,
    "consent_ok" boolean NOT NULL,
    "suppressed" boolean NOT NULL,
    "eligible" boolean NOT NULL,
    "exclusion_reason" "text",
    "communication_job_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL
);


ALTER TABLE "public"."marketing_campaign_recipients" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."marketing_campaign_conversions" WITH ("security_invoker"='true') AS
 WITH "sends" AS (
         SELECT "r"."instance_id",
            "r"."campaign_id",
            "r"."id" AS "recipient_id",
            "lower"("r"."email") AS "email",
            "j"."sent_at"
           FROM ("public"."marketing_campaign_recipients" "r"
             JOIN "public"."communication_jobs" "j" ON ((("j"."id" = "r"."communication_job_id") AND ("j"."instance_id" = "r"."instance_id"))))
          WHERE (("j"."status" = 'sent'::"text") AND ("j"."sent_at" IS NOT NULL))
        ), "candidates" AS (
         SELECT "s"."instance_id",
            "s"."campaign_id",
            "s"."recipient_id",
            "o"."id" AS "order_id",
            "o"."order_number",
            "o"."total_gross_huf",
            "o"."created_at" AS "order_created_at",
            "s"."sent_at",
            "row_number"() OVER (PARTITION BY "o"."instance_id", "o"."id" ORDER BY "s"."sent_at" DESC) AS "rn"
           FROM ("sends" "s"
             JOIN "public"."orders" "o" ON ((("o"."instance_id" = "s"."instance_id") AND ("lower"("o"."customer_email") = "s"."email"))))
          WHERE (("o"."status" = ANY (ARRAY['paid'::"public"."order_status", 'processing'::"public"."order_status", 'completed'::"public"."order_status"])) AND ("o"."created_at" >= "s"."sent_at") AND ("o"."created_at" < ("s"."sent_at" + '30 days'::interval)))
        )
 SELECT "campaign_id",
    "recipient_id",
    "order_id",
    "order_number",
    "total_gross_huf",
    "order_created_at",
    "sent_at",
    (EXTRACT(epoch FROM ("order_created_at" - "sent_at")) / 86400.0) AS "days_to_conversion",
    "instance_id"
   FROM "candidates"
  WHERE ("rn" = 1);


ALTER VIEW "public"."marketing_campaign_conversions" OWNER TO "postgres";


COMMENT ON VIEW "public"."marketing_campaign_conversions" IS 'Tenant-safe campaign conversion attribution; security_invoker preserves underlying RLS.';



CREATE TABLE IF NOT EXISTS "public"."marketing_campaign_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "actor_user_id" "uuid",
    "action" "text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "marketing_campaign_events_action_check" CHECK (("action" = ANY (ARRAY['submit_review'::"text", 'approve'::"text", 'queue'::"text", 'cancel'::"text"])))
);


ALTER TABLE "public"."marketing_campaign_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketing_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "segment" "text" NOT NULL,
    "template_key" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "scheduled_at" timestamp with time zone,
    "created_by" "uuid",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    "channel" "text" DEFAULT 'email'::"text" NOT NULL,
    "budget_huf" integer DEFAULT 0 NOT NULL,
    "utm_campaign" "text",
    "external_impressions" integer DEFAULT 0 NOT NULL,
    "external_clicks" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "marketing_campaigns_budget_huf_check" CHECK (("budget_huf" >= 0)),
    CONSTRAINT "marketing_campaigns_channel_check" CHECK (("channel" = ANY (ARRAY['email'::"text", 'facebook'::"text", 'instagram'::"text", 'tiktok'::"text", 'youtube'::"text", 'google'::"text", 'other'::"text"]))),
    CONSTRAINT "marketing_campaigns_external_clicks_check" CHECK (("external_clicks" >= 0)),
    CONSTRAINT "marketing_campaigns_external_impressions_check" CHECK (("external_impressions" >= 0)),
    CONSTRAINT "marketing_campaigns_segment_check" CHECK (("segment" = ANY (ARRAY['repeat_30_89'::"text", 'winback_90_plus'::"text", 'at_risk_30_89'::"text", 'winback_90_179'::"text", 'lost_180_plus'::"text", 'high_value_at_risk'::"text", 'external'::"text"]))),
    CONSTRAINT "marketing_campaigns_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'review'::"text", 'approved'::"text", 'queued'::"text", 'cancelled'::"text", 'completed'::"text"]))),
    CONSTRAINT "marketing_campaigns_template_key_check" CHECK (("template_key" = ANY (ARRAY['repeat_30d'::"text", 'winback_90d'::"text", 'retention_risk_30d'::"text", 'reactivation_180d'::"text", 'vip_retention'::"text", 'external_attribution'::"text"])))
);


ALTER TABLE "public"."marketing_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketing_consents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "channel" "text" DEFAULT 'email'::"text" NOT NULL,
    "status" "text" NOT NULL,
    "source" "text" NOT NULL,
    "policy_version" "text" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "marketing_consents_channel_check" CHECK (("channel" = 'email'::"text")),
    CONSTRAINT "marketing_consents_status_check" CHECK (("status" = ANY (ARRAY['granted'::"text", 'withdrawn'::"text"])))
);


ALTER TABLE "public"."marketing_consents" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."merchant_intelligence_tenant_gaps" WITH ("security_invoker"='true') AS
 SELECT 'customer_journeys'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."customer_journeys"
  WHERE ("customer_journeys"."instance_id" IS NULL)
UNION ALL
 SELECT 'customer_journey_steps'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."customer_journey_steps"
  WHERE ("customer_journey_steps"."instance_id" IS NULL)
UNION ALL
 SELECT 'customer_lifecycle_milestones'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."customer_lifecycle_milestones"
  WHERE ("customer_lifecycle_milestones"."instance_id" IS NULL)
UNION ALL
 SELECT 'control_alerts'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."control_alerts"
  WHERE ("control_alerts"."instance_id" IS NULL)
UNION ALL
 SELECT 'control_alert_events'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."control_alert_events"
  WHERE ("control_alert_events"."instance_id" IS NULL)
UNION ALL
 SELECT 'control_tasks'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."control_tasks"
  WHERE ("control_tasks"."instance_id" IS NULL)
UNION ALL
 SELECT 'control_processing_runs'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."control_processing_runs"
  WHERE ("control_processing_runs"."instance_id" IS NULL)
UNION ALL
 SELECT 'action_policies'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."action_policies"
  WHERE ("action_policies"."instance_id" IS NULL)
UNION ALL
 SELECT 'action_proposals'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."action_proposals"
  WHERE ("action_proposals"."instance_id" IS NULL)
UNION ALL
 SELECT 'action_proposal_events'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."action_proposal_events"
  WHERE ("action_proposal_events"."instance_id" IS NULL)
UNION ALL
 SELECT 'action_approvals'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."action_approvals"
  WHERE ("action_approvals"."instance_id" IS NULL)
UNION ALL
 SELECT 'action_executions'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."action_executions"
  WHERE ("action_executions"."instance_id" IS NULL)
UNION ALL
 SELECT 'action_processing_runs'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."action_processing_runs"
  WHERE ("action_processing_runs"."instance_id" IS NULL)
UNION ALL
 SELECT 'automation_control'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."automation_control"
  WHERE ("automation_control"."instance_id" IS NULL)
UNION ALL
 SELECT 'automation_control_events'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."automation_control_events"
  WHERE ("automation_control_events"."instance_id" IS NULL)
UNION ALL
 SELECT 'automation_processing_runs'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."automation_processing_runs"
  WHERE ("automation_processing_runs"."instance_id" IS NULL)
UNION ALL
 SELECT 'automation_runbook_instances'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."automation_runbook_instances"
  WHERE ("automation_runbook_instances"."instance_id" IS NULL);


ALTER VIEW "public"."merchant_intelligence_tenant_gaps" OWNER TO "postgres";


COMMENT ON VIEW "public"."merchant_intelligence_tenant_gaps" IS 'Preflight gate for the final merchant intelligence strict-tenant phase.';



CREATE TABLE IF NOT EXISTS "public"."observability_events" (
    "id" bigint NOT NULL,
    "event_key" "text" NOT NULL,
    "correlation_id" "text" NOT NULL,
    "category" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "event_name" "text" NOT NULL,
    "duration_ms" integer,
    "status_code" integer,
    "source" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "observability_events_category_check" CHECK (("category" = ANY (ARRAY['http'::"text", 'commerce'::"text", 'integration'::"text", 'payment'::"text", 'database'::"text", 'security'::"text", 'system'::"text"]))),
    CONSTRAINT "observability_events_duration_ms_check" CHECK ((("duration_ms" IS NULL) OR ("duration_ms" >= 0))),
    CONSTRAINT "observability_events_severity_check" CHECK (("severity" = ANY (ARRAY['debug'::"text", 'info'::"text", 'warning'::"text", 'error'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."observability_events" OWNER TO "postgres";


ALTER TABLE "public"."observability_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."observability_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."observability_issue_queue" WITH ("security_invoker"='true') AS
 SELECT "id",
    "correlation_id",
    "category",
    "severity",
    "event_name",
    "duration_ms",
    "status_code",
    "source",
    "metadata",
    "occurred_at"
   FROM "public"."observability_events"
  WHERE (("severity" = ANY (ARRAY['warning'::"text", 'error'::"text", 'critical'::"text"])) AND ("occurred_at" >= ("now"() - '7 days'::interval)))
  ORDER BY
        CASE "severity"
            WHEN 'critical'::"text" THEN 1
            WHEN 'error'::"text" THEN 2
            ELSE 3
        END, "occurred_at" DESC;


ALTER VIEW "public"."observability_issue_queue" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."observability_kpis" WITH ("security_invoker"='true') AS
 SELECT ("count"(*) FILTER (WHERE ("occurred_at" >= ("now"() - '24:00:00'::interval))))::integer AS "events_24h",
    ("count"(*) FILTER (WHERE (("severity" = ANY (ARRAY['error'::"text", 'critical'::"text"])) AND ("occurred_at" >= ("now"() - '24:00:00'::interval)))))::integer AS "errors_24h",
    ("count"(*) FILTER (WHERE (("severity" = 'critical'::"text") AND ("occurred_at" >= ("now"() - '24:00:00'::interval)))))::integer AS "critical_24h",
    (COALESCE("round"("avg"("duration_ms") FILTER (WHERE (("duration_ms" IS NOT NULL) AND ("occurred_at" >= ("now"() - '24:00:00'::interval))))), (0)::numeric))::integer AS "avg_duration_ms_24h",
    (COALESCE("percentile_cont"((0.95)::double precision) WITHIN GROUP (ORDER BY (("duration_ms")::double precision)) FILTER (WHERE (("duration_ms" IS NOT NULL) AND ("occurred_at" >= ("now"() - '24:00:00'::interval)))), (0)::double precision))::integer AS "p95_duration_ms_24h",
    "max"("occurred_at") AS "last_event_at"
   FROM "public"."observability_events";


ALTER VIEW "public"."observability_kpis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."office_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid" NOT NULL,
    "author_id" "uuid",
    "kind" "text" DEFAULT 'internal'::"text" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "communication_job_id" "uuid",
    "external_message_id" "text",
    "sender_email" "text",
    "recipient_email" "text",
    "subject" "text",
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "office_messages_kind_check" CHECK (("kind" = ANY (ARRAY['internal'::"text", 'note'::"text", 'email_in'::"text", 'email_out'::"text"])))
);


ALTER TABLE "public"."office_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."office_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid",
    "title" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "assigned_to" "uuid",
    "due_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "office_tasks_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'done'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."office_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."office_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject" "text" NOT NULL,
    "customer_email" "text",
    "order_id" "uuid",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "assigned_to" "uuid",
    "last_read_at" timestamp with time zone,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "office_threads_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "office_threads_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."office_threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."return_cases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "customer_email" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "customer_note" "text",
    "status" "public"."return_case_status" DEFAULT 'requested'::"public"."return_case_status" NOT NULL,
    "refund_amount_gross_huf" integer,
    "refund_reference" "text",
    "admin_note" "text",
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_at" timestamp with time zone,
    "received_at" timestamp with time zone,
    "refunded_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "inventory_restocked_at" timestamp with time zone,
    "inventory_restocked_by" "uuid",
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "return_cases_refund_amount_gross_huf_check" CHECK ((("refund_amount_gross_huf" IS NULL) OR ("refund_amount_gross_huf" >= 0)))
);


ALTER TABLE "public"."return_cases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_number" "text" NOT NULL,
    "user_id" "uuid",
    "order_id" "uuid",
    "email" "text" NOT NULL,
    "name" "text",
    "category" "public"."support_ticket_category" DEFAULT 'other'::"public"."support_ticket_category" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "status" "public"."support_ticket_status" DEFAULT 'open'::"public"."support_ticket_status" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "admin_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "support_tickets_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"])))
);


ALTER TABLE "public"."support_tickets" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."order_service_operations" WITH ("security_invoker"='true') AS
 SELECT "q"."order_id",
    "q"."order_number",
    "q"."commerce_status",
    "q"."created_at",
    "q"."total_gross_huf",
    "q"."customer_id",
    "q"."operational_status",
    "q"."priority_score",
    "q"."exception_code",
    "q"."customer_value_tier",
    "q"."customer_value_score",
    "q"."age_hours",
    COALESCE("s"."open_support_count", 0) AS "open_support_count",
    COALESCE("s"."urgent_support_count", 0) AS "urgent_support_count",
    COALESCE("r"."open_return_count", 0) AS "open_return_count",
    COALESCE("r"."received_return_count", 0) AS "received_return_count",
        CASE
            WHEN ((COALESCE("s"."open_support_count", 0) > 0) OR (COALESCE("r"."open_return_count", 0) > 0)) THEN true
            ELSE false
        END AS "service_attention_required"
   FROM (("public"."order_operations_queue" "q"
     LEFT JOIN LATERAL ( SELECT ("count"(*) FILTER (WHERE ("st"."status" = ANY (ARRAY['open'::"public"."support_ticket_status", 'in_progress'::"public"."support_ticket_status", 'waiting_customer'::"public"."support_ticket_status"]))))::integer AS "open_support_count",
            ("count"(*) FILTER (WHERE (("st"."status" = ANY (ARRAY['open'::"public"."support_ticket_status", 'in_progress'::"public"."support_ticket_status"])) AND ("st"."priority" = ANY (ARRAY['high'::"text", 'urgent'::"text"])))))::integer AS "urgent_support_count"
           FROM "public"."support_tickets" "st"
          WHERE ("st"."order_id" = "q"."order_id")) "s" ON (true))
     LEFT JOIN LATERAL ( SELECT ("count"(*) FILTER (WHERE ("rc"."status" = ANY (ARRAY['requested'::"public"."return_case_status", 'approved'::"public"."return_case_status", 'received'::"public"."return_case_status", 'refund_pending'::"public"."return_case_status"]))))::integer AS "open_return_count",
            ("count"(*) FILTER (WHERE ("rc"."status" = ANY (ARRAY['received'::"public"."return_case_status", 'refund_pending'::"public"."return_case_status"]))))::integer AS "received_return_count"
           FROM "public"."return_cases" "rc"
          WHERE ("rc"."order_id" = "q"."order_id")) "r" ON (true));


ALTER VIEW "public"."order_service_operations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."operations_exception_queue" WITH ("security_invoker"='true') AS
 SELECT "order_id",
    "order_number",
    "commerce_status",
    "created_at",
    "total_gross_huf",
    "customer_id",
    "operational_status",
    "priority_score",
    "exception_code",
    "customer_value_tier",
    "customer_value_score",
    "age_hours",
    "open_support_count",
    "urgent_support_count",
    "open_return_count",
    "received_return_count",
    "service_attention_required",
        CASE
            WHEN (("operational_status" = ANY (ARRAY['ready_to_pack'::"text", 'packed'::"text"])) AND ("commerce_status" <> ALL (ARRAY['paid'::"public"."order_status", 'processing'::"public"."order_status"]))) THEN 'payment_fulfillment_mismatch'::"text"
            WHEN (("operational_status" = 'handed_over'::"text") AND ("commerce_status" <> 'shipped'::"public"."order_status")) THEN 'shipment_status_mismatch'::"text"
            WHEN (("operational_status" = 'delivered'::"text") AND ("commerce_status" <> 'completed'::"public"."order_status")) THEN 'delivery_status_mismatch'::"text"
            WHEN ("exception_code" IS NOT NULL) THEN "exception_code"
            WHEN ("age_hours" >= (48)::numeric) THEN 'sla_over_48h'::"text"
            WHEN ("urgent_support_count" > 0) THEN 'urgent_support'::"text"
            WHEN ("open_return_count" > 0) THEN 'open_return'::"text"
            ELSE NULL::"text"
        END AS "derived_exception_code"
   FROM "public"."order_service_operations" "so"
  WHERE (("exception_code" IS NOT NULL) OR ("age_hours" >= (24)::numeric) OR "service_attention_required" OR (("operational_status" = ANY (ARRAY['ready_to_pack'::"text", 'packed'::"text"])) AND ("commerce_status" <> ALL (ARRAY['paid'::"public"."order_status", 'processing'::"public"."order_status"]))) OR (("operational_status" = 'handed_over'::"text") AND ("commerce_status" <> 'shipped'::"public"."order_status")) OR (("operational_status" = 'delivered'::"text") AND ("commerce_status" <> 'completed'::"public"."order_status")));


ALTER VIEW "public"."operations_exception_queue" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."operations_inventory_summary" WITH ("security_invoker"='true') AS
 SELECT ( SELECT "count"(*) AS "count"
           FROM "public"."order_operations_queue") AS "open_orders",
    ( SELECT "count"(*) AS "count"
           FROM "public"."order_operations"
          WHERE ("order_operations"."operational_status" = 'blocked'::"text")) AS "blocked_orders",
    ( SELECT "count"(*) AS "count"
           FROM "public"."order_operations"
          WHERE ("order_operations"."operational_status" = ANY (ARRAY['reserved'::"text", 'ready_to_pack'::"text", 'packed'::"text"]))) AS "fulfillment_backlog",
    ( SELECT "count"(*) AS "count"
           FROM "public"."inventory_available_to_promise"
          WHERE ("inventory_available_to_promise"."available_to_promise_quantity" = 0)) AS "zero_atp_variants",
    ( SELECT COALESCE("sum"("inventory_available_to_promise"."reserved_quantity"), (0)::bigint) AS "coalesce"
           FROM "public"."inventory_available_to_promise") AS "reserved_units",
    ( SELECT COALESCE("sum"("inventory_available_to_promise"."oversold_quantity"), (0)::bigint) AS "coalesce"
           FROM "public"."inventory_available_to_promise") AS "oversold_units";


ALTER VIEW "public"."operations_inventory_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."operations_kpi_summary" WITH ("security_invoker"='true') AS
 SELECT "count"(*) AS "open_orders",
    "count"(*) FILTER (WHERE ("operational_status" = 'blocked'::"text")) AS "blocked_orders",
    "count"(*) FILTER (WHERE ("operational_status" = 'ready_to_pack'::"text")) AS "ready_to_pack_orders",
    "count"(*) FILTER (WHERE ("operational_status" = 'packed'::"text")) AS "packed_orders",
    "count"(*) FILTER (WHERE ("age_hours" >= (24)::numeric)) AS "over_24h_orders",
    "count"(*) FILTER (WHERE "service_attention_required") AS "service_attention_orders",
    "count"(*) FILTER (WHERE (("customer_value_tier" = ANY (ARRAY['gold'::"text", 'platinum'::"text"])) AND ("operational_status" <> ALL (ARRAY['delivered'::"text", 'cancelled'::"text"])))) AS "high_value_open_orders",
    COALESCE("avg"("age_hours"), (0)::numeric) AS "avg_open_age_hours"
   FROM "public"."order_service_operations";


ALTER VIEW "public"."operations_kpi_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "from_status" "public"."order_status",
    "to_status" "public"."order_status",
    "actor_user_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL
);


ALTER TABLE "public"."order_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_inventory_restorations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "order_item_id" "uuid" NOT NULL,
    "source_type" "text" NOT NULL,
    "source_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "actor_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_inventory_restorations_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "order_inventory_restorations_source_type_check" CHECK (("source_type" = ANY (ARRAY['order_cancelled'::"text", 'return_case'::"text"])))
);


ALTER TABLE "public"."order_inventory_restorations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_request_keys" (
    "idempotency_key" "text" NOT NULL,
    "response" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "request_fingerprint" "text"
);


ALTER TABLE "public"."order_request_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organization_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organizations_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "provider_code" "text" NOT NULL,
    "provider_reference" "text",
    "status" "text" DEFAULT 'created'::"text" NOT NULL,
    "amount_huf" integer NOT NULL,
    "currency" "text" DEFAULT 'HUF'::"text" NOT NULL,
    "failure_code" "text",
    "failure_message" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "payment_attempts_amount_check" CHECK (("amount_huf" >= 0)),
    CONSTRAINT "payment_attempts_amount_huf_check" CHECK (("amount_huf" >= 0)),
    CONSTRAINT "payment_attempts_currency_check" CHECK (("currency" = 'HUF'::"text")),
    CONSTRAINT "payment_attempts_status_check" CHECK (("status" = ANY (ARRAY['created'::"text", 'pending'::"text", 'requires_action'::"text", 'succeeded'::"text", 'failed'::"text", 'cancelled'::"text", 'expired'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."payment_attempts" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_attempts" IS 'Provider-neutral online payment attempts. Failed or cancelled attempts do not cancel the order; a customer may retry payment.';



CREATE TABLE IF NOT EXISTS "public"."payment_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_code" "text" NOT NULL,
    "provider_event_id" "text" NOT NULL,
    "provider_reference" "text",
    "order_id" "uuid",
    "event_type" "text" NOT NULL,
    "payment_status" "text" NOT NULL,
    "signature_valid" boolean DEFAULT false NOT NULL,
    "payload_hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "payment_events_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'failed'::"text", 'cancelled'::"text", 'refunded'::"text", 'unknown'::"text"])))
);


ALTER TABLE "public"."payment_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_operators" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role" "text" DEFAULT 'operator'::"text" NOT NULL,
    CONSTRAINT "platform_operators_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'operator'::"text"])))
);


ALTER TABLE "public"."platform_operators" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_release_events" (
    "id" bigint NOT NULL,
    "event_key" "text" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "actor_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "post_release_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['started'::"text", 'evidence_recorded'::"text", 'finding_opened'::"text", 'finding_resolved'::"text", 'degraded'::"text", 'rollback_recommended'::"text", 'stable'::"text", 'closed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."post_release_events" OWNER TO "postgres";


ALTER TABLE "public"."post_release_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."post_release_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."post_release_findings_queue" WITH ("security_invoker"='true') AS
 SELECT "f"."id" AS "finding_id",
    "f"."session_id",
    "f"."finding_key",
    "f"."severity",
    "f"."status",
    "f"."title",
    "f"."description",
    "f"."occurrence_count",
    "f"."first_detected_at",
    "f"."last_detected_at",
    "e"."check_kind",
    "e"."source",
    "e"."status" AS "evidence_status",
    "e"."trusted",
    "e"."observed_at",
    "e"."evidence_hash"
   FROM ("public"."post_release_findings" "f"
     LEFT JOIN "public"."post_release_evidence" "e" ON (("e"."id" = "f"."last_evidence_id")))
  WHERE ("f"."status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text"]));


ALTER VIEW "public"."post_release_findings_queue" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."post_release_kpis" WITH ("security_invoker"='true') AS
 SELECT ("count"(*) FILTER (WHERE ("status" = 'observing'::"text")))::integer AS "observing",
    ("count"(*) FILTER (WHERE ("status" = 'degraded'::"text")))::integer AS "degraded",
    ("count"(*) FILTER (WHERE ("status" = 'rollback_recommended'::"text")))::integer AS "rollback_recommended",
    ("count"(*) FILTER (WHERE ("status" = 'stable'::"text")))::integer AS "stable",
    ("count"(*) FILTER (WHERE ("status" = 'closed'::"text")))::integer AS "closed",
    ("count"(*) FILTER (WHERE (("status" <> ALL (ARRAY['closed'::"text", 'cancelled'::"text"])) AND ("observation_ends_at" < "now"()))))::integer AS "overdue"
   FROM "public"."post_release_sessions";


ALTER VIEW "public"."post_release_kpis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_release_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "policy_key" "text" NOT NULL,
    "version" integer NOT NULL,
    "name" "text" NOT NULL,
    "observation_minutes" integer DEFAULT 120 NOT NULL,
    "critical_findings_block" boolean DEFAULT true NOT NULL,
    "high_findings_block" boolean DEFAULT true NOT NULL,
    "min_trusted_checks" integer DEFAULT 2 NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "definition" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "post_release_policies_min_trusted_checks_check" CHECK ((("min_trusted_checks" >= 1) AND ("min_trusted_checks" <= 20))),
    CONSTRAINT "post_release_policies_observation_minutes_check" CHECK ((("observation_minutes" >= 15) AND ("observation_minutes" <= 10080))),
    CONSTRAINT "post_release_policies_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."post_release_policies" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."post_release_session_queue" AS
SELECT
    NULL::"uuid" AS "session_id",
    NULL::"text" AS "session_key",
    NULL::"uuid" AS "release_candidate_id",
    NULL::"text" AS "source_sha",
    NULL::"text" AS "status",
    NULL::timestamp with time zone AS "started_at",
    NULL::timestamp with time zone AS "observation_ends_at",
    NULL::timestamp with time zone AS "stable_at",
    NULL::timestamp with time zone AS "closed_at",
    NULL::"text" AS "version_label",
    NULL::"text" AS "source_ref",
    NULL::"text" AS "risk_class",
    NULL::integer AS "evidence_count",
    NULL::integer AS "trusted_evidence_count",
    NULL::integer AS "trusted_passes",
    NULL::integer AS "critical_open",
    NULL::integer AS "high_open",
    NULL::"text" AS "evidence_bundle_hash";


ALTER VIEW "public"."post_release_session_queue" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."post_release_rollback_queue" WITH ("security_invoker"='true') AS
 SELECT "q"."session_id",
    "q"."session_key",
    "q"."release_candidate_id",
    "q"."source_sha",
    "q"."status",
    "q"."started_at",
    "q"."observation_ends_at",
    "q"."stable_at",
    "q"."closed_at",
    "q"."version_label",
    "q"."source_ref",
    "q"."risk_class",
    "q"."evidence_count",
    "q"."trusted_evidence_count",
    "q"."trusted_passes",
    "q"."critical_open",
    "q"."high_open",
    "q"."evidence_bundle_hash",
    "d"."decision" AS "latest_decision",
    "d"."note" AS "latest_decision_note",
    "d"."created_at" AS "latest_decision_at"
   FROM ("public"."post_release_session_queue" "q"
     LEFT JOIN LATERAL ( SELECT "x"."id",
            "x"."decision_key",
            "x"."session_id",
            "x"."decision",
            "x"."actor_id",
            "x"."note",
            "x"."session_evidence_hash",
            "x"."created_at"
           FROM "public"."post_release_rollback_decisions" "x"
          WHERE ("x"."session_id" = "q"."session_id")
          ORDER BY "x"."created_at" DESC
         LIMIT 1) "d" ON (true))
  WHERE ("q"."status" = ANY (ARRAY['degraded'::"text", 'rollback_recommended'::"text"]));


ALTER VIEW "public"."post_release_rollback_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_channel_settings" (
    "instance_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "channel_code" "text" NOT NULL,
    "visible" boolean DEFAULT true NOT NULL,
    "gross_price" integer,
    "minimum_quantity" integer DEFAULT 1 NOT NULL,
    "discount_percent" numeric(5,2),
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_channel_settings_channel_code_check" CHECK (("channel_code" = ANY (ARRAY['b2c'::"text", 'b2b'::"text"]))),
    CONSTRAINT "product_channel_settings_discount_percent_check" CHECK ((("discount_percent" IS NULL) OR (("discount_percent" >= (0)::numeric) AND ("discount_percent" <= (100)::numeric)))),
    CONSTRAINT "product_channel_settings_minimum_quantity_check" CHECK (("minimum_quantity" > 0))
);


ALTER TABLE "public"."product_channel_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_recommendation_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_variant_id" "uuid",
    "recommended_variant_id" "uuid" NOT NULL,
    "placement" "text" NOT NULL,
    "priority" integer DEFAULT 100 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "headline" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid",
    CONSTRAINT "product_recommendation_rules_check" CHECK ((("source_variant_id" IS NULL) OR ("source_variant_id" <> "recommended_variant_id"))),
    CONSTRAINT "product_recommendation_rules_placement_check" CHECK (("placement" = ANY (ARRAY['cart'::"text", 'post_purchase'::"text"]))),
    CONSTRAINT "product_recommendation_rules_priority_check" CHECK ((("priority" >= 0) AND ("priority" <= 10000)))
);


ALTER TABLE "public"."product_recommendation_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "rating" smallint NOT NULL,
    "title" "text",
    "body" "text",
    "reviewer_name" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "verified_purchase" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "moderated_at" timestamp with time zone,
    "instance_id" "uuid",
    CONSTRAINT "product_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "product_reviews_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."product_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "short_description" "text",
    "description" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "audience" "text" DEFAULT 'retail'::"text" NOT NULL,
    "featured" boolean DEFAULT false NOT NULL,
    "use_cases" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "highlights" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "products_audience_check" CHECK (("audience" = ANY (ARRAY['retail'::"text", 'professional'::"text"])))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON COLUMN "public"."products"."audience" IS 'Storefront audience used by the Shoperation catalog. Values: retail or professional.';



COMMENT ON COLUMN "public"."products"."featured" IS 'Whether the product is highlighted by default in storefront merchandising.';



COMMENT ON COLUMN "public"."products"."use_cases" IS 'Tenant-managed merchandising use-case labels for the product.';



COMMENT ON COLUMN "public"."products"."highlights" IS 'Tenant-managed merchandising highlight labels for the product.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "company_name" "text",
    "tax_number" "text",
    "role" "public"."customer_role" DEFAULT 'customer'::"public"."customer_role" NOT NULL,
    "reseller_approved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "subscription_plan" "text" DEFAULT 'alap'::"text" NOT NULL,
    CONSTRAINT "profiles_subscription_plan_check" CHECK (("subscription_plan" = ANY (ARRAY['alap'::"text", 'pro'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."subscription_plan" IS 'Shoperation package assignment. Defaults fail closed to Alap; Pro requires explicit assignment.';



CREATE TABLE IF NOT EXISTS "public"."purchase_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "purchase_order_id" "uuid" NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "received_quantity" integer DEFAULT 0 NOT NULL,
    "unit_cost_net_huf" numeric(12,2) NOT NULL,
    "line_net_huf" numeric(14,2) GENERATED ALWAYS AS ((("quantity")::numeric * "unit_cost_net_huf")) STORED,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "purchase_order_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "purchase_order_items_received_quantity_check" CHECK ((("received_quantity" >= 0) AND ("received_quantity" <= "quantity"))),
    CONSTRAINT "purchase_order_items_unit_cost_net_huf_check" CHECK (("unit_cost_net_huf" >= (0)::numeric))
);


ALTER TABLE "public"."purchase_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" "text" NOT NULL,
    "supplier_id" "uuid",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "ordered_at" timestamp with time zone,
    "expected_at" "date",
    "payment_due_at" "date",
    "net_total_huf" numeric(14,2) DEFAULT 0 NOT NULL,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "purchase_orders_net_total_huf_check" CHECK (("net_total_huf" >= (0)::numeric)),
    CONSTRAINT "purchase_orders_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'approved'::"text", 'ordered'::"text", 'partially_received'::"text", 'received'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."purchase_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."release_approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "slot" integer NOT NULL,
    "approver_id" "uuid" NOT NULL,
    "decision" "text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "gate_hash" "text" NOT NULL,
    CONSTRAINT "release_approvals_decision_check" CHECK (("decision" = ANY (ARRAY['approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "release_approvals_slot_check" CHECK (("slot" = ANY (ARRAY[1, 2])))
);


ALTER TABLE "public"."release_approvals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."release_changes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "change_key" "text" NOT NULL,
    "category" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "risk_level" "text" DEFAULT 'low'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "release_changes_category_check" CHECK (("category" = ANY (ARRAY['code'::"text", 'database'::"text", 'configuration'::"text", 'content'::"text", 'integration'::"text", 'operations'::"text"]))),
    CONSTRAINT "release_changes_risk_level_check" CHECK (("risk_level" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"])))
);


ALTER TABLE "public"."release_changes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."release_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "policy_key" "text" NOT NULL,
    "version" integer NOT NULL,
    "name" "text" NOT NULL,
    "risk_class" "text" NOT NULL,
    "min_assurance_score" integer DEFAULT 95 NOT NULL,
    "max_stale_controls" integer DEFAULT 0 NOT NULL,
    "max_high_findings" integer DEFAULT 0 NOT NULL,
    "max_accepted_risks" integer DEFAULT 0 NOT NULL,
    "require_ci_green" boolean DEFAULT true NOT NULL,
    "ci_freshness_minutes" integer DEFAULT 120 NOT NULL,
    "require_rollback_plan" boolean DEFAULT true NOT NULL,
    "approval_mode" "text" DEFAULT 'single'::"text" NOT NULL,
    "evaluation_valid_minutes" integer DEFAULT 120 NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "release_policies_approval_mode_check" CHECK (("approval_mode" = ANY (ARRAY['single'::"text", 'dual'::"text"]))),
    CONSTRAINT "release_policies_check" CHECK ((NOT (("risk_class" = 'high_impact'::"text") AND ("approval_mode" <> 'dual'::"text")))),
    CONSTRAINT "release_policies_ci_freshness_minutes_check" CHECK ((("ci_freshness_minutes" >= 5) AND ("ci_freshness_minutes" <= 10080))),
    CONSTRAINT "release_policies_evaluation_valid_minutes_check" CHECK ((("evaluation_valid_minutes" >= 5) AND ("evaluation_valid_minutes" <= 10080))),
    CONSTRAINT "release_policies_max_accepted_risks_check" CHECK (("max_accepted_risks" >= 0)),
    CONSTRAINT "release_policies_max_high_findings_check" CHECK (("max_high_findings" >= 0)),
    CONSTRAINT "release_policies_max_stale_controls_check" CHECK (("max_stale_controls" >= 0)),
    CONSTRAINT "release_policies_min_assurance_score_check" CHECK ((("min_assurance_score" >= 0) AND ("min_assurance_score" <= 100))),
    CONSTRAINT "release_policies_risk_class_check" CHECK (("risk_class" = ANY (ARRAY['standard'::"text", 'high_impact'::"text"]))),
    CONSTRAINT "release_policies_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."release_policies" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."release_candidate_queue" WITH ("security_invoker"='true') AS
 SELECT "c"."id" AS "candidate_id",
    "c"."candidate_key",
    "c"."version_label",
    "c"."source_ref",
    "c"."source_sha",
    "c"."risk_class",
    "c"."change_summary",
    "c"."status",
    "c"."ci_status",
    "c"."ci_observed_at",
    "public"."release_ci_is_trusted"("c"."id") AS "ci_trusted",
    "c"."assurance_score",
    "c"."assurance_bundle_hash",
    "c"."evaluated_at",
    "c"."expires_at",
    "c"."approved_at",
    "c"."created_at",
    "p"."policy_key",
    "p"."version" AS "policy_version",
    "p"."name" AS "policy_name",
    "p"."approval_mode",
    "p"."min_assurance_score",
    (( SELECT "count"(*) AS "count"
           FROM "public"."release_approvals" "a"
          WHERE (("a"."candidate_id" = "c"."id") AND ("a"."gate_hash" = "c"."gate_hash") AND ("a"."decision" = 'approved'::"text"))))::integer AS "approval_count",
    "public"."release_candidate_is_stale"("c"."id") AS "stale",
    (("public"."release_window_status"("c"."id") ->> 'allowed'::"text"))::boolean AS "window_allowed",
    (( SELECT "count"(*) AS "count"
           FROM "public"."release_changes" "ch"
          WHERE ("ch"."candidate_id" = "c"."id")))::integer AS "change_count",
    (( SELECT "count"(*) AS "count"
           FROM "public"."release_changes" "ch"
          WHERE (("ch"."candidate_id" = "c"."id") AND ("ch"."risk_level" = 'high'::"text"))))::integer AS "high_risk_changes"
   FROM ("public"."release_candidates" "c"
     JOIN "public"."release_policies" "p" ON (("p"."id" = "c"."policy_id")));


ALTER VIEW "public"."release_candidate_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."release_events" (
    "id" bigint NOT NULL,
    "event_key" "text" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "actor_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "release_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['created'::"text", 'ci_updated'::"text", 'evaluated'::"text", 'evaluation_invalidated'::"text", 'approval_added'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."release_events" OWNER TO "postgres";


ALTER TABLE "public"."release_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."release_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."release_gate_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gate_key" "text" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "gate_name" "text" NOT NULL,
    "status" "text" NOT NULL,
    "evidence" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "evidence_hash" "text" NOT NULL,
    "evaluated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "release_gate_results_status_check" CHECK (("status" = ANY (ARRAY['pass'::"text", 'fail'::"text", 'warning'::"text"])))
);


ALTER TABLE "public"."release_gate_results" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."release_governance_kpis" WITH ("security_invoker"='true') AS
 SELECT ("count"(*) FILTER (WHERE ("status" = 'draft'::"text")))::integer AS "draft",
    ("count"(*) FILTER (WHERE ("status" = ANY (ARRAY['evaluated'::"text", 'ready'::"text"]))))::integer AS "awaiting_decision",
    ("count"(*) FILTER (WHERE ("status" = 'approved'::"text")))::integer AS "approved",
    ("count"(*) FILTER (WHERE ("status" = 'rejected'::"text")))::integer AS "rejected",
    ("count"(*) FILTER (WHERE ("status" = 'expired'::"text")))::integer AS "expired",
    ("count"(*) FILTER (WHERE (("status" = ANY (ARRAY['evaluated'::"text", 'ready'::"text", 'approved'::"text"])) AND "public"."release_candidate_is_stale"("id"))))::integer AS "stale_candidates",
    ("count"(*) FILTER (WHERE (("risk_class" = 'high_impact'::"text") AND ("status" = ANY (ARRAY['draft'::"text", 'evaluated'::"text", 'ready'::"text", 'approved'::"text"])))))::integer AS "high_impact_open"
   FROM "public"."release_candidates";


ALTER VIEW "public"."release_governance_kpis" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."release_recent_governance_runs" WITH ("security_invoker"='true') AS
 SELECT "id",
    "run_key",
    "status",
    "invalidated_candidates",
    "started_at",
    "completed_at",
    "metadata"
   FROM "public"."release_governance_runs"
  ORDER BY "started_at" DESC;


ALTER VIEW "public"."release_recent_governance_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."release_windows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "window_key" "text" NOT NULL,
    "mode" "text" NOT NULL,
    "name" "text" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "risk_class" "text",
    "reason" "text",
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "release_windows_check" CHECK (("ends_at" > "starts_at")),
    CONSTRAINT "release_windows_mode_check" CHECK (("mode" = ANY (ARRAY['allow'::"text", 'freeze'::"text"]))),
    CONSTRAINT "release_windows_risk_class_check" CHECK (("risk_class" = ANY (ARRAY['standard'::"text", 'high_impact'::"text"])))
);


ALTER TABLE "public"."release_windows" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."reseller_reorder_signals" WITH ("security_invoker"='true') AS
 WITH "paid" AS (
         SELECT "o"."instance_id",
            "o"."customer_id",
            "lower"(TRIM(BOTH FROM "o"."customer_email")) AS "email_key",
            "o"."id" AS "order_id",
            "o"."created_at",
            "o"."total_gross_huf",
            "lag"("o"."created_at") OVER (PARTITION BY "o"."instance_id", COALESCE(("o"."customer_id")::"text", "lower"(TRIM(BOTH FROM "o"."customer_email"))) ORDER BY "o"."created_at") AS "previous_order_at"
           FROM "public"."orders" "o"
          WHERE ("o"."status" = ANY (ARRAY['paid'::"public"."order_status", 'processing'::"public"."order_status", 'shipped'::"public"."order_status", 'completed'::"public"."order_status"]))
        ), "g" AS (
         SELECT "paid"."instance_id",
            COALESCE(("paid"."customer_id")::"text", "paid"."email_key") AS "customer_key",
            ("max"(("paid"."customer_id")::"text"))::"uuid" AS "customer_id",
            "paid"."email_key",
            ("count"(*))::integer AS "paid_orders",
            "sum"("paid"."total_gross_huf") AS "revenue_gross_huf",
            "max"("paid"."created_at") AS "last_order_at",
            "avg"((EXTRACT(epoch FROM ("paid"."created_at" - "paid"."previous_order_at")) / (86400)::numeric)) FILTER (WHERE ("paid"."previous_order_at" IS NOT NULL)) AS "avg_reorder_days"
           FROM "paid"
          GROUP BY "paid"."instance_id", COALESCE(("paid"."customer_id")::"text", "paid"."email_key"), "paid"."email_key"
        )
 SELECT "g"."customer_key",
    "g"."customer_id",
    "p"."email",
    "p"."full_name",
    "p"."company_name",
    "g"."paid_orders",
    "g"."revenue_gross_huf",
    "g"."last_order_at",
    ("round"("g"."avg_reorder_days"))::integer AS "avg_reorder_days",
    ("floor"((EXTRACT(epoch FROM ("now"() - "g"."last_order_at")) / (86400)::numeric)))::integer AS "days_since_last_order",
        CASE
            WHEN (("g"."paid_orders" < 2) OR ("g"."avg_reorder_days" IS NULL)) THEN 'learning'::"text"
            WHEN (("now"() - "g"."last_order_at") >= "make_interval"("days" => GREATEST(1, (("round"("g"."avg_reorder_days"))::integer + 14)))) THEN 'overdue'::"text"
            WHEN (("now"() - "g"."last_order_at") >= "make_interval"("days" => GREATEST(1, (("round"("g"."avg_reorder_days"))::integer - 7)))) THEN 'due_soon'::"text"
            ELSE 'healthy'::"text"
        END AS "reorder_signal",
    "g"."instance_id"
   FROM ("g"
     JOIN "public"."profiles" "p" ON (("p"."id" = "g"."customer_id")))
  WHERE (("p"."role" = 'reseller'::"public"."customer_role") AND ("p"."reseller_approved" = true));


ALTER VIEW "public"."reseller_reorder_signals" OWNER TO "postgres";


COMMENT ON VIEW "public"."reseller_reorder_signals" IS 'V9 approved-reseller reorder cadence and overdue decision model.';



CREATE OR REPLACE VIEW "public"."reseller_growth_priorities" WITH ("security_invoker"='true') AS
 WITH "base" AS (
         SELECT "r"."customer_key",
            "r"."customer_id",
            "r"."email",
            "r"."full_name",
            "r"."company_name",
            "r"."paid_orders",
            "r"."revenue_gross_huf",
            "r"."last_order_at",
            "r"."avg_reorder_days",
            "r"."days_since_last_order",
            "r"."reorder_signal",
            "r"."instance_id",
                CASE
                    WHEN ("r"."paid_orders" > 0) THEN ("round"((("r"."revenue_gross_huf")::numeric / ("r"."paid_orders")::numeric)))::bigint
                    ELSE (0)::bigint
                END AS "avg_order_value_gross_huf",
                CASE
                    WHEN (("r"."reorder_signal" = 'overdue'::"text") AND ("r"."revenue_gross_huf" >= 250000)) THEN 100
                    WHEN ("r"."reorder_signal" = 'overdue'::"text") THEN 80
                    WHEN (("r"."reorder_signal" = 'due_soon'::"text") AND ("r"."revenue_gross_huf" >= 250000)) THEN 70
                    WHEN ("r"."reorder_signal" = 'due_soon'::"text") THEN 55
                    WHEN (("r"."reorder_signal" = 'learning'::"text") AND ("r"."revenue_gross_huf" >= 250000)) THEN 45
                    ELSE 20
                END AS "priority_score"
           FROM "public"."reseller_reorder_signals" "r"
        )
 SELECT "customer_key",
    "customer_id",
    "email",
    "full_name",
    "company_name",
    "paid_orders",
    "revenue_gross_huf",
    "last_order_at",
    "avg_reorder_days",
    "days_since_last_order",
    "reorder_signal",
    "avg_order_value_gross_huf",
    "priority_score",
    GREATEST((0)::bigint, "avg_order_value_gross_huf") AS "estimated_reorder_value_gross_huf",
        CASE
            WHEN ("priority_score" >= 90) THEN 'critical'::"text"
            WHEN ("priority_score" >= 70) THEN 'high'::"text"
            WHEN ("priority_score" >= 50) THEN 'medium'::"text"
            ELSE 'low'::"text"
        END AS "priority_band",
        CASE
            WHEN ("reorder_signal" = 'overdue'::"text") THEN 'Kapcsolatfelvétel és újrarendelési egyeztetés'::"text"
            WHEN ("reorder_signal" = 'due_soon'::"text") THEN 'Proaktív utánrendelési emlékeztető'::"text"
            WHEN ("reorder_signal" = 'learning'::"text") THEN 'Partnerciklus megfigyelése'::"text"
            ELSE 'Nincs azonnali teendő'::"text"
        END AS "recommended_action",
        CASE
            WHEN ("days_since_last_order" >= 180) THEN 'dormant'::"text"
            WHEN ("days_since_last_order" >= 90) THEN 'inactive'::"text"
            WHEN ("reorder_signal" = 'overdue'::"text") THEN 'late'::"text"
            ELSE 'active'::"text"
        END AS "inactivity_risk",
    "instance_id"
   FROM "base";


ALTER VIEW "public"."reseller_growth_priorities" OWNER TO "postgres";


COMMENT ON VIEW "public"."reseller_growth_priorities" IS 'V9 prioritized reseller growth opportunities using reorder cadence, account value and inactivity.';



CREATE OR REPLACE VIEW "public"."reseller_reorder_signals_v2" WITH ("security_invoker"='true') AS
 WITH "paid" AS (
         SELECT "o"."instance_id",
            "o"."customer_id",
            "lower"(TRIM(BOTH FROM "o"."customer_email")) AS "email_key",
            "o"."id" AS "order_id",
            "o"."created_at",
            "o"."total_gross_huf",
            "lag"("o"."created_at") OVER (PARTITION BY "o"."instance_id", COALESCE(("o"."customer_id")::"text", "lower"(TRIM(BOTH FROM "o"."customer_email"))) ORDER BY "o"."created_at") AS "previous_order_at"
           FROM "public"."orders" "o"
          WHERE ("o"."status" = ANY (ARRAY['paid'::"public"."order_status", 'processing'::"public"."order_status", 'shipped'::"public"."order_status", 'completed'::"public"."order_status"]))
        ), "grouped" AS (
         SELECT "paid"."instance_id",
            COALESCE(("paid"."customer_id")::"text", "paid"."email_key") AS "customer_key",
            ("max"(("paid"."customer_id")::"text"))::"uuid" AS "customer_id",
            "paid"."email_key",
            ("count"(*))::integer AS "paid_orders",
            "sum"("paid"."total_gross_huf") AS "revenue_gross_huf",
            "max"("paid"."created_at") AS "last_order_at",
            "avg"((EXTRACT(epoch FROM ("paid"."created_at" - "paid"."previous_order_at")) / (86400)::numeric)) FILTER (WHERE ("paid"."previous_order_at" IS NOT NULL)) AS "avg_reorder_days"
           FROM "paid"
          GROUP BY "paid"."instance_id", COALESCE(("paid"."customer_id")::"text", "paid"."email_key"), "paid"."email_key"
        )
 SELECT "g"."instance_id",
    "g"."customer_key",
    "g"."customer_id",
    "p"."email",
    "p"."full_name",
    "p"."company_name",
    "g"."paid_orders",
    "g"."revenue_gross_huf",
    "g"."last_order_at",
    ("round"("g"."avg_reorder_days"))::integer AS "avg_reorder_days",
    ("floor"((EXTRACT(epoch FROM ("now"() - "g"."last_order_at")) / (86400)::numeric)))::integer AS "days_since_last_order",
        CASE
            WHEN (("g"."paid_orders" < 2) OR ("g"."avg_reorder_days" IS NULL)) THEN 'learning'::"text"
            WHEN (("now"() - "g"."last_order_at") >= "make_interval"("days" => GREATEST(1, (("round"("g"."avg_reorder_days"))::integer + 14)))) THEN 'overdue'::"text"
            WHEN (("now"() - "g"."last_order_at") >= "make_interval"("days" => GREATEST(1, (("round"("g"."avg_reorder_days"))::integer - 7)))) THEN 'due_soon'::"text"
            ELSE 'healthy'::"text"
        END AS "reorder_signal"
   FROM (("grouped" "g"
     JOIN "public"."customer_instance_roles" "cir" ON ((("cir"."instance_id" = "g"."instance_id") AND ("cir"."user_id" = "g"."customer_id"))))
     JOIN "public"."profiles" "p" ON (("p"."id" = "g"."customer_id")))
  WHERE (("cir"."role" = 'reseller'::"public"."customer_role") AND ("cir"."reseller_approved" = true));


ALTER VIEW "public"."reseller_reorder_signals_v2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."reseller_growth_priorities_v2" WITH ("security_invoker"='true') AS
 WITH "base" AS (
         SELECT "r"."instance_id",
            "r"."customer_key",
            "r"."customer_id",
            "r"."email",
            "r"."full_name",
            "r"."company_name",
            "r"."paid_orders",
            "r"."revenue_gross_huf",
            "r"."last_order_at",
            "r"."avg_reorder_days",
            "r"."days_since_last_order",
            "r"."reorder_signal",
                CASE
                    WHEN ("r"."paid_orders" > 0) THEN ("round"((("r"."revenue_gross_huf")::numeric / ("r"."paid_orders")::numeric)))::bigint
                    ELSE (0)::bigint
                END AS "avg_order_value_gross_huf",
                CASE
                    WHEN (("r"."reorder_signal" = 'overdue'::"text") AND ("r"."revenue_gross_huf" >= 250000)) THEN 100
                    WHEN ("r"."reorder_signal" = 'overdue'::"text") THEN 80
                    WHEN (("r"."reorder_signal" = 'due_soon'::"text") AND ("r"."revenue_gross_huf" >= 250000)) THEN 70
                    WHEN ("r"."reorder_signal" = 'due_soon'::"text") THEN 55
                    WHEN (("r"."reorder_signal" = 'learning'::"text") AND ("r"."revenue_gross_huf" >= 250000)) THEN 45
                    ELSE 20
                END AS "priority_score"
           FROM "public"."reseller_reorder_signals_v2" "r"
        )
 SELECT "instance_id",
    "customer_key",
    "customer_id",
    "email",
    "full_name",
    "company_name",
    "paid_orders",
    "revenue_gross_huf",
    "last_order_at",
    "avg_reorder_days",
    "days_since_last_order",
    "reorder_signal",
    "avg_order_value_gross_huf",
    "priority_score",
    GREATEST((0)::bigint, "avg_order_value_gross_huf") AS "estimated_reorder_value_gross_huf",
        CASE
            WHEN ("priority_score" >= 90) THEN 'critical'::"text"
            WHEN ("priority_score" >= 70) THEN 'high'::"text"
            WHEN ("priority_score" >= 50) THEN 'medium'::"text"
            ELSE 'low'::"text"
        END AS "priority_band",
        CASE
            WHEN ("reorder_signal" = 'overdue'::"text") THEN 'Kapcsolatfelvétel és újrarendelési egyeztetés'::"text"
            WHEN ("reorder_signal" = 'due_soon'::"text") THEN 'Proaktív utánrendelési emlékeztető'::"text"
            WHEN ("reorder_signal" = 'learning'::"text") THEN 'Partnerciklus megfigyelése'::"text"
            ELSE 'Nincs azonnali teendő'::"text"
        END AS "recommended_action",
        CASE
            WHEN ("days_since_last_order" >= 180) THEN 'dormant'::"text"
            WHEN ("days_since_last_order" >= 90) THEN 'inactive'::"text"
            WHEN ("reorder_signal" = 'overdue'::"text") THEN 'late'::"text"
            ELSE 'active'::"text"
        END AS "inactivity_risk"
   FROM "base" "b";


ALTER VIEW "public"."reseller_growth_priorities_v2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."return_case_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "return_case_id" "uuid" NOT NULL,
    "order_item_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "return_case_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."return_case_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_bindings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "instance_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "role_code" "text" NOT NULL,
    "delegated_by" "uuid",
    "valid_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "valid_until" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "role_bindings_check" CHECK ((("valid_until" IS NULL) OR ("valid_until" > "valid_from"))),
    CONSTRAINT "role_bindings_role_code_check" CHECK (("role_code" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."role_bindings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rollout_environments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "environment_key" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "requires_manual_approval" boolean DEFAULT true NOT NULL,
    "requires_smoke_pass" boolean DEFAULT true NOT NULL,
    "requires_security_clearance" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rollout_environments_environment_key_check" CHECK (("environment_key" = ANY (ARRAY['preview'::"text", 'staging'::"text", 'production'::"text"])))
);


ALTER TABLE "public"."rollout_environments" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."rollout_readiness" WITH ("security_invoker"='true') AS
 SELECT "e"."environment_key",
    "e"."display_name",
    "c"."source_sha",
    ("count"(*) FILTER (WHERE ("c"."trusted" AND ("c"."status" = 'pass'::"text"))))::integer AS "trusted_passes",
    ("count"(*) FILTER (WHERE ("c"."trusted" AND ("c"."status" = ANY (ARRAY['fail'::"text", 'error'::"text"])))))::integer AS "trusted_failures",
    "bool_or"((("c"."check_kind" = 'smoke'::"text") AND "c"."trusted" AND ("c"."status" = 'pass'::"text"))) AS "smoke_pass",
    "bool_or"((("c"."check_kind" = 'security'::"text") AND "c"."trusted" AND ("c"."status" = 'pass'::"text"))) AS "security_pass",
    "bool_or"((("c"."check_kind" = 'migration'::"text") AND "c"."trusted" AND ("c"."status" = 'pass'::"text"))) AS "migration_pass",
    "md5"(COALESCE("string_agg"("c"."evidence_hash", '|'::"text" ORDER BY "c"."check_kind", "c"."evidence_hash"), ''::"text")) AS "evidence_bundle_hash"
   FROM ("public"."rollout_environments" "e"
     LEFT JOIN "public"."rollout_checks" "c" ON (("c"."environment_key" = "e"."environment_key")))
  GROUP BY "e"."environment_key", "e"."display_name", "c"."source_sha";


ALTER VIEW "public"."rollout_readiness" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "opportunity_id" "uuid",
    "offer_id" "uuid",
    "task_key" "text",
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "priority" integer DEFAULT 50 NOT NULL,
    "assigned_to" "uuid",
    "due_at" timestamp with time zone,
    "outcome" "text",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "sales_tasks_priority_check" CHECK ((("priority" >= 0) AND ("priority" <= 100))),
    CONSTRAINT "sales_tasks_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."sales_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_rate_limits" (
    "rate_key" "text" NOT NULL,
    "window_started_at" timestamp with time zone NOT NULL,
    "count" integer NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "security_rate_limits_count_check" CHECK (("count" >= 0))
);


ALTER TABLE "public"."security_rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "status" "text" DEFAULT 'waiting'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    "communication_job_id" "uuid",
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "stock_notifications_status_check" CHECK (("status" = ANY (ARRAY['waiting'::"text", 'queued'::"text", 'sent'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."stock_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "payment_terms_days" integer DEFAULT 8 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "suppliers_payment_terms_days_check" CHECK ((("payment_terms_days" >= 0) AND ("payment_terms_days" <= 365)))
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_ticket_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "author_user_id" "uuid",
    "author_role" "text" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid" NOT NULL,
    CONSTRAINT "support_ticket_messages_author_role_check" CHECK (("author_role" = ANY (ARRAY['customer'::"text", 'admin'::"text", 'system'::"text"]))),
    CONSTRAINT "support_ticket_messages_message_check" CHECK ((("char_length"("message") >= 1) AND ("char_length"("message") <= 4000)))
);


ALTER TABLE "public"."support_ticket_messages" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."tenant_operational_scope_gaps" WITH ("security_invoker"='true') AS
 SELECT 'payment_attempts'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."payment_attempts"
  WHERE ("payment_attempts"."instance_id" IS NULL)
UNION ALL
 SELECT 'payment_events'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."payment_events"
  WHERE ("payment_events"."instance_id" IS NULL)
UNION ALL
 SELECT 'fulfillment_events'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."fulfillment_events"
  WHERE ("fulfillment_events"."instance_id" IS NULL)
UNION ALL
 SELECT 'integration_jobs'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."integration_jobs"
  WHERE ("integration_jobs"."instance_id" IS NULL)
UNION ALL
 SELECT 'order_events'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."order_events"
  WHERE ("order_events"."instance_id" IS NULL)
UNION ALL
 SELECT 'order_operations'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."order_operations"
  WHERE ("order_operations"."instance_id" IS NULL)
UNION ALL
 SELECT 'purchase_orders'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."purchase_orders"
  WHERE ("purchase_orders"."instance_id" IS NULL)
UNION ALL
 SELECT 'purchase_order_items'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."purchase_order_items"
  WHERE ("purchase_order_items"."instance_id" IS NULL)
UNION ALL
 SELECT 'return_cases'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."return_cases"
  WHERE ("return_cases"."instance_id" IS NULL)
UNION ALL
 SELECT 'return_case_items'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."return_case_items"
  WHERE ("return_case_items"."instance_id" IS NULL)
UNION ALL
 SELECT 'support_tickets'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."support_tickets"
  WHERE ("support_tickets"."instance_id" IS NULL)
UNION ALL
 SELECT 'support_ticket_messages'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."support_ticket_messages"
  WHERE ("support_ticket_messages"."instance_id" IS NULL);


ALTER VIEW "public"."tenant_operational_scope_gaps" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."tenant_scope_gaps" WITH ("security_invoker"='true') AS
 SELECT 'products'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."products"
  WHERE ("products"."instance_id" IS NULL)
UNION ALL
 SELECT 'product_variants'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."product_variants"
  WHERE ("product_variants"."instance_id" IS NULL)
UNION ALL
 SELECT 'orders'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."orders"
  WHERE ("orders"."instance_id" IS NULL)
UNION ALL
 SELECT 'order_items'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."order_items"
  WHERE ("order_items"."instance_id" IS NULL)
UNION ALL
 SELECT 'inventory_events'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."inventory_events"
  WHERE ("inventory_events"."instance_id" IS NULL)
UNION ALL
 SELECT 'inventory_reservations'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."inventory_reservations"
  WHERE ("inventory_reservations"."instance_id" IS NULL)
UNION ALL
 SELECT 'inventory_snapshots'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."inventory_snapshots"
  WHERE ("inventory_snapshots"."instance_id" IS NULL)
UNION ALL
 SELECT 'marketing_campaigns'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."marketing_campaigns"
  WHERE ("marketing_campaigns"."instance_id" IS NULL)
UNION ALL
 SELECT 'marketing_campaign_recipients'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."marketing_campaign_recipients"
  WHERE ("marketing_campaign_recipients"."instance_id" IS NULL)
UNION ALL
 SELECT 'content_pages'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."content_pages"
  WHERE ("content_pages"."instance_id" IS NULL)
UNION ALL
 SELECT 'coupons'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."coupons"
  WHERE ("coupons"."instance_id" IS NULL)
UNION ALL
 SELECT 'marketing_consents'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."marketing_consents"
  WHERE ("marketing_consents"."instance_id" IS NULL)
UNION ALL
 SELECT 'communication_suppressions'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."communication_suppressions"
  WHERE ("communication_suppressions"."instance_id" IS NULL)
UNION ALL
 SELECT 'communication_jobs'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."communication_jobs"
  WHERE ("communication_jobs"."instance_id" IS NULL)
UNION ALL
 SELECT 'checkout_recovery_intents'::"text" AS "table_name",
    "count"(*) AS "rows_without_instance"
   FROM "public"."checkout_recovery_intents"
  WHERE ("checkout_recovery_intents"."instance_id" IS NULL);


ALTER VIEW "public"."tenant_scope_gaps" OWNER TO "postgres";


COMMENT ON VIEW "public"."tenant_scope_gaps" IS 'Architecture hardening diagnostic. Strict tenant RLS must not be enabled until every count is zero.';



CREATE OR REPLACE VIEW "public"."v9_channel_retention_summary" WITH ("security_invoker"='true') AS
 WITH "paid" AS (
         SELECT "o"."id",
            "o"."customer_id",
            "lower"(TRIM(BOTH FROM "o"."customer_email")) AS "email_key",
            "o"."created_at",
            "o"."total_gross_huf",
                CASE
                    WHEN (("p"."role" = 'reseller'::"public"."customer_role") AND ("p"."reseller_approved" = true)) THEN 'reseller'::"text"
                    ELSE 'retail'::"text"
                END AS "channel"
           FROM ("public"."orders" "o"
             LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "o"."customer_id")))
          WHERE ("o"."status" = ANY (ARRAY['paid'::"public"."order_status", 'processing'::"public"."order_status", 'shipped'::"public"."order_status", 'completed'::"public"."order_status"]))
        ), "customer_stats" AS (
         SELECT "paid"."channel",
            COALESCE(("paid"."customer_id")::"text", "paid"."email_key") AS "customer_key",
            ("count"(*))::integer AS "orders_count",
            "sum"("paid"."total_gross_huf") AS "revenue_gross_huf",
            "min"("paid"."created_at") AS "first_order_at",
            "max"("paid"."created_at") AS "last_order_at"
           FROM "paid"
          GROUP BY "paid"."channel", COALESCE(("paid"."customer_id")::"text", "paid"."email_key")
        )
 SELECT "channel",
    ("count"(*))::integer AS "paying_customers",
    ("count"(*) FILTER (WHERE ("orders_count" >= 2)))::integer AS "repeat_customers",
    "round"(((100.0 * ("count"(*) FILTER (WHERE ("orders_count" >= 2)))::numeric) / (NULLIF("count"(*), 0))::numeric), 1) AS "repeat_rate_percent",
    ("sum"("orders_count"))::integer AS "paid_orders",
    ("sum"("revenue_gross_huf"))::bigint AS "revenue_gross_huf",
    ("round"(("sum"("revenue_gross_huf") / (NULLIF("sum"("orders_count"), 0))::numeric)))::bigint AS "aov_gross_huf",
    ("round"(("sum"("revenue_gross_huf") / (NULLIF("count"(*), 0))::numeric)))::bigint AS "ltv_gross_huf",
    ("count"(*) FILTER (WHERE ("last_order_at" >= ("now"() - '90 days'::interval))))::integer AS "active_90d_customers",
    ("count"(*) FILTER (WHERE ("last_order_at" < ("now"() - '90 days'::interval))))::integer AS "inactive_90d_customers"
   FROM "customer_stats"
  GROUP BY "channel";


ALTER VIEW "public"."v9_channel_retention_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."v9_channel_retention_summary" IS 'V9 executive retail/reseller repeat-rate, LTV, AOV and inactivity summary.';



CREATE OR REPLACE VIEW "public"."v9_channel_retention_summary_v2" WITH ("security_invoker"='true') AS
 WITH "paid" AS (
         SELECT "o"."instance_id",
            "o"."id",
            "o"."customer_id",
            "lower"(TRIM(BOTH FROM "o"."customer_email")) AS "email_key",
            "o"."created_at",
            "o"."total_gross_huf",
                CASE
                    WHEN (("cir"."role" = 'reseller'::"public"."customer_role") AND ("cir"."reseller_approved" = true)) THEN 'reseller'::"text"
                    ELSE 'retail'::"text"
                END AS "channel"
           FROM ("public"."orders" "o"
             LEFT JOIN "public"."customer_instance_roles" "cir" ON ((("cir"."instance_id" = "o"."instance_id") AND ("cir"."user_id" = "o"."customer_id"))))
          WHERE ("o"."status" = ANY (ARRAY['paid'::"public"."order_status", 'processing'::"public"."order_status", 'shipped'::"public"."order_status", 'completed'::"public"."order_status"]))
        ), "customer_stats" AS (
         SELECT "paid"."instance_id",
            "paid"."channel",
            COALESCE(("paid"."customer_id")::"text", "paid"."email_key") AS "customer_key",
            ("count"(*))::integer AS "orders_count",
            "sum"("paid"."total_gross_huf") AS "revenue_gross_huf",
            "min"("paid"."created_at") AS "first_order_at",
            "max"("paid"."created_at") AS "last_order_at"
           FROM "paid"
          GROUP BY "paid"."instance_id", "paid"."channel", COALESCE(("paid"."customer_id")::"text", "paid"."email_key")
        )
 SELECT "instance_id",
    "channel",
    ("count"(*))::integer AS "paying_customers",
    ("count"(*) FILTER (WHERE ("orders_count" >= 2)))::integer AS "repeat_customers",
    "round"(((100.0 * ("count"(*) FILTER (WHERE ("orders_count" >= 2)))::numeric) / (NULLIF("count"(*), 0))::numeric), 1) AS "repeat_rate_percent",
    ("sum"("orders_count"))::integer AS "paid_orders",
    ("sum"("revenue_gross_huf"))::bigint AS "revenue_gross_huf",
    ("round"(("sum"("revenue_gross_huf") / (NULLIF("sum"("orders_count"), 0))::numeric)))::bigint AS "aov_gross_huf",
    ("round"(("sum"("revenue_gross_huf") / (NULLIF("count"(*), 0))::numeric)))::bigint AS "ltv_gross_huf",
    ("count"(*) FILTER (WHERE ("last_order_at" >= ("now"() - '90 days'::interval))))::integer AS "active_90d_customers",
    ("count"(*) FILTER (WHERE ("last_order_at" < ("now"() - '90 days'::interval))))::integer AS "inactive_90d_customers"
   FROM "customer_stats"
  GROUP BY "instance_id", "channel";


ALTER VIEW "public"."v9_channel_retention_summary_v2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v9_growth_dashboard" WITH ("security_invoker"='true') AS
 SELECT ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."customer_commercial_metrics") AS "paying_customers",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."customer_commercial_metrics"
          WHERE ("customer_commercial_metrics"."segment" = 'vip'::"text")) AS "vip_customers",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."customer_commercial_metrics"
          WHERE ("customer_commercial_metrics"."segment" = 'at_risk'::"text")) AS "at_risk_customers",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."customer_commercial_metrics"
          WHERE ("customer_commercial_metrics"."segment" = ANY (ARRAY['winback'::"text", 'dormant'::"text"]))) AS "winback_customers",
    ( SELECT (COALESCE("sum"("customer_commercial_metrics"."revenue_gross_huf"), (0)::numeric))::bigint AS "coalesce"
           FROM "public"."customer_commercial_metrics") AS "customer_lifetime_revenue_gross_huf",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."checkout_recovery_intents"
          WHERE (("checkout_recovery_intents"."status" = 'open'::"text") AND ("checkout_recovery_intents"."expires_at" > "now"()))) AS "open_checkout_recoveries",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."customer_journeys"
          WHERE ("customer_journeys"."status" = 'active'::"public"."customer_journey_status")) AS "active_journeys",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."customer_journey_steps"
          WHERE (("customer_journey_steps"."status" = 'pending'::"text") AND ("customer_journey_steps"."scheduled_at" <= "now"()))) AS "due_journey_steps",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."reseller_reorder_signals"
          WHERE ("reseller_reorder_signals"."reorder_signal" = 'overdue'::"text")) AS "overdue_resellers",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."reseller_reorder_signals"
          WHERE ("reseller_reorder_signals"."reorder_signal" = 'due_soon'::"text")) AS "due_soon_resellers",
    "now"() AS "calculated_at";


ALTER VIEW "public"."v9_growth_dashboard" OWNER TO "postgres";


COMMENT ON VIEW "public"."v9_growth_dashboard" IS 'V9 single-row executive retention, recovery and reseller reorder decision summary.';



CREATE OR REPLACE VIEW "public"."v9_growth_dashboard_v2" WITH ("security_invoker"='true') AS
 SELECT "id" AS "instance_id",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."customer_commercial_metrics" "c"
          WHERE ("c"."instance_id" = "w"."id")) AS "paying_customers",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."customer_commercial_metrics" "c"
          WHERE (("c"."instance_id" = "w"."id") AND ("c"."segment" = 'vip'::"text"))) AS "vip_customers",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."customer_commercial_metrics" "c"
          WHERE (("c"."instance_id" = "w"."id") AND ("c"."segment" = 'at_risk'::"text"))) AS "at_risk_customers",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."customer_commercial_metrics" "c"
          WHERE (("c"."instance_id" = "w"."id") AND ("c"."segment" = ANY (ARRAY['winback'::"text", 'dormant'::"text"])))) AS "winback_customers",
    ( SELECT (COALESCE("sum"("c"."revenue_gross_huf"), (0)::numeric))::bigint AS "coalesce"
           FROM "public"."customer_commercial_metrics" "c"
          WHERE ("c"."instance_id" = "w"."id")) AS "customer_lifetime_revenue_gross_huf",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."checkout_recovery_intents" "r"
          WHERE (("r"."instance_id" = "w"."id") AND ("r"."status" = 'open'::"text") AND ("r"."expires_at" > "now"()))) AS "open_checkout_recoveries",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."customer_journeys" "j"
          WHERE (("j"."instance_id" = "w"."id") AND ("j"."status" = 'active'::"public"."customer_journey_status"))) AS "active_journeys",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."customer_journey_steps" "s"
          WHERE (("s"."instance_id" = "w"."id") AND ("s"."status" = 'pending'::"text") AND ("s"."scheduled_at" <= "now"()))) AS "due_journey_steps",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."reseller_reorder_signals_v2" "r"
          WHERE (("r"."instance_id" = "w"."id") AND ("r"."reorder_signal" = 'overdue'::"text"))) AS "overdue_resellers",
    ( SELECT ("count"(*))::integer AS "count"
           FROM "public"."reseller_reorder_signals_v2" "r"
          WHERE (("r"."instance_id" = "w"."id") AND ("r"."reorder_signal" = 'due_soon'::"text"))) AS "due_soon_resellers",
    "now"() AS "calculated_at"
   FROM "public"."webshop_instances" "w"
  WHERE ("status" = ANY (ARRAY['pilot'::"text", 'active'::"text"]));


ALTER VIEW "public"."v9_growth_dashboard_v2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v9_monthly_customer_cohorts" WITH ("security_invoker"='true') AS
 WITH "paid" AS (
         SELECT COALESCE(("o"."customer_id")::"text", "lower"(TRIM(BOTH FROM "o"."customer_email"))) AS "customer_key",
            ("date_trunc"('month'::"text", "o"."created_at"))::"date" AS "order_month",
            "o"."total_gross_huf"
           FROM "public"."orders" "o"
          WHERE ("o"."status" = ANY (ARRAY['paid'::"public"."order_status", 'processing'::"public"."order_status", 'shipped'::"public"."order_status", 'completed'::"public"."order_status"]))
        ), "firsts" AS (
         SELECT "paid"."customer_key",
            "min"("paid"."order_month") AS "cohort_month"
           FROM "paid"
          GROUP BY "paid"."customer_key"
        ), "activity" AS (
         SELECT "f"."cohort_month",
            "p"."customer_key",
            "p"."order_month",
            (((EXTRACT(year FROM "age"(("p"."order_month")::timestamp with time zone, ("f"."cohort_month")::timestamp with time zone)) * (12)::numeric) + EXTRACT(month FROM "age"(("p"."order_month")::timestamp with time zone, ("f"."cohort_month")::timestamp with time zone))))::integer AS "month_number",
            "sum"("p"."total_gross_huf") AS "revenue_gross_huf"
           FROM ("paid" "p"
             JOIN "firsts" "f" USING ("customer_key"))
          GROUP BY "f"."cohort_month", "p"."customer_key", "p"."order_month"
        ), "sizes" AS (
         SELECT "firsts"."cohort_month",
            ("count"(*))::integer AS "cohort_customers"
           FROM "firsts"
          GROUP BY "firsts"."cohort_month"
        )
 SELECT "a"."cohort_month",
    "a"."month_number",
    "s"."cohort_customers",
    ("count"(DISTINCT "a"."customer_key"))::integer AS "active_customers",
    "round"(((100.0 * ("count"(DISTINCT "a"."customer_key"))::numeric) / (NULLIF("s"."cohort_customers", 0))::numeric), 1) AS "retention_percent",
    ("sum"("a"."revenue_gross_huf"))::bigint AS "revenue_gross_huf"
   FROM ("activity" "a"
     JOIN "sizes" "s" USING ("cohort_month"))
  GROUP BY "a"."cohort_month", "a"."month_number", "s"."cohort_customers"
  ORDER BY "a"."cohort_month" DESC, "a"."month_number";


ALTER VIEW "public"."v9_monthly_customer_cohorts" OWNER TO "postgres";


COMMENT ON VIEW "public"."v9_monthly_customer_cohorts" IS 'V9 monthly customer cohort retention and revenue view.';



CREATE OR REPLACE VIEW "public"."v9_monthly_customer_cohorts_v2" WITH ("security_invoker"='true') AS
 WITH "paid" AS (
         SELECT "o"."instance_id",
            COALESCE(("o"."customer_id")::"text", "lower"(TRIM(BOTH FROM "o"."customer_email"))) AS "customer_key",
            ("date_trunc"('month'::"text", "o"."created_at"))::"date" AS "order_month",
            "o"."total_gross_huf"
           FROM "public"."orders" "o"
          WHERE ("o"."status" = ANY (ARRAY['paid'::"public"."order_status", 'processing'::"public"."order_status", 'shipped'::"public"."order_status", 'completed'::"public"."order_status"]))
        ), "firsts" AS (
         SELECT "paid"."instance_id",
            "paid"."customer_key",
            "min"("paid"."order_month") AS "cohort_month"
           FROM "paid"
          GROUP BY "paid"."instance_id", "paid"."customer_key"
        ), "activity" AS (
         SELECT "p"."instance_id",
            "f"."cohort_month",
            "p"."customer_key",
            "p"."order_month",
            (((EXTRACT(year FROM "age"(("p"."order_month")::timestamp with time zone, ("f"."cohort_month")::timestamp with time zone)) * (12)::numeric) + EXTRACT(month FROM "age"(("p"."order_month")::timestamp with time zone, ("f"."cohort_month")::timestamp with time zone))))::integer AS "month_number",
            "sum"("p"."total_gross_huf") AS "revenue_gross_huf"
           FROM ("paid" "p"
             JOIN "firsts" "f" ON ((("f"."instance_id" = "p"."instance_id") AND ("f"."customer_key" = "p"."customer_key"))))
          GROUP BY "p"."instance_id", "f"."cohort_month", "p"."customer_key", "p"."order_month"
        ), "sizes" AS (
         SELECT "firsts"."instance_id",
            "firsts"."cohort_month",
            ("count"(*))::integer AS "cohort_customers"
           FROM "firsts"
          GROUP BY "firsts"."instance_id", "firsts"."cohort_month"
        )
 SELECT "a"."instance_id",
    "a"."cohort_month",
    "a"."month_number",
    "s"."cohort_customers",
    ("count"(DISTINCT "a"."customer_key"))::integer AS "active_customers",
    "round"(((100.0 * ("count"(DISTINCT "a"."customer_key"))::numeric) / (NULLIF("s"."cohort_customers", 0))::numeric), 1) AS "retention_percent",
    ("sum"("a"."revenue_gross_huf"))::bigint AS "revenue_gross_huf"
   FROM ("activity" "a"
     JOIN "sizes" "s" ON ((("s"."instance_id" = "a"."instance_id") AND ("s"."cohort_month" = "a"."cohort_month"))))
  GROUP BY "a"."instance_id", "a"."cohort_month", "a"."month_number", "s"."cohort_customers";


ALTER VIEW "public"."v9_monthly_customer_cohorts_v2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webshop_instance_addons" (
    "instance_id" "uuid" NOT NULL,
    "addon_code" "text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."webshop_instance_addons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webshop_instance_commerce_settings" (
    "instance_id" "uuid" NOT NULL,
    "enabled_shipping_methods" "text"[] DEFAULT ARRAY[]::"text"[] NOT NULL,
    "enabled_payment_methods" "text"[] DEFAULT ARRAY[]::"text"[] NOT NULL,
    "free_shipping_threshold_huf" integer DEFAULT 0 NOT NULL,
    "foxpost_fee_huf" integer DEFAULT 1490 NOT NULL,
    "gls_fee_huf" integer DEFAULT 2190 NOT NULL,
    "mpl_fee_huf" integer DEFAULT 1990 NOT NULL,
    "pickup_fee_huf" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "webshop_instance_commerce_set_free_shipping_threshold_huf_check" CHECK (("free_shipping_threshold_huf" >= 0)),
    CONSTRAINT "webshop_instance_commerce_settings_foxpost_fee_huf_check" CHECK (("foxpost_fee_huf" >= 0)),
    CONSTRAINT "webshop_instance_commerce_settings_gls_fee_huf_check" CHECK (("gls_fee_huf" >= 0)),
    CONSTRAINT "webshop_instance_commerce_settings_mpl_fee_huf_check" CHECK (("mpl_fee_huf" >= 0)),
    CONSTRAINT "webshop_instance_commerce_settings_pickup_fee_huf_check" CHECK (("pickup_fee_huf" >= 0)),
    CONSTRAINT "webshop_instance_payment_methods_check" CHECK (("enabled_payment_methods" <@ ARRAY['kh_card'::"text", 'simplepay'::"text", 'stripe'::"text", 'barion'::"text", 'bank_transfer'::"text", 'cash_on_delivery'::"text", 'custom_payment_api'::"text"])),
    CONSTRAINT "webshop_instance_shipping_methods_check" CHECK (("enabled_shipping_methods" <@ ARRAY['foxpost'::"text", 'gls'::"text", 'mpl'::"text", 'dpd'::"text", 'packeta'::"text", 'expressone'::"text", 'pickup'::"text", 'custom_shipping_api'::"text"]))
);


ALTER TABLE "public"."webshop_instance_commerce_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webshop_instance_members" (
    "instance_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "webshop_instance_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'staff'::"text"])))
);


ALTER TABLE "public"."webshop_instance_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webshop_instance_provider_connections" (
    "instance_id" "uuid" NOT NULL,
    "provider_code" "text" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "display_label" "text",
    "fee_huf" integer,
    "configuration" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "connection_status" "text" DEFAULT 'not_configured'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "onboarding_step" "text" DEFAULT 'selection'::"text" NOT NULL,
    "last_tested_at" timestamp with time zone,
    "last_test_message" "text",
    "credential_fields_present" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    CONSTRAINT "webshop_instance_provider_connections_connection_status_check" CHECK (("connection_status" = ANY (ARRAY['not_configured'::"text", 'configured'::"text", 'active'::"text", 'error'::"text"]))),
    CONSTRAINT "webshop_instance_provider_connections_fee_huf_check" CHECK ((("fee_huf" IS NULL) OR ("fee_huf" >= 0))),
    CONSTRAINT "webshop_instance_provider_connections_onboarding_step_check" CHECK (("onboarding_step" = ANY (ARRAY['selection'::"text", 'contract'::"text", 'credentials'::"text", 'verification'::"text", 'ready'::"text"])))
);


ALTER TABLE "public"."webshop_instance_provider_connections" OWNER TO "postgres";


COMMENT ON COLUMN "public"."webshop_instance_provider_connections"."credential_fields_present" IS 'Only non-secret credential field names. Secret values must remain in server-side environment/secret storage.';



CREATE TABLE IF NOT EXISTS "public"."webshop_sales_channels" (
    "instance_id" "uuid" NOT NULL,
    "channel_code" "text" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "webshop_sales_channels_channel_code_check" CHECK (("channel_code" = ANY (ARRAY['b2c'::"text", 'b2b'::"text"])))
);


ALTER TABLE "public"."webshop_sales_channels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wishlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instance_id" "uuid"
);


ALTER TABLE "public"."wishlists" OWNER TO "postgres";


ALTER TABLE ONLY "private"."platform_owner_claims"
    ADD CONSTRAINT "platform_owner_claims_pkey" PRIMARY KEY ("email");



ALTER TABLE ONLY "private"."stock_notification_rate_limits"
    ADD CONSTRAINT "stock_notification_rate_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."action_approvals"
    ADD CONSTRAINT "action_approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."action_approvals"
    ADD CONSTRAINT "action_approvals_proposal_id_approver_id_key" UNIQUE ("proposal_id", "approver_id");



ALTER TABLE ONLY "public"."action_approvals"
    ADD CONSTRAINT "action_approvals_proposal_id_slot_key" UNIQUE ("proposal_id", "slot");



ALTER TABLE ONLY "public"."action_executions"
    ADD CONSTRAINT "action_executions_execution_key_key" UNIQUE ("execution_key");



ALTER TABLE ONLY "public"."action_executions"
    ADD CONSTRAINT "action_executions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."action_policies"
    ADD CONSTRAINT "action_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."action_policies"
    ADD CONSTRAINT "action_policies_policy_key_version_key" UNIQUE ("policy_key", "version");



ALTER TABLE ONLY "public"."action_processing_runs"
    ADD CONSTRAINT "action_processing_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."action_proposal_events"
    ADD CONSTRAINT "action_proposal_events_event_key_key" UNIQUE ("event_key");



ALTER TABLE ONLY "public"."action_proposal_events"
    ADD CONSTRAINT "action_proposal_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."action_proposals"
    ADD CONSTRAINT "action_proposals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assurance_controls"
    ADD CONSTRAINT "assurance_controls_control_key_version_key" UNIQUE ("control_key", "version");



ALTER TABLE ONLY "public"."assurance_controls"
    ADD CONSTRAINT "assurance_controls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assurance_events"
    ADD CONSTRAINT "assurance_events_event_key_key" UNIQUE ("event_key");



ALTER TABLE ONLY "public"."assurance_events"
    ADD CONSTRAINT "assurance_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assurance_evidence"
    ADD CONSTRAINT "assurance_evidence_evidence_key_key" UNIQUE ("evidence_key");



ALTER TABLE ONLY "public"."assurance_evidence"
    ADD CONSTRAINT "assurance_evidence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assurance_findings"
    ADD CONSTRAINT "assurance_findings_finding_key_key" UNIQUE ("finding_key");



ALTER TABLE ONLY "public"."assurance_findings"
    ADD CONSTRAINT "assurance_findings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assurance_runs"
    ADD CONSTRAINT "assurance_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assurance_runs"
    ADD CONSTRAINT "assurance_runs_run_key_key" UNIQUE ("run_key");



ALTER TABLE ONLY "public"."automation_control_events"
    ADD CONSTRAINT "automation_control_events_event_key_key" UNIQUE ("event_key");



ALTER TABLE ONLY "public"."automation_control_events"
    ADD CONSTRAINT "automation_control_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_control"
    ADD CONSTRAINT "automation_control_pkey" PRIMARY KEY ("instance_id");



ALTER TABLE ONLY "public"."automation_events"
    ADD CONSTRAINT "automation_events_event_key_key" UNIQUE ("event_key");



ALTER TABLE ONLY "public"."automation_events"
    ADD CONSTRAINT "automation_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_processing_runs"
    ADD CONSTRAINT "automation_processing_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_runbook_instances"
    ADD CONSTRAINT "automation_runbook_instances_instance_key_key" UNIQUE ("instance_key");



ALTER TABLE ONLY "public"."automation_runbook_instances"
    ADD CONSTRAINT "automation_runbook_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_runbook_steps"
    ADD CONSTRAINT "automation_runbook_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_runbook_steps"
    ADD CONSTRAINT "automation_runbook_steps_runbook_id_step_key_key" UNIQUE ("runbook_id", "step_key");



ALTER TABLE ONLY "public"."automation_runbook_steps"
    ADD CONSTRAINT "automation_runbook_steps_runbook_id_step_order_key" UNIQUE ("runbook_id", "step_order");



ALTER TABLE ONLY "public"."automation_runbooks"
    ADD CONSTRAINT "automation_runbooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_runbooks"
    ADD CONSTRAINT "automation_runbooks_runbook_key_version_key" UNIQUE ("runbook_key", "version");



ALTER TABLE ONLY "public"."automation_step_runs"
    ADD CONSTRAINT "automation_step_runs_instance_id_step_id_key" UNIQUE ("instance_id", "step_id");



ALTER TABLE ONLY "public"."automation_step_runs"
    ADD CONSTRAINT "automation_step_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checkout_recovery_intents"
    ADD CONSTRAINT "checkout_recovery_intents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checkout_recovery_intents"
    ADD CONSTRAINT "checkout_recovery_intents_recovery_token_key" UNIQUE ("recovery_token");



ALTER TABLE ONLY "public"."commerce_provider_catalog"
    ADD CONSTRAINT "commerce_provider_catalog_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."commercial_offers"
    ADD CONSTRAINT "commercial_offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commercial_opportunities"
    ADD CONSTRAINT "commercial_opportunities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communication_job_events"
    ADD CONSTRAINT "communication_job_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communication_jobs"
    ADD CONSTRAINT "communication_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communication_suppression_events"
    ADD CONSTRAINT "communication_suppression_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communication_suppressions"
    ADD CONSTRAINT "communication_suppressions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communication_worker_runs"
    ADD CONSTRAINT "communication_worker_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_pages"
    ADD CONSTRAINT "content_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."control_alert_events"
    ADD CONSTRAINT "control_alert_events_event_key_key" UNIQUE ("event_key");



ALTER TABLE ONLY "public"."control_alert_events"
    ADD CONSTRAINT "control_alert_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."control_alerts"
    ADD CONSTRAINT "control_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."control_processing_runs"
    ADD CONSTRAINT "control_processing_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."control_tasks"
    ADD CONSTRAINT "control_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."control_tasks"
    ADD CONSTRAINT "control_tasks_task_key_key" UNIQUE ("task_key");



ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_instance_id_order_id_coupon_id_key" UNIQUE ("instance_id", "order_id", "coupon_id");



ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_instance_roles"
    ADD CONSTRAINT "customer_instance_roles_pkey" PRIMARY KEY ("instance_id", "user_id");



ALTER TABLE ONLY "public"."customer_journey_steps"
    ADD CONSTRAINT "customer_journey_steps_journey_id_step_key_key" UNIQUE ("journey_id", "step_key");



ALTER TABLE ONLY "public"."customer_journey_steps"
    ADD CONSTRAINT "customer_journey_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_journeys"
    ADD CONSTRAINT "customer_journeys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_lifecycle_milestones"
    ADD CONSTRAINT "customer_lifecycle_milestones_customer_id_milestone_key_key" UNIQUE ("customer_id", "milestone_key");



ALTER TABLE ONLY "public"."customer_lifecycle_milestones"
    ADD CONSTRAINT "customer_lifecycle_milestones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_value_profiles"
    ADD CONSTRAINT "customer_value_profiles_pkey" PRIMARY KEY ("instance_id", "customer_id");



ALTER TABLE ONLY "public"."feature_entitlements"
    ADD CONSTRAINT "feature_entitlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fulfillment_events"
    ADD CONSTRAINT "fulfillment_events_event_key_key" UNIQUE ("event_key");



ALTER TABLE ONLY "public"."fulfillment_events"
    ADD CONSTRAINT "fulfillment_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integration_jobs"
    ADD CONSTRAINT "integration_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_events"
    ADD CONSTRAINT "inventory_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_reservations"
    ADD CONSTRAINT "inventory_reservations_order_item_id_key" UNIQUE ("order_item_id");



ALTER TABLE ONLY "public"."inventory_reservations"
    ADD CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_reservations"
    ADD CONSTRAINT "inventory_reservations_reservation_key_key" UNIQUE ("reservation_key");



ALTER TABLE ONLY "public"."inventory_snapshots"
    ADD CONSTRAINT "inventory_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_snapshots"
    ADD CONSTRAINT "inventory_snapshots_snapshot_date_variant_id_key" UNIQUE ("snapshot_date", "variant_id");



ALTER TABLE ONLY "public"."loyalty_benefit_rules"
    ADD CONSTRAINT "loyalty_benefit_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_benefit_usage"
    ADD CONSTRAINT "loyalty_benefit_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_ledger"
    ADD CONSTRAINT "loyalty_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_processing_runs"
    ADD CONSTRAINT "loyalty_processing_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_program_settings"
    ADD CONSTRAINT "loyalty_program_settings_pkey" PRIMARY KEY ("instance_id");



ALTER TABLE ONLY "public"."marketing_campaign_events"
    ADD CONSTRAINT "marketing_campaign_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_campaign_recipients"
    ADD CONSTRAINT "marketing_campaign_recipients_campaign_id_email_key" UNIQUE ("campaign_id", "email");



ALTER TABLE ONLY "public"."marketing_campaign_recipients"
    ADD CONSTRAINT "marketing_campaign_recipients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_consents"
    ADD CONSTRAINT "marketing_consents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."observability_events"
    ADD CONSTRAINT "observability_events_event_key_key" UNIQUE ("event_key");



ALTER TABLE ONLY "public"."observability_events"
    ADD CONSTRAINT "observability_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."office_messages"
    ADD CONSTRAINT "office_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."office_tasks"
    ADD CONSTRAINT "office_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."office_threads"
    ADD CONSTRAINT "office_threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operations_processing_runs"
    ADD CONSTRAINT "operations_processing_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operations_processing_runs"
    ADD CONSTRAINT "operations_processing_runs_run_key_key" UNIQUE ("run_key");



ALTER TABLE ONLY "public"."order_events"
    ADD CONSTRAINT "order_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_inventory_restorations"
    ADD CONSTRAINT "order_inventory_restorations_instance_id_order_item_id_sour_key" UNIQUE ("instance_id", "order_item_id", "source_type", "source_id");



ALTER TABLE ONLY "public"."order_inventory_restorations"
    ADD CONSTRAINT "order_inventory_restorations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_operations"
    ADD CONSTRAINT "order_operations_pkey" PRIMARY KEY ("order_id");



ALTER TABLE ONLY "public"."order_request_keys"
    ADD CONSTRAINT "order_request_keys_pkey" PRIMARY KEY ("idempotency_key");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."payment_attempts"
    ADD CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_events"
    ADD CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_operators"
    ADD CONSTRAINT "platform_operators_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."post_release_events"
    ADD CONSTRAINT "post_release_events_event_key_key" UNIQUE ("event_key");



ALTER TABLE ONLY "public"."post_release_events"
    ADD CONSTRAINT "post_release_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_release_evidence"
    ADD CONSTRAINT "post_release_evidence_evidence_key_key" UNIQUE ("evidence_key");



ALTER TABLE ONLY "public"."post_release_evidence"
    ADD CONSTRAINT "post_release_evidence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_release_findings"
    ADD CONSTRAINT "post_release_findings_finding_key_key" UNIQUE ("finding_key");



ALTER TABLE ONLY "public"."post_release_findings"
    ADD CONSTRAINT "post_release_findings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_release_policies"
    ADD CONSTRAINT "post_release_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_release_policies"
    ADD CONSTRAINT "post_release_policies_policy_key_version_key" UNIQUE ("policy_key", "version");



ALTER TABLE ONLY "public"."post_release_rollback_decisions"
    ADD CONSTRAINT "post_release_rollback_decisions_decision_key_key" UNIQUE ("decision_key");



ALTER TABLE ONLY "public"."post_release_rollback_decisions"
    ADD CONSTRAINT "post_release_rollback_decisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_release_sessions"
    ADD CONSTRAINT "post_release_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_release_sessions"
    ADD CONSTRAINT "post_release_sessions_release_candidate_id_source_sha_key" UNIQUE ("release_candidate_id", "source_sha");



ALTER TABLE ONLY "public"."post_release_sessions"
    ADD CONSTRAINT "post_release_sessions_session_key_key" UNIQUE ("session_key");



ALTER TABLE ONLY "public"."product_channel_settings"
    ADD CONSTRAINT "product_channel_settings_pkey" PRIMARY KEY ("instance_id", "product_id", "channel_code");



ALTER TABLE ONLY "public"."product_recommendation_rules"
    ADD CONSTRAINT "product_recommendation_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_recommendation_rules"
    ADD CONSTRAINT "product_recommendation_rules_source_variant_id_recommended__key" UNIQUE ("source_variant_id", "recommended_variant_id", "placement");



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."release_approvals"
    ADD CONSTRAINT "release_approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."release_candidates"
    ADD CONSTRAINT "release_candidates_candidate_key_key" UNIQUE ("candidate_key");



ALTER TABLE ONLY "public"."release_candidates"
    ADD CONSTRAINT "release_candidates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."release_changes"
    ADD CONSTRAINT "release_changes_candidate_id_change_key_key" UNIQUE ("candidate_id", "change_key");



ALTER TABLE ONLY "public"."release_changes"
    ADD CONSTRAINT "release_changes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."release_events"
    ADD CONSTRAINT "release_events_event_key_key" UNIQUE ("event_key");



ALTER TABLE ONLY "public"."release_events"
    ADD CONSTRAINT "release_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."release_gate_results"
    ADD CONSTRAINT "release_gate_results_gate_key_key" UNIQUE ("gate_key");



ALTER TABLE ONLY "public"."release_gate_results"
    ADD CONSTRAINT "release_gate_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."release_governance_runs"
    ADD CONSTRAINT "release_governance_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."release_governance_runs"
    ADD CONSTRAINT "release_governance_runs_run_key_key" UNIQUE ("run_key");



ALTER TABLE ONLY "public"."release_policies"
    ADD CONSTRAINT "release_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."release_policies"
    ADD CONSTRAINT "release_policies_policy_key_version_key" UNIQUE ("policy_key", "version");



ALTER TABLE ONLY "public"."release_windows"
    ADD CONSTRAINT "release_windows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."release_windows"
    ADD CONSTRAINT "release_windows_window_key_key" UNIQUE ("window_key");



ALTER TABLE ONLY "public"."return_case_items"
    ADD CONSTRAINT "return_case_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."return_case_items"
    ADD CONSTRAINT "return_case_items_return_case_id_order_item_id_key" UNIQUE ("return_case_id", "order_item_id");



ALTER TABLE ONLY "public"."return_cases"
    ADD CONSTRAINT "return_cases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_bindings"
    ADD CONSTRAINT "role_bindings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rollout_checks"
    ADD CONSTRAINT "rollout_checks_check_key_key" UNIQUE ("check_key");



ALTER TABLE ONLY "public"."rollout_checks"
    ADD CONSTRAINT "rollout_checks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rollout_decisions"
    ADD CONSTRAINT "rollout_decisions_decision_key_key" UNIQUE ("decision_key");



ALTER TABLE ONLY "public"."rollout_decisions"
    ADD CONSTRAINT "rollout_decisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rollout_environments"
    ADD CONSTRAINT "rollout_environments_environment_key_key" UNIQUE ("environment_key");



ALTER TABLE ONLY "public"."rollout_environments"
    ADD CONSTRAINT "rollout_environments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_tasks"
    ADD CONSTRAINT "sales_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_rate_limits"
    ADD CONSTRAINT "security_rate_limits_pkey" PRIMARY KEY ("rate_key");



ALTER TABLE ONLY "public"."stock_notifications"
    ADD CONSTRAINT "stock_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_notifications"
    ADD CONSTRAINT "stock_notifications_variant_id_email_key" UNIQUE ("variant_id", "email");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_ticket_messages"
    ADD CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_ticket_number_key" UNIQUE ("ticket_number");



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webshop_instance_addons"
    ADD CONSTRAINT "webshop_instance_addons_pkey" PRIMARY KEY ("instance_id", "addon_code");



ALTER TABLE ONLY "public"."webshop_instance_commerce_settings"
    ADD CONSTRAINT "webshop_instance_commerce_settings_pkey" PRIMARY KEY ("instance_id");



ALTER TABLE ONLY "public"."webshop_instance_members"
    ADD CONSTRAINT "webshop_instance_members_pkey" PRIMARY KEY ("instance_id", "user_id");



ALTER TABLE ONLY "public"."webshop_instance_provider_connections"
    ADD CONSTRAINT "webshop_instance_provider_connections_pkey" PRIMARY KEY ("instance_id", "provider_code");



ALTER TABLE ONLY "public"."webshop_instances"
    ADD CONSTRAINT "webshop_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webshop_instances"
    ADD CONSTRAINT "webshop_instances_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."webshop_sales_channels"
    ADD CONSTRAINT "webshop_sales_channels_pkey" PRIMARY KEY ("instance_id", "channel_code");



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_user_id_variant_id_key" UNIQUE ("user_id", "variant_id");



CREATE INDEX "stock_notification_rate_limits_email_requested_idx" ON "private"."stock_notification_rate_limits" USING "btree" ("email", "requested_at" DESC);



CREATE INDEX "stock_notification_rate_limits_ip_requested_idx" ON "private"."stock_notification_rate_limits" USING "btree" ("ip", "requested_at" DESC);



CREATE UNIQUE INDEX "action_processing_runs_instance_run_key_uq" ON "public"."action_processing_runs" USING "btree" ("instance_id", "run_key");



CREATE INDEX "action_proposals_alert_idx" ON "public"."action_proposals" USING "btree" ("alert_id", "status");



CREATE UNIQUE INDEX "action_proposals_instance_proposal_key_uq" ON "public"."action_proposals" USING "btree" ("instance_id", "proposal_key");



CREATE INDEX "action_proposals_instance_status_idx" ON "public"."action_proposals" USING "btree" ("instance_id", "status", "created_at" DESC);



CREATE INDEX "action_proposals_queue_idx" ON "public"."action_proposals" USING "btree" ("status", "risk_score" DESC, "expires_at");



CREATE UNIQUE INDEX "admin_audit_chain_seq_uidx" ON "public"."admin_audit_log" USING "btree" ("chain_seq");



CREATE INDEX "admin_audit_instance_chain_idx" ON "public"."admin_audit_log" USING "btree" ("instance_id", "chain_seq" DESC) WHERE ("instance_id" IS NOT NULL);



CREATE INDEX "admin_audit_log_action_idx" ON "public"."admin_audit_log" USING "btree" ("action", "created_at" DESC);



CREATE INDEX "admin_audit_log_actor_idx" ON "public"."admin_audit_log" USING "btree" ("actor_user_id", "created_at" DESC);



CREATE INDEX "admin_audit_log_created_at_idx" ON "public"."admin_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "admin_audit_log_entity_idx" ON "public"."admin_audit_log" USING "btree" ("entity_type", "entity_id", "created_at" DESC);



CREATE INDEX "admin_audit_log_scope_idx" ON "public"."admin_audit_log" USING "btree" ("organization_id", "instance_id", "created_at" DESC);



CREATE INDEX "admin_audit_org_chain_idx" ON "public"."admin_audit_log" USING "btree" ("organization_id", "chain_seq" DESC) WHERE ("organization_id" IS NOT NULL);



CREATE INDEX "admin_audit_scope_chain_idx" ON "public"."admin_audit_log" USING "btree" ("audit_scope", "chain_seq" DESC);



CREATE INDEX "assurance_events_finding_idx" ON "public"."assurance_events" USING "btree" ("finding_id", "occurred_at" DESC);



CREATE INDEX "assurance_evidence_control_idx" ON "public"."assurance_evidence" USING "btree" ("control_id", "captured_at" DESC);



CREATE INDEX "assurance_evidence_run_idx" ON "public"."assurance_evidence" USING "btree" ("run_id", "status");



CREATE INDEX "assurance_findings_control_idx" ON "public"."assurance_findings" USING "btree" ("control_id", "status");



CREATE INDEX "assurance_findings_queue_idx" ON "public"."assurance_findings" USING "btree" ("status", "severity", "last_detected_at" DESC);



CREATE INDEX "automation_events_store_instance_idx" ON "public"."automation_events" USING "btree" ("store_instance_id", "instance_id", "occurred_at" DESC);



CREATE INDEX "automation_instances_queue_idx" ON "public"."automation_runbook_instances" USING "btree" ("status", "deadline_at", "escalation_level" DESC);



CREATE UNIQUE INDEX "automation_processing_runs_instance_run_key_uq" ON "public"."automation_processing_runs" USING "btree" ("instance_id", "run_key");



CREATE INDEX "automation_runbook_instances_instance_idx" ON "public"."automation_runbook_instances" USING "btree" ("instance_id", "status");



CREATE INDEX "automation_step_runs_store_instance_idx" ON "public"."automation_step_runs" USING "btree" ("store_instance_id", "instance_id", "status");



CREATE INDEX "checkout_recovery_converted_order_idx" ON "public"."checkout_recovery_intents" USING "btree" ("converted_order_id");



CREATE INDEX "checkout_recovery_instance_user_idx" ON "public"."checkout_recovery_intents" USING "btree" ("instance_id", "user_id", "status");



CREATE UNIQUE INDEX "checkout_recovery_intents_communication_job_uidx" ON "public"."checkout_recovery_intents" USING "btree" ("communication_job_id") WHERE ("communication_job_id" IS NOT NULL);



CREATE INDEX "checkout_recovery_intents_open_seen_idx" ON "public"."checkout_recovery_intents" USING "btree" ("status", "last_seen_at") WHERE ("status" = 'open'::"text");



CREATE UNIQUE INDEX "checkout_recovery_open_instance_user_uq" ON "public"."checkout_recovery_intents" USING "btree" ("instance_id", "user_id") WHERE ("status" = 'open'::"text");



CREATE INDEX "checkout_recovery_status_expiry_idx" ON "public"."checkout_recovery_intents" USING "btree" ("status", "expires_at");



CREATE INDEX "commercial_offers_instance_status_idx" ON "public"."commercial_offers" USING "btree" ("instance_id", "status", "created_at" DESC);



CREATE INDEX "commercial_offers_opportunity_idx" ON "public"."commercial_offers" USING "btree" ("opportunity_id", "status");



CREATE UNIQUE INDEX "commercial_opportunities_active_b2b_uidx" ON "public"."commercial_opportunities" USING "btree" ("instance_id", "reseller_id") WHERE (("channel" = 'b2b'::"text") AND ("kind" = 'reorder'::"text") AND ("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text"])) AND ("reseller_id" IS NOT NULL));



CREATE UNIQUE INDEX "commercial_opportunities_active_b2c_uidx" ON "public"."commercial_opportunities" USING "btree" ("instance_id", "customer_id") WHERE (("channel" = 'b2c'::"text") AND ("kind" = ANY (ARRAY['retention'::"text", 'winback'::"text"])) AND ("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text"])) AND ("customer_id" IS NOT NULL));



CREATE UNIQUE INDEX "commercial_opportunities_active_guest_uidx" ON "public"."commercial_opportunities" USING "btree" ("instance_id", "lower"("customer_email")) WHERE (("channel" = 'b2c'::"text") AND ("kind" = ANY (ARRAY['retention'::"text", 'winback'::"text"])) AND ("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text"])) AND ("customer_id" IS NULL) AND ("customer_email" IS NOT NULL));



CREATE INDEX "commercial_opportunities_customer_idx" ON "public"."commercial_opportunities" USING "btree" ("customer_id", "status");



CREATE UNIQUE INDEX "commercial_opportunities_instance_key_uidx" ON "public"."commercial_opportunities" USING "btree" ("instance_id", "opportunity_key");



CREATE INDEX "commercial_opportunities_instance_queue_idx" ON "public"."commercial_opportunities" USING "btree" ("instance_id", "status", "priority_score" DESC, "due_at");



CREATE INDEX "commercial_opportunities_open_idx" ON "public"."commercial_opportunities" USING "btree" ("status", "priority_score" DESC, "due_at");



CREATE INDEX "commercial_opportunities_reseller_idx" ON "public"."commercial_opportunities" USING "btree" ("reseller_id", "status");



CREATE INDEX "communication_job_events_instance_job_idx" ON "public"."communication_job_events" USING "btree" ("instance_id", "job_id", "created_at" DESC);



CREATE INDEX "communication_job_events_job_idx" ON "public"."communication_job_events" USING "btree" ("job_id", "created_at" DESC);



CREATE UNIQUE INDEX "communication_jobs_instance_idempotency_uidx" ON "public"."communication_jobs" USING "btree" ("instance_id", "idempotency_key");



CREATE INDEX "communication_jobs_instance_status_idx" ON "public"."communication_jobs" USING "btree" ("instance_id", "status", "scheduled_at");



CREATE INDEX "communication_jobs_recipient_idx" ON "public"."communication_jobs" USING "btree" ("lower"("recipient_email"), "created_at" DESC);



CREATE INDEX "communication_jobs_status_schedule_idx" ON "public"."communication_jobs" USING "btree" ("status", "scheduled_at");



CREATE INDEX "communication_suppression_events_email_idx" ON "public"."communication_suppression_events" USING "btree" ("lower"("email"), "created_at" DESC);



CREATE INDEX "communication_suppression_events_instance_email_idx" ON "public"."communication_suppression_events" USING "btree" ("instance_id", "lower"("email"), "created_at" DESC);



CREATE INDEX "communication_suppressions_email_idx" ON "public"."communication_suppressions" USING "btree" ("lower"("email"), "active");



CREATE INDEX "communication_suppressions_instance_email_idx" ON "public"."communication_suppressions" USING "btree" ("instance_id", "lower"("email"), "active");



CREATE UNIQUE INDEX "communication_suppressions_instance_provider_event_uidx" ON "public"."communication_suppressions" USING "btree" ("instance_id", "provider_event_id") WHERE ("provider_event_id" IS NOT NULL);



CREATE INDEX "communication_worker_runs_instance_started_idx" ON "public"."communication_worker_runs" USING "btree" ("instance_id", "started_at" DESC);



CREATE INDEX "communication_worker_runs_started_idx" ON "public"."communication_worker_runs" USING "btree" ("started_at" DESC);



CREATE UNIQUE INDEX "content_pages_instance_slug_unique" ON "public"."content_pages" USING "btree" ("instance_id", "slug");



CREATE INDEX "content_pages_instance_status_idx" ON "public"."content_pages" USING "btree" ("instance_id", "status");



CREATE INDEX "content_pages_public_idx" ON "public"."content_pages" USING "btree" ("kind", "status", "published_at" DESC);



CREATE INDEX "control_alert_events_alert_idx" ON "public"."control_alert_events" USING "btree" ("alert_id", "occurred_at" DESC);



CREATE INDEX "control_alerts_customer_idx" ON "public"."control_alerts" USING "btree" ("customer_id", "status");



CREATE UNIQUE INDEX "control_alerts_instance_alert_key_uq" ON "public"."control_alerts" USING "btree" ("instance_id", "alert_key");



CREATE INDEX "control_alerts_instance_status_idx" ON "public"."control_alerts" USING "btree" ("instance_id", "status", "priority_score" DESC);



CREATE INDEX "control_alerts_opportunity_idx" ON "public"."control_alerts" USING "btree" ("opportunity_id", "status");



CREATE INDEX "control_alerts_order_idx" ON "public"."control_alerts" USING "btree" ("order_id", "status");



CREATE INDEX "control_alerts_queue_idx" ON "public"."control_alerts" USING "btree" ("status", "severity", "priority_score" DESC, "last_detected_at" DESC);



CREATE INDEX "control_alerts_variant_idx" ON "public"."control_alerts" USING "btree" ("variant_id", "status");



CREATE UNIQUE INDEX "control_processing_runs_instance_run_key_uq" ON "public"."control_processing_runs" USING "btree" ("instance_id", "run_key");



CREATE INDEX "control_tasks_alert_idx" ON "public"."control_tasks" USING "btree" ("alert_id", "status");



CREATE INDEX "control_tasks_instance_status_idx" ON "public"."control_tasks" USING "btree" ("instance_id", "status", "due_at");



CREATE INDEX "control_tasks_queue_idx" ON "public"."control_tasks" USING "btree" ("status", "priority_score" DESC, "due_at");



CREATE INDEX "coupon_redemptions_coupon_idx" ON "public"."coupon_redemptions" USING "btree" ("instance_id", "coupon_id", "status");



CREATE INDEX "coupon_redemptions_customer_idx" ON "public"."coupon_redemptions" USING "btree" ("instance_id", "customer_id", "coupon_id", "status") WHERE ("customer_id" IS NOT NULL);



CREATE INDEX "coupon_redemptions_email_idx" ON "public"."coupon_redemptions" USING "btree" ("instance_id", "lower"("customer_email"), "coupon_id", "status");



CREATE INDEX "coupons_active_code_idx" ON "public"."coupons" USING "btree" ("code") WHERE ("active" = true);



CREATE INDEX "coupons_instance_active_idx" ON "public"."coupons" USING "btree" ("instance_id", "active");



CREATE UNIQUE INDEX "coupons_instance_code_unique" ON "public"."coupons" USING "btree" ("instance_id", "code");



CREATE INDEX "coupons_window_idx" ON "public"."coupons" USING "btree" ("active", "starts_at", "ends_at");



CREATE INDEX "customer_instance_roles_partner_idx" ON "public"."customer_instance_roles" USING "btree" ("instance_id", "role", "reseller_approved", "updated_at" DESC);



CREATE INDEX "customer_journey_steps_schedule_idx" ON "public"."customer_journey_steps" USING "btree" ("status", "scheduled_at");



CREATE INDEX "customer_journeys_instance_idx" ON "public"."customer_journeys" USING "btree" ("instance_id");



CREATE UNIQUE INDEX "customer_journeys_instance_kind_source_uq" ON "public"."customer_journeys" USING "btree" ("instance_id", "kind", "source_key");



CREATE INDEX "customer_journeys_status_idx" ON "public"."customer_journeys" USING "btree" ("status", "created_at");



CREATE INDEX "customer_lifecycle_milestones_customer_idx" ON "public"."customer_lifecycle_milestones" USING "btree" ("customer_id", "occurred_at" DESC);



CREATE INDEX "customer_lifecycle_milestones_instance_idx" ON "public"."customer_lifecycle_milestones" USING "btree" ("instance_id", "customer_id");



CREATE INDEX "customer_value_profiles_instance_score_idx" ON "public"."customer_value_profiles" USING "btree" ("instance_id", "value_score" DESC);



CREATE INDEX "feature_entitlements_lookup_idx" ON "public"."feature_entitlements" USING "btree" ("organization_id", "instance_id", "feature_code", "enabled");



CREATE INDEX "fulfillment_events_instance_order_idx" ON "public"."fulfillment_events" USING "btree" ("instance_id", "order_id");



CREATE INDEX "fulfillment_events_order_idx" ON "public"."fulfillment_events" USING "btree" ("order_id", "occurred_at" DESC);



CREATE UNIQUE INDEX "integration_jobs_active_order_kind_provider_uidx" ON "public"."integration_jobs" USING "btree" ("order_id", "kind", "provider") WHERE (("order_id" IS NOT NULL) AND ("status" = ANY (ARRAY['pending'::"text", 'processing'::"text"])));



CREATE INDEX "integration_jobs_instance_status_idx" ON "public"."integration_jobs" USING "btree" ("instance_id", "status", "next_attempt_at");



CREATE INDEX "integration_jobs_order_idx" ON "public"."integration_jobs" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "integration_jobs_status_idx" ON "public"."integration_jobs" USING "btree" ("status", "next_attempt_at", "created_at");



CREATE INDEX "inventory_events_actor_user_id_idx" ON "public"."inventory_events" USING "btree" ("actor_user_id");



CREATE INDEX "inventory_events_instance_created_idx" ON "public"."inventory_events" USING "btree" ("instance_id", "created_at" DESC);



CREATE INDEX "inventory_events_order_id_idx" ON "public"."inventory_events" USING "btree" ("order_id");



CREATE INDEX "inventory_events_variant_id_idx" ON "public"."inventory_events" USING "btree" ("variant_id", "created_at" DESC);



CREATE INDEX "inventory_reservations_instance_idx" ON "public"."inventory_reservations" USING "btree" ("instance_id", "status");



CREATE INDEX "inventory_reservations_order_idx" ON "public"."inventory_reservations" USING "btree" ("order_id", "status");



CREATE INDEX "inventory_reservations_variant_idx" ON "public"."inventory_reservations" USING "btree" ("variant_id", "status");



CREATE INDEX "inventory_snapshots_date_idx" ON "public"."inventory_snapshots" USING "btree" ("snapshot_date" DESC);



CREATE INDEX "inventory_snapshots_instance_date_idx" ON "public"."inventory_snapshots" USING "btree" ("instance_id", "snapshot_date" DESC);



CREATE INDEX "inventory_snapshots_variant_date_idx" ON "public"."inventory_snapshots" USING "btree" ("variant_id", "snapshot_date" DESC);



CREATE UNIQUE INDEX "loyalty_benefit_rules_instance_key_uidx" ON "public"."loyalty_benefit_rules" USING "btree" ("instance_id", "rule_key");



CREATE INDEX "loyalty_benefit_usage_customer_rule_idx" ON "public"."loyalty_benefit_usage" USING "btree" ("customer_id", "rule_id", "used_at" DESC);



CREATE UNIQUE INDEX "loyalty_benefit_usage_instance_key_uidx" ON "public"."loyalty_benefit_usage" USING "btree" ("instance_id", "usage_key");



CREATE INDEX "loyalty_ledger_customer_idx" ON "public"."loyalty_ledger" USING "btree" ("customer_id", "occurred_at" DESC);



CREATE INDEX "loyalty_ledger_instance_customer_idx" ON "public"."loyalty_ledger" USING "btree" ("instance_id", "customer_id", "occurred_at" DESC);



CREATE UNIQUE INDEX "loyalty_ledger_instance_event_uidx" ON "public"."loyalty_ledger" USING "btree" ("instance_id", "event_key");



CREATE INDEX "loyalty_ledger_order_idx" ON "public"."loyalty_ledger" USING "btree" ("order_id") WHERE ("order_id" IS NOT NULL);



CREATE UNIQUE INDEX "loyalty_processing_runs_instance_key_uidx" ON "public"."loyalty_processing_runs" USING "btree" ("instance_id", "run_key");



CREATE INDEX "marketing_campaign_recipients_campaign_idx" ON "public"."marketing_campaign_recipients" USING "btree" ("campaign_id", "eligible");



CREATE INDEX "marketing_campaigns_instance_idx" ON "public"."marketing_campaigns" USING "btree" ("instance_id", "created_at" DESC);



CREATE UNIQUE INDEX "marketing_campaigns_instance_utm_unique" ON "public"."marketing_campaigns" USING "btree" ("instance_id", "lower"("utm_campaign")) WHERE ("utm_campaign" IS NOT NULL);



CREATE INDEX "marketing_campaigns_status_idx" ON "public"."marketing_campaigns" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "marketing_consents_email_occurred_idx" ON "public"."marketing_consents" USING "btree" ("lower"("email"), "channel", "occurred_at" DESC);



CREATE INDEX "marketing_consents_instance_email_idx" ON "public"."marketing_consents" USING "btree" ("instance_id", "lower"("email"), "occurred_at" DESC);



CREATE INDEX "marketing_consents_user_occurred_idx" ON "public"."marketing_consents" USING "btree" ("user_id", "occurred_at" DESC) WHERE ("user_id" IS NOT NULL);



CREATE INDEX "observability_events_time_severity_idx" ON "public"."observability_events" USING "btree" ("occurred_at" DESC, "severity");



CREATE INDEX "office_messages_author_id_idx" ON "public"."office_messages" USING "btree" ("author_id");



CREATE UNIQUE INDEX "office_messages_communication_job_uidx" ON "public"."office_messages" USING "btree" ("communication_job_id") WHERE ("communication_job_id" IS NOT NULL);



CREATE UNIQUE INDEX "office_messages_instance_external_message_uidx" ON "public"."office_messages" USING "btree" ("instance_id", "external_message_id") WHERE ("external_message_id" IS NOT NULL);



CREATE INDEX "office_messages_instance_thread_idx" ON "public"."office_messages" USING "btree" ("instance_id", "thread_id", "created_at");



CREATE INDEX "office_messages_sender_idx" ON "public"."office_messages" USING "btree" ("lower"("sender_email")) WHERE ("sender_email" IS NOT NULL);



CREATE INDEX "office_messages_thread_idx" ON "public"."office_messages" USING "btree" ("thread_id", "created_at");



CREATE INDEX "office_tasks_assigned_idx" ON "public"."office_tasks" USING "btree" ("assigned_to", "status", "due_at");



CREATE INDEX "office_tasks_created_by_idx" ON "public"."office_tasks" USING "btree" ("created_by");



CREATE INDEX "office_tasks_instance_status_idx" ON "public"."office_tasks" USING "btree" ("instance_id", "status", "due_at");



CREATE INDEX "office_tasks_status_idx" ON "public"."office_tasks" USING "btree" ("status", "due_at");



CREATE INDEX "office_tasks_thread_id_idx" ON "public"."office_tasks" USING "btree" ("thread_id");



CREATE INDEX "office_threads_assigned_idx" ON "public"."office_threads" USING "btree" ("assigned_to", "status", "updated_at" DESC);



CREATE INDEX "office_threads_instance_updated_idx" ON "public"."office_threads" USING "btree" ("instance_id", "updated_at" DESC);



CREATE INDEX "office_threads_order_id_idx" ON "public"."office_threads" USING "btree" ("order_id");



CREATE INDEX "office_threads_priority_idx" ON "public"."office_threads" USING "btree" ("priority", "status", "updated_at" DESC);



CREATE INDEX "office_threads_updated_idx" ON "public"."office_threads" USING "btree" ("updated_at" DESC);



CREATE INDEX "order_events_actor_user_id_idx" ON "public"."order_events" USING "btree" ("actor_user_id");



CREATE INDEX "order_events_instance_order_idx" ON "public"."order_events" USING "btree" ("instance_id", "order_id");



CREATE INDEX "order_events_order_id_idx" ON "public"."order_events" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "order_items_instance_idx" ON "public"."order_items" USING "btree" ("instance_id", "order_id");



CREATE INDEX "order_items_order_id_idx" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "order_items_variant_id_idx" ON "public"."order_items" USING "btree" ("variant_id");



CREATE INDEX "order_operations_instance_order_idx" ON "public"."order_operations" USING "btree" ("instance_id", "order_id");



CREATE INDEX "order_request_keys_created_at_idx" ON "public"."order_request_keys" USING "btree" ("created_at");



CREATE UNIQUE INDEX "orders_confirmation_token_key" ON "public"."orders" USING "btree" ("confirmation_token");



CREATE INDEX "orders_customer_created_at_idx" ON "public"."orders" USING "btree" ("customer_id", "created_at" DESC);



CREATE INDEX "orders_instance_created_idx" ON "public"."orders" USING "btree" ("instance_id", "created_at" DESC);



CREATE INDEX "orders_invoice_number_idx" ON "public"."orders" USING "btree" ("invoice_number") WHERE ("invoice_number" IS NOT NULL);



CREATE INDEX "orders_status_created_at_idx" ON "public"."orders" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "orders_utm_campaign_idx" ON "public"."orders" USING "btree" ("lower"("utm_campaign")) WHERE ("utm_campaign" IS NOT NULL);



CREATE INDEX "payment_attempts_instance_order_idx" ON "public"."payment_attempts" USING "btree" ("instance_id", "order_id");



CREATE INDEX "payment_attempts_instance_provider_idx" ON "public"."payment_attempts" USING "btree" ("instance_id", "provider_code", "created_at" DESC);



CREATE UNIQUE INDEX "payment_attempts_instance_provider_reference_uidx" ON "public"."payment_attempts" USING "btree" ("instance_id", "provider_code", "provider_reference") WHERE ("provider_reference" IS NOT NULL);



COMMENT ON INDEX "public"."payment_attempts_instance_provider_reference_uidx" IS 'Payment provider references are unique per webshop tenant.';



CREATE INDEX "payment_attempts_order_created_idx" ON "public"."payment_attempts" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "payment_events_instance_order_idx" ON "public"."payment_events" USING "btree" ("instance_id", "order_id", "created_at" DESC);



CREATE UNIQUE INDEX "payment_events_instance_provider_event_uidx" ON "public"."payment_events" USING "btree" ("instance_id", "provider_code", "provider_event_id");



COMMENT ON INDEX "public"."payment_events_instance_provider_event_uidx" IS 'Webhook event ids are unique per webshop tenant and provider.';



CREATE INDEX "payment_events_instance_provider_idx" ON "public"."payment_events" USING "btree" ("instance_id", "provider_code", "created_at" DESC);



CREATE INDEX "payment_events_order_idx" ON "public"."payment_events" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "product_recommendation_rules_lookup_idx" ON "public"."product_recommendation_rules" USING "btree" ("placement", "source_variant_id", "active", "priority");



CREATE INDEX "product_recommendation_rules_recommended_variant_idx" ON "public"."product_recommendation_rules" USING "btree" ("recommended_variant_id");



CREATE INDEX "product_reviews_instance_idx" ON "public"."product_reviews" USING "btree" ("instance_id", "product_id");



CREATE INDEX "product_reviews_product_idx" ON "public"."product_reviews" USING "btree" ("product_id", "status", "created_at" DESC);



CREATE INDEX "product_reviews_user_id_idx" ON "public"."product_reviews" USING "btree" ("user_id");



CREATE INDEX "product_variants_instance_idx" ON "public"."product_variants" USING "btree" ("instance_id");



CREATE UNIQUE INDEX "product_variants_instance_sku_unique" ON "public"."product_variants" USING "btree" ("instance_id", "sku");



CREATE INDEX "product_variants_product_id_idx" ON "public"."product_variants" USING "btree" ("product_id");



CREATE INDEX "product_variants_supplier_idx" ON "public"."product_variants" USING "btree" ("supplier_id");



CREATE INDEX "products_instance_idx" ON "public"."products" USING "btree" ("instance_id");



CREATE UNIQUE INDEX "products_instance_slug_unique" ON "public"."products" USING "btree" ("instance_id", "slug");



CREATE INDEX "profiles_subscription_plan_idx" ON "public"."profiles" USING "btree" ("subscription_plan");



CREATE INDEX "purchase_order_items_order_idx" ON "public"."purchase_order_items" USING "btree" ("purchase_order_id");



CREATE UNIQUE INDEX "purchase_order_items_order_variant_uq" ON "public"."purchase_order_items" USING "btree" ("purchase_order_id", "variant_id");



CREATE INDEX "purchase_orders_instance_status_idx" ON "public"."purchase_orders" USING "btree" ("instance_id", "status", "created_at" DESC);



CREATE INDEX "purchase_orders_status_due_idx" ON "public"."purchase_orders" USING "btree" ("status", "payment_due_at");



CREATE UNIQUE INDEX "release_approvals_gate_approver_uq" ON "public"."release_approvals" USING "btree" ("candidate_id", "gate_hash", "approver_id");



CREATE UNIQUE INDEX "release_approvals_gate_slot_uq" ON "public"."release_approvals" USING "btree" ("candidate_id", "gate_hash", "slot");



CREATE INDEX "release_candidates_queue_idx" ON "public"."release_candidates" USING "btree" ("status", "risk_class", "created_at" DESC);



CREATE INDEX "return_case_items_case_idx" ON "public"."return_case_items" USING "btree" ("return_case_id");



CREATE INDEX "return_case_items_order_item_idx" ON "public"."return_case_items" USING "btree" ("order_item_id");



CREATE INDEX "return_cases_instance_order_idx" ON "public"."return_cases" USING "btree" ("instance_id", "order_id");



CREATE INDEX "return_cases_order_idx" ON "public"."return_cases" USING "btree" ("order_id", "requested_at" DESC);



CREATE INDEX "return_cases_status_idx" ON "public"."return_cases" USING "btree" ("status", "requested_at");



CREATE INDEX "return_cases_user_idx" ON "public"."return_cases" USING "btree" ("user_id", "requested_at" DESC);



CREATE UNIQUE INDEX "role_bindings_active_unique" ON "public"."role_bindings" USING "btree" ("organization_id", COALESCE("instance_id", '00000000-0000-0000-0000-000000000000'::"uuid"), "user_id", "role_code") WHERE ("revoked_at" IS NULL);



CREATE INDEX "role_bindings_lookup_idx" ON "public"."role_bindings" USING "btree" ("user_id", "instance_id", "valid_from", "valid_until") WHERE ("revoked_at" IS NULL);



CREATE INDEX "rollout_checks_environment_key_idx" ON "public"."rollout_checks" USING "btree" ("environment_key");



CREATE INDEX "rollout_decisions_actor_id_idx" ON "public"."rollout_decisions" USING "btree" ("actor_id");



CREATE INDEX "rollout_decisions_environment_key_idx" ON "public"."rollout_decisions" USING "btree" ("environment_key");



CREATE UNIQUE INDEX "sales_tasks_instance_key_uidx" ON "public"."sales_tasks" USING "btree" ("instance_id", "task_key");



CREATE INDEX "sales_tasks_instance_queue_idx" ON "public"."sales_tasks" USING "btree" ("instance_id", "status", "priority" DESC, "due_at");



CREATE INDEX "sales_tasks_queue_idx" ON "public"."sales_tasks" USING "btree" ("status", "priority" DESC, "due_at");



CREATE UNIQUE INDEX "stock_notifications_communication_job_uidx" ON "public"."stock_notifications" USING "btree" ("communication_job_id") WHERE ("communication_job_id" IS NOT NULL);



CREATE INDEX "stock_notifications_instance_idx" ON "public"."stock_notifications" USING "btree" ("instance_id", "status");



CREATE INDEX "stock_notifications_user_id_idx" ON "public"."stock_notifications" USING "btree" ("user_id");



CREATE INDEX "stock_notifications_waiting_idx" ON "public"."stock_notifications" USING "btree" ("status", "variant_id");



CREATE INDEX "suppliers_instance_idx" ON "public"."suppliers" USING "btree" ("instance_id", "name");



CREATE UNIQUE INDEX "suppliers_instance_name_unique_ci" ON "public"."suppliers" USING "btree" ("instance_id", "lower"(TRIM(BOTH FROM "name")));



CREATE INDEX "support_ticket_messages_ticket_idx" ON "public"."support_ticket_messages" USING "btree" ("ticket_id", "created_at");



CREATE INDEX "support_tickets_email_idx" ON "public"."support_tickets" USING "btree" ("lower"("email"), "created_at" DESC);



CREATE INDEX "support_tickets_instance_status_idx" ON "public"."support_tickets" USING "btree" ("instance_id", "status", "updated_at" DESC);



CREATE INDEX "support_tickets_status_idx" ON "public"."support_tickets" USING "btree" ("status", "priority", "created_at");



CREATE INDEX "support_tickets_user_idx" ON "public"."support_tickets" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "webhook_events_instance_status_idx" ON "public"."webhook_events" USING "btree" ("instance_id", "status", "created_at" DESC) WHERE ("instance_id" IS NOT NULL);



CREATE UNIQUE INDEX "webhook_events_provider_external_uidx" ON "public"."webhook_events" USING "btree" ("provider", "external_event_id") WHERE ("external_event_id" IS NOT NULL);



CREATE INDEX "webshop_instance_members_user_idx" ON "public"."webshop_instance_members" USING "btree" ("user_id");



CREATE INDEX "webshop_instances_organization_idx" ON "public"."webshop_instances" USING "btree" ("organization_id");



CREATE INDEX "webshop_instances_status_idx" ON "public"."webshop_instances" USING "btree" ("status");



CREATE INDEX "wishlists_instance_user_idx" ON "public"."wishlists" USING "btree" ("instance_id", "user_id");



CREATE INDEX "wishlists_user_idx" ON "public"."wishlists" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "wishlists_variant_id_idx" ON "public"."wishlists" USING "btree" ("variant_id");



CREATE OR REPLACE VIEW "public"."automation_runbook_queue" WITH ("security_invoker"='true') AS
 SELECT "i"."id" AS "instance_id",
    "i"."instance_key",
    "i"."status",
    "i"."escalation_level",
    "i"."failure_count",
    "i"."deadline_at",
    "i"."started_at",
    "i"."created_at",
    "r"."runbook_key",
    "r"."version" AS "runbook_version",
    "r"."name" AS "runbook_name",
    "r"."category",
    "r"."risk_class",
    "r"."requires_action_approval",
    "r"."max_failures",
    "a"."id" AS "alert_id",
    "a"."title" AS "alert_title",
    "a"."severity",
    "a"."priority_score",
    "a"."status" AS "alert_status",
    "i"."proposal_id",
    "p"."status" AS "proposal_status",
    "count"("sr"."id") AS "total_steps",
    "count"("sr"."id") FILTER (WHERE ("sr"."status" = 'succeeded'::"text")) AS "succeeded_steps",
    "count"("sr"."id") FILTER (WHERE ("sr"."status" = 'failed'::"text")) AS "failed_steps",
    "count"("sr"."id") FILTER (WHERE ("sr"."status" = ANY (ARRAY['ready'::"text", 'running'::"text"]))) AS "executable_steps",
    "round"((EXTRACT(epoch FROM ("now"() - COALESCE("i"."started_at", "i"."created_at"))) / (3600)::numeric), 1) AS "age_hours",
        CASE
            WHEN (("i"."deadline_at" < "now"()) AND ("i"."status" = ANY (ARRAY['planned'::"text", 'active'::"text", 'paused'::"text"]))) THEN true
            ELSE false
        END AS "overdue"
   FROM (((("public"."automation_runbook_instances" "i"
     JOIN "public"."automation_runbooks" "r" ON (("r"."id" = "i"."runbook_id")))
     JOIN "public"."control_alerts" "a" ON (("a"."id" = "i"."alert_id")))
     LEFT JOIN "public"."action_proposals" "p" ON (("p"."id" = "i"."proposal_id")))
     LEFT JOIN "public"."automation_step_runs" "sr" ON (("sr"."instance_id" = "i"."id")))
  GROUP BY "i"."id", "r"."id", "a"."id", "p"."id";



CREATE OR REPLACE VIEW "public"."post_release_session_queue" WITH ("security_invoker"='true') AS
 SELECT "s"."id" AS "session_id",
    "s"."session_key",
    "s"."release_candidate_id",
    "s"."source_sha",
    "s"."status",
    "s"."started_at",
    "s"."observation_ends_at",
    "s"."stable_at",
    "s"."closed_at",
    "r"."version_label",
    "r"."source_ref",
    "r"."risk_class",
    ("count"("e"."id"))::integer AS "evidence_count",
    ("count"("e"."id") FILTER (WHERE "e"."trusted"))::integer AS "trusted_evidence_count",
    ("count"("e"."id") FILTER (WHERE ("e"."trusted" AND ("e"."status" = 'pass'::"text"))))::integer AS "trusted_passes",
    ("count"("f"."id") FILTER (WHERE (("f"."status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text"])) AND ("f"."severity" = 'critical'::"text"))))::integer AS "critical_open",
    ("count"("f"."id") FILTER (WHERE (("f"."status" = ANY (ARRAY['open'::"text", 'acknowledged'::"text"])) AND ("f"."severity" = 'high'::"text"))))::integer AS "high_open",
    "md5"(COALESCE("string_agg"(DISTINCT "e"."evidence_hash", '|'::"text" ORDER BY "e"."evidence_hash"), ''::"text")) AS "evidence_bundle_hash"
   FROM ((("public"."post_release_sessions" "s"
     JOIN "public"."release_candidates" "r" ON (("r"."id" = "s"."release_candidate_id")))
     LEFT JOIN "public"."post_release_evidence" "e" ON (("e"."session_id" = "s"."id")))
     LEFT JOIN "public"."post_release_findings" "f" ON (("f"."session_id" = "s"."id")))
  GROUP BY "s"."id", "r"."version_label", "r"."source_ref", "r"."risk_class";



CREATE OR REPLACE TRIGGER "action_approvals_append_only_trigger" BEFORE DELETE OR UPDATE ON "public"."action_approvals" FOR EACH ROW EXECUTE FUNCTION "public"."reject_append_only_action_mutation"();



CREATE OR REPLACE TRIGGER "action_approvals_store_guard" BEFORE INSERT OR UPDATE ON "public"."action_approvals" FOR EACH ROW EXECUTE FUNCTION "public"."merchant_intelligence_store_guard"();



CREATE OR REPLACE TRIGGER "action_events_append_only_trigger" BEFORE DELETE OR UPDATE ON "public"."action_proposal_events" FOR EACH ROW EXECUTE FUNCTION "public"."reject_append_only_action_mutation"();



CREATE OR REPLACE TRIGGER "action_executions_append_only_trigger" BEFORE DELETE OR UPDATE ON "public"."action_executions" FOR EACH ROW EXECUTE FUNCTION "public"."reject_append_only_action_mutation"();



CREATE OR REPLACE TRIGGER "action_executions_store_guard" BEFORE INSERT OR UPDATE ON "public"."action_executions" FOR EACH ROW EXECUTE FUNCTION "public"."merchant_intelligence_store_guard"();



CREATE OR REPLACE TRIGGER "action_proposal_events_store_guard" BEFORE INSERT OR UPDATE ON "public"."action_proposal_events" FOR EACH ROW EXECUTE FUNCTION "public"."merchant_intelligence_store_guard"();



CREATE OR REPLACE TRIGGER "admin_audit_immutable" BEFORE DELETE OR UPDATE ON "public"."admin_audit_log" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_admin_audit_mutation"();



CREATE OR REPLACE TRIGGER "admin_audit_prepare_insert" BEFORE INSERT ON "public"."admin_audit_log" FOR EACH ROW EXECUTE FUNCTION "public"."prepare_admin_audit_entry"();



CREATE OR REPLACE TRIGGER "automation_events_store_guard" BEFORE INSERT OR UPDATE ON "public"."automation_events" FOR EACH ROW EXECUTE FUNCTION "public"."automation_child_store_guard"();



CREATE OR REPLACE TRIGGER "automation_runbook_instances_store_guard" BEFORE INSERT OR UPDATE ON "public"."automation_runbook_instances" FOR EACH ROW EXECUTE FUNCTION "public"."merchant_intelligence_store_guard"();



CREATE OR REPLACE TRIGGER "automation_step_runs_store_guard" BEFORE INSERT OR UPDATE ON "public"."automation_step_runs" FOR EACH ROW EXECUTE FUNCTION "public"."automation_child_store_guard"();



CREATE OR REPLACE TRIGGER "capture_coupon_redemption_after_order_totals" AFTER INSERT OR UPDATE OF "discount_gross_huf", "coupon_code" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."capture_order_coupon_redemption"();



CREATE OR REPLACE TRIGGER "control_alert_events_store_guard" BEFORE INSERT OR UPDATE ON "public"."control_alert_events" FOR EACH ROW EXECUTE FUNCTION "public"."merchant_intelligence_store_guard"();



CREATE OR REPLACE TRIGGER "control_tasks_store_guard" BEFORE INSERT OR UPDATE ON "public"."control_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."merchant_intelligence_store_guard"();



CREATE OR REPLACE TRIGGER "customer_journey_steps_store_guard" BEFORE INSERT OR UPDATE ON "public"."customer_journey_steps" FOR EACH ROW EXECUTE FUNCTION "public"."merchant_intelligence_store_guard"();



CREATE OR REPLACE TRIGGER "guard_action_policy_version_definition_trigger" BEFORE UPDATE ON "public"."action_policies" FOR EACH ROW EXECUTE FUNCTION "public"."guard_action_policy_version_definition"();



CREATE OR REPLACE TRIGGER "guard_action_proposal_identity_trigger" BEFORE UPDATE ON "public"."action_proposals" FOR EACH ROW EXECUTE FUNCTION "public"."guard_action_proposal_identity"();



CREATE OR REPLACE TRIGGER "guard_action_proposal_status_trigger" BEFORE UPDATE OF "status" ON "public"."action_proposals" FOR EACH ROW EXECUTE FUNCTION "public"."guard_action_proposal_status"();



CREATE OR REPLACE TRIGGER "guard_assurance_control_version_trigger" BEFORE UPDATE ON "public"."assurance_controls" FOR EACH ROW EXECUTE FUNCTION "public"."guard_assurance_control_version"();



CREATE OR REPLACE TRIGGER "guard_assurance_events_append_only" BEFORE DELETE OR UPDATE ON "public"."assurance_events" FOR EACH ROW EXECUTE FUNCTION "public"."guard_assurance_append_only"();



CREATE OR REPLACE TRIGGER "guard_assurance_evidence_append_only" BEFORE DELETE OR UPDATE ON "public"."assurance_evidence" FOR EACH ROW EXECUTE FUNCTION "public"."guard_assurance_append_only"();



CREATE OR REPLACE TRIGGER "guard_assurance_finding_identity_trigger" BEFORE UPDATE ON "public"."assurance_findings" FOR EACH ROW EXECUTE FUNCTION "public"."guard_assurance_finding_identity"();



CREATE OR REPLACE TRIGGER "guard_automation_control_event_update_trigger" BEFORE DELETE OR UPDATE ON "public"."automation_control_events" FOR EACH ROW EXECUTE FUNCTION "public"."guard_automation_event_immutable"();



CREATE OR REPLACE TRIGGER "guard_automation_event_update_trigger" BEFORE DELETE OR UPDATE ON "public"."automation_events" FOR EACH ROW EXECUTE FUNCTION "public"."guard_automation_event_immutable"();



CREATE OR REPLACE TRIGGER "guard_automation_instance_identity_trigger" BEFORE UPDATE ON "public"."automation_runbook_instances" FOR EACH ROW EXECUTE FUNCTION "public"."guard_automation_instance_identity"();



CREATE OR REPLACE TRIGGER "guard_automation_instance_terminal_trigger" BEFORE UPDATE ON "public"."automation_runbook_instances" FOR EACH ROW EXECUTE FUNCTION "public"."guard_automation_instance_terminal"();



CREATE OR REPLACE TRIGGER "guard_automation_runbook_identity_trigger" BEFORE UPDATE ON "public"."automation_runbooks" FOR EACH ROW EXECUTE FUNCTION "public"."guard_automation_runbook_identity"();



CREATE OR REPLACE TRIGGER "guard_automation_runbook_step_update_trigger" BEFORE DELETE OR UPDATE ON "public"."automation_runbook_steps" FOR EACH ROW EXECUTE FUNCTION "public"."guard_automation_runbook_step_immutable"();



CREATE OR REPLACE TRIGGER "guard_automation_step_integrity_trigger" BEFORE UPDATE ON "public"."automation_step_runs" FOR EACH ROW EXECUTE FUNCTION "public"."guard_automation_step_integrity"();



CREATE OR REPLACE TRIGGER "guard_automation_step_source_current_trigger" BEFORE UPDATE ON "public"."automation_step_runs" FOR EACH ROW EXECUTE FUNCTION "public"."guard_automation_step_source_current"();



CREATE OR REPLACE TRIGGER "guard_closed_support_thread_trigger" BEFORE INSERT ON "public"."support_ticket_messages" FOR EACH ROW EXECUTE FUNCTION "public"."guard_closed_support_thread"();



CREATE OR REPLACE TRIGGER "guard_control_alert_identity_trigger" BEFORE UPDATE ON "public"."control_alerts" FOR EACH ROW EXECUTE FUNCTION "public"."guard_control_alert_identity"();



CREATE OR REPLACE TRIGGER "guard_control_task_identity_trigger" BEFORE UPDATE ON "public"."control_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."guard_control_task_identity"();



CREATE OR REPLACE TRIGGER "guard_order_status_against_operations_trigger" BEFORE UPDATE OF "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."guard_order_status_against_operations"();



CREATE OR REPLACE TRIGGER "guard_release_candidate_identity_trigger" BEFORE UPDATE ON "public"."release_candidates" FOR EACH ROW EXECUTE FUNCTION "public"."guard_release_candidate_identity"();



CREATE OR REPLACE TRIGGER "guard_release_policy_definition_trigger" BEFORE UPDATE ON "public"."release_policies" FOR EACH ROW EXECUTE FUNCTION "public"."guard_release_policy_definition"();



CREATE OR REPLACE TRIGGER "initialize_support_ticket_thread_trigger" AFTER INSERT ON "public"."support_tickets" FOR EACH ROW EXECUTE FUNCTION "public"."initialize_support_ticket_thread"();



CREATE OR REPLACE TRIGGER "inventory_events_sync_instance" BEFORE INSERT OR UPDATE OF "variant_id", "order_id", "instance_id" ON "public"."inventory_events" FOR EACH ROW EXECUTE FUNCTION "public"."sync_inventory_event_instance"();



CREATE OR REPLACE TRIGGER "inventory_reservations_sync_instance" BEFORE INSERT OR UPDATE OF "variant_id", "order_id", "instance_id" ON "public"."inventory_reservations" FOR EACH ROW EXECUTE FUNCTION "public"."sync_inventory_reservation_instance"();



CREATE OR REPLACE TRIGGER "inventory_snapshots_sync_instance" BEFORE INSERT OR UPDATE OF "variant_id", "instance_id" ON "public"."inventory_snapshots" FOR EACH ROW EXECUTE FUNCTION "public"."sync_variant_child_instance"();



CREATE OR REPLACE TRIGGER "maintain_control_incident_started_at_trigger" BEFORE UPDATE OF "status" ON "public"."control_alerts" FOR EACH ROW EXECUTE FUNCTION "public"."maintain_control_incident_started_at"();



CREATE OR REPLACE TRIGGER "marketing_campaign_events_sync_instance" BEFORE INSERT OR UPDATE OF "campaign_id", "instance_id" ON "public"."marketing_campaign_events" FOR EACH ROW EXECUTE FUNCTION "public"."sync_campaign_child_instance"();



CREATE OR REPLACE TRIGGER "marketing_campaign_recipients_sync_instance" BEFORE INSERT OR UPDATE OF "campaign_id", "instance_id" ON "public"."marketing_campaign_recipients" FOR EACH ROW EXECUTE FUNCTION "public"."sync_campaign_child_instance"();



CREATE OR REPLACE TRIGGER "order_items_sync_instance" BEFORE INSERT OR UPDATE OF "order_id", "variant_id", "instance_id" ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."sync_order_item_instance"();



CREATE OR REPLACE TRIGGER "orders_apply_checkout_instance_context" BEFORE INSERT ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."apply_checkout_instance_context"();



CREATE OR REPLACE TRIGGER "orders_coupon_redemption_sync" AFTER INSERT OR UPDATE OF "coupon_code", "discount_gross_huf", "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."sync_coupon_redemption_from_order_v1"();



CREATE OR REPLACE TRIGGER "post_release_events_immutable" BEFORE DELETE OR UPDATE ON "public"."post_release_events" FOR EACH ROW EXECUTE FUNCTION "public"."block_post_release_immutable_mutation"();



CREATE OR REPLACE TRIGGER "post_release_evidence_immutable" BEFORE DELETE OR UPDATE ON "public"."post_release_evidence" FOR EACH ROW EXECUTE FUNCTION "public"."block_post_release_immutable_mutation"();



CREATE OR REPLACE TRIGGER "prevent_control_event_delete" BEFORE DELETE ON "public"."control_alert_events" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_control_event_mutation"();



CREATE OR REPLACE TRIGGER "prevent_control_event_update" BEFORE UPDATE ON "public"."control_alert_events" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_control_event_mutation"();



CREATE OR REPLACE TRIGGER "product_variants_sync_instance" BEFORE INSERT OR UPDATE OF "product_id", "instance_id" ON "public"."product_variants" FOR EACH ROW EXECUTE FUNCTION "public"."sync_product_variant_instance"();



CREATE OR REPLACE TRIGGER "product_variants_touch_updated_at" BEFORE UPDATE ON "public"."product_variants" FOR EACH ROW EXECUTE FUNCTION "private"."touch_product_variant_updated_at"();



CREATE OR REPLACE TRIGGER "release_approval_immutable_trigger" BEFORE DELETE OR UPDATE ON "public"."release_approvals" FOR EACH ROW EXECUTE FUNCTION "public"."guard_release_audit_immutable"();



CREATE OR REPLACE TRIGGER "release_coupon_redemption_after_order_cancel" AFTER UPDATE OF "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."release_cancelled_order_coupon_redemption"();



CREATE OR REPLACE TRIGGER "release_event_immutable_trigger" BEFORE DELETE OR UPDATE ON "public"."release_events" FOR EACH ROW EXECUTE FUNCTION "public"."guard_release_audit_immutable"();



CREATE OR REPLACE TRIGGER "release_gate_immutable_trigger" BEFORE DELETE OR UPDATE ON "public"."release_gate_results" FOR EACH ROW EXECUTE FUNCTION "public"."guard_release_audit_immutable"();



CREATE OR REPLACE TRIGGER "restore_inventory_after_order_cancel" AFTER UPDATE OF "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."restore_cancelled_order_inventory"();



CREATE OR REPLACE TRIGGER "rollout_checks_immutable" BEFORE DELETE OR UPDATE ON "public"."rollout_checks" FOR EACH ROW EXECUTE FUNCTION "public"."block_rollout_ledger_mutation"();



CREATE OR REPLACE TRIGGER "rollout_decisions_immutable" BEFORE DELETE OR UPDATE ON "public"."rollout_decisions" FOR EACH ROW EXECUTE FUNCTION "public"."block_rollout_ledger_mutation"();



CREATE OR REPLACE TRIGGER "stock_notifications_sync_instance" BEFORE INSERT OR UPDATE OF "variant_id", "instance_id" ON "public"."stock_notifications" FOR EACH ROW EXECUTE FUNCTION "public"."sync_variant_child_instance"();



CREATE OR REPLACE TRIGGER "sync_support_ticket_from_message_trigger" AFTER INSERT ON "public"."support_ticket_messages" FOR EACH ROW EXECUTE FUNCTION "public"."sync_support_ticket_from_message"();



CREATE OR REPLACE TRIGGER "tenant_office_message_parent" BEFORE INSERT OR UPDATE OF "thread_id", "communication_job_id", "instance_id" ON "public"."office_messages" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_office_message_tenant"();



CREATE OR REPLACE TRIGGER "tenant_office_task_parent" BEFORE INSERT OR UPDATE OF "thread_id", "instance_id" ON "public"."office_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_office_task_tenant"();



CREATE OR REPLACE TRIGGER "tenant_office_thread_order" BEFORE INSERT OR UPDATE OF "order_id", "instance_id" ON "public"."office_threads" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_office_thread_tenant"();



CREATE OR REPLACE TRIGGER "tenant_order_match_fulfillment_events" BEFORE INSERT OR UPDATE OF "order_id", "instance_id" ON "public"."fulfillment_events" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_order_tenant_match"();



CREATE OR REPLACE TRIGGER "tenant_order_match_integration_jobs" BEFORE INSERT OR UPDATE OF "order_id", "instance_id" ON "public"."integration_jobs" FOR EACH ROW WHEN (("new"."order_id" IS NOT NULL)) EXECUTE FUNCTION "public"."enforce_order_tenant_match"();



CREATE OR REPLACE TRIGGER "tenant_order_match_order_events" BEFORE INSERT OR UPDATE OF "order_id", "instance_id" ON "public"."order_events" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_order_tenant_match"();



CREATE OR REPLACE TRIGGER "tenant_order_match_order_operations" BEFORE INSERT OR UPDATE OF "order_id", "instance_id" ON "public"."order_operations" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_order_tenant_match"();



CREATE OR REPLACE TRIGGER "tenant_order_match_payment_attempts" BEFORE INSERT OR UPDATE OF "order_id", "instance_id" ON "public"."payment_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_order_tenant_match"();



CREATE OR REPLACE TRIGGER "tenant_order_match_payment_events" BEFORE INSERT OR UPDATE OF "order_id", "instance_id" ON "public"."payment_events" FOR EACH ROW WHEN (("new"."order_id" IS NOT NULL)) EXECUTE FUNCTION "public"."enforce_order_tenant_match"();



CREATE OR REPLACE TRIGGER "tenant_order_match_return_cases" BEFORE INSERT OR UPDATE OF "order_id", "instance_id" ON "public"."return_cases" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_order_tenant_match"();



CREATE OR REPLACE TRIGGER "tenant_order_match_support_tickets" BEFORE INSERT OR UPDATE OF "order_id", "instance_id" ON "public"."support_tickets" FOR EACH ROW WHEN (("new"."order_id" IS NOT NULL)) EXECUTE FUNCTION "public"."enforce_order_tenant_match"();



CREATE OR REPLACE TRIGGER "tenant_purchase_match_items" BEFORE INSERT OR UPDATE OF "purchase_order_id", "instance_id" ON "public"."purchase_order_items" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_purchase_order_tenant_match"();



CREATE OR REPLACE TRIGGER "tenant_return_match_items" BEFORE INSERT OR UPDATE OF "return_case_id", "instance_id" ON "public"."return_case_items" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_return_case_tenant_match"();



CREATE OR REPLACE TRIGGER "tenant_support_match_messages" BEFORE INSERT OR UPDATE OF "ticket_id", "instance_id" ON "public"."support_ticket_messages" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_support_ticket_tenant_match"();



CREATE OR REPLACE TRIGGER "trg_snapshot_order_item_tax" BEFORE INSERT ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "private"."snapshot_order_item_tax"();



CREATE OR REPLACE TRIGGER "validate_refund_total_trigger" BEFORE INSERT OR UPDATE OF "status", "refund_amount_gross_huf" ON "public"."return_cases" FOR EACH ROW EXECUTE FUNCTION "public"."validate_refund_total"();



CREATE OR REPLACE TRIGGER "validate_return_case_item_quantity_trigger" BEFORE INSERT OR UPDATE OF "quantity", "order_item_id", "return_case_id" ON "public"."return_case_items" FOR EACH ROW EXECUTE FUNCTION "public"."validate_return_case_item_quantity"();



CREATE OR REPLACE TRIGGER "wishlists_sync_instance" BEFORE INSERT OR UPDATE OF "variant_id", "instance_id" ON "public"."wishlists" FOR EACH ROW EXECUTE FUNCTION "public"."sync_variant_child_instance"();



ALTER TABLE ONLY "private"."platform_owner_claims"
    ADD CONSTRAINT "platform_owner_claims_claimed_by_user_id_fkey" FOREIGN KEY ("claimed_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."action_approvals"
    ADD CONSTRAINT "action_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."action_approvals"
    ADD CONSTRAINT "action_approvals_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."action_approvals"
    ADD CONSTRAINT "action_approvals_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."action_proposals"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."action_executions"
    ADD CONSTRAINT "action_executions_executed_by_fkey" FOREIGN KEY ("executed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."action_executions"
    ADD CONSTRAINT "action_executions_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."action_executions"
    ADD CONSTRAINT "action_executions_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."action_proposals"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."action_policies"
    ADD CONSTRAINT "action_policies_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."action_processing_runs"
    ADD CONSTRAINT "action_processing_runs_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."action_proposal_events"
    ADD CONSTRAINT "action_proposal_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."action_proposal_events"
    ADD CONSTRAINT "action_proposal_events_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."action_proposal_events"
    ADD CONSTRAINT "action_proposal_events_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."action_proposals"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."action_proposals"
    ADD CONSTRAINT "action_proposals_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "public"."control_alerts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."action_proposals"
    ADD CONSTRAINT "action_proposals_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."action_proposals"
    ADD CONSTRAINT "action_proposals_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "public"."action_policies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assurance_events"
    ADD CONSTRAINT "assurance_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assurance_events"
    ADD CONSTRAINT "assurance_events_finding_id_fkey" FOREIGN KEY ("finding_id") REFERENCES "public"."assurance_findings"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assurance_events"
    ADD CONSTRAINT "assurance_events_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."assurance_runs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assurance_evidence"
    ADD CONSTRAINT "assurance_evidence_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "public"."assurance_controls"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assurance_evidence"
    ADD CONSTRAINT "assurance_evidence_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."assurance_runs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assurance_findings"
    ADD CONSTRAINT "assurance_findings_accepted_risk_by_fkey" FOREIGN KEY ("accepted_risk_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assurance_findings"
    ADD CONSTRAINT "assurance_findings_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assurance_findings"
    ADD CONSTRAINT "assurance_findings_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "public"."assurance_controls"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assurance_findings"
    ADD CONSTRAINT "assurance_findings_last_evidence_id_fkey" FOREIGN KEY ("last_evidence_id") REFERENCES "public"."assurance_evidence"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assurance_findings"
    ADD CONSTRAINT "assurance_findings_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."automation_control_events"
    ADD CONSTRAINT "automation_control_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."automation_control_events"
    ADD CONSTRAINT "automation_control_events_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."automation_control"
    ADD CONSTRAINT "automation_control_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."automation_events"
    ADD CONSTRAINT "automation_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."automation_events"
    ADD CONSTRAINT "automation_events_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."automation_runbook_instances"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."automation_events"
    ADD CONSTRAINT "automation_events_step_run_id_fkey" FOREIGN KEY ("step_run_id") REFERENCES "public"."automation_step_runs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."automation_events"
    ADD CONSTRAINT "automation_events_store_instance_id_fkey" FOREIGN KEY ("store_instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."automation_processing_runs"
    ADD CONSTRAINT "automation_processing_runs_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."automation_runbook_instances"
    ADD CONSTRAINT "automation_runbook_instances_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "public"."control_alerts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."automation_runbook_instances"
    ADD CONSTRAINT "automation_runbook_instances_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."automation_runbook_instances"
    ADD CONSTRAINT "automation_runbook_instances_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."action_proposals"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."automation_runbook_instances"
    ADD CONSTRAINT "automation_runbook_instances_runbook_id_fkey" FOREIGN KEY ("runbook_id") REFERENCES "public"."automation_runbooks"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."automation_runbook_steps"
    ADD CONSTRAINT "automation_runbook_steps_runbook_id_fkey" FOREIGN KEY ("runbook_id") REFERENCES "public"."automation_runbooks"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."automation_step_runs"
    ADD CONSTRAINT "automation_step_runs_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."automation_runbook_instances"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."automation_step_runs"
    ADD CONSTRAINT "automation_step_runs_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "public"."automation_runbook_steps"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."automation_step_runs"
    ADD CONSTRAINT "automation_step_runs_store_instance_id_fkey" FOREIGN KEY ("store_instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checkout_recovery_intents"
    ADD CONSTRAINT "checkout_recovery_intents_communication_job_id_fkey" FOREIGN KEY ("communication_job_id") REFERENCES "public"."communication_jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."checkout_recovery_intents"
    ADD CONSTRAINT "checkout_recovery_intents_converted_order_id_fkey" FOREIGN KEY ("converted_order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."checkout_recovery_intents"
    ADD CONSTRAINT "checkout_recovery_intents_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checkout_recovery_intents"
    ADD CONSTRAINT "checkout_recovery_intents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."commercial_offers"
    ADD CONSTRAINT "commercial_offers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."commercial_offers"
    ADD CONSTRAINT "commercial_offers_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."commercial_offers"
    ADD CONSTRAINT "commercial_offers_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."commercial_opportunities"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."commercial_offers"
    ADD CONSTRAINT "commercial_offers_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."commercial_opportunities"
    ADD CONSTRAINT "commercial_opportunities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."commercial_opportunities"
    ADD CONSTRAINT "commercial_opportunities_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."commercial_opportunities"
    ADD CONSTRAINT "commercial_opportunities_reseller_id_fkey" FOREIGN KEY ("reseller_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."communication_job_events"
    ADD CONSTRAINT "communication_job_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."communication_job_events"
    ADD CONSTRAINT "communication_job_events_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communication_job_events"
    ADD CONSTRAINT "communication_job_events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."communication_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communication_jobs"
    ADD CONSTRAINT "communication_jobs_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."communication_jobs"
    ADD CONSTRAINT "communication_jobs_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communication_jobs"
    ADD CONSTRAINT "communication_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."communication_suppression_events"
    ADD CONSTRAINT "communication_suppression_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."communication_suppression_events"
    ADD CONSTRAINT "communication_suppression_events_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communication_suppression_events"
    ADD CONSTRAINT "communication_suppression_events_suppression_id_fkey" FOREIGN KEY ("suppression_id") REFERENCES "public"."communication_suppressions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."communication_suppressions"
    ADD CONSTRAINT "communication_suppressions_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communication_suppressions"
    ADD CONSTRAINT "communication_suppressions_released_by_fkey" FOREIGN KEY ("released_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."communication_worker_runs"
    ADD CONSTRAINT "communication_worker_runs_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_pages"
    ADD CONSTRAINT "content_pages_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."control_alert_events"
    ADD CONSTRAINT "control_alert_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."control_alert_events"
    ADD CONSTRAINT "control_alert_events_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "public"."control_alerts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."control_alert_events"
    ADD CONSTRAINT "control_alert_events_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."control_alerts"
    ADD CONSTRAINT "control_alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."control_alerts"
    ADD CONSTRAINT "control_alerts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."control_alerts"
    ADD CONSTRAINT "control_alerts_dismissed_by_fkey" FOREIGN KEY ("dismissed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."control_alerts"
    ADD CONSTRAINT "control_alerts_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."control_alerts"
    ADD CONSTRAINT "control_alerts_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."commercial_opportunities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."control_alerts"
    ADD CONSTRAINT "control_alerts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."control_alerts"
    ADD CONSTRAINT "control_alerts_reseller_id_fkey" FOREIGN KEY ("reseller_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."control_alerts"
    ADD CONSTRAINT "control_alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."control_alerts"
    ADD CONSTRAINT "control_alerts_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."control_processing_runs"
    ADD CONSTRAINT "control_processing_runs_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."control_tasks"
    ADD CONSTRAINT "control_tasks_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "public"."control_alerts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."control_tasks"
    ADD CONSTRAINT "control_tasks_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."control_tasks"
    ADD CONSTRAINT "control_tasks_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."control_tasks"
    ADD CONSTRAINT "control_tasks_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_instance_roles"
    ADD CONSTRAINT "customer_instance_roles_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customer_instance_roles"
    ADD CONSTRAINT "customer_instance_roles_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_instance_roles"
    ADD CONSTRAINT "customer_instance_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_journey_steps"
    ADD CONSTRAINT "customer_journey_steps_communication_job_id_fkey" FOREIGN KEY ("communication_job_id") REFERENCES "public"."communication_jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customer_journey_steps"
    ADD CONSTRAINT "customer_journey_steps_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_journey_steps"
    ADD CONSTRAINT "customer_journey_steps_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "public"."customer_journeys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_journeys"
    ADD CONSTRAINT "customer_journeys_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_journeys"
    ADD CONSTRAINT "customer_journeys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customer_lifecycle_milestones"
    ADD CONSTRAINT "customer_lifecycle_milestones_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."customer_lifecycle_milestones"
    ADD CONSTRAINT "customer_lifecycle_milestones_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_lifecycle_milestones"
    ADD CONSTRAINT "customer_lifecycle_milestones_source_order_id_fkey" FOREIGN KEY ("source_order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."customer_value_profiles"
    ADD CONSTRAINT "customer_value_profiles_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_value_profiles"
    ADD CONSTRAINT "customer_value_profiles_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_entitlements"
    ADD CONSTRAINT "feature_entitlements_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_entitlements"
    ADD CONSTRAINT "feature_entitlements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fulfillment_events"
    ADD CONSTRAINT "fulfillment_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fulfillment_events"
    ADD CONSTRAINT "fulfillment_events_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fulfillment_events"
    ADD CONSTRAINT "fulfillment_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."integration_jobs"
    ADD CONSTRAINT "integration_jobs_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."integration_jobs"
    ADD CONSTRAINT "integration_jobs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_events"
    ADD CONSTRAINT "inventory_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory_events"
    ADD CONSTRAINT "inventory_events_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inventory_events"
    ADD CONSTRAINT "inventory_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory_events"
    ADD CONSTRAINT "inventory_events_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_reservations"
    ADD CONSTRAINT "inventory_reservations_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inventory_reservations"
    ADD CONSTRAINT "inventory_reservations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inventory_reservations"
    ADD CONSTRAINT "inventory_reservations_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inventory_reservations"
    ADD CONSTRAINT "inventory_reservations_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inventory_snapshots"
    ADD CONSTRAINT "inventory_snapshots_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_snapshots"
    ADD CONSTRAINT "inventory_snapshots_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loyalty_benefit_rules"
    ADD CONSTRAINT "loyalty_benefit_rules_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loyalty_benefit_usage"
    ADD CONSTRAINT "loyalty_benefit_usage_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."loyalty_benefit_usage"
    ADD CONSTRAINT "loyalty_benefit_usage_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loyalty_benefit_usage"
    ADD CONSTRAINT "loyalty_benefit_usage_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."loyalty_benefit_usage"
    ADD CONSTRAINT "loyalty_benefit_usage_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "public"."loyalty_benefit_rules"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."loyalty_ledger"
    ADD CONSTRAINT "loyalty_ledger_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."loyalty_ledger"
    ADD CONSTRAINT "loyalty_ledger_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loyalty_ledger"
    ADD CONSTRAINT "loyalty_ledger_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."loyalty_ledger"
    ADD CONSTRAINT "loyalty_ledger_reverses_entry_id_fkey" FOREIGN KEY ("reverses_entry_id") REFERENCES "public"."loyalty_ledger"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."loyalty_processing_runs"
    ADD CONSTRAINT "loyalty_processing_runs_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loyalty_program_settings"
    ADD CONSTRAINT "loyalty_program_settings_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_campaign_events"
    ADD CONSTRAINT "marketing_campaign_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_campaign_events"
    ADD CONSTRAINT "marketing_campaign_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_campaign_events"
    ADD CONSTRAINT "marketing_campaign_events_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_campaign_recipients"
    ADD CONSTRAINT "marketing_campaign_recipients_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_campaign_recipients"
    ADD CONSTRAINT "marketing_campaign_recipients_communication_job_id_fkey" FOREIGN KEY ("communication_job_id") REFERENCES "public"."communication_jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_campaign_recipients"
    ADD CONSTRAINT "marketing_campaign_recipients_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_campaign_recipients"
    ADD CONSTRAINT "marketing_campaign_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_consents"
    ADD CONSTRAINT "marketing_consents_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_consents"
    ADD CONSTRAINT "marketing_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."office_messages"
    ADD CONSTRAINT "office_messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."office_messages"
    ADD CONSTRAINT "office_messages_communication_job_id_fkey" FOREIGN KEY ("communication_job_id") REFERENCES "public"."communication_jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."office_messages"
    ADD CONSTRAINT "office_messages_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."office_messages"
    ADD CONSTRAINT "office_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."office_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."office_tasks"
    ADD CONSTRAINT "office_tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."office_tasks"
    ADD CONSTRAINT "office_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."office_tasks"
    ADD CONSTRAINT "office_tasks_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."office_tasks"
    ADD CONSTRAINT "office_tasks_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."office_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."office_threads"
    ADD CONSTRAINT "office_threads_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."office_threads"
    ADD CONSTRAINT "office_threads_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."office_threads"
    ADD CONSTRAINT "office_threads_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."office_threads"
    ADD CONSTRAINT "office_threads_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_events"
    ADD CONSTRAINT "order_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_events"
    ADD CONSTRAINT "order_events_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_events"
    ADD CONSTRAINT "order_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_inventory_restorations"
    ADD CONSTRAINT "order_inventory_restorations_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."order_inventory_restorations"
    ADD CONSTRAINT "order_inventory_restorations_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_inventory_restorations"
    ADD CONSTRAINT "order_inventory_restorations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_inventory_restorations"
    ADD CONSTRAINT "order_inventory_restorations_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_operations"
    ADD CONSTRAINT "order_operations_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_operations"
    ADD CONSTRAINT "order_operations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_attempts"
    ADD CONSTRAINT "payment_attempts_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_attempts"
    ADD CONSTRAINT "payment_attempts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_events"
    ADD CONSTRAINT "payment_events_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_events"
    ADD CONSTRAINT "payment_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."platform_operators"
    ADD CONSTRAINT "platform_operators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_release_events"
    ADD CONSTRAINT "post_release_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."post_release_events"
    ADD CONSTRAINT "post_release_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."post_release_sessions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."post_release_evidence"
    ADD CONSTRAINT "post_release_evidence_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."post_release_sessions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."post_release_findings"
    ADD CONSTRAINT "post_release_findings_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."post_release_findings"
    ADD CONSTRAINT "post_release_findings_last_evidence_id_fkey" FOREIGN KEY ("last_evidence_id") REFERENCES "public"."post_release_evidence"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."post_release_findings"
    ADD CONSTRAINT "post_release_findings_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."post_release_findings"
    ADD CONSTRAINT "post_release_findings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."post_release_sessions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."post_release_rollback_decisions"
    ADD CONSTRAINT "post_release_rollback_decisions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."post_release_rollback_decisions"
    ADD CONSTRAINT "post_release_rollback_decisions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."post_release_sessions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."post_release_sessions"
    ADD CONSTRAINT "post_release_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."post_release_sessions"
    ADD CONSTRAINT "post_release_sessions_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "public"."post_release_policies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."post_release_sessions"
    ADD CONSTRAINT "post_release_sessions_release_candidate_id_fkey" FOREIGN KEY ("release_candidate_id") REFERENCES "public"."release_candidates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."product_channel_settings"
    ADD CONSTRAINT "product_channel_settings_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_channel_settings"
    ADD CONSTRAINT "product_channel_settings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_recommendation_rules"
    ADD CONSTRAINT "product_recommendation_rules_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_recommendation_rules"
    ADD CONSTRAINT "product_recommendation_rules_recommended_variant_id_fkey" FOREIGN KEY ("recommended_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_recommendation_rules"
    ADD CONSTRAINT "product_recommendation_rules_source_variant_id_fkey" FOREIGN KEY ("source_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."release_approvals"
    ADD CONSTRAINT "release_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."release_approvals"
    ADD CONSTRAINT "release_approvals_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."release_candidates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."release_candidates"
    ADD CONSTRAINT "release_candidates_assurance_run_id_fkey" FOREIGN KEY ("assurance_run_id") REFERENCES "public"."assurance_runs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."release_candidates"
    ADD CONSTRAINT "release_candidates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."release_candidates"
    ADD CONSTRAINT "release_candidates_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "public"."release_policies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."release_changes"
    ADD CONSTRAINT "release_changes_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."release_candidates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."release_events"
    ADD CONSTRAINT "release_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."release_events"
    ADD CONSTRAINT "release_events_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."release_candidates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."release_gate_results"
    ADD CONSTRAINT "release_gate_results_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."release_candidates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."return_case_items"
    ADD CONSTRAINT "return_case_items_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."return_case_items"
    ADD CONSTRAINT "return_case_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."return_case_items"
    ADD CONSTRAINT "return_case_items_return_case_id_fkey" FOREIGN KEY ("return_case_id") REFERENCES "public"."return_cases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."return_cases"
    ADD CONSTRAINT "return_cases_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."return_cases"
    ADD CONSTRAINT "return_cases_inventory_restocked_by_fkey" FOREIGN KEY ("inventory_restocked_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."return_cases"
    ADD CONSTRAINT "return_cases_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."return_cases"
    ADD CONSTRAINT "return_cases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."role_bindings"
    ADD CONSTRAINT "role_bindings_delegated_by_fkey" FOREIGN KEY ("delegated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."role_bindings"
    ADD CONSTRAINT "role_bindings_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_bindings"
    ADD CONSTRAINT "role_bindings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_bindings"
    ADD CONSTRAINT "role_bindings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rollout_checks"
    ADD CONSTRAINT "rollout_checks_environment_key_fkey" FOREIGN KEY ("environment_key") REFERENCES "public"."rollout_environments"("environment_key") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rollout_decisions"
    ADD CONSTRAINT "rollout_decisions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rollout_decisions"
    ADD CONSTRAINT "rollout_decisions_environment_key_fkey" FOREIGN KEY ("environment_key") REFERENCES "public"."rollout_environments"("environment_key") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sales_tasks"
    ADD CONSTRAINT "sales_tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales_tasks"
    ADD CONSTRAINT "sales_tasks_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales_tasks"
    ADD CONSTRAINT "sales_tasks_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."commercial_offers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales_tasks"
    ADD CONSTRAINT "sales_tasks_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."commercial_opportunities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_notifications"
    ADD CONSTRAINT "stock_notifications_communication_job_id_fkey" FOREIGN KEY ("communication_job_id") REFERENCES "public"."communication_jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_notifications"
    ADD CONSTRAINT "stock_notifications_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_notifications"
    ADD CONSTRAINT "stock_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_notifications"
    ADD CONSTRAINT "stock_notifications_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_ticket_messages"
    ADD CONSTRAINT "support_ticket_messages_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_ticket_messages"
    ADD CONSTRAINT "support_ticket_messages_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_ticket_messages"
    ADD CONSTRAINT "support_ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "webhook_events_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."webshop_instance_addons"
    ADD CONSTRAINT "webshop_instance_addons_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webshop_instance_commerce_settings"
    ADD CONSTRAINT "webshop_instance_commerce_settings_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webshop_instance_members"
    ADD CONSTRAINT "webshop_instance_members_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webshop_instance_members"
    ADD CONSTRAINT "webshop_instance_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webshop_instance_provider_connections"
    ADD CONSTRAINT "webshop_instance_provider_connections_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webshop_instance_provider_connections"
    ADD CONSTRAINT "webshop_instance_provider_connections_provider_code_fkey" FOREIGN KEY ("provider_code") REFERENCES "public"."commerce_provider_catalog"("code") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."webshop_instances"
    ADD CONSTRAINT "webshop_instances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."webshop_sales_channels"
    ADD CONSTRAINT "webshop_sales_channels_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "public"."webshop_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE "private"."stock_notification_rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."action_approvals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."action_executions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."action_policies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."action_processing_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."action_proposal_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."action_proposals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_audit_tenant_read" ON "public"."admin_audit_log" FOR SELECT TO "authenticated" USING (("public"."is_platform_operator"(( SELECT "auth"."uid"() AS "uid")) OR (("instance_id" IS NOT NULL) AND "public"."can_read_store"("instance_id", ( SELECT "auth"."uid"() AS "uid"))) OR (("instance_id" IS NULL) AND ("organization_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."organization_members" "om"
  WHERE (("om"."organization_id" = "admin_audit_log"."organization_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "admins delete stock notifications" ON "public"."stock_notifications" FOR DELETE TO "authenticated" USING ("private"."is_admin"());



CREATE POLICY "admins manage recommendation rules" ON "public"."product_recommendation_rules" TO "authenticated" USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());



CREATE POLICY "admins moderate reviews" ON "public"."product_reviews" FOR UPDATE TO "authenticated" USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());



CREATE POLICY "admins update stock notifications" ON "public"."stock_notifications" FOR UPDATE TO "authenticated" USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());



CREATE POLICY "anonymous can create stock notifications" ON "public"."stock_notifications" FOR INSERT TO "anon" WITH CHECK ((("user_id" IS NULL) AND (("length"(TRIM(BOTH FROM "email")) >= 5) AND ("length"(TRIM(BOTH FROM "email")) <= 320)) AND ("status" = 'waiting'::"text")));



ALTER TABLE "public"."assurance_controls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assurance_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assurance_evidence" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assurance_findings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assurance_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated can read permitted profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "id") OR ( SELECT "private"."is_admin"() AS "is_admin")));



CREATE POLICY "authenticated reads approved or own reviews" ON "public"."product_reviews" FOR SELECT TO "authenticated" USING ((("status" = 'approved'::"text") OR (( SELECT "auth"."uid"() AS "uid") = "user_id") OR "private"."is_admin"()));



ALTER TABLE "public"."automation_control" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."automation_control_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."automation_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."automation_processing_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."automation_runbook_instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."automation_runbook_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."automation_runbooks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."automation_step_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "campaign_events_store_all" ON "public"."marketing_campaign_events" TO "authenticated" USING ("public"."can_manage_marketing"("instance_id")) WITH CHECK ("public"."can_manage_marketing"("instance_id"));



CREATE POLICY "campaign_recipients_store_all" ON "public"."marketing_campaign_recipients" TO "authenticated" USING ("public"."can_manage_marketing"("instance_id")) WITH CHECK ("public"."can_manage_marketing"("instance_id"));



CREATE POLICY "campaigns_store_all" ON "public"."marketing_campaigns" TO "authenticated" USING ("public"."can_manage_marketing"("instance_id")) WITH CHECK ("public"."can_manage_marketing"("instance_id"));



ALTER TABLE "public"."checkout_recovery_intents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."commerce_provider_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."commercial_offers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "commercial_offers_store_all" ON "public"."commercial_offers" TO "authenticated" USING ("public"."can_manage_sales"("instance_id")) WITH CHECK ("public"."can_manage_sales"("instance_id"));



ALTER TABLE "public"."commercial_opportunities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "commercial_opportunities_store_all" ON "public"."commercial_opportunities" TO "authenticated" USING ("public"."can_manage_sales"("instance_id")) WITH CHECK ("public"."can_manage_sales"("instance_id"));



ALTER TABLE "public"."communication_job_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."communication_jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "communication_jobs_store_read" ON "public"."communication_jobs" FOR SELECT TO "authenticated" USING (("public"."can_manage_marketing"("instance_id") OR "public"."can_manage_orders"("instance_id")));



ALTER TABLE "public"."communication_suppression_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."communication_suppressions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."communication_worker_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_pages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "content_store_delete" ON "public"."content_pages" FOR DELETE TO "authenticated" USING ("public"."can_manage_marketing"("instance_id"));



CREATE POLICY "content_store_insert" ON "public"."content_pages" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_manage_marketing"("instance_id"));



CREATE POLICY "content_store_read" ON "public"."content_pages" FOR SELECT TO "authenticated" USING ("public"."can_read_store"("instance_id"));



CREATE POLICY "content_store_update" ON "public"."content_pages" FOR UPDATE TO "authenticated" USING ("public"."can_manage_marketing"("instance_id")) WITH CHECK ("public"."can_manage_marketing"("instance_id"));



ALTER TABLE "public"."control_alert_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."control_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."control_processing_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."control_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupon_redemptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coupons_store_all" ON "public"."coupons" TO "authenticated" USING ("public"."can_manage_marketing"("instance_id")) WITH CHECK ("public"."can_manage_marketing"("instance_id"));



ALTER TABLE "public"."customer_instance_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_instance_roles_self_select" ON "public"."customer_instance_roles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."customer_journey_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_journeys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_lifecycle_milestones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_value_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_value_profiles_tenant_delete" ON "public"."customer_value_profiles" FOR DELETE TO "authenticated" USING ("public"."can_manage_loyalty"("instance_id"));



CREATE POLICY "customer_value_profiles_tenant_insert" ON "public"."customer_value_profiles" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_manage_loyalty"("instance_id"));



CREATE POLICY "customer_value_profiles_tenant_read" ON "public"."customer_value_profiles" FOR SELECT TO "authenticated" USING ("public"."can_read_loyalty"("instance_id"));



CREATE POLICY "customer_value_profiles_tenant_update" ON "public"."customer_value_profiles" FOR UPDATE TO "authenticated" USING ("public"."can_manage_loyalty"("instance_id")) WITH CHECK ("public"."can_manage_loyalty"("instance_id"));



ALTER TABLE "public"."feature_entitlements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feature_entitlements_scope_read" ON "public"."feature_entitlements" FOR SELECT TO "authenticated" USING (("public"."is_platform_operator"(( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."organization_members" "m"
  WHERE (("m"."organization_id" = "feature_entitlements"."organization_id") AND ("m"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."fulfillment_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fulfillment_events_store_read" ON "public"."fulfillment_events" FOR SELECT TO "authenticated" USING ("public"."can_manage_orders"("instance_id"));



ALTER TABLE "public"."integration_jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "integration_jobs_store_read" ON "public"."integration_jobs" FOR SELECT TO "authenticated" USING ("public"."can_read_store"("instance_id"));



ALTER TABLE "public"."inventory_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventory_events_store_delete" ON "public"."inventory_events" FOR DELETE TO "authenticated" USING (("public"."can_manage_catalog"("instance_id") OR "public"."can_manage_orders"("instance_id")));



CREATE POLICY "inventory_events_store_insert" ON "public"."inventory_events" FOR INSERT TO "authenticated" WITH CHECK (("public"."can_manage_catalog"("instance_id") OR "public"."can_manage_orders"("instance_id")));



CREATE POLICY "inventory_events_store_read" ON "public"."inventory_events" FOR SELECT TO "authenticated" USING ("public"."can_read_store"("instance_id"));



CREATE POLICY "inventory_events_store_update" ON "public"."inventory_events" FOR UPDATE TO "authenticated" USING (("public"."can_manage_catalog"("instance_id") OR "public"."can_manage_orders"("instance_id"))) WITH CHECK (("public"."can_manage_catalog"("instance_id") OR "public"."can_manage_orders"("instance_id")));



ALTER TABLE "public"."inventory_reservations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventory_reservations_store_delete" ON "public"."inventory_reservations" FOR DELETE TO "authenticated" USING (("public"."can_manage_catalog"("instance_id") OR "public"."can_manage_orders"("instance_id")));



CREATE POLICY "inventory_reservations_store_insert" ON "public"."inventory_reservations" FOR INSERT TO "authenticated" WITH CHECK (("public"."can_manage_catalog"("instance_id") OR "public"."can_manage_orders"("instance_id")));



CREATE POLICY "inventory_reservations_store_read" ON "public"."inventory_reservations" FOR SELECT TO "authenticated" USING ("public"."can_read_store"("instance_id"));



CREATE POLICY "inventory_reservations_store_update" ON "public"."inventory_reservations" FOR UPDATE TO "authenticated" USING (("public"."can_manage_catalog"("instance_id") OR "public"."can_manage_orders"("instance_id"))) WITH CHECK (("public"."can_manage_catalog"("instance_id") OR "public"."can_manage_orders"("instance_id")));



ALTER TABLE "public"."inventory_snapshots" ENABLE ROW LEVEL SECURITY;





ALTER TABLE "public"."loyalty_benefit_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loyalty_benefit_rules_tenant_delete" ON "public"."loyalty_benefit_rules" FOR DELETE TO "authenticated" USING ("public"."can_manage_loyalty"("instance_id"));



CREATE POLICY "loyalty_benefit_rules_tenant_insert" ON "public"."loyalty_benefit_rules" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_manage_loyalty"("instance_id"));



CREATE POLICY "loyalty_benefit_rules_tenant_read" ON "public"."loyalty_benefit_rules" FOR SELECT TO "authenticated" USING ("public"."can_read_loyalty"("instance_id"));



CREATE POLICY "loyalty_benefit_rules_tenant_update" ON "public"."loyalty_benefit_rules" FOR UPDATE TO "authenticated" USING ("public"."can_manage_loyalty"("instance_id")) WITH CHECK ("public"."can_manage_loyalty"("instance_id"));



ALTER TABLE "public"."loyalty_benefit_usage" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loyalty_benefit_usage_tenant_delete" ON "public"."loyalty_benefit_usage" FOR DELETE TO "authenticated" USING ("public"."can_manage_loyalty"("instance_id"));



CREATE POLICY "loyalty_benefit_usage_tenant_insert" ON "public"."loyalty_benefit_usage" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_manage_loyalty"("instance_id"));



CREATE POLICY "loyalty_benefit_usage_tenant_read" ON "public"."loyalty_benefit_usage" FOR SELECT TO "authenticated" USING ("public"."can_read_loyalty"("instance_id"));



CREATE POLICY "loyalty_benefit_usage_tenant_update" ON "public"."loyalty_benefit_usage" FOR UPDATE TO "authenticated" USING ("public"."can_manage_loyalty"("instance_id")) WITH CHECK ("public"."can_manage_loyalty"("instance_id"));



ALTER TABLE "public"."loyalty_ledger" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loyalty_ledger_tenant_delete" ON "public"."loyalty_ledger" FOR DELETE TO "authenticated" USING ("public"."can_manage_loyalty"("instance_id"));



CREATE POLICY "loyalty_ledger_tenant_insert" ON "public"."loyalty_ledger" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_manage_loyalty"("instance_id"));



CREATE POLICY "loyalty_ledger_tenant_read" ON "public"."loyalty_ledger" FOR SELECT TO "authenticated" USING ("public"."can_read_loyalty"("instance_id"));



CREATE POLICY "loyalty_ledger_tenant_update" ON "public"."loyalty_ledger" FOR UPDATE TO "authenticated" USING ("public"."can_manage_loyalty"("instance_id")) WITH CHECK ("public"."can_manage_loyalty"("instance_id"));



ALTER TABLE "public"."loyalty_processing_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loyalty_processing_runs_tenant_delete" ON "public"."loyalty_processing_runs" FOR DELETE TO "authenticated" USING ("public"."can_manage_loyalty"("instance_id"));



CREATE POLICY "loyalty_processing_runs_tenant_insert" ON "public"."loyalty_processing_runs" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_manage_loyalty"("instance_id"));



CREATE POLICY "loyalty_processing_runs_tenant_read" ON "public"."loyalty_processing_runs" FOR SELECT TO "authenticated" USING ("public"."can_read_loyalty"("instance_id"));



CREATE POLICY "loyalty_processing_runs_tenant_update" ON "public"."loyalty_processing_runs" FOR UPDATE TO "authenticated" USING ("public"."can_manage_loyalty"("instance_id")) WITH CHECK ("public"."can_manage_loyalty"("instance_id"));



ALTER TABLE "public"."loyalty_program_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loyalty_program_settings_tenant_delete" ON "public"."loyalty_program_settings" FOR DELETE TO "authenticated" USING ("public"."can_manage_loyalty"("instance_id"));



CREATE POLICY "loyalty_program_settings_tenant_insert" ON "public"."loyalty_program_settings" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_manage_loyalty"("instance_id"));



CREATE POLICY "loyalty_program_settings_tenant_read" ON "public"."loyalty_program_settings" FOR SELECT TO "authenticated" USING ("public"."can_read_loyalty"("instance_id"));



CREATE POLICY "loyalty_program_settings_tenant_update" ON "public"."loyalty_program_settings" FOR UPDATE TO "authenticated" USING ("public"."can_manage_loyalty"("instance_id")) WITH CHECK ("public"."can_manage_loyalty"("instance_id"));



ALTER TABLE "public"."marketing_campaign_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketing_campaign_recipients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketing_campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketing_consents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "marketing_consents_store_read" ON "public"."marketing_consents" FOR SELECT TO "authenticated" USING ("public"."can_manage_marketing"("instance_id"));



ALTER TABLE "public"."observability_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."office_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "office_messages_store_all" ON "public"."office_messages" TO "authenticated" USING ("public"."can_manage_support"("instance_id")) WITH CHECK ("public"."can_manage_support"("instance_id"));



ALTER TABLE "public"."office_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "office_tasks_store_all" ON "public"."office_tasks" TO "authenticated" USING ("public"."can_manage_support"("instance_id")) WITH CHECK ("public"."can_manage_support"("instance_id"));



ALTER TABLE "public"."office_threads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "office_threads_store_all" ON "public"."office_threads" TO "authenticated" USING ("public"."can_manage_support"("instance_id")) WITH CHECK ("public"."can_manage_support"("instance_id"));



ALTER TABLE "public"."operations_processing_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_events_store_read" ON "public"."order_events" FOR SELECT TO "authenticated" USING ("public"."can_manage_orders"("instance_id"));



ALTER TABLE "public"."order_inventory_restorations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_inventory_restorations_store_read" ON "public"."order_inventory_restorations" FOR SELECT TO "authenticated" USING ("public"."can_manage_orders"("instance_id"));



ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_customer_or_store_read" ON "public"."order_items" FOR SELECT TO "authenticated" USING (("public"."can_manage_orders"("instance_id", ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."customer_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("o"."instance_id" = "order_items"."instance_id"))))));



ALTER TABLE "public"."order_operations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_operations_store_all" ON "public"."order_operations" TO "authenticated" USING ("public"."can_manage_orders"("instance_id")) WITH CHECK ("public"."can_manage_orders"("instance_id"));



ALTER TABLE "public"."order_request_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_customer_or_store_read" ON "public"."orders" FOR SELECT TO "authenticated" USING ((("customer_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."can_manage_orders"("instance_id", ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "orders_store_update" ON "public"."orders" FOR UPDATE TO "authenticated" USING ("public"."can_manage_orders"("instance_id")) WITH CHECK ("public"."can_manage_orders"("instance_id"));



ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_members_self_read" ON "public"."organization_members" FOR SELECT TO "authenticated" USING (("public"."is_platform_operator"(( SELECT "auth"."uid"() AS "uid")) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."organization_members" "m"
  WHERE (("m"."organization_id" = "organization_members"."organization_id") AND ("m"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organizations_member_read" ON "public"."organizations" FOR SELECT TO "authenticated" USING (("public"."is_platform_operator"(( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."organization_members" "m"
  WHERE (("m"."organization_id" = "organizations"."id") AND ("m"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."payment_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_attempts_store_read" ON "public"."payment_attempts" FOR SELECT TO "authenticated" USING ("public"."can_manage_orders"("instance_id"));



ALTER TABLE "public"."payment_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_events_store_read" ON "public"."payment_events" FOR SELECT TO "authenticated" USING ("public"."can_manage_orders"("instance_id"));



ALTER TABLE "public"."platform_operators" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_release_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_release_evidence" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_release_findings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_release_policies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_release_rollback_decisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_release_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_channel_scope_read" ON "public"."product_channel_settings" FOR SELECT TO "authenticated" USING ("public"."has_store_role"("instance_id", ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"]));



ALTER TABLE "public"."product_channel_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_recommendation_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_store_delete" ON "public"."products" FOR DELETE TO "authenticated" USING ("public"."can_manage_catalog"("instance_id"));



CREATE POLICY "products_store_insert" ON "public"."products" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_manage_catalog"("instance_id"));



CREATE POLICY "products_store_read" ON "public"."products" FOR SELECT TO "authenticated" USING ("public"."can_read_store"("instance_id"));



CREATE POLICY "products_store_update" ON "public"."products" FOR UPDATE TO "authenticated" USING ("public"."can_manage_catalog"("instance_id")) WITH CHECK ("public"."can_manage_catalog"("instance_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public reads approved reviews" ON "public"."product_reviews" FOR SELECT TO "anon" USING (("status" = 'approved'::"text"));



ALTER TABLE "public"."purchase_order_items" ENABLE ROW LEVEL SECURITY;





ALTER TABLE "public"."purchase_orders" ENABLE ROW LEVEL SECURITY;





CREATE POLICY "recovery_intents_owner_read" ON "public"."checkout_recovery_intents" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."can_manage_marketing"("instance_id", ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."release_approvals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."release_candidates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."release_changes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."release_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."release_gate_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."release_governance_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."release_policies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."release_windows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."return_case_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "return_case_items_store_all" ON "public"."return_case_items" TO "authenticated" USING ("public"."can_manage_orders"("instance_id")) WITH CHECK ("public"."can_manage_orders"("instance_id"));



ALTER TABLE "public"."return_cases" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "return_cases_store_all" ON "public"."return_cases" TO "authenticated" USING ("public"."can_manage_orders"("instance_id")) WITH CHECK ("public"."can_manage_orders"("instance_id"));



ALTER TABLE "public"."role_bindings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role_bindings_scope_read" ON "public"."role_bindings" FOR SELECT TO "authenticated" USING (("public"."is_platform_operator"(( SELECT "auth"."uid"() AS "uid")) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."organization_members" "m"
  WHERE (("m"."organization_id" = "role_bindings"."organization_id") AND ("m"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("m"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))));



ALTER TABLE "public"."rollout_checks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rollout_decisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rollout_environments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_channels_scope_read" ON "public"."webshop_sales_channels" FOR SELECT TO "authenticated" USING ("public"."has_store_role"("instance_id", ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"]));



ALTER TABLE "public"."sales_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_tasks_store_all" ON "public"."sales_tasks" TO "authenticated" USING ("public"."can_manage_sales"("instance_id")) WITH CHECK ("public"."can_manage_sales"("instance_id"));



ALTER TABLE "public"."security_rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;





ALTER TABLE "public"."support_ticket_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_ticket_messages_store_all" ON "public"."support_ticket_messages" TO "authenticated" USING ("public"."can_manage_support"("instance_id")) WITH CHECK ("public"."can_manage_support"("instance_id"));



ALTER TABLE "public"."support_tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_tickets_store_all" ON "public"."support_tickets" TO "authenticated" USING ("public"."can_manage_support"("instance_id")) WITH CHECK ("public"."can_manage_support"("instance_id"));



CREATE POLICY "suppressions_store_read" ON "public"."communication_suppressions" FOR SELECT TO "authenticated" USING ("public"."can_manage_marketing"("instance_id"));



CREATE POLICY "tenant_read" ON "public"."action_approvals" FOR SELECT TO "authenticated" USING ("public"."has_store_role"("instance_id", ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"]));



CREATE POLICY "tenant_read" ON "public"."action_executions" FOR SELECT TO "authenticated" USING ("public"."has_store_role"("instance_id", ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"]));



CREATE POLICY "tenant_read" ON "public"."action_processing_runs" FOR SELECT TO "authenticated" USING ("public"."has_store_role"("instance_id", ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"]));



CREATE POLICY "tenant_read" ON "public"."action_proposal_events" FOR SELECT TO "authenticated" USING ("public"."has_store_role"("instance_id", ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"]));



CREATE POLICY "tenant_read" ON "public"."action_proposals" FOR SELECT TO "authenticated" USING ("public"."has_store_role"("instance_id", ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"]));



CREATE POLICY "tenant_read" ON "public"."automation_control" FOR SELECT TO "authenticated" USING ("public"."has_store_role"("instance_id", ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"]));



CREATE POLICY "tenant_read" ON "public"."automation_control_events" FOR SELECT TO "authenticated" USING ("public"."has_store_role"("instance_id", ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"]));



CREATE POLICY "tenant_read" ON "public"."automation_events" FOR SELECT TO "authenticated" USING ("public"."has_store_role"("store_instance_id", ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"]));



CREATE POLICY "tenant_read" ON "public"."automation_processing_runs" FOR SELECT TO "authenticated" USING ("public"."has_store_role"("instance_id", ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"]));



CREATE POLICY "tenant_read" ON "public"."automation_runbook_instances" FOR SELECT TO "authenticated" USING ("public"."has_store_role"("instance_id", ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"]));



CREATE POLICY "tenant_read" ON "public"."automation_step_runs" FOR SELECT TO "authenticated" USING ("public"."has_store_role"("store_instance_id", ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"]));



CREATE POLICY "tenant_read" ON "public"."control_alert_events" FOR SELECT TO "authenticated" USING ("public"."has_store_role"("instance_id", ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"]));



CREATE POLICY "tenant_read" ON "public"."control_alerts" FOR SELECT TO "authenticated" USING ("public"."has_store_role"("instance_id", ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"]));



CREATE POLICY "tenant_read" ON "public"."control_processing_runs" FOR SELECT TO "authenticated" USING ("public"."has_store_role"("instance_id", ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"]));



CREATE POLICY "tenant_read" ON "public"."control_tasks" FOR SELECT TO "authenticated" USING ("public"."has_store_role"("instance_id", ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"]));



CREATE POLICY "tenant_read" ON "public"."customer_journey_steps" FOR SELECT TO "authenticated" USING ("public"."has_store_role"("instance_id", ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"]));



CREATE POLICY "tenant_read" ON "public"."customer_journeys" FOR SELECT TO "authenticated" USING ("public"."has_store_role"("instance_id", ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"]));



CREATE POLICY "tenant_read" ON "public"."customer_lifecycle_milestones" FOR SELECT TO "authenticated" USING ("public"."has_store_role"("instance_id", ARRAY['owner'::"text", 'admin'::"text", 'catalog_manager'::"text", 'order_manager'::"text", 'marketing_manager'::"text", 'support'::"text", 'analyst'::"text", 'viewer'::"text"]));



CREATE POLICY "users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "users create own reviews" ON "public"."product_reviews" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND ("status" = 'pending'::"text")));



CREATE POLICY "users create own stock notifications" ON "public"."stock_notifications" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "private"."is_admin"()));



CREATE POLICY "users manage own wishlist" ON "public"."wishlists" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "users read own stock notifications" ON "public"."stock_notifications" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR "private"."is_admin"()));



CREATE POLICY "variants_store_delete" ON "public"."product_variants" FOR DELETE TO "authenticated" USING ("public"."can_manage_catalog"("instance_id"));



CREATE POLICY "variants_store_insert" ON "public"."product_variants" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_manage_catalog"("instance_id"));



CREATE POLICY "variants_store_read" ON "public"."product_variants" FOR SELECT TO "authenticated" USING ("public"."can_read_store"("instance_id"));



CREATE POLICY "variants_store_update" ON "public"."product_variants" FOR UPDATE TO "authenticated" USING ("public"."can_manage_catalog"("instance_id")) WITH CHECK ("public"."can_manage_catalog"("instance_id"));



ALTER TABLE "public"."webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webshop_instance_addons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webshop_instance_commerce_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webshop_instance_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webshop_instance_provider_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webshop_instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webshop_sales_channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wishlists" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "private" TO "authenticated";
GRANT USAGE ON SCHEMA "private" TO "service_role";



REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "private"."handle_new_user"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."has_feature_entitlement_current"("p_instance_id" "uuid", "p_feature_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."has_feature_entitlement_current"("p_instance_id" "uuid", "p_feature_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "private"."has_feature_entitlement_current"("p_instance_id" "uuid", "p_feature_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "private"."has_store_role_current"("p_instance_id" "uuid", "p_roles" "text"[], "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."has_store_role_current"("p_instance_id" "uuid", "p_roles" "text"[], "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "private"."has_store_role_current"("p_instance_id" "uuid", "p_roles" "text"[], "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "private"."is_admin"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."is_platform_operator_current"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_platform_operator_current"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "private"."is_platform_operator_current"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "private"."snapshot_order_item_tax"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."touch_product_variant_updated_at"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."accrue_loyalty_points_from_paid_orders"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accrue_loyalty_points_from_paid_orders"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."accrue_loyalty_points_from_paid_orders_v2"("p_instance_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accrue_loyalty_points_from_paid_orders_v2"("p_instance_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."action_proposal_is_stale"("p_proposal_id" "uuid") FROM PUBLIC;



GRANT ALL ON TABLE "public"."automation_runbook_instances" TO "service_role";



REVOKE ALL ON FUNCTION "public"."activate_automation_runbook"("p_instance_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."activate_automation_runbook_v2"("p_store_instance_id" "uuid", "p_runbook_instance_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."activate_automation_runbook_v2"("p_store_instance_id" "uuid", "p_runbook_instance_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_customer_journey_step"("p_journey_id" "uuid", "p_step_key" "text", "p_purpose" "text", "p_template_key" "text", "p_scheduled_at" timestamp with time zone) FROM PUBLIC;



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."release_candidates" TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_release_change"("p_candidate_id" "uuid", "p_actor_id" "uuid", "p_change_key" "text", "p_category" "text", "p_title" "text", "p_description" "text", "p_risk_level" "text", "p_event_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_release_change"("p_candidate_id" "uuid", "p_actor_id" "uuid", "p_change_key" "text", "p_category" "text", "p_title" "text", "p_description" "text", "p_risk_level" "text", "p_event_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_approve_communication_job"("p_job_id" "uuid", "p_actor" "uuid", "p_note" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."admin_approve_communication_job_v2"("p_instance_id" "uuid", "p_job_id" "uuid", "p_actor" "uuid", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_approve_communication_job_v2"("p_instance_id" "uuid", "p_job_id" "uuid", "p_actor" "uuid", "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_block_communication_email"("p_email" "text", "p_actor" "uuid", "p_note" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."admin_block_communication_email_v2"("p_instance_id" "uuid", "p_email" "text", "p_actor" "uuid", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_block_communication_email_v2"("p_instance_id" "uuid", "p_email" "text", "p_actor" "uuid", "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_manage_communication_job"("p_job_id" "uuid", "p_actor" "uuid", "p_action" "text", "p_scheduled_at" timestamp with time zone, "p_note" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."admin_manage_communication_job_v2"("p_instance_id" "uuid", "p_job_id" "uuid", "p_actor" "uuid", "p_action" "text", "p_scheduled_at" timestamp with time zone, "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_manage_communication_job_v2"("p_instance_id" "uuid", "p_job_id" "uuid", "p_actor" "uuid", "p_action" "text", "p_scheduled_at" timestamp with time zone, "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_manage_marketing_campaign"("p_campaign_id" "uuid", "p_actor" "uuid", "p_action" "text", "p_note" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."admin_manage_marketing_campaign_v2"("p_instance_id" "uuid", "p_campaign_id" "uuid", "p_actor" "uuid", "p_action" "text", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_manage_marketing_campaign_v2"("p_instance_id" "uuid", "p_campaign_id" "uuid", "p_actor" "uuid", "p_action" "text", "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_release_communication_suppression"("p_suppression_id" "uuid", "p_actor" "uuid", "p_note" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."admin_release_communication_suppression_v2"("p_instance_id" "uuid", "p_suppression_id" "uuid", "p_actor" "uuid", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_release_communication_suppression_v2"("p_instance_id" "uuid", "p_suppression_id" "uuid", "p_actor" "uuid", "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."allow_stock_notification_request"("p_email" "text", "p_ip" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."allow_stock_notification_request"("p_email" "text", "p_ip" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_checkout_instance_context"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."apply_loyalty_tier_bonus_points"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_loyalty_tier_bonus_points"() TO "service_role";



GRANT ALL ON TABLE "public"."commercial_offers" TO "service_role";



REVOKE ALL ON FUNCTION "public"."approve_commercial_offer"("p_offer_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."approve_commercial_offer_v2"("p_instance_id" "uuid", "p_offer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_commercial_offer_v2"("p_instance_id" "uuid", "p_offer_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."automation_child_store_guard"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."block_post_release_immutable_mutation"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."block_post_release_immutable_mutation"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."block_rollout_ledger_mutation"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."block_rollout_ledger_mutation"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."bulk_update_product_variants"("p_changes" "jsonb", "p_actor" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bulk_update_product_variants"("p_changes" "jsonb", "p_actor" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_manage_catalog"("p_instance_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_manage_catalog"("p_instance_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_catalog"("p_instance_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_manage_loyalty"("p_instance_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_manage_loyalty"("p_instance_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_loyalty"("p_instance_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_manage_marketing"("p_instance_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_manage_marketing"("p_instance_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_marketing"("p_instance_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_manage_orders"("p_instance_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_manage_orders"("p_instance_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_orders"("p_instance_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_manage_procurement"("p_instance_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_manage_procurement"("p_instance_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_procurement"("p_instance_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_manage_sales"("p_instance_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_manage_sales"("p_instance_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_sales"("p_instance_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_manage_support"("p_instance_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_manage_support"("p_instance_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_support"("p_instance_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_read_loyalty"("p_instance_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_read_loyalty"("p_instance_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_read_loyalty"("p_instance_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_read_store"("p_instance_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_read_store"("p_instance_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_read_store"("p_instance_id" "uuid", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cancel_release_candidate"("p_candidate_id" "uuid", "p_actor_id" "uuid", "p_reason" "text", "p_event_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_release_candidate"("p_candidate_id" "uuid", "p_actor_id" "uuid", "p_reason" "text", "p_event_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cancel_stale_automation_incidents"("p_run_key" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."capture_inventory_snapshot"("p_snapshot_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."capture_inventory_snapshot"("p_snapshot_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."capture_order_coupon_redemption"() FROM PUBLIC;



GRANT ALL ON TABLE "public"."communication_jobs" TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_communication_jobs"("p_limit" integer) FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."claim_communication_jobs_v2"("p_instance_id" "uuid", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_communication_jobs_v2"("p_instance_id" "uuid", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_integration_job"("p_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."claim_integration_job_v2"("p_instance_id" "uuid", "p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_integration_job_v2"("p_instance_id" "uuid", "p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_integration_jobs"("p_limit" integer) FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."complete_communication_job"("p_id" "uuid", "p_claim_token" "uuid", "p_provider_message_id" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."complete_communication_job_v2"("p_instance_id" "uuid", "p_id" "uuid", "p_claim_token" "uuid", "p_provider_message_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_communication_job_v2"("p_instance_id" "uuid", "p_id" "uuid", "p_claim_token" "uuid", "p_provider_message_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_admin_audit_hash"("p_chain_seq" bigint, "p_audit_scope" "text", "p_prev_hash" "text", "p_actor_user_id" "uuid", "p_actor_roles" "text"[], "p_action" "text", "p_entity_type" "text", "p_entity_id" "text", "p_summary" "text", "p_before_state" "jsonb", "p_after_state" "jsonb", "p_metadata" "jsonb", "p_created_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."compute_admin_audit_hash"("p_chain_seq" bigint, "p_audit_scope" "text", "p_prev_hash" "text", "p_actor_user_id" "uuid", "p_actor_roles" "text"[], "p_action" "text", "p_entity_type" "text", "p_entity_id" "text", "p_summary" "text", "p_before_state" "jsonb", "p_after_state" "jsonb", "p_metadata" "jsonb", "p_created_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_admin_audit_hash"("p_chain_seq" bigint, "p_audit_scope" "text", "p_prev_hash" "text", "p_actor_user_id" "uuid", "p_actor_roles" "text"[], "p_action" "text", "p_entity_type" "text", "p_entity_id" "text", "p_summary" "text", "p_before_state" "jsonb", "p_after_state" "jsonb", "p_metadata" "jsonb", "p_created_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."consume_security_rate_limit"("p_rate_key" "text", "p_window_seconds" integer, "p_max_count" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."consume_security_rate_limit"("p_rate_key" "text", "p_window_seconds" integer, "p_max_count" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."convert_checkout_recovery_intent"("p_user_id" "uuid", "p_order_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."convert_checkout_recovery_intent_v2"("p_instance_id" "uuid", "p_user_id" "uuid", "p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."convert_checkout_recovery_intent_v2"("p_instance_id" "uuid", "p_user_id" "uuid", "p_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_commercial_offer"("p_opportunity_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_discount_percent" numeric, "p_minimum_margin_percent" numeric, "p_created_by" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."create_commercial_offer_v2"("p_instance_id" "uuid", "p_opportunity_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_discount_percent" numeric, "p_minimum_margin_percent" numeric, "p_created_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_commercial_offer_v2"("p_instance_id" "uuid", "p_opportunity_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_discount_percent" numeric, "p_minimum_margin_percent" numeric, "p_created_by" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_customer_journey"("p_kind" "public"."customer_journey_kind", "p_user_id" "uuid", "p_email" "text", "p_source_key" "text", "p_metadata" "jsonb") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."create_customer_journey_v2"("p_instance_id" "uuid", "p_kind" "public"."customer_journey_kind", "p_user_id" "uuid", "p_email" "text", "p_source_key" "text", "p_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_customer_journey_v2"("p_instance_id" "uuid", "p_kind" "public"."customer_journey_kind", "p_user_id" "uuid", "p_email" "text", "p_source_key" "text", "p_metadata" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_purchase_order"("p_order_number" "text", "p_supplier_name" "text", "p_payment_terms_days" integer, "p_expected_at" "date", "p_payment_due_at" "date", "p_notes" "text", "p_created_by" "uuid", "p_items" "jsonb") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."create_purchase_order_v2"("p_instance_id" "uuid", "p_order_number" "text", "p_supplier_name" "text", "p_payment_terms_days" integer, "p_expected_at" "date", "p_payment_due_at" "date", "p_notes" "text", "p_created_by" "uuid", "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_purchase_order_v2"("p_instance_id" "uuid", "p_order_number" "text", "p_supplier_name" "text", "p_payment_terms_days" integer, "p_expected_at" "date", "p_payment_due_at" "date", "p_notes" "text", "p_created_by" "uuid", "p_items" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_release_candidate"("p_candidate_key" "text", "p_version_label" "text", "p_source_ref" "text", "p_source_sha" "text", "p_risk_class" "text", "p_change_summary" "text", "p_rollback_plan" "text", "p_created_by" "uuid", "p_event_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_release_candidate"("p_candidate_key" "text", "p_version_label" "text", "p_source_ref" "text", "p_source_sha" "text", "p_risk_class" "text", "p_change_summary" "text", "p_rollback_plan" "text", "p_created_by" "uuid", "p_event_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_return_case"("p_order_id" "uuid", "p_user_id" "uuid", "p_customer_email" "text", "p_reason" "text", "p_customer_note" "text", "p_items" "jsonb") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."create_return_case_v2"("p_instance_id" "uuid", "p_order_id" "uuid", "p_user_id" "uuid", "p_customer_email" "text", "p_reason" "text", "p_customer_note" "text", "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_return_case_v2"("p_instance_id" "uuid", "p_order_id" "uuid", "p_user_id" "uuid", "p_customer_email" "text", "p_reason" "text", "p_customer_note" "text", "p_items" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."action_proposals" TO "service_role";



REVOKE ALL ON FUNCTION "public"."decide_action_proposal"("p_proposal_id" "uuid", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text", "p_event_key" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."decide_action_proposal_v2"("p_instance_id" "uuid", "p_proposal_id" "uuid", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text", "p_event_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."decide_action_proposal_v2"("p_instance_id" "uuid", "p_proposal_id" "uuid", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text", "p_event_key" "text") TO "service_role";



GRANT ALL ON TABLE "public"."post_release_rollback_decisions" TO "service_role";



REVOKE ALL ON FUNCTION "public"."decide_post_release_rollback"("p_session_id" "uuid", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text", "p_event_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."decide_post_release_rollback"("p_session_id" "uuid", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text", "p_event_key" "text") TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."post_release_sessions" TO "service_role";



REVOKE ALL ON FUNCTION "public"."decide_post_release_session"("p_session_id" "uuid", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text", "p_event_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."decide_post_release_session"("p_session_id" "uuid", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text", "p_event_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."decide_release_candidate"("p_candidate_id" "uuid", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text", "p_event_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."decide_release_candidate"("p_candidate_id" "uuid", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text", "p_event_key" "text") TO "service_role";



GRANT ALL ON TABLE "public"."rollout_decisions" TO "service_role";



REVOKE ALL ON FUNCTION "public"."decide_rollout"("p_decision_key" "text", "p_environment_key" "text", "p_source_sha" "text", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."decide_rollout"("p_decision_key" "text", "p_environment_key" "text", "p_source_sha" "text", "p_actor_id" "uuid", "p_decision" "text", "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."detect_customer_value_control_alerts"("p_run_key" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."detect_system_control_alerts"("p_run_key" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."dispatch_due_customer_journey_steps"("p_limit" integer) FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."dispatch_due_customer_journey_steps_v2"("p_instance_id" "uuid", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dispatch_due_customer_journey_steps_v2"("p_instance_id" "uuid", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_office_message_tenant"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."enforce_office_task_tenant"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."enforce_office_thread_tenant"() FROM PUBLIC;



GRANT ALL ON FUNCTION "public"."enforce_order_tenant_match"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_order_tenant_match"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_order_tenant_match"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_purchase_order_tenant_match"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_purchase_order_tenant_match"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_purchase_order_tenant_match"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_return_case_tenant_match"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_return_case_tenant_match"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_return_case_tenant_match"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_support_ticket_tenant_match"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_support_ticket_tenant_match"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_support_ticket_tenant_match"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enqueue_communication"("p_email" "text", "p_user_id" "uuid", "p_purpose" "text", "p_template_key" "text", "p_payload" "jsonb", "p_idempotency_key" "text", "p_scheduled_at" timestamp with time zone) FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."enqueue_communication_v2"("p_instance_id" "uuid", "p_email" "text", "p_user_id" "uuid", "p_purpose" "text", "p_template_key" "text", "p_payload" "jsonb", "p_idempotency_key" "text", "p_scheduled_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enqueue_communication_v2"("p_instance_id" "uuid", "p_email" "text", "p_user_id" "uuid", "p_purpose" "text", "p_template_key" "text", "p_payload" "jsonb", "p_idempotency_key" "text", "p_scheduled_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."evaluate_assurance_control"("p_control_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."evaluate_assurance_control"("p_control_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."evaluate_release_candidate"("p_candidate_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."evaluate_release_candidate"("p_candidate_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") TO "service_role";



GRANT ALL ON TABLE "public"."action_executions" TO "service_role";



REVOKE ALL ON FUNCTION "public"."execute_action_proposal"("p_proposal_id" "uuid", "p_actor_id" "uuid", "p_execution_key" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."execute_action_proposal_v2"("p_instance_id" "uuid", "p_proposal_id" "uuid", "p_actor_id" "uuid", "p_execution_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."execute_action_proposal_v2"("p_instance_id" "uuid", "p_proposal_id" "uuid", "p_actor_id" "uuid", "p_execution_key" "text") TO "service_role";



GRANT ALL ON TABLE "public"."automation_step_runs" TO "service_role";



REVOKE ALL ON FUNCTION "public"."execute_automation_step"("p_instance_id" "uuid", "p_actor_id" "uuid", "p_execution_key" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."execute_automation_step_v2"("p_store_instance_id" "uuid", "p_runbook_instance_id" "uuid", "p_actor_id" "uuid", "p_execution_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."execute_automation_step_v2"("p_store_instance_id" "uuid", "p_runbook_instance_id" "uuid", "p_actor_id" "uuid", "p_execution_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."expire_assurance_risk_acceptances"("p_run_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."expire_assurance_risk_acceptances"("p_run_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."expire_or_cancel_action_proposals"("p_run_key" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."expire_stale_release_candidates"("p_run_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."expire_stale_release_candidates"("p_run_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fail_communication_job"("p_id" "uuid", "p_claim_token" "uuid", "p_error" "text", "p_retry" boolean) FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."fail_communication_job_v2"("p_instance_id" "uuid", "p_id" "uuid", "p_claim_token" "uuid", "p_error" "text", "p_retry" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fail_communication_job_v2"("p_instance_id" "uuid", "p_id" "uuid", "p_claim_token" "uuid", "p_error" "text", "p_retry" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_customer_loyalty_snapshot"("p_customer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_customer_loyalty_snapshot"("p_customer_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_customer_loyalty_snapshot_v2"("p_instance_id" "uuid", "p_customer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_customer_loyalty_snapshot_v2"("p_instance_id" "uuid", "p_customer_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_order_operation_snapshot"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_order_operation_snapshot"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_action_policy_identity"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_action_policy_identity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_action_policy_identity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_action_policy_version_definition"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_action_policy_version_definition"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_action_policy_version_definition"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_action_proposal_identity"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_action_proposal_identity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_action_proposal_identity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_action_proposal_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_action_proposal_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_action_proposal_status"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."guard_assurance_append_only"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."guard_assurance_append_only"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."guard_assurance_control_version"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."guard_assurance_control_version"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."guard_assurance_finding_identity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."guard_assurance_finding_identity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_automation_event_immutable"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_automation_event_immutable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_automation_event_immutable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_automation_instance_identity"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_automation_instance_identity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_automation_instance_identity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_automation_instance_terminal"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_automation_instance_terminal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_automation_instance_terminal"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_automation_runbook_identity"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_automation_runbook_identity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_automation_runbook_identity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_automation_runbook_step_immutable"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_automation_runbook_step_immutable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_automation_runbook_step_immutable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_automation_step_integrity"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_automation_step_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_automation_step_integrity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."guard_automation_step_source_current"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."guard_closed_support_thread"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."guard_control_alert_identity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."guard_control_alert_identity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."guard_control_task_identity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."guard_control_task_identity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."guard_order_status_against_operations"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."guard_release_audit_immutable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."guard_release_audit_immutable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."guard_release_candidate_identity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."guard_release_candidate_identity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."guard_release_policy_definition"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."guard_release_policy_definition"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_feature_entitlement"("p_instance_id" "uuid", "p_feature_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_feature_entitlement"("p_instance_id" "uuid", "p_feature_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_feature_entitlement"("p_instance_id" "uuid", "p_feature_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_marketing_consent"("p_email" "text", "p_channel" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."has_marketing_consent_v2"("p_instance_id" "uuid", "p_email" "text", "p_channel" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_marketing_consent_v2"("p_instance_id" "uuid", "p_email" "text", "p_channel" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_store_role"("p_instance_id" "uuid", "p_roles" "text"[], "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_store_role"("p_instance_id" "uuid", "p_roles" "text"[], "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_store_role"("p_instance_id" "uuid", "p_roles" "text"[], "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."initialize_support_ticket_thread"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."is_communication_suppressed"("p_email" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."is_communication_suppressed_v2"("p_instance_id" "uuid", "p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_communication_suppressed_v2"("p_instance_id" "uuid", "p_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_platform_operator"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_platform_operator"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_platform_operator"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."maintain_control_incident_started_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."maintain_control_incident_started_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."merchant_intelligence_store_guard"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."place_order_idempotent"("p_idempotency_key" "text", "p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text", "p_billing_tax_number" "text", "p_billing_postcode" "text", "p_billing_city" "text", "p_billing_address" "text", "p_shipping_name" "text", "p_shipping_postcode" "text", "p_shipping_city" "text", "p_shipping_address" "text", "p_customer_phone" "text", "p_shipping_method" "text", "p_parcel_point_id" "text", "p_payment_method" "text", "p_note" "text", "p_customer_id" "uuid", "p_coupon_code" "text", "p_items" "jsonb") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."place_order_provider"("p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text", "p_billing_tax_number" "text", "p_billing_postcode" "text", "p_billing_city" "text", "p_billing_address" "text", "p_shipping_name" "text", "p_shipping_postcode" "text", "p_shipping_city" "text", "p_shipping_address" "text", "p_customer_phone" "text", "p_shipping_provider" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_parcel_point_id" "text", "p_payment_provider" "text", "p_note" "text", "p_customer_id" "uuid", "p_coupon_code" "text", "p_items" "jsonb") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."place_order_provider_idempotent"("p_idempotency_key" "text", "p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text", "p_billing_tax_number" "text", "p_billing_postcode" "text", "p_billing_city" "text", "p_billing_address" "text", "p_shipping_name" "text", "p_shipping_postcode" "text", "p_shipping_city" "text", "p_shipping_address" "text", "p_customer_phone" "text", "p_shipping_provider" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_parcel_point_id" "text", "p_payment_provider" "text", "p_note" "text", "p_customer_id" "uuid", "p_coupon_code" "text", "p_items" "jsonb") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."place_order_provider_v2"("p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text", "p_billing_tax_number" "text", "p_billing_postcode" "text", "p_billing_city" "text", "p_billing_address" "text", "p_shipping_name" "text", "p_shipping_postcode" "text", "p_shipping_city" "text", "p_shipping_address" "text", "p_customer_phone" "text", "p_shipping_provider" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_free_shipping_threshold_huf" integer, "p_parcel_point_id" "text", "p_payment_provider" "text", "p_note" "text", "p_customer_id" "uuid", "p_coupon_code" "text", "p_items" "jsonb") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."place_order_provider_v2_idempotent"("p_idempotency_key" "text", "p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text", "p_billing_tax_number" "text", "p_billing_postcode" "text", "p_billing_city" "text", "p_billing_address" "text", "p_shipping_name" "text", "p_shipping_postcode" "text", "p_shipping_city" "text", "p_shipping_address" "text", "p_customer_phone" "text", "p_shipping_provider" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_free_shipping_threshold_huf" integer, "p_parcel_point_id" "text", "p_payment_provider" "text", "p_note" "text", "p_customer_id" "uuid", "p_coupon_code" "text", "p_items" "jsonb") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."place_order_provider_v3_idempotent"("p_instance_id" "uuid", "p_idempotency_key" "text", "p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text", "p_billing_tax_number" "text", "p_billing_postcode" "text", "p_billing_city" "text", "p_billing_address" "text", "p_shipping_name" "text", "p_shipping_postcode" "text", "p_shipping_city" "text", "p_shipping_address" "text", "p_customer_phone" "text", "p_shipping_provider" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_free_shipping_threshold_huf" integer, "p_parcel_point_id" "text", "p_payment_provider" "text", "p_note" "text", "p_customer_id" "uuid", "p_coupon_code" "text", "p_items" "jsonb") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."place_order_provider_v4_idempotent"("p_instance_id" "uuid", "p_idempotency_key" "text", "p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text", "p_billing_tax_number" "text", "p_billing_postcode" "text", "p_billing_city" "text", "p_billing_address" "text", "p_shipping_name" "text", "p_shipping_postcode" "text", "p_shipping_city" "text", "p_shipping_address" "text", "p_customer_phone" "text", "p_shipping_provider" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_free_shipping_threshold_huf" integer, "p_parcel_point_id" "text", "p_payment_provider" "text", "p_note" "text", "p_customer_id" "uuid", "p_coupon_code" "text", "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."place_order_provider_v4_idempotent"("p_instance_id" "uuid", "p_idempotency_key" "text", "p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text", "p_billing_tax_number" "text", "p_billing_postcode" "text", "p_billing_city" "text", "p_billing_address" "text", "p_shipping_name" "text", "p_shipping_postcode" "text", "p_shipping_city" "text", "p_shipping_address" "text", "p_customer_phone" "text", "p_shipping_provider" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_free_shipping_threshold_huf" integer, "p_parcel_point_id" "text", "p_payment_provider" "text", "p_note" "text", "p_customer_id" "uuid", "p_coupon_code" "text", "p_items" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."place_order_provider_v5_idempotent"("p_instance_id" "uuid", "p_idempotency_key" "text", "p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text", "p_billing_tax_number" "text", "p_billing_postcode" "text", "p_billing_city" "text", "p_billing_address" "text", "p_shipping_name" "text", "p_shipping_postcode" "text", "p_shipping_city" "text", "p_shipping_address" "text", "p_customer_phone" "text", "p_shipping_provider" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_free_shipping_threshold_huf" integer, "p_parcel_point_id" "text", "p_payment_provider" "text", "p_note" "text", "p_customer_id" "uuid", "p_coupon_code" "text", "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."place_order_provider_v5_idempotent"("p_instance_id" "uuid", "p_idempotency_key" "text", "p_customer_email" "text", "p_billing_name" "text", "p_billing_company" "text", "p_billing_tax_number" "text", "p_billing_postcode" "text", "p_billing_city" "text", "p_billing_address" "text", "p_shipping_name" "text", "p_shipping_postcode" "text", "p_shipping_city" "text", "p_shipping_address" "text", "p_customer_phone" "text", "p_shipping_provider" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_free_shipping_threshold_huf" integer, "p_parcel_point_id" "text", "p_payment_provider" "text", "p_note" "text", "p_customer_id" "uuid", "p_coupon_code" "text", "p_items" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."plan_action_proposals"("p_run_key" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."plan_automation_runbooks"("p_run_key" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."plan_commercial_opportunities"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."plan_commercial_opportunities_v2"("p_instance_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."plan_commercial_opportunities_v2"("p_instance_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."plan_control_tasks"("p_run_key" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."plan_customer_lifecycle_milestones"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."plan_customer_retention_journeys"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."plan_customer_retention_journeys_v2"("p_instance_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."plan_customer_retention_journeys_v2"("p_instance_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."plan_high_value_sales_tasks"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."plan_high_value_sales_tasks_v2"("p_instance_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."plan_high_value_sales_tasks_v2"("p_instance_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."plan_loyalty_retention_opportunities"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."plan_loyalty_retention_opportunities"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."platform_owner_claim_available"("p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."platform_owner_claim_available"("p_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."prepare_admin_audit_entry"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."prevent_admin_audit_mutation"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."prevent_control_event_mutation"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prevent_control_event_mutation"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."preview_promotion_margin"("p_variant_id" "uuid", "p_discount_percent" numeric, "p_min_margin_percent" numeric) FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."preview_promotion_margin_v2"("p_instance_id" "uuid", "p_variant_id" "uuid", "p_discount_percent" numeric, "p_min_margin_percent" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."preview_promotion_margin_v2"("p_instance_id" "uuid", "p_variant_id" "uuid", "p_discount_percent" numeric, "p_min_margin_percent" numeric) TO "service_role";



GRANT ALL ON TABLE "public"."action_processing_runs" TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_action_cycle"("p_run_key" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."process_action_cycle_v2"("p_instance_id" "uuid", "p_run_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_action_cycle_v2"("p_instance_id" "uuid", "p_run_key" "text") TO "service_role";



GRANT ALL ON TABLE "public"."assurance_runs" TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_assurance_cycle"("p_run_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_assurance_cycle"("p_run_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_assurance_readiness_cycle"("p_run_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_assurance_readiness_cycle"("p_run_key" "text") TO "service_role";



GRANT ALL ON TABLE "public"."automation_processing_runs" TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_automation_cycle"("p_run_key" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."process_automation_cycle_v2"("p_instance_id" "uuid", "p_run_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_automation_cycle_v2"("p_instance_id" "uuid", "p_run_key" "text") TO "service_role";



GRANT ALL ON TABLE "public"."control_processing_runs" TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_control_tower_cycle"("p_run_key" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."process_control_tower_cycle_v2"("p_instance_id" "uuid", "p_run_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_control_tower_cycle_v2"("p_instance_id" "uuid", "p_run_key" "text") TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_processing_runs" TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_loyalty_lifecycle"("p_run_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_loyalty_lifecycle"("p_run_key" "text") TO "service_role";



GRANT ALL ON TABLE "public"."operations_processing_runs" TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_operations_cycle"("p_run_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_operations_cycle"("p_run_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_post_release_cycle"("p_run_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_post_release_cycle"("p_run_key" "text") TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."release_governance_runs" TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_release_governance_cycle"("p_run_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_release_governance_cycle"("p_run_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."purge_observability_events"("p_retention_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."purge_observability_events"("p_retention_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."queue_abandoned_checkout_recoveries"("p_limit" integer, "p_min_age_minutes" integer) FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."queue_abandoned_checkout_recoveries_v2"("p_instance_id" "uuid", "p_limit" integer, "p_min_age_minutes" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."queue_abandoned_checkout_recoveries_v2"("p_instance_id" "uuid", "p_limit" integer, "p_min_age_minutes" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."queue_available_stock_notifications"("p_limit" integer) FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."queue_available_stock_notifications_v2"("p_instance_id" "uuid", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."queue_available_stock_notifications_v2"("p_instance_id" "uuid", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."queue_due_customer_journey_steps"("p_limit" integer) FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."quote_tenant_checkout_v1"("p_instance_id" "uuid", "p_customer_id" "uuid", "p_coupon_code" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_free_shipping_threshold_huf" integer, "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."quote_tenant_checkout_v1"("p_instance_id" "uuid", "p_customer_id" "uuid", "p_coupon_code" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_free_shipping_threshold_huf" integer, "p_items" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."quote_tenant_checkout_v2"("p_instance_id" "uuid", "p_customer_id" "uuid", "p_coupon_code" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_free_shipping_threshold_huf" integer, "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."quote_tenant_checkout_v2"("p_instance_id" "uuid", "p_customer_id" "uuid", "p_coupon_code" "text", "p_shipping_kind" "text", "p_shipping_fee_huf" integer, "p_free_shipping_threshold_huf" integer, "p_items" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."receive_purchase_order"("p_purchase_order_id" "uuid", "p_actor" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."receive_purchase_order_items"("p_purchase_order_id" "uuid", "p_actor" "uuid", "p_items" "jsonb") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."receive_purchase_order_items_v2"("p_instance_id" "uuid", "p_purchase_order_id" "uuid", "p_actor" "uuid", "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."receive_purchase_order_items_v2"("p_instance_id" "uuid", "p_purchase_order_id" "uuid", "p_actor" "uuid", "p_items" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."receive_purchase_order_v2"("p_instance_id" "uuid", "p_purchase_order_id" "uuid", "p_actor" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."receive_purchase_order_v2"("p_instance_id" "uuid", "p_purchase_order_id" "uuid", "p_actor" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reconcile_assurance_findings"("p_run_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reconcile_assurance_findings"("p_run_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reconcile_automation_runbooks"("p_run_key" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."reconcile_inventory_reservations"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reconcile_inventory_reservations"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reconcile_post_release_session"("p_session_id" "uuid", "p_run_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reconcile_post_release_session"("p_session_id" "uuid", "p_run_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reconcile_release_candidates"("p_run_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reconcile_release_candidates"("p_run_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_coupon_redemption_v1"("p_instance_id" "uuid", "p_order_id" "uuid", "p_coupon_code" "text", "p_discount_gross_huf" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_coupon_redemption_v1"("p_instance_id" "uuid", "p_order_id" "uuid", "p_coupon_code" "text", "p_discount_gross_huf" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_observability_event"("p_event_key" "text", "p_correlation_id" "text", "p_category" "text", "p_severity" "text", "p_event_name" "text", "p_duration_ms" integer, "p_status_code" integer, "p_source" "text", "p_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_observability_event"("p_event_key" "text", "p_correlation_id" "text", "p_category" "text", "p_severity" "text", "p_event_name" "text", "p_duration_ms" integer, "p_status_code" integer, "p_source" "text", "p_metadata" "jsonb") TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."post_release_evidence" TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_post_release_evidence"("p_session_id" "uuid", "p_check_kind" "text", "p_status" "text", "p_source" "text", "p_observed_at" timestamp with time zone, "p_evidence" "jsonb", "p_event_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_post_release_evidence"("p_session_id" "uuid", "p_check_kind" "text", "p_status" "text", "p_source" "text", "p_observed_at" timestamp with time zone, "p_evidence" "jsonb", "p_event_key" "text") TO "service_role";



GRANT ALL ON TABLE "public"."rollout_checks" TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_rollout_check"("p_check_key" "text", "p_environment_key" "text", "p_source_sha" "text", "p_check_kind" "text", "p_status" "text", "p_trusted" boolean, "p_evidence_hash" "text", "p_source" "text", "p_observed_at" timestamp with time zone, "p_metadata" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_rollout_check"("p_check_key" "text", "p_environment_key" "text", "p_source_sha" "text", "p_check_kind" "text", "p_status" "text", "p_trusted" boolean, "p_evidence_hash" "text", "p_source" "text", "p_observed_at" timestamp with time zone, "p_metadata" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."recover_stale_communication_jobs"("p_stale_minutes" integer) FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."recover_stale_communication_jobs_v2"("p_instance_id" "uuid", "p_stale_minutes" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."recover_stale_communication_jobs_v2"("p_instance_id" "uuid", "p_stale_minutes" integer) TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_ledger" TO "service_role";



REVOKE ALL ON FUNCTION "public"."redeem_loyalty_points"("p_customer_id" "uuid", "p_points" integer, "p_event_key" "text", "p_reason" "text", "p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."redeem_loyalty_points"("p_customer_id" "uuid", "p_points" integer, "p_event_key" "text", "p_reason" "text", "p_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."refresh_automation_ready_steps"("p_run_key" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."refresh_customer_value_profiles"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."refresh_customer_value_profiles"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."refresh_customer_value_profiles_v2"("p_instance_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."refresh_customer_value_profiles_v2"("p_instance_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."refresh_order_operation_priorities"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."refresh_order_operation_priorities"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_append_only_action_mutation"() TO "anon";
GRANT ALL ON FUNCTION "public"."reject_append_only_action_mutation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_append_only_action_mutation"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."release_cancelled_order_coupon_redemption"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."release_candidate_is_stale"("p_candidate_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."release_candidate_is_stale"("p_candidate_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."release_change_set_hash"("p_candidate_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."release_change_set_hash"("p_candidate_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."release_ci_is_trusted"("p_candidate_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."release_ci_is_trusted"("p_candidate_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."release_coupon_redemption_v1"("p_instance_id" "uuid", "p_order_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."release_coupon_redemption_v1"("p_instance_id" "uuid", "p_order_id" "uuid", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."release_inventory_for_order"("p_order_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."release_inventory_for_order"("p_order_id" "uuid", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."release_window_status"("p_candidate_id" "uuid", "p_at" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."release_window_status"("p_candidate_id" "uuid", "p_at" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."reserve_inventory_for_order"("p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reserve_inventory_for_order"("p_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."resolve_stale_control_alerts"("p_cycle_started_at" timestamp with time zone, "p_run_key" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."restock_return_case"("p_case_id" "uuid", "p_actor" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."restock_return_case"("p_case_id" "uuid", "p_actor" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."restore_cancelled_order_inventory"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."restore_order_item_inventory_v1"("p_instance_id" "uuid", "p_order_id" "uuid", "p_order_item_id" "uuid", "p_source_type" "text", "p_source_id" "uuid", "p_quantity" integer, "p_actor" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."restore_order_item_inventory_v1"("p_instance_id" "uuid", "p_order_id" "uuid", "p_order_item_id" "uuid", "p_source_type" "text", "p_source_id" "uuid", "p_quantity" integer, "p_actor" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."restore_refunded_pre_fulfillment_inventory"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."restore_refunded_pre_fulfillment_inventory"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reverse_loyalty_points_for_ineligible_orders"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reverse_loyalty_points_for_ineligible_orders"() TO "service_role";



GRANT ALL ON TABLE "public"."automation_control" TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_automation_global_pause"("p_actor_id" "uuid", "p_paused" boolean, "p_reason" "text", "p_event_key" "text") FROM PUBLIC;



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."post_release_findings" TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_post_release_finding_state"("p_finding_id" "uuid", "p_actor_id" "uuid", "p_action" "text", "p_event_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_post_release_finding_state"("p_finding_id" "uuid", "p_actor_id" "uuid", "p_action" "text", "p_event_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_store_automation_pause_v2"("p_instance_id" "uuid", "p_actor_id" "uuid", "p_paused" boolean, "p_reason" "text", "p_event_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_store_automation_pause_v2"("p_instance_id" "uuid", "p_actor_id" "uuid", "p_paused" boolean, "p_reason" "text", "p_event_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."simulate_action_proposal"("p_proposal_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."simulate_action_proposal_v2"("p_instance_id" "uuid", "p_proposal_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."simulate_action_proposal_v2"("p_instance_id" "uuid", "p_proposal_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."single_runtime_instance_id"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."start_post_release_session"("p_release_candidate_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."start_post_release_session"("p_release_candidate_id" "uuid", "p_actor_id" "uuid", "p_event_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_campaign_child_instance"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."sync_coupon_redemption_from_order_v1"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."sync_inventory_event_instance"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."sync_inventory_reservation_instance"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."sync_order_item_instance"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."sync_product_variant_instance"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."sync_support_ticket_from_message"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."sync_variant_child_instance"() FROM PUBLIC;



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."assurance_findings" TO "service_role";



REVOKE ALL ON FUNCTION "public"."transition_assurance_finding"("p_finding_id" "uuid", "p_actor_id" "uuid", "p_target" "text", "p_reason" "text", "p_risk_expires_at" timestamp with time zone, "p_event_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transition_assurance_finding"("p_finding_id" "uuid", "p_actor_id" "uuid", "p_target" "text", "p_reason" "text", "p_risk_expires_at" timestamp with time zone, "p_event_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."transition_automation_instance"("p_instance_id" "uuid", "p_actor_id" "uuid", "p_target" "text", "p_event_key" "text", "p_reason" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."transition_automation_instance_v2"("p_store_instance_id" "uuid", "p_runbook_instance_id" "uuid", "p_actor_id" "uuid", "p_target" "text", "p_event_key" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transition_automation_instance_v2"("p_store_instance_id" "uuid", "p_runbook_instance_id" "uuid", "p_actor_id" "uuid", "p_target" "text", "p_event_key" "text", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."transition_commercial_offer"("p_offer_id" "uuid", "p_status" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."transition_commercial_offer_v2"("p_instance_id" "uuid", "p_offer_id" "uuid", "p_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transition_commercial_offer_v2"("p_instance_id" "uuid", "p_offer_id" "uuid", "p_status" "text") TO "service_role";



GRANT ALL ON TABLE "public"."control_alerts" TO "service_role";



REVOKE ALL ON FUNCTION "public"."transition_control_alert"("p_alert_id" "uuid", "p_target_status" "text", "p_event_key" "text", "p_actor_id" "uuid", "p_snoozed_until" timestamp with time zone, "p_note" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."transition_control_alert_v2"("p_instance_id" "uuid", "p_alert_id" "uuid", "p_target_status" "text", "p_event_key" "text", "p_actor_id" "uuid", "p_snoozed_until" timestamp with time zone, "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transition_control_alert_v2"("p_instance_id" "uuid", "p_alert_id" "uuid", "p_target_status" "text", "p_event_key" "text", "p_actor_id" "uuid", "p_snoozed_until" timestamp with time zone, "p_note" "text") TO "service_role";



GRANT ALL ON TABLE "public"."control_tasks" TO "service_role";



REVOKE ALL ON FUNCTION "public"."transition_control_task"("p_task_id" "uuid", "p_target_status" "text", "p_event_key" "text", "p_actor_id" "uuid", "p_outcome" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."transition_control_task_v2"("p_instance_id" "uuid", "p_task_id" "uuid", "p_target_status" "text", "p_event_key" "text", "p_actor_id" "uuid", "p_outcome" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transition_control_task_v2"("p_instance_id" "uuid", "p_task_id" "uuid", "p_target_status" "text", "p_event_key" "text", "p_actor_id" "uuid", "p_outcome" "text") TO "service_role";



GRANT ALL ON TABLE "public"."order_operations" TO "service_role";



REVOKE ALL ON FUNCTION "public"."transition_order_operation"("p_order_id" "uuid", "p_target_status" "text", "p_event_key" "text", "p_actor_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transition_order_operation"("p_order_id" "uuid", "p_target_status" "text", "p_event_key" "text", "p_actor_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."transition_purchase_order"("p_purchase_order_id" "uuid", "p_target_status" "text", "p_actor" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."transition_purchase_order_v2"("p_instance_id" "uuid", "p_purchase_order_id" "uuid", "p_target_status" "text", "p_actor" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transition_purchase_order_v2"("p_instance_id" "uuid", "p_purchase_order_id" "uuid", "p_target_status" "text", "p_actor" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."transition_return_case"("p_case_id" "uuid", "p_actor" "uuid", "p_target_status" "text", "p_refund_amount" integer, "p_refund_reference" "text", "p_admin_note" "text", "p_restock" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transition_return_case"("p_case_id" "uuid", "p_actor" "uuid", "p_target_status" "text", "p_refund_amount" integer, "p_refund_reference" "text", "p_admin_note" "text", "p_restock" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."transition_tenant_order_v1"("p_instance_id" "uuid", "p_order_id" "uuid", "p_actor" "uuid", "p_target_status" "text", "p_tracking_number" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transition_tenant_order_v1"("p_instance_id" "uuid", "p_order_id" "uuid", "p_actor" "uuid", "p_target_status" "text", "p_tracking_number" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_release_ci_evidence"("p_candidate_id" "uuid", "p_actor_id" "uuid", "p_ci_status" "text", "p_observed_at" timestamp with time zone, "p_evidence" "jsonb", "p_event_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_release_ci_evidence"("p_candidate_id" "uuid", "p_actor_id" "uuid", "p_ci_status" "text", "p_observed_at" timestamp with time zone, "p_evidence" "jsonb", "p_event_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."upsert_checkout_recovery_intent"("p_user_id" "uuid", "p_email" "text", "p_cart" "jsonb", "p_checkout" "jsonb") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."upsert_checkout_recovery_intent_v2"("p_instance_id" "uuid", "p_user_id" "uuid", "p_email" "text", "p_cart" "jsonb", "p_checkout" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_checkout_recovery_intent_v2"("p_instance_id" "uuid", "p_user_id" "uuid", "p_email" "text", "p_cart" "jsonb", "p_checkout" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."upsert_control_alert"("p_alert_key" "text", "p_category" "text", "p_alert_type" "text", "p_severity" "text", "p_priority_score" integer, "p_title" "text", "p_description" "text", "p_recommended_action" "text", "p_run_key" "text", "p_order_id" "uuid", "p_customer_id" "uuid", "p_reseller_id" "uuid", "p_variant_id" "uuid", "p_opportunity_id" "uuid", "p_evidence" "jsonb") FROM PUBLIC;



GRANT ALL ON TABLE "public"."loyalty_benefit_usage" TO "service_role";



REVOKE ALL ON FUNCTION "public"."use_discount_loyalty_benefit"("p_customer_id" "uuid", "p_rule_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_usage_key" "text", "p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."use_discount_loyalty_benefit"("p_customer_id" "uuid", "p_rule_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_usage_key" "text", "p_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."use_loyalty_benefit"("p_customer_id" "uuid", "p_rule_id" "uuid", "p_usage_key" "text", "p_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."use_loyalty_benefit"("p_customer_id" "uuid", "p_rule_id" "uuid", "p_usage_key" "text", "p_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_refund_total"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."validate_return_case_item_quantity"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."verify_admin_audit_chain"("p_instance_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."verify_admin_audit_chain"("p_instance_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_admin_audit_chain"("p_instance_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_admin_audit_chain"("p_instance_id" "uuid") TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "private"."platform_owner_claims" TO "service_role";



GRANT ALL ON TABLE "public"."action_approvals" TO "service_role";



GRANT ALL ON TABLE "public"."action_center_kpis" TO "service_role";



GRANT ALL ON TABLE "public"."action_policies" TO "service_role";



GRANT ALL ON TABLE "public"."action_center_queue" TO "service_role";



GRANT ALL ON TABLE "public"."action_proposal_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."action_proposal_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."action_proposal_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."action_proposal_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."customer_value_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_benefit_rules" TO "service_role";



GRANT ALL ON TABLE "public"."active_customer_benefits" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."admin_audit_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."admin_audit_chain_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."admin_audit_chain_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."admin_audit_chain_seq" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."assurance_controls" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."assurance_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."assurance_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."assurance_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."assurance_events_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."assurance_evidence" TO "service_role";



GRANT ALL ON TABLE "public"."assurance_finding_queue" TO "service_role";



GRANT ALL ON TABLE "public"."assurance_latest_control_results" TO "service_role";



GRANT ALL ON TABLE "public"."assurance_readiness" TO "service_role";



GRANT ALL ON TABLE "public"."assurance_recent_runs" TO "service_role";



GRANT ALL ON TABLE "public"."automation_control_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."automation_control_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."automation_control_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."automation_control_events_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."automation_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."automation_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."automation_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."automation_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."automation_health" TO "service_role";



GRANT ALL ON TABLE "public"."automation_runbook_queue" TO "service_role";



GRANT ALL ON TABLE "public"."automation_kpis" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."automation_runbook_steps" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."automation_runbooks" TO "service_role";



GRANT ALL ON TABLE "public"."checkout_recovery_intents" TO "service_role";



GRANT ALL ON TABLE "public"."commerce_provider_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."commercial_opportunities" TO "service_role";



GRANT ALL ON TABLE "public"."commercial_conversion_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."commercial_offer_forecast" TO "service_role";



GRANT ALL ON TABLE "public"."commercial_pipeline_summary" TO "service_role";



GRANT ALL ON TABLE "public"."commercial_executive_forecast" TO "service_role";



GRANT ALL ON TABLE "public"."commercial_pipeline_decision_support" TO "service_role";



GRANT ALL ON TABLE "public"."communication_job_events" TO "service_role";



GRANT ALL ON TABLE "public"."communication_suppression_events" TO "service_role";



GRANT ALL ON TABLE "public"."communication_suppressions" TO "service_role";



GRANT ALL ON TABLE "public"."communication_worker_runs" TO "service_role";



GRANT ALL ON TABLE "public"."content_pages" TO "anon";
GRANT ALL ON TABLE "public"."content_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."content_pages" TO "service_role";



GRANT ALL ON TABLE "public"."control_alert_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."control_alert_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."control_alert_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."control_alert_events_id_seq" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."integration_jobs" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."integration_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."integration_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."control_system_health" TO "service_role";



GRANT ALL ON TABLE "public"."webshop_instances" TO "service_role";



GRANT ALL ON TABLE "public"."control_system_health_v2" TO "service_role";



GRANT ALL ON TABLE "public"."control_tower_category_summary" TO "service_role";



GRANT ALL ON TABLE "public"."control_tower_category_summary_v2" TO "service_role";



GRANT ALL ON TABLE "public"."control_tower_queue" TO "service_role";



GRANT ALL ON TABLE "public"."control_tower_kpis" TO "service_role";



GRANT ALL ON TABLE "public"."control_tower_queue_v2" TO "service_role";



GRANT ALL ON TABLE "public"."control_tower_kpis_v2" TO "service_role";



GRANT ALL ON TABLE "public"."coupon_redemptions" TO "service_role";



GRANT ALL ON TABLE "public"."coupons" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."customer_commercial_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."customer_instance_roles" TO "service_role";
GRANT SELECT ON TABLE "public"."customer_instance_roles" TO "authenticated";



GRANT ALL ON TABLE "public"."customer_journey_steps" TO "service_role";



GRANT ALL ON TABLE "public"."customer_journeys" TO "service_role";



GRANT ALL ON TABLE "public"."customer_lifecycle_milestones" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_balances" TO "service_role";



GRANT ALL ON TABLE "public"."customer_loyalty_summary" TO "service_role";



GRANT ALL ON TABLE "public"."feature_entitlements" TO "anon";
GRANT ALL ON TABLE "public"."feature_entitlements" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_entitlements" TO "service_role";



GRANT ALL ON TABLE "public"."fulfillment_events" TO "service_role";



GRANT ALL ON TABLE "public"."order_operations_queue" TO "service_role";



GRANT ALL ON TABLE "public"."fulfillment_sla_summary" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_reservations" TO "service_role";



GRANT ALL ON TABLE "public"."product_variants" TO "anon";
GRANT ALL ON TABLE "public"."product_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."product_variants" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_available_to_promise" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_events" TO "anon";
GRANT ALL ON TABLE "public"."inventory_events" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_events" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_pressure" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_snapshots" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_snapshots_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_snapshots_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_snapshots_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_program_settings" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_campaign_recipients" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_campaign_conversions" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_campaign_events" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_consents" TO "service_role";



GRANT ALL ON TABLE "public"."merchant_intelligence_tenant_gaps" TO "anon";
GRANT ALL ON TABLE "public"."merchant_intelligence_tenant_gaps" TO "authenticated";
GRANT ALL ON TABLE "public"."merchant_intelligence_tenant_gaps" TO "service_role";



GRANT ALL ON TABLE "public"."observability_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."observability_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."observability_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."observability_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."observability_issue_queue" TO "service_role";



GRANT ALL ON TABLE "public"."observability_kpis" TO "service_role";



GRANT ALL ON TABLE "public"."office_messages" TO "anon";
GRANT ALL ON TABLE "public"."office_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."office_messages" TO "service_role";



GRANT ALL ON TABLE "public"."office_tasks" TO "anon";
GRANT ALL ON TABLE "public"."office_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."office_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."office_threads" TO "anon";
GRANT ALL ON TABLE "public"."office_threads" TO "authenticated";
GRANT ALL ON TABLE "public"."office_threads" TO "service_role";



GRANT ALL ON TABLE "public"."return_cases" TO "anon";
GRANT ALL ON TABLE "public"."return_cases" TO "authenticated";
GRANT ALL ON TABLE "public"."return_cases" TO "service_role";



GRANT ALL ON TABLE "public"."support_tickets" TO "anon";
GRANT ALL ON TABLE "public"."support_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."support_tickets" TO "service_role";



GRANT ALL ON TABLE "public"."order_service_operations" TO "service_role";



GRANT ALL ON TABLE "public"."operations_exception_queue" TO "service_role";



GRANT ALL ON TABLE "public"."operations_inventory_summary" TO "service_role";



GRANT ALL ON TABLE "public"."operations_kpi_summary" TO "service_role";



GRANT ALL ON TABLE "public"."order_events" TO "anon";
GRANT ALL ON TABLE "public"."order_events" TO "authenticated";
GRANT ALL ON TABLE "public"."order_events" TO "service_role";



GRANT ALL ON TABLE "public"."order_inventory_restorations" TO "anon";
GRANT ALL ON TABLE "public"."order_inventory_restorations" TO "authenticated";
GRANT ALL ON TABLE "public"."order_inventory_restorations" TO "service_role";



GRANT ALL ON TABLE "public"."order_request_keys" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."payment_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."payment_events" TO "service_role";



GRANT ALL ON TABLE "public"."platform_operators" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."post_release_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."post_release_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."post_release_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."post_release_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."post_release_findings_queue" TO "service_role";



GRANT ALL ON TABLE "public"."post_release_kpis" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."post_release_policies" TO "service_role";



GRANT ALL ON TABLE "public"."post_release_session_queue" TO "service_role";



GRANT ALL ON TABLE "public"."post_release_rollback_queue" TO "service_role";



GRANT ALL ON TABLE "public"."product_channel_settings" TO "anon";
GRANT ALL ON TABLE "public"."product_channel_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."product_channel_settings" TO "service_role";



GRANT ALL ON TABLE "public"."product_recommendation_rules" TO "anon";
GRANT ALL ON TABLE "public"."product_recommendation_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."product_recommendation_rules" TO "service_role";



GRANT ALL ON TABLE "public"."product_reviews" TO "anon";
GRANT ALL ON TABLE "public"."product_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."product_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT UPDATE("full_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("company_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("tax_number") ON TABLE "public"."profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."purchase_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_orders" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."release_approvals" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."release_changes" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."release_policies" TO "service_role";



GRANT ALL ON TABLE "public"."release_candidate_queue" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."release_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."release_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."release_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."release_events_id_seq" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."release_gate_results" TO "service_role";



GRANT ALL ON TABLE "public"."release_governance_kpis" TO "service_role";



GRANT ALL ON TABLE "public"."release_recent_governance_runs" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."release_windows" TO "service_role";



GRANT ALL ON TABLE "public"."reseller_reorder_signals" TO "service_role";



GRANT ALL ON TABLE "public"."reseller_growth_priorities" TO "service_role";



GRANT ALL ON TABLE "public"."reseller_reorder_signals_v2" TO "service_role";



GRANT ALL ON TABLE "public"."reseller_growth_priorities_v2" TO "service_role";



GRANT ALL ON TABLE "public"."return_case_items" TO "anon";
GRANT ALL ON TABLE "public"."return_case_items" TO "authenticated";
GRANT ALL ON TABLE "public"."return_case_items" TO "service_role";



GRANT ALL ON TABLE "public"."role_bindings" TO "anon";
GRANT ALL ON TABLE "public"."role_bindings" TO "authenticated";
GRANT ALL ON TABLE "public"."role_bindings" TO "service_role";



GRANT ALL ON TABLE "public"."rollout_environments" TO "service_role";



GRANT ALL ON TABLE "public"."rollout_readiness" TO "service_role";



GRANT ALL ON TABLE "public"."sales_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."stock_notifications" TO "anon";
GRANT ALL ON TABLE "public"."stock_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."support_ticket_messages" TO "anon";
GRANT ALL ON TABLE "public"."support_ticket_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."support_ticket_messages" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_operational_scope_gaps" TO "anon";
GRANT ALL ON TABLE "public"."tenant_operational_scope_gaps" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_operational_scope_gaps" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_scope_gaps" TO "anon";
GRANT ALL ON TABLE "public"."tenant_scope_gaps" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_scope_gaps" TO "service_role";



GRANT ALL ON TABLE "public"."v9_channel_retention_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v9_channel_retention_summary_v2" TO "service_role";



GRANT ALL ON TABLE "public"."v9_growth_dashboard" TO "service_role";



GRANT ALL ON TABLE "public"."v9_growth_dashboard_v2" TO "service_role";



GRANT ALL ON TABLE "public"."v9_monthly_customer_cohorts" TO "service_role";



GRANT ALL ON TABLE "public"."v9_monthly_customer_cohorts_v2" TO "service_role";



GRANT ALL ON TABLE "public"."webshop_instance_addons" TO "service_role";



GRANT ALL ON TABLE "public"."webshop_instance_commerce_settings" TO "service_role";



GRANT ALL ON TABLE "public"."webshop_instance_members" TO "service_role";



GRANT ALL ON TABLE "public"."webshop_instance_provider_connections" TO "service_role";



GRANT ALL ON TABLE "public"."webshop_sales_channels" TO "anon";
GRANT ALL ON TABLE "public"."webshop_sales_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."webshop_sales_channels" TO "service_role";



GRANT ALL ON TABLE "public"."wishlists" TO "anon";
GRANT ALL ON TABLE "public"."wishlists" TO "authenticated";
GRANT ALL ON TABLE "public"."wishlists" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";




