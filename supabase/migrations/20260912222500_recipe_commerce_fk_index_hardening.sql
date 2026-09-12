-- Special Commerce Wave 2 hardening: cover Recipe Commerce FK directions reported by the database advisor.
-- Keep the server-only RLS/privilege boundary unchanged.

create index if not exists recipe_definitions_created_by_idx
  on public.recipe_definitions(created_by)
  where created_by is not null;

create index if not exists recipe_definitions_updated_by_idx
  on public.recipe_definitions(updated_by)
  where updated_by is not null;

create index if not exists recipe_ingredient_mappings_recipe_ingredient_fk_idx
  on public.recipe_ingredient_mappings(instance_id,recipe_id,ingredient_id);

create index if not exists recipe_ingredient_mappings_product_instance_fk_idx
  on public.recipe_ingredient_mappings(product_id,instance_id);

create index if not exists recipe_ingredient_mappings_variant_product_instance_fk_idx
  on public.recipe_ingredient_mappings(variant_id,product_id,instance_id);

-- The unique constraint already provides the exact read path below; the extra
-- non-unique copy only adds write amplification.
drop index if exists public.recipe_food_claims_recipe_idx;
