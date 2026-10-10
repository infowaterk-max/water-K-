-- F25: local PostgreSQL 18 only; two tenant, two active participants and isolated role-bound actors.
-- No real Supabase Auth claim parity. Entire suite is transactional and ROLLBACK-only.
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('d1111111-1111-4111-8111-111111111111','owner@local.invalid'),
 ('d2222222-2222-4222-8222-222222222222','member@local.invalid'),
 ('d3333333-3333-4333-8333-333333333333','other-tenant@local.invalid');
INSERT INTO public.organizations(id,slug,name) VALUES
 ('81111111-1111-4111-8111-111111111111','f25-tenant-a','Disposable Tenant A'),
 ('82222222-2222-4222-8222-222222222222','f25-tenant-b','Disposable Tenant B');
INSERT INTO public.webshop_instances(id,slug,name,status,organization_id) VALUES
 ('a1111111-1111-4111-8111-111111111111','f25-shop-a','Disposable Shop A','pilot','81111111-1111-4111-8111-111111111111'),
 ('a2222222-2222-4222-8222-222222222222','f25-shop-b','Disposable Shop B','pilot','82222222-2222-4222-8222-222222222222');
INSERT INTO public.role_bindings(organization_id,instance_id,user_id,role_code) VALUES
 ('81111111-1111-4111-8111-111111111111','a1111111-1111-4111-8111-111111111111','d1111111-1111-4111-8111-111111111111','support'),
 ('81111111-1111-4111-8111-111111111111','a1111111-1111-4111-8111-111111111111','d2222222-2222-4222-8222-222222222222','support'),
 ('82222222-2222-4222-8222-222222222222','a2222222-2222-4222-8222-222222222222','d3333333-3333-4333-8333-333333333333','support');
INSERT INTO public.office_threads(id,instance_id,subject,conversation_type,created_by)
 VALUES('c1111111-1111-4111-8111-111111111111','a1111111-1111-4111-8111-111111111111','F25 Internal Team Chat Owner Proof','internal_group','d1111111-1111-4111-8111-111111111111');
INSERT INTO public.office_thread_participants(instance_id,thread_id,user_id,participant_role) VALUES
 ('a1111111-1111-4111-8111-111111111111','c1111111-1111-4111-8111-111111111111','d1111111-1111-4111-8111-111111111111','owner'),
 ('a1111111-1111-4111-8111-111111111111','c1111111-1111-4111-8111-111111111111','d2222222-2222-4222-8222-222222222222','member');

DO $$
DECLARE err text;
  shop_a uuid:='a1111111-1111-4111-8111-111111111111';
  shop_b uuid:='a2222222-2222-4222-8222-222222222222';
  t uuid:='c1111111-1111-4111-8111-111111111111';
  owner_a uuid:='d1111111-1111-4111-8111-111111111111';
  member_b uuid:='d2222222-2222-4222-8222-222222222222';
  foreign_c uuid:='d3333333-3333-4333-8333-333333333333';
  result jsonb;
  owners integer;
  audits integer;
BEGIN
  IF NOT public.can_read_office_thread_v1(shop_a,t,owner_a)
     OR NOT public.can_read_office_thread_v1(shop_a,t,member_b)
     OR public.can_read_office_thread_v1(shop_a,t,foreign_c)
  THEN RAISE EXCEPTION 'F25_TEST_ROLE_AND_PARTICIPANT_PREREQUISITE_FAILED'; END IF;
  IF NOT private.office_active_thread_owner_v1(shop_a,t,owner_a) THEN
    RAISE EXCEPTION 'F25_TEST_INITIAL_OWNER_NOT_ACTIVE'; END IF;

  -- A member must not take control even when a privileged server caller invokes the RPC.
  BEGIN
    PERFORM public.admin_transfer_office_thread_owner_v1(shop_a,member_b,t,owner_a);
    RAISE EXCEPTION 'F25_TEST_NON_OWNER_TRANSFER_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err=MESSAGE_TEXT;
    IF err <> 'OFFICE_THREAD_OWNER_REQUIRED' THEN
      RAISE EXCEPTION 'F25_TEST_NON_OWNER_WRONG_REJECTION:%',err;
    END IF;
  END;

  BEGIN
    PERFORM public.admin_transfer_office_thread_owner_v1(shop_a,owner_a,t,owner_a);
    RAISE EXCEPTION 'F25_TEST_SELF_TRANSFER_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err=MESSAGE_TEXT;
    IF err <> 'OFFICE_OWNER_TRANSFER_SELF_FORBIDDEN' THEN
      RAISE EXCEPTION 'F25_TEST_SELF_WRONG_REJECTION:%',err;
    END IF;
  END;

  BEGIN
    PERFORM public.admin_transfer_office_thread_owner_v1(shop_a,owner_a,t,foreign_c);
    RAISE EXCEPTION 'F25_TEST_CROSS_TENANT_TRANSFER_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err=MESSAGE_TEXT;
    IF err <> 'OFFICE_OWNER_TRANSFER_TARGET_MEMBER_REQUIRED' THEN
      RAISE EXCEPTION 'F25_TEST_CROSS_TENANT_WRONG_REJECTION:%',err;
    END IF;
  END;

  BEGIN
    PERFORM public.admin_transfer_office_thread_owner_v1(shop_b,owner_a,t,foreign_c);
    RAISE EXCEPTION 'F25_TEST_WRONG_INSTANCE_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err=MESSAGE_TEXT;
    IF err <> 'OFFICE_INTERNAL_THREAD_NOT_FOUND' THEN
      RAISE EXCEPTION 'F25_TEST_WRONG_INSTANCE_WRONG_REJECTION:%',err;
    END IF;
  END;

  SELECT count(*) INTO owners FROM public.office_thread_participants
    WHERE instance_id=shop_a AND thread_id=t AND left_at IS NULL AND participant_role='owner';
  IF owners<>1 OR NOT private.office_active_thread_owner_v1(shop_a,t,owner_a) THEN
    RAISE EXCEPTION 'F25_TEST_NEGATIVE_ACTION_MUTATED_OWNER'; END IF;

  result:=public.admin_transfer_office_thread_owner_v1(shop_a,owner_a,t,member_b);
  IF result->>'transferred'<>'true' OR result->>'ownerUserId'<>member_b::text
    OR private.office_active_thread_owner_v1(shop_a,t,owner_a)
    OR NOT private.office_active_thread_owner_v1(shop_a,t,member_b) THEN
    RAISE EXCEPTION 'F25_TEST_POSITIVE_OWNER_TRANSFER_FAILED:%',result; END IF;
  SELECT count(*) INTO owners FROM public.office_thread_participants
    WHERE instance_id=shop_a AND thread_id=t AND left_at IS NULL AND participant_role='owner';
  IF owners<>1 THEN RAISE EXCEPTION 'F25_TEST_POSITIVE_NOT_SINGLE_OWNER'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.office_thread_participants
    WHERE instance_id=shop_a AND thread_id=t AND user_id=owner_a AND participant_role='member')
  THEN RAISE EXCEPTION 'F25_TEST_PREVIOUS_OWNER_NOT_DEMOTED'; END IF;

  SELECT count(*) INTO audits FROM public.admin_audit_log
    WHERE instance_id=shop_a AND action='office.private_owner_transferred'
      AND entity_id=t::text;
  IF audits<>1 THEN RAISE EXCEPTION 'F25_TEST_TRANSFER_AUDIT_COUNT:%',audits; END IF;

  BEGIN
    PERFORM public.admin_transfer_office_thread_owner_v1(shop_a,owner_a,t,member_b);
    RAISE EXCEPTION 'F25_TEST_FORMER_OWNER_SECOND_TRANSFER_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err=MESSAGE_TEXT;
    IF err <> 'OFFICE_THREAD_OWNER_REQUIRED' THEN
      RAISE EXCEPTION 'F25_TEST_FORMER_OWNER_WRONG_REJECTION:%',err;
    END IF;
  END;

  result:=public.admin_transfer_office_thread_owner_v1(shop_a,member_b,t,owner_a);
  IF result->>'transferred'<>'true' OR result->>'ownerUserId'<>owner_a::text
    OR NOT private.office_active_thread_owner_v1(shop_a,t,owner_a)
    OR private.office_active_thread_owner_v1(shop_a,t,member_b)
  THEN RAISE EXCEPTION 'F25_TEST_REVERSE_OWNER_TRANSFER_FAILED:%',result; END IF;
  SELECT count(*) INTO audits FROM public.admin_audit_log
    WHERE instance_id=shop_a AND action='office.private_owner_transferred'
      AND entity_id=t::text;
  IF audits<>2 THEN RAISE EXCEPTION 'F25_TEST_REVERSE_AUDIT_COUNT:%',audits; END IF;
  SELECT count(*) INTO owners FROM public.office_thread_participants
    WHERE instance_id=shop_a AND thread_id=t AND left_at IS NULL AND participant_role='owner';
  IF owners<>1 THEN RAISE EXCEPTION 'F25_TEST_REVERSE_NOT_SINGLE_OWNER'; END IF;
END;$$;
ROLLBACK;
