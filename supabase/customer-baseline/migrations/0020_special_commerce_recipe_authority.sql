-- Special Commerce Wave 2: Recipe Commerce + explicit allergen/dietary structured authority.
-- Recipe-to-Cart composes existing catalog items and delegates cart intent/revalidation to E4.
-- No recipe table owns pricing, inventory, cart, checkout, order or payment state.

create unique index if not exists product_variants_id_product_instance_uidx
  on public.product_variants(id,product_id,instance_id);

create table if not exists public.recipe_definitions (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  recipe_key text not null check (recipe_key ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'),
  title text not null check (char_length(trim(title)) between 1 and 200),
  summary text,
  base_servings integer not null check (base_servings between 1 and 100),
  min_servings integer not null check (min_servings between 1 and 100),
  max_servings integer not null check (max_servings between 1 and 100),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_servings<=base_servings and base_servings<=max_servings),
  unique(instance_id,recipe_key),
  unique(instance_id,id)
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null,
  recipe_id uuid not null,
  ingredient_key text not null check (ingredient_key ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'),
  label text not null check (char_length(trim(label)) between 1 and 200),
  quantity_display text not null check (char_length(trim(quantity_display)) between 1 and 120),
  commerce_mode text not null check (commerce_mode in ('required','optional','informational')),
  base_cart_quantity integer,
  scaling_policy text,
  sort_order integer not null default 0 check (sort_order between 0 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (commerce_mode='informational' and base_cart_quantity is null and scaling_policy is null)
    or
    (commerce_mode in ('required','optional') and base_cart_quantity between 1 and 100 and scaling_policy in ('fixed','proportional-ceil'))
  ),
  unique(instance_id,recipe_id,ingredient_key),
  unique(instance_id,recipe_id,id),
  foreign key(instance_id,recipe_id) references public.recipe_definitions(instance_id,id) on delete cascade
);

create table if not exists public.recipe_ingredient_mappings (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null,
  recipe_id uuid not null,
  ingredient_id uuid not null,
  mapping_key text not null check (mapping_key ~ '^[a-z0-9]+([._-][a-z0-9]+)*$'),
  product_id uuid not null,
  variant_id uuid not null,
  label text,
  sort_order integer not null default 0 check (sort_order between 0 and 1000),
  created_at timestamptz not null default now(),
  unique(instance_id,ingredient_id,mapping_key),
  unique(instance_id,id),
  foreign key(instance_id,recipe_id,ingredient_id)
    references public.recipe_ingredients(instance_id,recipe_id,id) on delete cascade,
  foreign key(product_id,instance_id)
    references public.products(id,instance_id) on delete restrict,
  foreign key(variant_id,product_id,instance_id)
    references public.product_variants(id,product_id,instance_id) on delete restrict
);

create table if not exists public.recipe_food_claims (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null,
  recipe_id uuid not null,
  claim_type text not null check (claim_type in ('allergen','dietary')),
  claim_code text not null check (claim_code ~ '^[a-z0-9]+([._:-][a-z0-9]+)*$'),
  status text not null,
  source text not null check (source in ('merchant-structured-data','certified-source')),
  evidence_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (claim_type='allergen' and status in ('contains','may-contain','free-from'))
    or
    (claim_type='dietary' and status in ('meets','does-not-meet'))
  ),
  check (evidence_ref is null or char_length(trim(evidence_ref)) between 1 and 512),
  unique(instance_id,recipe_id,claim_type,claim_code),
  foreign key(instance_id,recipe_id) references public.recipe_definitions(instance_id,id) on delete cascade
);

create index if not exists recipe_definitions_instance_active_idx
  on public.recipe_definitions(instance_id,active,updated_at desc);
create index if not exists recipe_ingredients_recipe_idx
  on public.recipe_ingredients(instance_id,recipe_id,sort_order);
create index if not exists recipe_ingredient_mappings_ingredient_idx
  on public.recipe_ingredient_mappings(instance_id,ingredient_id,sort_order);
create index if not exists recipe_ingredient_mappings_product_idx
  on public.recipe_ingredient_mappings(instance_id,product_id,variant_id);
create index if not exists recipe_food_claims_recipe_idx
  on public.recipe_food_claims(instance_id,recipe_id,claim_type,claim_code);

alter table public.recipe_definitions enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_ingredient_mappings enable row level security;
alter table public.recipe_food_claims enable row level security;

-- Server-only persistence boundary. Browser roles receive no direct access.
revoke all on public.recipe_definitions from public,anon,authenticated;
revoke all on public.recipe_ingredients from public,anon,authenticated;
revoke all on public.recipe_ingredient_mappings from public,anon,authenticated;
revoke all on public.recipe_food_claims from public,anon,authenticated;
revoke insert,update,delete on public.recipe_definitions from service_role;
revoke insert,update,delete on public.recipe_ingredients from service_role;
revoke insert,update,delete on public.recipe_ingredient_mappings from service_role;
revoke insert,update,delete on public.recipe_food_claims from service_role;
grant select on public.recipe_definitions to service_role;
grant select on public.recipe_ingredients to service_role;
grant select on public.recipe_ingredient_mappings to service_role;
grant select on public.recipe_food_claims to service_role;

create or replace function public.save_recipe_commerce_v1(
  p_instance_id uuid,
  p_actor uuid,
  p_recipe jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_recipe_id uuid;
  v_recipe_key text;
  v_title text;
  v_base integer;
  v_min integer;
  v_max integer;
  v_ingredient jsonb;
  v_ingredient_id uuid;
  v_mode text;
  v_mapping jsonb;
  v_claim jsonb;
  v_product_id uuid;
  v_variant_id uuid;
begin
  if not public.can_manage_catalog(p_instance_id,p_actor) then
    raise exception 'RECIPE_COMMERCE_FORBIDDEN';
  end if;
  if p_recipe is null or pg_catalog.jsonb_typeof(p_recipe)<>'object' then
    raise exception 'RECIPE_COMMERCE_DOCUMENT_INVALID';
  end if;
  if pg_catalog.octet_length(p_recipe::text)>1048576 then
    raise exception 'RECIPE_COMMERCE_DOCUMENT_TOO_LARGE';
  end if;

  v_recipe_key=trim(coalesce(p_recipe->>'recipeKey',''));
  v_title=trim(coalesce(p_recipe->>'title',''));
  if v_recipe_key !~ '^[a-z0-9]+([._-][a-z0-9]+)*$' or char_length(v_title) not between 1 and 200 then
    raise exception 'RECIPE_COMMERCE_IDENTITY_INVALID';
  end if;
  begin
    v_base=(p_recipe->>'baseServings')::integer;
    v_min=(p_recipe->>'minServings')::integer;
    v_max=(p_recipe->>'maxServings')::integer;
  exception when others then
    raise exception 'RECIPE_COMMERCE_SERVINGS_INVALID';
  end;
  if v_min<1 or v_max>100 or v_min>v_base or v_base>v_max then
    raise exception 'RECIPE_COMMERCE_SERVINGS_INVALID';
  end if;
  if pg_catalog.jsonb_typeof(coalesce(p_recipe->'ingredients','[]'::jsonb))<>'array'
     or jsonb_array_length(coalesce(p_recipe->'ingredients','[]'::jsonb)) not between 1 and 100
     or pg_catalog.jsonb_typeof(coalesce(p_recipe->'claims','[]'::jsonb))<>'array'
     or jsonb_array_length(coalesce(p_recipe->'claims','[]'::jsonb))>100 then
    raise exception 'RECIPE_COMMERCE_ARRAY_INVALID';
  end if;

  insert into public.recipe_definitions(instance_id,recipe_key,title,summary,base_servings,min_servings,max_servings,active,created_by,updated_by)
  values(p_instance_id,v_recipe_key,v_title,nullif(trim(coalesce(p_recipe->>'summary','')),''),v_base,v_min,v_max,coalesce((p_recipe->>'active')::boolean,true),p_actor,p_actor)
  on conflict(instance_id,recipe_key) do update set
    title=excluded.title,
    summary=excluded.summary,
    base_servings=excluded.base_servings,
    min_servings=excluded.min_servings,
    max_servings=excluded.max_servings,
    active=excluded.active,
    updated_by=excluded.updated_by,
    updated_at=now()
  returning id into v_recipe_id;

  delete from public.recipe_food_claims where instance_id=p_instance_id and recipe_id=v_recipe_id;
  delete from public.recipe_ingredients where instance_id=p_instance_id and recipe_id=v_recipe_id;

  for v_ingredient in select value from jsonb_array_elements(p_recipe->'ingredients') loop
    v_mode=coalesce(v_ingredient->>'commerceMode','');
    if coalesce(v_ingredient->>'ingredientId','') !~ '^[a-z0-9]+([._-][a-z0-9]+)*$'
       or char_length(trim(coalesce(v_ingredient->>'label',''))) not between 1 and 200
       or char_length(trim(coalesce(v_ingredient->>'quantityDisplay',''))) not between 1 and 120
       or v_mode not in ('required','optional','informational') then
      raise exception 'RECIPE_COMMERCE_INGREDIENT_INVALID';
    end if;
    if v_mode='informational' then
      if coalesce(jsonb_array_length(coalesce(v_ingredient->'mappings','[]'::jsonb)),0)<>0 then
        raise exception 'RECIPE_COMMERCE_INFORMATIONAL_MAPPING_FORBIDDEN';
      end if;
      insert into public.recipe_ingredients(instance_id,recipe_id,ingredient_key,label,quantity_display,commerce_mode,sort_order)
      values(p_instance_id,v_recipe_id,v_ingredient->>'ingredientId',trim(v_ingredient->>'label'),trim(v_ingredient->>'quantityDisplay'),v_mode,coalesce((v_ingredient->>'sortOrder')::integer,0))
      returning id into v_ingredient_id;
    else
      if coalesce((v_ingredient->>'baseCartQuantity')::integer,0) not between 1 and 100
         or coalesce(v_ingredient->>'scalingPolicy','') not in ('fixed','proportional-ceil')
         or pg_catalog.jsonb_typeof(coalesce(v_ingredient->'mappings','[]'::jsonb))<>'array'
         or jsonb_array_length(coalesce(v_ingredient->'mappings','[]'::jsonb)) not between 1 and 20 then
        raise exception 'RECIPE_COMMERCE_MAPPING_REQUIRED';
      end if;
      insert into public.recipe_ingredients(instance_id,recipe_id,ingredient_key,label,quantity_display,commerce_mode,base_cart_quantity,scaling_policy,sort_order)
      values(p_instance_id,v_recipe_id,v_ingredient->>'ingredientId',trim(v_ingredient->>'label'),trim(v_ingredient->>'quantityDisplay'),v_mode,(v_ingredient->>'baseCartQuantity')::integer,v_ingredient->>'scalingPolicy',coalesce((v_ingredient->>'sortOrder')::integer,0))
      returning id into v_ingredient_id;

      for v_mapping in select value from jsonb_array_elements(v_ingredient->'mappings') loop
        if coalesce(v_mapping->>'mappingId','') !~ '^[a-z0-9]+([._-][a-z0-9]+)*$' then
          raise exception 'RECIPE_COMMERCE_MAPPING_ID_INVALID';
        end if;
        begin
          v_product_id=(v_mapping->>'productId')::uuid;
          v_variant_id=(v_mapping->>'variantId')::uuid;
        exception when others then
          raise exception 'RECIPE_COMMERCE_MAPPING_CATALOG_ID_INVALID';
        end;
        if not exists(
          select 1 from public.product_variants pv
          join public.products p on p.id=pv.product_id and p.instance_id=pv.instance_id
          where pv.instance_id=p_instance_id and pv.id=v_variant_id and pv.product_id=v_product_id
        ) then
          raise exception 'RECIPE_COMMERCE_MAPPING_TENANT_MISMATCH';
        end if;
        insert into public.recipe_ingredient_mappings(instance_id,recipe_id,ingredient_id,mapping_key,product_id,variant_id,label,sort_order)
        values(p_instance_id,v_recipe_id,v_ingredient_id,v_mapping->>'mappingId',v_product_id,v_variant_id,nullif(trim(coalesce(v_mapping->>'label','')),''),coalesce((v_mapping->>'sortOrder')::integer,0));
      end loop;
    end if;
  end loop;

  for v_claim in select value from jsonb_array_elements(coalesce(p_recipe->'claims','[]'::jsonb)) loop
    if coalesce(v_claim->>'claimType','') not in ('allergen','dietary')
       or coalesce(v_claim->>'claimCode','') !~ '^[a-z0-9]+([._:-][a-z0-9]+)*$'
       or coalesce(v_claim->>'source','') not in ('merchant-structured-data','certified-source') then
      raise exception 'RECIPE_COMMERCE_CLAIM_INVALID';
    end if;
    if (v_claim->>'claimType'='allergen' and coalesce(v_claim->>'status','') not in ('contains','may-contain','free-from'))
       or (v_claim->>'claimType'='dietary' and coalesce(v_claim->>'status','') not in ('meets','does-not-meet')) then
      raise exception 'RECIPE_COMMERCE_CLAIM_STATUS_INVALID';
    end if;
    insert into public.recipe_food_claims(instance_id,recipe_id,claim_type,claim_code,status,source,evidence_ref)
    values(p_instance_id,v_recipe_id,v_claim->>'claimType',v_claim->>'claimCode',v_claim->>'status',v_claim->>'source',nullif(trim(coalesce(v_claim->>'evidenceRef','')),''));
  end loop;

  return jsonb_build_object('recipeId',v_recipe_id,'recipeKey',v_recipe_key);
end;
$$;

create or replace function public.delete_recipe_commerce_v1(
  p_instance_id uuid,
  p_actor uuid,
  p_recipe_id uuid
) returns boolean
language plpgsql
security definer
set search_path=''
as $$
begin
  if not public.can_manage_catalog(p_instance_id,p_actor) then
    raise exception 'RECIPE_COMMERCE_FORBIDDEN';
  end if;
  delete from public.recipe_definitions where instance_id=p_instance_id and id=p_recipe_id;
  return found;
end;
$$;

revoke all on function public.save_recipe_commerce_v1(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.delete_recipe_commerce_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.save_recipe_commerce_v1(uuid,uuid,jsonb) to service_role;
grant execute on function public.delete_recipe_commerce_v1(uuid,uuid,uuid) to service_role;

insert into public.entitlement_capabilities(capability_code,release_state,capability_kind,metadata)
values ('recipeCommerce','released','feature',jsonb_build_object('surface','storefront','family','special-commerce','engine','recipe-commerce-v1'))
on conflict(capability_code) do update
set release_state='released',capability_kind='feature',metadata=excluded.metadata,updated_at=now();

insert into public.plan_capability_grants(plan_code,capability_code)
values ('pro','recipeCommerce')
on conflict do nothing;

do $$
declare r record;
begin
  for r in select id from public.webshop_instances where subscription_plan='pro' loop
    perform private.sync_webshop_plan_entitlements(r.id);
  end loop;
end $$;
