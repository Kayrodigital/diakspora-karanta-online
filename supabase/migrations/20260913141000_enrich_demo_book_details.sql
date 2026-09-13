-- Complete the public demo product sheet with bibliographic details.

update public.shop_products
set description = 'Un abrégé de référence consacré aux règles de la purification et de la prière selon le rite malikite. Édition Maison d’Ennour (2009), en français, couverture souple, 133 pages, format 18 × 11 cm. ISBN/EAN : 9782752400246.\n\nProduit de démonstration : le paiement en ligne reste désactivé tant que Stripe n’est pas connecté.',
    updated_at = now()
where slug = 'mukhtasar-al-akhdari-priere-rite-malikite'
  and exists (
    select 1
    from public.shop_settings as shop
    where shop.id = shop_products.shop_id
      and shop.slug = 'diakspora'
  );
