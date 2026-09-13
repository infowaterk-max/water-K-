-- Merchant Saved Blocks v1 staging advisor follow-up.
-- Cover nullable auth-user foreign keys used by referential checks / deletes.

create index if not exists storefront_saved_blocks_created_by_idx
  on public.storefront_saved_blocks(created_by);

create index if not exists storefront_saved_block_events_actor_user_idx
  on public.storefront_saved_block_events(actor_user_id);
