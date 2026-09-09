-- Block 8 Digital Office performance catch-up.
-- Cover foreign-key leading columns introduced or materially exercised by Team Chat 2.0 and secure attachments.
-- No authorization, mailbox, storefront, payment or data-lifecycle semantics change.

create index if not exists office_attachments_draft_instance_fk_idx
  on public.office_attachments(draft_id,instance_id)
  where draft_id is not null;
create index if not exists office_attachments_message_instance_fk_idx
  on public.office_attachments(message_id,instance_id)
  where message_id is not null;
create index if not exists office_attachments_uploaded_by_fk_idx
  on public.office_attachments(uploaded_by)
  where uploaded_by is not null;

create index if not exists office_message_attachments_message_fk_idx
  on public.office_message_attachments(message_id)
  where message_id is not null;
create index if not exists office_message_attachments_thread_fk_idx
  on public.office_message_attachments(thread_id);
create index if not exists office_message_attachments_uploader_fk_idx
  on public.office_message_attachments(uploader_id);

create index if not exists office_message_mentions_mentioned_by_fk_idx
  on public.office_message_mentions(mentioned_by);
create index if not exists office_message_mentions_mentioned_user_fk_idx
  on public.office_message_mentions(mentioned_user_id);
create index if not exists office_message_mentions_message_thread_instance_fk_idx
  on public.office_message_mentions(message_id,thread_id,instance_id);

create index if not exists office_message_object_links_created_by_fk_idx
  on public.office_message_object_links(created_by);
create index if not exists office_message_object_links_message_thread_instance_fk_idx
  on public.office_message_object_links(message_id,thread_id,instance_id);

create index if not exists office_thread_participants_added_by_fk_idx
  on public.office_thread_participants(added_by)
  where added_by is not null;
create index if not exists office_thread_participants_thread_instance_fk_idx
  on public.office_thread_participants(thread_id,instance_id);
create index if not exists office_thread_participants_user_fk_idx
  on public.office_thread_participants(user_id);

create index if not exists office_threads_created_by_fk_idx
  on public.office_threads(created_by)
  where created_by is not null;
