-- Diakspora Karanta shop foundation: tenant-scoped physical books, inventory,
-- orders and service-only checkout lifecycle functions.

create table public.shop_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  description text,
  currency text not null default 'eur' check (currency ~ '^[a-z]{3}$'),
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  payment_provider text not null default 'stripe' check (payment_provider = 'stripe'),
  payment_enabled boolean not null default false,
  shipping_country text not null default 'FR' check (shipping_country = 'FR'),
  flat_shipping_cents integer not null default 0 check (flat_shipping_cents >= 0),
  free_shipping_threshold_cents integer check (free_shipping_threshold_cents is null or free_shipping_threshold_cents > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table public.shop_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  shop_id uuid not null references public.shop_settings(id) on delete cascade,
  book_id uuid references public.books(id) on delete set null,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  sku text,
  title text not null check (char_length(title) between 2 and 200),
  subtitle text,
  author text,
  description text,
  cover_url text,
  language text not null default 'fr',
  format text not null default 'paperback' check (format in ('paperback', 'hardcover')),
  price_cents integer not null check (price_cents > 0),
  compare_at_price_cents integer check (compare_at_price_cents is null or compare_at_price_cents > price_cents),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  track_inventory boolean not null default true,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, slug),
  unique (id, organization_id),
  constraint shop_products_tenant_consistency
    foreign key (shop_id, organization_id)
    references public.shop_settings(id, organization_id)
);

create sequence private.shop_order_number_seq;

create table public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  shop_id uuid not null references public.shop_settings(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  order_number text not null unique default (
    'KAR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('private.shop_order_number_seq')::text, 6, '0')
  ),
  customer_email text not null,
  customer_name text not null,
  customer_phone text,
  shipping_address jsonb,
  currency text not null default 'eur' check (currency ~ '^[a-z]{3}$'),
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'expired', 'refunded')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  tracking_reference text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  constraint shop_orders_tenant_consistency
    foreign key (shop_id, organization_id)
    references public.shop_settings(id, organization_id)
);

create table public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  product_id uuid references public.shop_products(id) on delete set null,
  product_title text not null,
  product_sku text,
  cover_url text,
  unit_price_cents integer not null check (unit_price_cents > 0),
  quantity integer not null check (quantity between 1 and 20),
  line_total_cents integer generated always as (unit_price_cents * quantity) stored,
  created_at timestamptz not null default now(),
  constraint shop_order_items_order_tenant
    foreign key (order_id, organization_id)
    references public.shop_orders(id, organization_id),
  constraint shop_order_items_product_tenant
    foreign key (product_id, organization_id)
    references public.shop_products(id, organization_id)
);

create table public.shop_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.shop_checkout_attempts (
  id bigint generated by default as identity primary key,
  fingerprint text not null,
  created_at timestamptz not null default now()
);

create index shop_products_public_catalog_idx
  on public.shop_products (shop_id, featured desc, published_at desc)
  where status = 'published';
create index shop_products_organization_status_idx
  on public.shop_products (organization_id, status, updated_at desc);
create unique index shop_products_shop_sku_idx
  on public.shop_products (shop_id, sku)
  where sku is not null;
create index shop_orders_organization_created_idx
  on public.shop_orders (organization_id, created_at desc);
create index shop_orders_user_created_idx
  on public.shop_orders (user_id, created_at desc)
  where user_id is not null;
create index shop_order_items_order_idx on public.shop_order_items (order_id);
create index shop_checkout_attempts_fingerprint_idx
  on private.shop_checkout_attempts (fingerprint, created_at desc);

alter table public.shop_settings enable row level security;
alter table public.shop_products enable row level security;
alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;
alter table public.shop_webhook_events enable row level security;

revoke all on table public.shop_settings from public, anon, authenticated;
revoke all on table public.shop_products from public, anon, authenticated;
revoke all on table public.shop_orders from public, anon, authenticated;
revoke all on table public.shop_order_items from public, anon, authenticated;
revoke all on table public.shop_webhook_events from public, anon, authenticated;
revoke all on table private.shop_checkout_attempts from public, anon, authenticated;
revoke all on sequence private.shop_order_number_seq from public, anon, authenticated;

grant select on table public.shop_settings to anon, authenticated;
grant select on table public.shop_products to anon, authenticated;
grant select, insert, update, delete on table public.shop_settings to authenticated;
grant select, insert, update, delete on table public.shop_products to authenticated;
grant select on table public.shop_orders to authenticated;
grant select on table public.shop_order_items to authenticated;

create policy shop_settings_public_read
  on public.shop_settings for select to anon, authenticated
  using (status = 'active');

create policy shop_settings_staff_manage
  on public.shop_settings for all to authenticated
  using (
    private.has_organization_role(organization_id, array['owner', 'admin', 'technician'])
    or private.is_platform_administrator()
  )
  with check (
    private.has_organization_role(organization_id, array['owner', 'admin', 'technician'])
    or private.is_platform_administrator()
  );

create policy shop_products_public_read
  on public.shop_products for select to anon, authenticated
  using (
    status = 'published'
    and exists (
      select 1 from public.shop_settings shop
      where shop.id = shop_id and shop.status = 'active'
    )
  );

create policy shop_products_staff_manage
  on public.shop_products for all to authenticated
  using (
    private.has_organization_role(organization_id, array['owner', 'admin', 'technician'])
    or private.is_platform_administrator()
  )
  with check (
    private.has_organization_role(organization_id, array['owner', 'admin', 'technician'])
    or private.is_platform_administrator()
  );

create policy shop_orders_customer_read
  on public.shop_orders for select to authenticated
  using (user_id = (select auth.uid()));

create policy shop_orders_staff_read
  on public.shop_orders for select to authenticated
  using (
    private.has_organization_role(organization_id, array['owner', 'admin', 'technician'])
    or private.is_platform_administrator()
  );

create policy shop_order_items_customer_read
  on public.shop_order_items for select to authenticated
  using (
    exists (
      select 1 from public.shop_orders orders
      where orders.id = order_id and orders.user_id = (select auth.uid())
    )
  );

create policy shop_order_items_staff_read
  on public.shop_order_items for select to authenticated
  using (
    private.has_organization_role(organization_id, array['owner', 'admin', 'technician'])
    or private.is_platform_administrator()
  );

create or replace function public.check_shop_checkout_rate_limit(p_fingerprint text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_attempts integer;
begin
  if p_fingerprint is null or char_length(p_fingerprint) < 16 then
    return false;
  end if;

  delete from private.shop_checkout_attempts
  where created_at < now() - interval '1 day';

  select count(*) into recent_attempts
  from private.shop_checkout_attempts
  where fingerprint = p_fingerprint
    and created_at > now() - interval '10 minutes';

  if recent_attempts >= 10 then
    return false;
  end if;

  insert into private.shop_checkout_attempts (fingerprint) values (p_fingerprint);
  return true;
end;
$$;

create or replace function public.create_shop_order(
  p_shop_id uuid,
  p_customer_email text,
  p_customer_name text,
  p_customer_phone text,
  p_items jsonb,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop public.shop_settings%rowtype;
  new_order public.shop_orders%rowtype;
  item jsonb;
  product public.shop_products%rowtype;
  requested_quantity integer;
  computed_subtotal integer := 0;
  computed_shipping integer := 0;
begin
  if p_customer_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Adresse e-mail invalide.';
  end if;
  if char_length(btrim(p_customer_name)) < 2 then
    raise exception 'Nom client invalide.';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'Panier invalide.';
  end if;

  select * into shop from public.shop_settings
  where id = p_shop_id and status = 'active' and payment_enabled
  for update;
  if not found then raise exception 'La boutique ne peut pas accepter de paiement.'; end if;

  insert into public.shop_orders (
    organization_id, shop_id, user_id, customer_email, customer_name, customer_phone, currency
  ) values (
    shop.organization_id, shop.id, p_user_id, lower(btrim(p_customer_email)), btrim(p_customer_name),
    nullif(btrim(p_customer_phone), ''), shop.currency
  ) returning * into new_order;

  for item in select value from jsonb_array_elements(p_items)
  loop
    requested_quantity := (item ->> 'quantity')::integer;
    if requested_quantity < 1 or requested_quantity > 20 then
      raise exception 'Quantité invalide.';
    end if;

    select * into product from public.shop_products
    where id = (item ->> 'product_id')::uuid
      and shop_id = shop.id
      and status = 'published'
    for update;
    if not found then raise exception 'Un produit du panier n’est plus disponible.'; end if;
    if product.track_inventory and product.stock_quantity < requested_quantity then
      raise exception 'Stock insuffisant pour %.', product.title;
    end if;

    insert into public.shop_order_items (
      organization_id, order_id, product_id, product_title, product_sku, cover_url,
      unit_price_cents, quantity
    ) values (
      shop.organization_id, new_order.id, product.id, product.title, product.sku, product.cover_url,
      product.price_cents, requested_quantity
    );

    if product.track_inventory then
      update public.shop_products
      set stock_quantity = stock_quantity - requested_quantity, updated_at = now()
      where id = product.id;
    end if;
    computed_subtotal := computed_subtotal + (product.price_cents * requested_quantity);
  end loop;

  computed_shipping := case
    when shop.free_shipping_threshold_cents is not null
      and computed_subtotal >= shop.free_shipping_threshold_cents then 0
    else shop.flat_shipping_cents
  end;

  update public.shop_orders
  set subtotal_cents = computed_subtotal,
      shipping_cents = computed_shipping,
      total_cents = computed_subtotal + computed_shipping,
      updated_at = now()
  where id = new_order.id;

  return jsonb_build_object(
    'id', new_order.id,
    'order_number', new_order.order_number,
    'currency', shop.currency,
    'subtotal_cents', computed_subtotal,
    'shipping_cents', computed_shipping,
    'total_cents', computed_subtotal + computed_shipping
  );
end;
$$;

create or replace function public.release_shop_order(p_order_id uuid, p_status text default 'expired')
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.shop_orders%rowtype;
  item public.shop_order_items%rowtype;
begin
  if p_status not in ('cancelled', 'expired') then raise exception 'Statut de libération invalide.'; end if;
  select * into target_order from public.shop_orders where id = p_order_id for update;
  if not found or target_order.status <> 'awaiting_payment' then return false; end if;

  for item in select * from public.shop_order_items where order_id = p_order_id
  loop
    update public.shop_products
    set stock_quantity = stock_quantity + item.quantity, updated_at = now()
    where id = item.product_id and track_inventory;
  end loop;

  update public.shop_orders
  set status = p_status, updated_at = now()
  where id = p_order_id;
  return true;
end;
$$;

create or replace function public.mark_shop_order_paid(
  p_order_id uuid,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_shipping_address jsonb default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.shop_orders
  set status = 'paid',
      stripe_checkout_session_id = coalesce(stripe_checkout_session_id, p_checkout_session_id),
      stripe_payment_intent_id = coalesce(stripe_payment_intent_id, p_payment_intent_id),
      shipping_address = coalesce(p_shipping_address, shipping_address),
      paid_at = coalesce(paid_at, now()),
      updated_at = now()
  where id = p_order_id and status in ('awaiting_payment', 'paid');
  return found;
end;
$$;

create or replace function public.update_shop_order_fulfillment(
  p_order_id uuid,
  p_status text,
  p_tracking_reference text default null,
  p_internal_notes text default null
)
returns public.shop_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.shop_orders%rowtype;
begin
  select * into target_order
  from public.shop_orders
  where id = p_order_id;

  if not found then raise exception 'Commande introuvable.'; end if;
  if not (
    private.has_organization_role(target_order.organization_id, array['owner', 'admin', 'technician'])
    or private.is_platform_administrator()
  ) then
    raise exception 'Accès refusé.';
  end if;
  if p_status not in ('paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded') then
    raise exception 'Statut de commande invalide.';
  end if;
  if target_order.status = 'awaiting_payment' and p_status not in ('cancelled') then
    raise exception 'Une commande non payée ne peut pas être préparée.';
  end if;
  if target_order.status in ('cancelled', 'expired', 'refunded') then
    raise exception 'Cette commande est clôturée.';
  end if;

  update public.shop_orders
  set status = p_status,
      tracking_reference = nullif(btrim(p_tracking_reference), ''),
      internal_notes = nullif(btrim(p_internal_notes), ''),
      shipped_at = case when p_status = 'shipped' then coalesce(shipped_at, now()) else shipped_at end,
      delivered_at = case when p_status = 'delivered' then coalesce(delivered_at, now()) else delivered_at end,
      updated_at = now()
  where id = p_order_id
  returning * into target_order;

  return target_order;
end;
$$;

create or replace function private.release_expired_shop_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
  released_count integer := 0;
begin
  for target in
    select id from public.shop_orders
    where status = 'awaiting_payment' and expires_at < now()
    order by expires_at
    limit 100
  loop
    if public.release_shop_order(target.id, 'expired') then
      released_count := released_count + 1;
    end if;
  end loop;
  return released_count;
end;
$$;

revoke all on function public.check_shop_checkout_rate_limit(text) from public, anon, authenticated;
revoke all on function public.create_shop_order(uuid, text, text, text, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.release_shop_order(uuid, text) from public, anon, authenticated;
revoke all on function public.mark_shop_order_paid(uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.update_shop_order_fulfillment(uuid, text, text, text) from public, anon;
revoke all on function private.release_expired_shop_orders() from public, anon, authenticated;
grant execute on function public.check_shop_checkout_rate_limit(text) to service_role;
grant execute on function public.create_shop_order(uuid, text, text, text, jsonb, uuid) to service_role;
grant execute on function public.release_shop_order(uuid, text) to service_role;
grant execute on function public.mark_shop_order_paid(uuid, text, text, jsonb) to service_role;
grant execute on function public.update_shop_order_fulfillment(uuid, text, text, text) to authenticated;

select cron.schedule(
  'karanta-expire-shop-orders',
  '*/10 * * * *',
  'select private.release_expired_shop_orders()'
);

insert into public.shop_settings (
  organization_id, slug, name, description, currency, status, payment_enabled,
  shipping_country, flat_shipping_cents, free_shipping_threshold_cents
)
select id, 'diakspora', 'Librairie Diakspora',
       'Les livres étudiés dans Karanta, disponibles pour apprendre à votre rythme.',
       'eur', 'active', false, 'FR', 500, 5000
from public.organizations
where slug = 'diakspora'
on conflict (organization_id) do nothing;
