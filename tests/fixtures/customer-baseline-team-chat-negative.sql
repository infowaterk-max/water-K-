-- Team Chat 2 negative DML; execution must be on a fresh isolated test PostgreSQL only.
-- Checks both BEFORE INSERT integrity triggers; tests intentionally use nonexistent message UUIDs.
-- No authenticated identity or existing tenant/office rows are implied by this fixture.
BEGIN;
DO $$
DECLARE err text;
BEGIN
  BEGIN
    INSERT INTO public.office_message_mentions(instance_id,message_id,thread_id,mentioned_user_id,mentioned_by)
    VALUES('a1111111-1111-4111-8111-111111111111',
           'b2222222-2222-4222-8222-222222222222',
           'c3333333-3333-4333-8333-333333333333',
           'd4444444-4444-4444-8444-444444444444',
           'e5555555-5555-4555-8555-555555555555');
    RAISE EXCEPTION 'TEST_FAILED_MENTION_WITHOUT_MESSAGE_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err=MESSAGE_TEXT;
    IF err <> 'OFFICE_MENTION_MESSAGE_INTEGRITY_INVALID' THEN
      RAISE EXCEPTION 'TEAM_CHAT_MENTION_WRONG_FAILURE:%',err;
    END IF;
  END;
  BEGIN
    INSERT INTO public.office_message_object_links(instance_id,message_id,thread_id,object_type,object_id,created_by)
    VALUES('a1111111-1111-4111-8111-111111111111',
           'b2222222-2222-4222-8222-222222222222',
           'c3333333-3333-4333-8333-333333333333',
           'order',
           'f6666666-6666-4666-8666-666666666666',
           'e5555555-5555-4555-8555-555555555555');
    RAISE EXCEPTION 'TEST_FAILED_OBJECT_LINK_WITHOUT_MESSAGE_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err=MESSAGE_TEXT;
    IF err <> 'OFFICE_OBJECT_MESSAGE_INTEGRITY_INVALID' THEN
      RAISE EXCEPTION 'TEAM_CHAT_OBJECT_LINK_WRONG_FAILURE:%',err;
    END IF;
  END;
END;$$;
ROLLBACK;
