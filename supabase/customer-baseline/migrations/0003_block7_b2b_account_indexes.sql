-- Block 7 performance catch-up: covering indexes for B2B ownership foreign keys.
-- No authorization, payment, K&H, or data-shape semantics change in this migration.

create index if not exists b2b_accounts_created_by_idx
  on public.b2b_accounts(created_by);
create index if not exists b2b_accounts_approved_by_idx
  on public.b2b_accounts(approved_by);
create index if not exists b2b_accounts_status_changed_by_idx
  on public.b2b_accounts(status_changed_by);

create index if not exists b2b_account_members_account_instance_idx
  on public.b2b_account_members(account_id,instance_id);
create index if not exists b2b_account_members_user_id_idx
  on public.b2b_account_members(user_id);
create index if not exists b2b_account_members_added_by_idx
  on public.b2b_account_members(added_by);
create index if not exists b2b_account_members_updated_by_idx
  on public.b2b_account_members(updated_by);

create index if not exists b2b_account_invitations_account_instance_idx
  on public.b2b_account_invitations(account_id,instance_id);
create index if not exists b2b_account_invitations_invited_by_idx
  on public.b2b_account_invitations(invited_by);
create index if not exists b2b_account_invitations_accepted_by_idx
  on public.b2b_account_invitations(accepted_by);
create index if not exists b2b_account_invitations_revoked_by_idx
  on public.b2b_account_invitations(revoked_by);

create index if not exists customer_instance_roles_b2b_account_instance_idx
  on public.customer_instance_roles(b2b_account_id,instance_id);
create index if not exists orders_b2b_account_instance_idx
  on public.orders(b2b_account_id,instance_id);
