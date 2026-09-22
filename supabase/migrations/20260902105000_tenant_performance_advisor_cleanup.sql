-- Shoperation tenant RLS performance cleanup.
-- Preserve authorization semantics while avoiding per-row auth.uid() evaluation,
-- overlapping permissive SELECT policies, and one duplicate loyalty index.

alter policy organizations_member_read on public.organizations
  using (
    public.is_platform_operator((select auth.uid()))
    or exists (
      select 1
      from public.organization_members m
      where m.organization_id=organizations.id
        and m.user_id=(select auth.uid())
    )
  );

alter policy organization_members_self_read on public.organization_members
  using (
    public.is_platform_operator((select auth.uid()))
    or user_id=(select auth.uid())
    or exists (
      select 1
      from public.organization_members m
      where m.organization_id=organization_members.organization_id
        and m.user_id=(select auth.uid())
        and m.role=any(array['owner'::text,'admin'::text])
    )
  );

alter policy feature_entitlements_scope_read on public.feature_entitlements
  using (
    public.is_platform_operator((select auth.uid()))
    or exists (
      select 1
      from public.organization_members m
      where m.organization_id=feature_entitlements.organization_id
        and m.user_id=(select auth.uid())
    )
  );

alter policy orders_customer_or_store_read on public.orders
  using (
    customer_id=(select auth.uid())
    or public.can_manage_orders(instance_id,(select auth.uid()))
  );

alter policy order_items_customer_or_store_read on public.order_items
  using (
    public.can_manage_orders(instance_id,(select auth.uid()))
    or exists (
      select 1
      from public.orders o
      where o.id=order_items.order_id
        and o.customer_id=(select auth.uid())
        and o.instance_id=order_items.instance_id
    )
  );

alter policy recovery_intents_owner_read on public.checkout_recovery_intents
  using (
    user_id=(select auth.uid())
    or public.can_manage_marketing(instance_id,(select auth.uid()))
  );

alter policy admin_audit_tenant_read on public.admin_audit_log
  using (
    public.is_platform_operator((select auth.uid()))
    or (instance_id is not null and public.can_read_store(instance_id,(select auth.uid())))
    or (
      instance_id is null
      and organization_id is not null
      and exists (
        select 1
        from public.organization_members om
        where om.organization_id=admin_audit_log.organization_id
          and om.user_id=(select auth.uid())
      )
    )
  );

alter policy role_bindings_scope_read on public.role_bindings
  using (
    public.is_platform_operator((select auth.uid()))
    or user_id=(select auth.uid())
    or exists (
      select 1
      from public.organization_members m
      where m.organization_id=role_bindings.organization_id
        and m.user_id=(select auth.uid())
        and m.role=any(array['owner'::text,'admin'::text])
    )
  );

-- Split ALL policies so authenticated SELECT uses only the dedicated read policy.
drop policy if exists content_store_write on public.content_pages;
drop policy if exists content_store_insert on public.content_pages;
create policy content_store_insert on public.content_pages for insert to authenticated
  with check (public.can_manage_marketing(instance_id));
drop policy if exists content_store_update on public.content_pages;
create policy content_store_update on public.content_pages for update to authenticated
  using (public.can_manage_marketing(instance_id))
  with check (public.can_manage_marketing(instance_id));
drop policy if exists content_store_delete on public.content_pages;
create policy content_store_delete on public.content_pages for delete to authenticated
  using (public.can_manage_marketing(instance_id));

drop policy if exists inventory_events_store_write on public.inventory_events;
drop policy if exists inventory_events_store_insert on public.inventory_events;
create policy inventory_events_store_insert on public.inventory_events for insert to authenticated
  with check (public.can_manage_catalog(instance_id) or public.can_manage_orders(instance_id));
drop policy if exists inventory_events_store_update on public.inventory_events;
create policy inventory_events_store_update on public.inventory_events for update to authenticated
  using (public.can_manage_catalog(instance_id) or public.can_manage_orders(instance_id))
  with check (public.can_manage_catalog(instance_id) or public.can_manage_orders(instance_id));
drop policy if exists inventory_events_store_delete on public.inventory_events;
create policy inventory_events_store_delete on public.inventory_events for delete to authenticated
  using (public.can_manage_catalog(instance_id) or public.can_manage_orders(instance_id));

drop policy if exists inventory_reservations_store_write on public.inventory_reservations;
drop policy if exists inventory_reservations_store_insert on public.inventory_reservations;
create policy inventory_reservations_store_insert on public.inventory_reservations for insert to authenticated
  with check (public.can_manage_catalog(instance_id) or public.can_manage_orders(instance_id));
drop policy if exists inventory_reservations_store_update on public.inventory_reservations;
create policy inventory_reservations_store_update on public.inventory_reservations for update to authenticated
  using (public.can_manage_catalog(instance_id) or public.can_manage_orders(instance_id))
  with check (public.can_manage_catalog(instance_id) or public.can_manage_orders(instance_id));
drop policy if exists inventory_reservations_store_delete on public.inventory_reservations;
create policy inventory_reservations_store_delete on public.inventory_reservations for delete to authenticated
  using (public.can_manage_catalog(instance_id) or public.can_manage_orders(instance_id));

drop policy if exists variants_store_write on public.product_variants;
drop policy if exists variants_store_insert on public.product_variants;
create policy variants_store_insert on public.product_variants for insert to authenticated
  with check (public.can_manage_catalog(instance_id));
drop policy if exists variants_store_update on public.product_variants;
create policy variants_store_update on public.product_variants for update to authenticated
  using (public.can_manage_catalog(instance_id))
  with check (public.can_manage_catalog(instance_id));
drop policy if exists variants_store_delete on public.product_variants;
create policy variants_store_delete on public.product_variants for delete to authenticated
  using (public.can_manage_catalog(instance_id));

drop policy if exists products_store_write on public.products;
drop policy if exists products_store_insert on public.products;
create policy products_store_insert on public.products for insert to authenticated
  with check (public.can_manage_catalog(instance_id));
drop policy if exists products_store_update on public.products;
create policy products_store_update on public.products for update to authenticated
  using (public.can_manage_catalog(instance_id))
  with check (public.can_manage_catalog(instance_id));
drop policy if exists products_store_delete on public.products;
create policy products_store_delete on public.products for delete to authenticated
  using (public.can_manage_catalog(instance_id));

-- Both indexes cover exactly (customer_id, occurred_at desc); keep the older canonical one.
drop index if exists public.loyalty_ledger_customer_time_idx;
