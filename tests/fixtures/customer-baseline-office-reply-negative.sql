-- All writes are within one transaction and always rolled back.
BEGIN;
INSERT INTO public.organizations(id,slug,name) VALUES('99999999-9999-4999-8999-999999999999','isolated-rehearsal-org','Disposable Test Org');
INSERT INTO public.webshop_instances(id,slug,name,status,organization_id)
 VALUES('a1111111-1111-4111-8111-111111111111','isolated-rehearsal','Isolated SQL Rehearsal','pilot','99999999-9999-4999-8999-999999999999');
INSERT INTO public.office_mailboxes(instance_id,mailbox_key,label,inbound_address,is_active)
 VALUES('a1111111-1111-4111-8111-111111111111','support','Test Support','support@disposable.invalid',true);
INSERT INTO public.office_threads(id,instance_id,subject,conversation_type,mailbox_key)
 VALUES('b2222222-2222-4222-8222-222222222222','a1111111-1111-4111-8111-111111111111','Test Customer Thread','customer','support');
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.office_thread_email_routes WHERE instance_id='a1111111-1111-4111-8111-111111111111' AND thread_id='b2222222-2222-4222-8222-222222222222') THEN
    RAISE EXCEPTION 'MISSING_TEST_ROUTE';
  END IF;
END;$$;
INSERT INTO public.communication_jobs(id,instance_id,recipient_email,purpose,template_key,payload,idempotency_key)
 VALUES('c3333333-3333-4333-8333-333333333333','a1111111-1111-4111-8111-111111111111','buyer@disposable.invalid','transactional','support_reply','{"officeThreadId":"b2222222-2222-4222-8222-222222222222"}','test-valid-office-reply');
DO $$
DECLARE msg text;
BEGIN
 UPDATE public.communication_jobs SET status='processing' WHERE id='c3333333-3333-4333-8333-333333333333';
 IF NOT FOUND THEN RAISE EXCEPTION 'STATUS_UPDATE_FAILED'; END IF;
 BEGIN
   UPDATE public.communication_jobs
      SET payload='{"officeThreadId":"d4444444-4444-4444-8444-444444444444"}'::jsonb
    WHERE id='c3333333-3333-4333-8333-333333333333';
   RAISE EXCEPTION 'TEST_FAILED_UNEXPECTED_THREAD_UPDATE_ACCEPTED';
 EXCEPTION WHEN OTHERS THEN
   GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT;
   IF msg <> 'OFFICE_REPLY_ROUTING_CONTEXT_IMMUTABLE' THEN RAISE EXCEPTION 'WRONG_THREAD_EXCEPTION:%',msg; END IF;
 END;
 BEGIN
   UPDATE public.communication_jobs
      SET template_key='unrelated',payload='{}'::jsonb
    WHERE id='c3333333-3333-4333-8333-333333333333';
   RAISE EXCEPTION 'TEST_FAILED_TAG_STRIP_ACCEPTED';
 EXCEPTION WHEN OTHERS THEN
   GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT;
   IF msg <> 'OFFICE_REPLY_ROUTING_CONTEXT_IMMUTABLE' THEN RAISE EXCEPTION 'WRONG_TAG_STRIP_EXCEPTION:%',msg; END IF;
 END;
END;$$;
INSERT INTO public.communication_jobs(id,instance_id,recipient_email,purpose,template_key,payload,idempotency_key)
 VALUES('e5555555-5555-4555-8555-555555555555','a1111111-1111-4111-8111-111111111111','buyer@disposable.invalid','transactional','general_receipt','{}','test-ordinary-job');
DO $$
DECLARE msg text;
BEGIN
 BEGIN
  UPDATE public.communication_jobs SET template_key='support_reply',payload='{"officeThreadId":"f6666666-6666-4666-8666-666666666666"}'::jsonb WHERE id='e5555555-5555-4555-8555-555555555555';
  RAISE EXCEPTION 'TEST_FAILED_TAG_ADD_ACCEPTED';
 EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT;
  IF msg <> 'OFFICE_REPLY_THREAD_REQUIRED' THEN RAISE EXCEPTION 'WRONG_TAG_ADD_EXCEPTION:%',msg; END IF;
 END;
END;$$;
ROLLBACK;
