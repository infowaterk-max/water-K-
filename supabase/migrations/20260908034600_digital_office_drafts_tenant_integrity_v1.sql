-- Digital Office draft tenant integrity hardening.
-- New-email drafts can exist without a thread, therefore instance ownership must be enforced directly as well.

alter table public.office_drafts
  drop constraint if exists office_drafts_instance_id_fkey;
alter table public.office_drafts
  add constraint office_drafts_instance_id_fkey
  foreign key(instance_id) references public.webshop_instances(id) on delete cascade;

create index if not exists office_drafts_author_instance_idx
  on public.office_drafts(author_user_id,instance_id);
