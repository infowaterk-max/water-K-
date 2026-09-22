create index if not exists wishlists_variant_id_idx on public.wishlists(variant_id);
create index if not exists product_reviews_user_id_idx on public.product_reviews(user_id);
create index if not exists product_recommendation_rules_recommended_variant_idx on public.product_recommendation_rules(recommended_variant_id);
create index if not exists office_tasks_thread_id_idx on public.office_tasks(thread_id);
