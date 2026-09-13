-- Add Google Drive / Docs homework links and publish one Diakspora demo book.

alter table public.homework_submissions
  add column if not exists external_url text;

alter table public.homework_submissions
  drop constraint if exists homework_submissions_external_url_check,
  add constraint homework_submissions_external_url_check check (
    external_url is null
    or external_url ~ '^https://(drive|docs)\.google\.com/'
  ),
  drop constraint if exists homework_submissions_content_check,
  add constraint homework_submissions_content_check check (
    file_url is not null or external_url is not null
  );

insert into public.shop_products (
  organization_id,
  shop_id,
  slug,
  sku,
  title,
  subtitle,
  author,
  description,
  cover_url,
  language,
  format,
  price_cents,
  stock_quantity,
  low_stock_threshold,
  track_inventory,
  featured,
  status,
  published_at
)
select
  shop.organization_id,
  shop.id,
  'mukhtasar-al-akhdari-priere-rite-malikite',
  'DK-MAA-001',
  'Mukhtasar Al-Akhdarî',
  'La prière selon le rite malikite',
  'Abd Ar-Rahmân Al-Akhdarî',
  'Un abrégé de référence consacré aux règles de la purification et de la prière selon le rite malikite. Édition française, couverture souple, 133 pages, format 18 × 11 cm.\n\nProduit de démonstration : le paiement en ligne reste désactivé tant que Stripe n’est pas connecté.',
  '/brands/diakspora/books/mukhtasar-al-akhdari.webp',
  'fr',
  'paperback',
  550,
  20,
  3,
  true,
  true,
  'published',
  now()
from public.shop_settings as shop
where shop.slug = 'diakspora'
on conflict (shop_id, slug) do update set
  sku = excluded.sku,
  title = excluded.title,
  subtitle = excluded.subtitle,
  author = excluded.author,
  description = excluded.description,
  cover_url = excluded.cover_url,
  language = excluded.language,
  format = excluded.format,
  price_cents = excluded.price_cents,
  stock_quantity = excluded.stock_quantity,
  featured = excluded.featured,
  status = excluded.status,
  published_at = coalesce(public.shop_products.published_at, excluded.published_at),
  updated_at = now();
