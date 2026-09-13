-- Tighten catalog policies and add the covering indexes reported by the
-- Supabase database advisor after the initial shop migration.

drop policy shop_settings_public_read on public.shop_settings;
drop policy shop_settings_staff_manage on public.shop_settings;

create policy shop_settings_read
  on public.shop_settings for select to anon, authenticated
  using (
    status = 'active'
    or private.has_organization_role(organization_id, array['owner', 'admin', 'technician'])
    or private.is_platform_administrator()
  );
create policy shop_settings_staff_insert
  on public.shop_settings for insert to authenticated
  with check (
    private.has_organization_role(organization_id, array['owner', 'admin', 'technician'])
    or private.is_platform_administrator()
  );
create policy shop_settings_staff_update
  on public.shop_settings for update to authenticated
  using (
    private.has_organization_role(organization_id, array['owner', 'admin', 'technician'])
    or private.is_platform_administrator()
  )
  with check (
    private.has_organization_role(organization_id, array['owner', 'admin', 'technician'])
    or private.is_platform_administrator()
  );
create policy shop_settings_staff_delete
  on public.shop_settings for delete to authenticated
  using (
    private.has_organization_role(organization_id, array['owner', 'admin', 'technician'])
    or private.is_platform_administrator()
  );

drop policy shop_products_public_read on public.shop_products;
drop policy shop_products_staff_manage on public.shop_products;

create policy shop_products_read
  on public.shop_products for select to anon, authenticated
  using (
    (
      status = 'published'
      and exists (
        select 1 from public.shop_settings shop
        where shop.id = shop_id and shop.status = 'active'
      )
    )
    or private.has_organization_role(organization_id, array['owner', 'admin', 'technician'])
    or private.is_platform_administrator()
  );
create policy shop_products_staff_insert
  on public.shop_products for insert to authenticated
  with check (
    private.has_organization_role(organization_id, array['owner', 'admin', 'technician'])
    or private.is_platform_administrator()
  );
create policy shop_products_staff_update
  on public.shop_products for update to authenticated
  using (
    private.has_organization_role(organization_id, array['owner', 'admin', 'technician'])
    or private.is_platform_administrator()
  )
  with check (
    private.has_organization_role(organization_id, array['owner', 'admin', 'technician'])
    or private.is_platform_administrator()
  );
create policy shop_products_staff_delete
  on public.shop_products for delete to authenticated
  using (
    private.has_organization_role(organization_id, array['owner', 'admin', 'technician'])
    or private.is_platform_administrator()
  );

drop policy shop_orders_customer_read on public.shop_orders;
drop policy shop_orders_staff_read on public.shop_orders;
create policy shop_orders_read
  on public.shop_orders for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_organization_role(organization_id, array['owner', 'admin', 'technician'])
    or private.is_platform_administrator()
  );

drop policy shop_order_items_customer_read on public.shop_order_items;
drop policy shop_order_items_staff_read on public.shop_order_items;
create policy shop_order_items_read
  on public.shop_order_items for select to authenticated
  using (
    exists (
      select 1 from public.shop_orders orders
      where orders.id = order_id and orders.user_id = (select auth.uid())
    )
    or private.has_organization_role(organization_id, array['owner', 'admin', 'technician'])
    or private.is_platform_administrator()
  );

create policy shop_webhook_events_no_client_access
  on public.shop_webhook_events for all to anon, authenticated
  using (false)
  with check (false);

create index shop_products_book_idx on public.shop_products (book_id);
create index shop_products_created_by_idx on public.shop_products (created_by);
create index shop_products_shop_organization_idx on public.shop_products (shop_id, organization_id);
create index shop_orders_shop_organization_idx on public.shop_orders (shop_id, organization_id);
create index shop_order_items_organization_idx on public.shop_order_items (organization_id);
create index shop_order_items_product_organization_idx on public.shop_order_items (product_id, organization_id);
create index shop_order_items_order_organization_idx on public.shop_order_items (order_id, organization_id);
