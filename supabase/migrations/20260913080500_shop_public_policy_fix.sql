-- Anonymous visitors cannot execute private tenant-role helpers. Keep the
-- public catalog predicates separate from authenticated staff predicates.

drop policy shop_settings_read on public.shop_settings;
create policy shop_settings_anon_read
  on public.shop_settings for select to anon
  using (status = 'active');
create policy shop_settings_authenticated_read
  on public.shop_settings for select to authenticated
  using (
    status = 'active'
    or private.has_organization_role(organization_id, array['owner', 'admin', 'technician'])
    or private.is_platform_administrator()
  );

drop policy shop_products_read on public.shop_products;
create policy shop_products_anon_read
  on public.shop_products for select to anon
  using (
    status = 'published'
    and exists (
      select 1 from public.shop_settings shop
      where shop.id = shop_id and shop.status = 'active'
    )
  );
create policy shop_products_authenticated_read
  on public.shop_products for select to authenticated
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
